# Slack Thread Cost Tracker

Estimates the dollar cost of Slack conversations by combining real-time
message metadata with staff hourly rates, so you can see which threads,
channels, and people are consuming the most paid time.

Runs entirely on-prem / on a local machine or VM. The only outbound
network dependency is Slack's own API (Socket Mode) — no cloud hosting,
no external services, no data leaves your network except to Slack itself.

For a beginner-friendly, step-by-step deployment walkthrough (Ubuntu
VM), see [DEPLOYMENT.md](DEPLOYMENT.md). This README covers the same
ground more tersely and is OS-agnostic.

## How it works

1. A Slack bot (`packages/bot`) listens for messages in real time via
   Socket Mode — no public URL or ngrok needed.
2. For each message it stores only: word count, char count, timestamp,
   thread structure, and the author's Slack user ID. **Message text is
   never stored or logged** — see [Privacy](#privacy).
3. Each Slack user is periodically mapped to one of 5 staff
   classifications (via a pluggable provider — CSV mapping today, Denodo
   later) which resolves to an hourly rate.
4. A cost-estimation formula converts word count into estimated minutes
   spent reading/writing, then minutes × hourly rate → cost, rolled up
   per message, thread, channel, and person.
5. A web dashboard (`packages/dashboard`) reads the database and shows
   cost breakdowns, filterable by date range, channel, and person.

## Architecture

```
packages/
  core/       shared Prisma schema/client, classification providers,
              cost-calculation logic — both other packages depend on this
  bot/        long-running Slack ingestion daemon (Socket Mode)
  dashboard/  Next.js app — reads the DB, renders the web UI
```

Ingestion and the dashboard are separate long-running processes: the
bot needs a stable persistent connection to Slack, and Next.js dev-mode
restarts shouldn't risk dropping or duplicating that connection.

Money is stored as integer cents and classification codes as plain
strings, so the same schema works against SQLite (dev) or Postgres
(prod) — switching is a config change, not a rewrite (see
[Moving to Postgres](#moving-to-postgres)).

## Setup

### 1. Install dependencies

```
npm install
```

### 2. Configure environment

```
cp .env.example .env
```

Fill in `DATABASE_URL` (an absolute `file:` path is safest on Windows —
see note below) and leave the Slack tokens for step 4.

### 3. Create the database

```
npm run prisma:migrate
npm run prisma:seed
```

This creates the SQLite DB and seeds the 5 staff classifications with
placeholder hourly rates. Edit `packages/core/prisma/seed.ts` with your
real classification names and rates from your company's cost-estimator
methodology, then re-run `npm run prisma:seed`.

### 4. Create the Slack app

Done manually at [api.slack.com/apps](https://api.slack.com/apps) —
can't be automated:

1. Create an app "from scratch." Under **Socket Mode**, enable it and
   generate an App-Level Token with the `connections:write` scope →
   this is `SLACK_APP_TOKEN`.
2. Under **OAuth & Permissions**, add Bot Token Scopes:
   `channels:history`, `groups:history`, `channels:read`, `groups:read`,
   `users:read`, `users:read.email`.
   (DM scopes — `im:history` / `mpim:history` — are deliberately
   omitted: this tool doesn't track DMs by default.)
3. Under **Event Subscriptions**, enable events and subscribe to
   `message.channels` and `message.groups`. No Request URL is needed
   under Socket Mode.
4. Install the app to your workspace, then copy the **Bot User OAuth
   Token** → `SLACK_BOT_TOKEN`.
5. Invite the bot to whichever channels you want tracked:
   `/invite @your-bot-name`. Channel membership is the opt-in
   mechanism — the bot only sees channels it's explicitly invited to.
6. Fill `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` into `.env`.

There is no backfill — ingestion only sees messages sent after the bot
starts listening.

### 5. Map staff classifications

Default provider is `manual` (CSV-backed). Edit
`packages/core/src/classification/data/classification-mapping.csv`
(see the `.example.csv` for the format — either `slack_user_id` or
`email`, plus a `classification_code` matching one of the 5 seeded
codes). The bot re-reads this file periodically, so no restart needed
after edits.

If/when Denodo access to Workday data is confirmed, set
`CLASSIFICATION_PROVIDER=denodo` and fill the `DENODO_*` vars in
`.env` — see `packages/core/src/classification/DenodoProvider.ts` for
the TODO marking where the real query needs to be wired in.

### 6. Run it

```
npm run dev:bot         # start ingestion (separate terminal)
npm run dev:dashboard   # start the dashboard (separate terminal)
```

Dashboard runs on `http://localhost:3311` (fixed in
`packages/dashboard/package.json`).

### Windows note: SQLite path

On Windows, a relative `DATABASE_URL` (e.g. `file:./dev.db`) can fail
to resolve depending on which directory a command is run from. Prefer
an absolute path, e.g.:

```
DATABASE_URL=file:C:/path/to/slack-thread-cost/packages/core/dev.db
```

## Privacy

This tool is designed to answer "how much is this costing," not "what
did people say." Concretely:

- **Message text is never stored or logged.** Only word count, char
  count, timestamps, and thread structure (which messages belong to
  which thread) are persisted.
- **DMs are not tracked** — the bot's OAuth scopes deliberately omit
  `im:history`/`mpim:history`.
- **Channel tracking is opt-in**, not workspace-wide passive
  listening — the bot only sees channels it's been explicitly invited
  to via `/invite`.
- Estimated cost is a heuristic based on message length, not a
  precise measurement of time actually spent — treat it as a relative
  signal (which threads/channels are expensive) rather than an exact
  figure.

Share this section with whoever administers your Slack workspace
before rolling the bot out.

## Moving to Postgres

1. In `packages/core/prisma/schema.prisma`, change the datasource
   `provider` from `"sqlite"` to `"postgresql"`.
2. Point `DATABASE_URL` at your Postgres instance (a `docker-compose.yml`
   is included for local testing — `docker compose up -d`).
3. Run `npx prisma migrate deploy` (from `packages/core`) to apply
   migrations to the new database.

No application code changes are required — money-as-cents and
classification-codes-as-strings were chosen specifically so this
migration is config-only.

## Environment variables

See `.env.example` for the full list with inline comments, including
`CLASSIFICATION_PROVIDER`, `DENODO_*`, and `TRACKED_CHANNELS`.

## Known limitations (v1)

- Cost is estimated from message length only — it doesn't account for
  time spent reading by participants who never reply, or wall-clock
  thread duration.
- No historical backfill — only messages sent after the bot is running
  are counted.
- The Denodo/Workday classification provider is a stub pending
  confirmation of Denodo access and the actual view/schema to query.
