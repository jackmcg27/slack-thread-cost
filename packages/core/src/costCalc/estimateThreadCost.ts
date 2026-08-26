import { estimateMessageMinutes, TimeEstimateConfig } from './estimateMessageMinutes';
import { MessageForCosting, ParticipantCost, RateLookup, ThreadCostResult } from './types';

/**
 * Groups a thread's messages by author, estimates time spent per message,
 * and converts to cost using whatever hourly rate was in effect for that
 * author at the time each message was sent. Pure function — no DB access
 * — so it can be reused identically by the bot (if ever needed) and the
 * dashboard's read-time queries.
 */
export function estimateThreadCost(
  messages: MessageForCosting[],
  rateLookup: RateLookup,
  config: TimeEstimateConfig
): ThreadCostResult {
  if (messages.length === 0) {
    return {
      threadTotalCostCents: 0,
      totalMinutes: 0,
      messageCount: 0,
      participantCount: 0,
      firstMessageAt: 0,
      lastMessageAt: 0,
      participants: [],
      unratedUserIds: [],
    };
  }

  const byUser = new Map<string, ParticipantCost>();
  const unratedUserIds = new Set<string>();
  let totalMinutes = 0;
  let threadTotalCostCents = 0;
  let firstMessageAt = messages[0].timestampMs;
  let lastMessageAt = messages[0].timestampMs;

  for (const message of messages) {
    firstMessageAt = Math.min(firstMessageAt, message.timestampMs);
    lastMessageAt = Math.max(lastMessageAt, message.timestampMs);

    const minutes = estimateMessageMinutes(message.wordCount, config);
    totalMinutes += minutes;

    const hourlyRateCents = rateLookup(message.userId, message.timestampMs);
    const costCents = hourlyRateCents == null ? 0 : Math.round((minutes / 60) * hourlyRateCents);
    if (hourlyRateCents == null) unratedUserIds.add(message.userId);
    threadTotalCostCents += costCents;

    const existing = byUser.get(message.userId);
    if (existing) {
      existing.minutes += minutes;
      existing.costCents += costCents;
      existing.messageCount += 1;
    } else {
      byUser.set(message.userId, {
        userId: message.userId,
        minutes,
        costCents,
        messageCount: 1,
      });
    }
  }

  return {
    threadTotalCostCents,
    totalMinutes,
    messageCount: messages.length,
    participantCount: byUser.size,
    firstMessageAt,
    lastMessageAt,
    participants: Array.from(byUser.values()).sort((a, b) => b.costCents - a.costCents),
    unratedUserIds: Array.from(unratedUserIds),
  };
}
