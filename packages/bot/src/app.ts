import { App } from '@slack/bolt';
import type { Env } from '@slack-thread-cost/core';

export function buildApp(env: Env): App {
  if (!env.SLACK_BOT_TOKEN || !env.SLACK_APP_TOKEN) {
    throw new Error(
      'SLACK_BOT_TOKEN and SLACK_APP_TOKEN are required to start the bot. ' +
        'See README "Slack App Setup" for how to generate them.'
    );
  }

  return new App({
    token: env.SLACK_BOT_TOKEN,
    appToken: env.SLACK_APP_TOKEN,
    socketMode: true,
  });
}
