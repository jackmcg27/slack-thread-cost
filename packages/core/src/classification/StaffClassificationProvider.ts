export interface ClassificationLookupInput {
  slackUserId: string;
  email?: string;
}

export interface ClassificationResult {
  classificationCode: string;
  /** Where this mapping came from: "manual" | "denodo" | "workday" | ... */
  source: string;
}

/**
 * Pluggable source of "which staff classification does this person belong
 * to". Implementations must never throw for an unmapped person — return
 * null so callers can flag the user as unclassified instead of crashing
 * ingestion or sync.
 */
export abstract class StaffClassificationProvider {
  abstract init(): Promise<void>;

  abstract getClassification(
    input: ClassificationLookupInput
  ): Promise<ClassificationResult | null>;

  /**
   * Optional bulk fetch for providers whose backing store supports a full
   * dump cheaply (e.g. the manual CSV). Callers should fall back to
   * per-user getClassification() calls when this isn't implemented.
   */
  getAllMappings?(): Promise<Map<string, string>>;
}
