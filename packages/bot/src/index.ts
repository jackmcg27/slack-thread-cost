import path from 'node:path';
import dotenv from 'dotenv';

// Load the repo-root .env regardless of which directory this process was
// started from (tsx watch runs with cwd = packages/bot).
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { loadEnv, getClassificationProvider } from '@slack-thread-cost/core';
import { buildApp } from './app';
import { registerOnMessage } from './handlers/onMessage';
import { ensureWorkspace, syncTrackedChannels } from './services/channelRegistry';
import { syncUsers } from './services/userSync';

const USER_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function main() {
  const env = loadEnv();

  const provider = getClassificationProvider(env);
  await provider.init();

  const app = buildApp(env);
  registerOnMessage(app);

  await app.start();
  console.log('[bot] Connected to Slack (Socket Mode).');

  const client = app.client;
  const workspaceId = await ensureWorkspace(client);
  await syncTrackedChannels(client, workspaceId, env.TRACKED_CHANNELS);
  await syncUsers(client, provider);

  setInterval(() => {
    syncTrackedChannels(client, workspaceId, env.TRACKED_CHANNELS).catch((err) =>
      console.error('[bot] channel sync failed:', err)
    );
    syncUsers(client, provider).catch((err) => console.error('[bot] user sync failed:', err));
  }, USER_SYNC_INTERVAL_MS);
}

main().catch((err) => {
  console.error('[bot] Fatal error during startup:', err);
  process.exit(1);
});
