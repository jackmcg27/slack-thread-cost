import { prisma } from '@slack-thread-cost/core';
import { buildRateLookup, computeCostBreakdown, DateRangeFilter, fetchMessages } from '../costEngine';

export interface PersonRow {
  userId: string;
  displayName: string;
  classificationLabel: string;
  totalCostCents: number;
  messageCount: number;
  threadCount: number;
}

export async function getPeople(filter: DateRangeFilter): Promise<PersonRow[]> {
  const [messages, rateLookup, users] = await Promise.all([
    fetchMessages(filter),
    buildRateLookup(),
    prisma.user.findMany({
      select: { id: true, displayName: true, classification: { select: { label: true } } },
    }),
  ]);
  const userInfo = new Map(
    users.map((u) => [u.id, { displayName: u.displayName, classificationLabel: u.classification?.label ?? 'Unclassified' }])
  );

  const breakdown = computeCostBreakdown(messages, rateLookup);

  return [...breakdown.byUser.values()]
    .map((u) => ({
      userId: u.userId,
      displayName: userInfo.get(u.userId)?.displayName ?? u.userId,
      classificationLabel: userInfo.get(u.userId)?.classificationLabel ?? 'Unclassified',
      totalCostCents: u.costCents,
      messageCount: u.messageCount,
      threadCount: u.threadCount,
    }))
    .sort((a, b) => b.totalCostCents - a.totalCostCents);
}
