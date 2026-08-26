/** Minimal shape of the Slack message event fields the bot actually uses. */
export interface SlackMessageEvent {
  type: 'message';
  subtype?: string;
  channel: string;
  user?: string;
  bot_id?: string;
  text?: string;
  ts: string;
  thread_ts?: string;
}
