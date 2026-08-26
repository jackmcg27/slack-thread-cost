import { prisma } from '@slack-thread-cost/core';
import {
  buildRateLookup,
  computeCostBreakdown,
  computeMessageCostCents,
  DateRangeFilter,
  fetchMessages,
} from '../costEngine';

export interface ChannelRow {
  channelId: string;
  name: string;
  totalCostCents: number;
  messageCount: number;
  threadCount: number;
  trend: { date: string; costCents: number }[];
}

function dayKey(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

export async function getChannels(filter: DateRangeFilter): Promise<ChannelRow[]> {
  const [messages, rateLookup, channels] = await Promise.all([
    fetchMessages(filter),
    buildRateLookup(),
    prisma.channel.findMany({ select: { id: true, name: true } }),
  ]);
  const channelName = new Map(channels.map((c) => [c.id, c.name]));

  const breakdown = computeCostBreakdown(messages, rateLookup);

  // Trend uses per-message cost (independent of thread grouping) bucketed
  // by day, so it lines up exactly with the thread-grouped totals above.
  const trendByChannel = new Map<string, Map<string, number>>();
  for (const m of messages) {
    const costCents = computeMessageCostCents(
      { userId: m.userId, wordCount: m.wordCount, timestampMs: Number(m.timestampMs) },
      rateLookup
    );
    const day = dayKey(Number(m.timestampMs));
    const dayMap = trendByChannel.get(m.channelId) ?? new Map<string, number>();
    dayMap.set(day, (dayMap.get(day) ?? 0) + costCents);
    trendByChannel.set(m.channelId, dayMap);
  }

  return [...breakdown.byChannel.values()]
    .map((c) => ({
      channelId: c.channelId,
      name: channelName.get(c.channelId) ?? c.channelId,
      totalCostCents: c.costCents,
      messageCount: c.messageCount,
      threadCount: c.threadCount,
      trend: [...(trendByChannel.get(c.channelId) ?? new Map())]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, costCents]) => ({ date, costCents })),
    }))
    .sort((a, b) => b.totalCostCents - a.totalCostCents);
}
