import { prisma } from '@slack-thread-cost/core';
import { buildRateLookup, computeCostBreakdown, DateRangeFilter, fetchMessages } from '../costEngine';

export interface SummaryResult {
  totalCostCents: number;
  totalMessages: number;
  totalThreads: number;
  topChannel: { channelId: string; name: string; costCents: number } | null;
  topPerson: { userId: string; name: string; costCents: number } | null;
}

export async function getSummary(filter: DateRangeFilter): Promise<SummaryResult> {
  const [messages, rateLookup] = await Promise.all([fetchMessages(filter), buildRateLookup()]);
  const breakdown = computeCostBreakdown(messages, rateLookup);

  const [channels, users] = await Promise.all([
    prisma.channel.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ select: { id: true, displayName: true } }),
  ]);
  const channelName = new Map(channels.map((c) => [c.id, c.name]));
  const userName = new Map(users.map((u) => [u.id, u.displayName]));

  const topChannelEntry = [...breakdown.byChannel.values()].sort((a, b) => b.costCents - a.costCents)[0];
  const topPersonEntry = [...breakdown.byUser.values()].sort((a, b) => b.costCents - a.costCents)[0];

  return {
    totalCostCents: breakdown.totalCostCents,
    totalMessages: breakdown.totalMessages,
    totalThreads: breakdown.threads.length,
    topChannel: topChannelEntry
      ? {
          channelId: topChannelEntry.channelId,
          name: channelName.get(topChannelEntry.channelId) ?? topChannelEntry.channelId,
          costCents: topChannelEntry.costCents,
        }
      : null,
    topPerson: topPersonEntry
      ? {
          userId: topPersonEntry.userId,
          name: userName.get(topPersonEntry.userId) ?? topPersonEntry.userId,
          costCents: topPersonEntry.costCents,
        }
      : null,
  };
}
