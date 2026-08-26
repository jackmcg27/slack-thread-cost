# Deployment — step by step (Ubuntu)

Written for someone who hasn't deployed a Node app before. Every step
is one small action. Do them in order, in a terminal on the Ubuntu VM.

There's a script (`scripts/setup.sh`) that automates Parts 2–4 below.
You can either follow every step by hand the first time to understand
what's happening, or jump straight to [the fast path](#fast-path-recommended-after-your-first-read-through).

---

## Part 1 — Install the tools (one-time, on the VM)

**1.1 Check if Git is already installed:**

```
git --version
```

If missing:

```
sudo apt-get update
sudo apt-get install -y git
```

**1.2 Check if Node.js is already installed:**

```
node --version
```

You need v18 or higher. If missing or too old, install Node 20 LTS:

```
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
```

---

## Part 2 — Get the code

**2.1 Pick a folder**, e.g. your home directory, and clone the repo:

```
cd ~
git clone https://github.com/jackmcg27/slack-thread-cost.git
cd slack-thread-cost
```

**2.2 Install dependencies** (downloads everything the app needs):

```
npm install
```

---

## Part 3 — Configure

**3.1 Create your own `.env` file** from the template:

```
cp .env.example .env
```

**3.2 Open `.env`** (`nano .env`) and set `DATABASE_URL` to an
absolute path pointing at `packages/core/dev.db` inside wherever you
cloned the repo. Example, if you cloned into `/home/youruser/slack-thread-cost`:

```
DATABASE_URL=file:/home/youruser/slack-thread-cost/packages/core/dev.db
```

Leave `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` blank for now — you'll
fill those in Part 5. Save and exit (`nano`: Ctrl+O, Enter, Ctrl+X).

---

## Part 4 — Create the database

**4.1 Apply the database schema:**

```
npm run prisma:deploy
```

**4.2 Seed the 5 staff classifications and rates:**

```
npm run prisma:seed
```

This inserts placeholder rates ($30/40/55/75/100 per hour). To use
your company's real numbers, edit
`packages/core/src/config/rates.config.json`, then re-run
`npm run prisma:seed`.

---

## Fast path (recommended after your first read-through)

Once you understand what Parts 2–4 do, `scripts/setup.sh` does all of
it in one go — clones aren't included, so start from inside a freshly
cloned repo:

```
git clone https://github.com/jackmcg27/slack-thread-cost.git
cd slack-thread-cost
npm run setup
```

It checks Node, runs `npm install`, creates `.env` with the correct
absolute `DATABASE_URL` already filled in, and creates + seeds the
database. It stops short of Slack tokens and real hourly rates —
those still need Part 5 below and a `seed.ts` edit.

---

## Part 5 — Create the Slack app

This part happens in a browser at
[api.slack.com/apps](https://api.slack.com/apps), not on the VM. Full
instructions with every scope/setting are in
[README.md → "Create the Slack app"](README.md#4-create-the-slack-app).
Short version:

1. Create an app "from scratch," turn on **Socket Mode**, generate an
   App-Level Token → copy it into `.env` as `SLACK_APP_TOKEN`.
2. Add the bot scopes listed in the README, install the app to your
   workspace, copy the **Bot User OAuth Token** → `.env` as
   `SLACK_BOT_TOKEN`.
3. In Slack, invite the bot to whichever channel(s) you want tracked:
   `/invite @your-bot-name`.

Save `.env` after adding both tokens.

---

## Part 6 — Test it manually

Open **two** terminal sessions on the VM (two SSH windows, or `tmux`)
— one for the bot, one for the dashboard.

**6.1 Terminal 1 — start the bot:**

```
npm run dev:bot
```

You should see `[bot] Connected to Slack (Socket Mode).` If you see
an error instead, re-check the two Slack tokens in `.env`.

**6.2 Terminal 2 — build and start the dashboard:**

```
npm run build --workspace=packages/dashboard
npm run start:dashboard
```

**6.3 Open the dashboard.** From a browser on the same network as the
VM, go to `http://<VM's IP address>:3311`. Find the VM's IP with:

```
hostname -I
```

If you can't reach it, your VM's firewall may be blocking port 3311:

```
sudo ufw allow 3311/tcp
```

**6.4 Post a test message** in the Slack channel you invited the bot
to, then refresh the dashboard. You should see it show up under
Threads with a small estimated cost.

If both terminals are running without errors and the dashboard loads,
it's working — stop here if manual testing is all you need for now.

---

## Part 7 — Keep it running (optional, do this once you're happy it works)

Right now the bot and dashboard only run while their terminal session
stays open — closing the SSH connection kills them. `pm2` keeps them
running in the background, restarts them if they crash, and can start
them automatically on VM reboot.

**7.1 Install pm2** (once):

```
sudo npm install -g pm2
```

**7.2 Stop the two terminals from Part 6** (Ctrl+C in each).

**7.3 Build both packages** (production mode, not dev mode):

```
npm run build --workspace=packages/bot
npm run build --workspace=packages/dashboard
```

**7.4 Start both under pm2**, from the `slack-thread-cost` folder:

```
pm2 start npm --name thread-cost-bot -- run start:bot
pm2 start npm --name thread-cost-dashboard -- run start:dashboard
```

**7.5 Check they're running:**

```
pm2 status
```

Both should show `online`.

**7.6 View logs any time:**

```
pm2 logs thread-cost-bot
pm2 logs thread-cost-dashboard
```

**7.7 Make it survive a VM reboot:**

```
pm2 save
pm2 startup
```

`pm2 startup` prints one more command — copy and run exactly what it
prints (it uses `sudo` to register a systemd service).

---

## Quick reference — everyday commands

| What | Command |
|---|---|
| Check both are running | `pm2 status` |
| Restart the bot | `pm2 restart thread-cost-bot` |
| Restart the dashboard | `pm2 restart thread-cost-dashboard` |
| Stop everything | `pm2 stop all` |
| View dashboard | `http://<VM IP>:3311` |
| Re-seed rates after editing `seed.ts` | `npm run prisma:seed` |
| Pull code updates | `git pull`, then `npm install`, then rebuild + `pm2 restart all` |

## If something breaks

- **Dashboard shows an error / blank page**: check
  `pm2 logs thread-cost-dashboard` for the actual error.
- **Bot never says "Connected to Slack"**: double check
  `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` in `.env`, and that Socket
  Mode is enabled on the Slack app.
- **No data shows up after posting in Slack**: confirm the bot was
  actually invited to that channel (`/invite @your-bot-name`), and
  check `pm2 logs thread-cost-bot` for errors.
- **Can't reach the dashboard from your browser**: check `sudo ufw
  status` — port 3311 may need to be opened (Part 6.3).
