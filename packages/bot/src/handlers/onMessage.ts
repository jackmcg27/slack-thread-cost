import type { App } from '@slack/bolt';
import type { SlackMessageEvent } from '@slack-thread-cost/core';
import { ingestMessage } from '../services/messageIngest';

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

/**
 * Registers the message-ingestion handler. Only metadata (word/char
 * count, timestamps, thread structure) is derived from event.text — the
 * text itself is never persisted or logged in full (see README Privacy
 * section).
 */
export function registerOnMessage(app: App): void {
  app.message(async ({ message }) => {
    const event = message as SlackMessageEvent;

    // Skip bot messages, edits/deletes, and anything else with a subtype
    // (channel_join, message_changed, etc.) — only plain new messages count.
    if (event.subtype || event.bot_id || !event.user) return;

    const text = event.text ?? '';
    const wordCount = countWords(text);
    const charCount = text.length;
    const timestampMs = Math.round(parseFloat(event.ts) * 1000);

    try {
      await ingestMessage({
        slackChannelId: event.channel,
        slackTs: event.ts,
        threadTs: event.thread_ts,
        slackUserId: event.user,
        wordCount,
        charCount,
        timestampMs,
      });
    } catch (err) {
      console.error('[onMessage] Failed to ingest message:', err);
    }
  });
}
