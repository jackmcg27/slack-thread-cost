import {
  Prisma,
  prisma,
  estimateMessageMinutes,
  estimateThreadCost,
  timeEstimateConfig,
  type MessageForCosting,
  type RateLookup,
  type ThreadCostResult,
} from '@slack-thread-cost/core';

export interface DateRangeFilter {
  from?: Date;
  to?: Date;
  channelId?: string;
}

interface MessageRow {
  id: string;
  channelId: string;
  threadTs: string | null;
  slackTs: string;
  userId: string;
  wordCount: number;
  timestampMs: bigint;
}

/** Fetches raw message metadata rows for a date-range/channel filter. */
export async function fetchMessages(filter: DateRangeFilter): Promise<MessageRow[]> {
  const where: Prisma.MessageWhereInput = {};

  if (filter.from || filter.to) {
    where.timestampMs = {};
    if (filter.from) where.timestampMs.gte = BigInt(filter.from.getTime());
    if (filter.to) where.timestampMs.lte = BigInt(filter.to.getTime());
  }
  if (filter.channelId) {
    where.channelId = filter.channelId;
  }

  return prisma.message.findMany({
    where,
    select: {
      id: true,
      channelId: true,
      threadTs: true,
      slackTs: true,
      userId: true,
      wordCount: true,
      timestampMs: true,
    },
  });
}

interface RatePeriod {
  hourlyRateCents: number;
  effectiveFrom: number;
  effectiveTo: number | null;
}

/**
 * Builds a (userId, timestampMs) -> hourlyRateCents lookup by resolving
 * each user's classification and picking the RateHistory row that was
 * active at that timestamp. Loads the whole (small) rate table once
 * rather than querying per message.
 */
export async function buildRateLookup(): Promise<RateLookup> {
  const users = await prisma.user.findMany({ select: { id: true, classificationId: true } });
  const userClassification = new Map(users.map((u) => [u.id, u.classificationId]));

  const rates = await prisma.rateHistory.findMany({
    select: { classificationId: true, hourlyRateCents: true, effectiveFrom: true, effectiveTo: true },
  });
  const byClassification = new Map<string, RatePeriod[]>();
  for (const r of rates) {
    const list = byClassification.get(r.classificationId) ?? [];
    list.push({
      hourlyRateCents: r.hourlyRateCents,
      effectiveFrom: r.effectiveFrom.getTime(),
      effectiveTo: r.effectiveTo ? r.effectiveTo.getTime() : null,
    });
    byClassification.set(r.classificationId, list);
  }

  return (userId: string, timestampMs: number) => {
    const classificationId = userClassification.get(userId);
    if (!classificationId) return null;
    const periods = byClassification.get(classificationId);
    if (!periods) return null;
    const period = periods.find(
      (p) => p.effectiveFrom <= timestampMs && (p.effectiveTo === null || timestampMs < p.effectiveTo)
    );
    return period ? period.hourlyRateCents : null;
  };
}

/** Per-message cost, independent of thread grouping (grouping only changes aggregation). */
export function computeMessageCostCents(
  message: { userId: string; wordCount: number; timestampMs: number },
  rateLookup: RateLookup
): number {
  const minutes = estimateMessageMinutes(message.wordCount, timeEstimateConfig);
  const rate = rateLookup(message.userId, message.timestampMs);
  return rate == null ? 0 : Math.round((minutes / 60) * rate);
}

export interface ThreadCostRow extends ThreadCostResult {
  channelId: string;
  /** threadTs if the message belongs to a thread, else the root message's own slackTs. */
  threadKey: string;
}

export interface ChannelAgg {
  channelId: string;
  costCents: number;
  messageCount: number;
  threadCount: number;
}

export interface UserAgg {
  userId: string;
  costCents: number;
  messageCount: number;
  threadCount: number;
}

export interface CostBreakdown {
  threads: ThreadCostRow[];
  byChannel: Map<string, ChannelAgg>;
  byUser: Map<string, UserAgg>;
  totalCostCents: number;
  totalMessages: number;
}

/**
 * "Thread" is a query-time grouping, not a stored entity: all messages
 * sharing (channelId, threadTs ?? own slackTs). Groups the given
 * messages into threads, costs each one, and rolls the results up by
 * channel and by user in a single pass.
 */
export function computeCostBreakdown(messages: MessageRow[], rateLookup: RateLookup): CostBreakdown {
  const groups = new Map<string, { channelId: string; threadKey: string; messages: MessageForCosting[] }>();

  for (const m of messages) {
    const threadKey = m.threadTs ?? m.slackTs;
    const groupKey = `${m.channelId}::${threadKey}`;
    let group = groups.get(groupKey);
    if (!group) {
      group = { channelId: m.channelId, threadKey, messages: [] };
      groups.set(groupKey, group);
    }
    group.messages.push({
      id: m.id,
      userId: m.userId,
      wordCount: m.wordCount,
      timestampMs: Number(m.timestampMs),
    });
  }

  const threads: ThreadCostRow[] = [];
  const byChannel = new Map<string, ChannelAgg>();
  const byUser = new Map<string, UserAgg>();
  let totalCostCents = 0;

  for (const group of groups.values()) {
    const result = estimateThreadCost(group.messages, rateLookup, timeEstimateConfig);
    threads.push({ ...result, channelId: group.channelId, threadKey: group.threadKey });
    totalCostCents += result.threadTotalCostCents;

    const channelAgg = byChannel.get(group.channelId) ?? {
      channelId: group.channelId,
      costCents: 0,
      messageCount: 0,
      threadCount: 0,
    };
    channelAgg.costCents += result.threadTotalCostCents;
    channelAgg.messageCount += result.messageCount;
    channelAgg.threadCount += 1;
    byChannel.set(group.channelId, channelAgg);

    for (const p of result.participants) {
      const userAgg = byUser.get(p.userId) ?? {
        userId: p.userId,
        costCents: 0,
        messageCount: 0,
        threadCount: 0,
      };
      userAgg.costCents += p.costCents;
      userAgg.messageCount += p.messageCount;
      userAgg.threadCount += 1;
      byUser.set(p.userId, userAgg);
    }
  }

  return { threads, byChannel, byUser, totalCostCents, totalMessages: messages.length };
}
