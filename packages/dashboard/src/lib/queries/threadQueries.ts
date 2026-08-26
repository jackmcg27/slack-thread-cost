import { prisma, estimateMessageMinutes, estimateThreadCost, timeEstimateConfig } from '@slack-thread-cost/core';
import { buildRateLookup, computeCostBreakdown, DateRangeFilter, fetchMessages } from '../costEngine';

export interface ThreadListFilter extends DateRangeFilter {
  sortBy?: 'cost' | 'recency';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ThreadRow {
  channelId: string;
  channelName: string;
  threadTs: string;
  firstMessageAt: number;
  lastMessageAt: number;
  messageCount: number;
  participantCount: number;
  totalCostCents: number;
}

export async function getThreads(filter: ThreadListFilter): Promise<{ rows: ThreadRow[]; total: number }> {
  const [messages, rateLookup, channels] = await Promise.all([
    fetchMessages(filter),
    buildRateLookup(),
    prisma.channel.findMany({ select: { id: true, name: true } }),
  ]);
  const channelName = new Map(channels.map((c) => [c.id, c.name]));

  const breakdown = computeCostBreakdown(messages, rateLookup);

  let rows: ThreadRow[] = breakdown.threads.map((t) => ({
    channelId: t.channelId,
    channelName: channelName.get(t.channelId) ?? t.channelId,
    threadTs: t.threadKey,
    firstMessageAt: t.firstMessageAt,
    lastMessageAt: t.lastMessageAt,
    messageCount: t.messageCount,
    participantCount: t.participantCount,
    totalCostCents: t.threadTotalCostCents,
  }));

  const sortBy = filter.sortBy ?? 'cost';
  const order = filter.order ?? 'desc';
  rows.sort((a, b) => {
    const diff = sortBy === 'cost' ? a.totalCostCents - b.totalCostCents : a.lastMessageAt - b.lastMessageAt;
    return order === 'asc' ? diff : -diff;
  });

  const total = rows.length;
  const limit = filter.limit ?? 50;
  const offset = filter.offset ?? 0;
  rows = rows.slice(offset, offset + limit);

  return { rows, total };
}

export interface ThreadDetailMessage {
  id: string;
  userId: string;
  displayName: string;
  wordCount: number;
  costCents: number;
  timestampMs: number;
  isThreadRoot: boolean;
}

export interface ThreadDetail {
  channelId: string;
  channelName: string;
  threadTs: string;
  totalCostCents: number;
  totalMinutes: number;
  messages: ThreadDetailMessage[];
  participants: { userId: string; displayName: string; costCents: number; minutes: number; messageCount: number }[];
}

export async function getThreadDetail(channelId: string, threadTs: string): Promise<ThreadDetail | null> {
  const [rawMessages, rateLookup, channel] = await Promise.all([
    prisma.message.findMany({
      where: {
        channelId,
        OR: [{ threadTs }, { threadTs: null, slackTs: threadTs }],
      },
      orderBy: { timestampMs: 'asc' },
      select: { id: true, userId: true, wordCount: true, timestampMs: true, isThreadRoot: true },
    }),
    buildRateLookup(),
    prisma.channel.findUnique({ where: { id: channelId }, select: { name: true } }),
  ]);

  if (rawMessages.length === 0) return null;

  const userIds = [...new Set(rawMessages.map((m) => m.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true },
  });
  const userName = new Map(users.map((u) => [u.id, u.displayName]));

  const messagesForCosting = rawMessages.map((m) => ({
    id: m.id,
    userId: m.userId,
    wordCount: m.wordCount,
    timestampMs: Number(m.timestampMs),
  }));
  const result = estimateThreadCost(messagesForCosting, rateLookup, timeEstimateConfig);

  const messages: ThreadDetailMessage[] = rawMessages.map((m) => {
    const minutes = estimateMessageMinutes(m.wordCount, timeEstimateConfig);
    const rate = rateLookup(m.userId, Number(m.timestampMs));
    const costCents = rate == null ? 0 : Math.round((minutes / 60) * rate);
    return {
      id: m.id,
      userId: m.userId,
      displayName: userName.get(m.userId) ?? m.userId,
      wordCount: m.wordCount,
      costCents,
      timestampMs: Number(m.timestampMs),
      isThreadRoot: m.isThreadRoot,
    };
  });

  return {
    channelId,
    channelName: channel?.name ?? channelId,
    threadTs,
    totalCostCents: result.threadTotalCostCents,
    totalMinutes: result.totalMinutes,
    messages,
    participants: result.participants.map((p) => ({
      userId: p.userId,
      displayName: userName.get(p.userId) ?? p.userId,
      costCents: p.costCents,
      minutes: p.minutes,
      messageCount: p.messageCount,
    })),
  };
}
