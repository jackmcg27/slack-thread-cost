export interface TimeEstimateConfig {
  baseOverheadMinutes: number;
  wordsPerMinuteComposing: number;
  minMessageMinutes: number;
  maxMessageMinutes: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Estimated minutes a single message "cost" its author: a fixed
 * context-switch overhead (opening Slack, reading, engaging) plus a
 * composition-time term proportional to word count, clamped so an
 * outlier message (e.g. a giant pasted log) can't dominate a thread's
 * total cost.
 */
export function estimateMessageMinutes(wordCount: number, config: TimeEstimateConfig): number {
  const raw = config.baseOverheadMinutes + wordCount / config.wordsPerMinuteComposing;
  return clamp(raw, config.minMessageMinutes, config.maxMessageMinutes);
}
