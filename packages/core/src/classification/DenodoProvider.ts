import {
  ClassificationLookupInput,
  ClassificationResult,
  StaffClassificationProvider,
} from './StaffClassificationProvider';

export interface DenodoProviderConfig {
  baseUrl: string;
  authType: 'basic' | 'token';
  username?: string;
  password?: string;
  token?: string;
  /** Name of the Denodo view exposing the Workday-sourced staff data. */
  viewName: string;
  lookupColumn: 'email' | 'slack_user_id';
  classificationColumn: string;
  timeoutMs: number;
}

const SOURCE = 'denodo';

/**
 * Stub adapter for pulling staff classification from a Denodo view
 * (expected to expose Workday-sourced data). NOT functional yet — access
 * and the real view/column names aren't confirmed. init() only validates
 * config completeness so a misconfiguration fails fast and loudly at
 * startup rather than silently as a runtime 404. getClassification()
 * degrades to "unmapped" (null) instead of throwing, so the rest of the
 * system (userSync, dashboard) keeps working with unclassified users
 * while this is filled in.
 *
 * TODO(denodo): once credentials + schema are confirmed, implement the
 * actual lookup — most likely a GET against Denodo's REST/OData endpoint,
 * e.g.:
 *   GET {baseUrl}/server/{viewName}/views/{viewName}?$filter={lookupColumn} eq '{value}'
 * expected to return JSON shaped like:
 *   { "elements": [ { [classificationColumn]: "L3", ... } ] }
 * Adjust the query/parsing once the real Denodo response shape is known.
 */
export class DenodoProvider extends StaffClassificationProvider {
  constructor(private readonly config: DenodoProviderConfig) {
    super();
  }

  async init(): Promise<void> {
    const required: Array<[string, unknown]> = [
      ['DENODO_BASE_URL', this.config.baseUrl],
      ['DENODO_VIEW_NAME', this.config.viewName],
      ['DENODO_CLASSIFICATION_COLUMN', this.config.classificationColumn],
    ];
    if (this.config.authType === 'basic') {
      required.push(['DENODO_USERNAME', this.config.username], ['DENODO_PASSWORD', this.config.password]);
    } else {
      required.push(['DENODO_TOKEN', this.config.token]);
    }

    const missing = required.filter(([, value]) => !value).map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `DenodoProvider is missing required config: ${missing.join(', ')}. ` +
          'Set these env vars, or switch CLASSIFICATION_PROVIDER=manual until Denodo access is confirmed.'
      );
    }

    console.warn(
      '[DenodoProvider] Config is present but the query implementation is a stub — ' +
        'getClassification() currently returns null for every lookup. See DenodoProvider.ts TODO.'
    );
  }

  async getClassification(
    _input: ClassificationLookupInput
  ): Promise<ClassificationResult | null> {
    void _input;
    // Not implemented yet — see class-level TODO. Returning null keeps
    // callers (userSync) degrading gracefully to "unclassified" rather
    // than crashing.
    return null;
  }
}

export const DENODO_SOURCE = SOURCE;
