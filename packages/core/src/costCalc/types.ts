export interface MessageForCosting {
  id: string;
  userId: string;
  wordCount: number;
  timestampMs: number;
}

/** A rate lookup resolves (userId, timestampMs) -> the cents/hour that was in effect at that time. */
export type RateLookup = (userId: string, timestampMs: number) => number | null;

export interface ParticipantCost {
  userId: string;
  minutes: number;
  costCents: number;
  messageCount: number;
}

export interface ThreadCostResult {
  threadTotalCostCents: number;
  totalMinutes: number;
  messageCount: number;
  participantCount: number;
  firstMessageAt: number;
  lastMessageAt: number;
  participants: ParticipantCost[];
  /** userIds whose messages couldn't be costed because no rate was found (unclassified user). */
  unratedUserIds: string[];
}
