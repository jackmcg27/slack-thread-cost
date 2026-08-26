#!/usr/bin/env bash
# One-time setup for a fresh clone on Linux/macOS. Run from the repo root:
#   npm run setup
# or directly:
#   bash scripts/setup.sh
#
# Does: checks Node.js, installs dependencies, creates .env (if missing),
# creates the database, seeds placeholder classifications/rates.
# Does NOT create the Slack app or fill in Slack tokens — that part is
# manual, see README.md "Create the Slack app".

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo "== Checking Node.js =="
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found."
  echo "Install it (Ubuntu example, Node 20 LTS via NodeSource):"
  echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
  echo "  sudo apt-get install -y nodejs"
  echo "Then re-run this script."
  exit 1
fi
NODE_MAJOR="$(node --version | sed 's/^v//' | cut -d. -f1)"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Node.js $(node --version) found, but version 18+ is required."
  exit 1
fi
echo "Node.js $(node --version) OK"

echo "== Installing dependencies (npm install) =="
npm install

echo "== Generating Prisma client =="
npm run prisma:generate --workspace=packages/core

echo "== Configuring .env =="
ENV_PATH="$REPO_ROOT/.env"
TOKENS_STILL_NEEDED=0
if [ -f "$ENV_PATH" ]; then
  echo ".env already exists — leaving it as is."
else
  cp "$REPO_ROOT/.env.example" "$ENV_PATH"
  DB_PATH="$REPO_ROOT/packages/core/dev.db"
  # portable in-place sed for both GNU sed (Linux) and BSD sed (macOS)
  sed -i.bak "s#^DATABASE_URL=.*#DATABASE_URL=file:$DB_PATH#" "$ENV_PATH"
  rm -f "$ENV_PATH.bak"
  echo "Created .env with DATABASE_URL set to file:$DB_PATH"
  TOKENS_STILL_NEEDED=1
fi

echo "== Creating the database =="
npm run prisma:deploy

echo "== Seeding staff classifications and rates =="
npm run prisma:seed

echo
echo "== Setup complete =="
echo "Next steps:"
echo "  1. Edit packages/core/prisma/seed.ts with real hourly rates, then: npm run prisma:seed"
if [ "$TOKENS_STILL_NEEDED" -eq 1 ]; then
  echo "  2. Create the Slack app and add SLACK_BOT_TOKEN / SLACK_APP_TOKEN to .env"
  echo "     (see README.md, section 'Create the Slack app')"
else
  echo "  2. Confirm SLACK_BOT_TOKEN / SLACK_APP_TOKEN are set in .env"
fi
echo "  3. Try it: npm run dev:bot          (one terminal)"
echo "             npm run dev:dashboard    (another terminal)"
echo "  4. Open http://localhost:3311"
echo "See DEPLOYMENT.md for the full walkthrough, including keeping it running with pm2."
