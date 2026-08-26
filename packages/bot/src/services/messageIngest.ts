import { Prisma, prisma } from '@slack-thread-cost/core';

export interface IngestMessageInput {
  slackChannelId: string;
  slackTs: string;
  threadTs?: string;
  slackUserId: string;
  wordCount: number;
  charCount: number;
  timestampMs: number;
}

/**
 * Persists one message's metadata. Never receives or stores message
 * text — callers must compute wordCount/charCount and discard the raw
 * text before calling this.
 */
export async function ingestMessage(input: IngestMessageInput): Promise<void> {
  const channel = await prisma.channel.findUnique({
    where: { slackChannelId: input.slackChannelId },
  });
  if (!channel || !channel.isTracked) return;

  // Placeholder user row if userSync hasn't seen this person yet — a
  // later sync fills in displayName/classification without touching
  // ingestion. No-op update keeps an existing (possibly classified) row
  // untouched by a race with a concurrent sync.
  const user = await prisma.user.upsert({
    where: { slackUserId: input.slackUserId },
    update: {},
    create: {
      slackUserId: input.slackUserId,
      displayName: input.slackUserId,
    },
  });

  const isThreadRoot = !input.threadTs || input.threadTs === input.slackTs;

  try {
    await prisma.message.create({
      data: {
        slackTs: input.slackTs,
        channelId: channel.id,
        threadTs: input.threadTs,
        userId: user.id,
        wordCount: input.wordCount,
        charCount: input.charCount,
        timestampMs: BigInt(input.timestampMs),
        isThreadRoot,
      },
    });
  } catch (err) {
    // P2002 = unique constraint violation on (channelId, slackTs) — a
    // redelivered Socket Mode event, safe to ignore.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return;
    throw err;
  }
}
