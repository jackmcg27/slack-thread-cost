import { Env } from '../config/env';
import { StaffClassificationProvider } from './StaffClassificationProvider';
import { ManualMappingProvider } from './ManualMappingProvider';
import { DenodoProvider } from './DenodoProvider';

/**
 * Single switch point for which classification backend is active.
 * Adding a future direct-Workday provider means writing that class and
 * adding one case here — nothing else in the bot or dashboard changes.
 */
export function getClassificationProvider(env: Env): StaffClassificationProvider {
  switch (env.CLASSIFICATION_PROVIDER) {
    case 'manual':
      if (!env.CLASSIFICATION_MAPPING_FILE) {
        throw new Error(
          'CLASSIFICATION_PROVIDER=manual requires CLASSIFICATION_MAPPING_FILE to be set.'
        );
      }
      return new ManualMappingProvider({
        filePath: env.CLASSIFICATION_MAPPING_FILE,
        keyedBy: 'slackUserId',
        defaultCode: env.DEFAULT_CLASSIFICATION_CODE || undefined,
      });

    case 'denodo':
      return new DenodoProvider({
        baseUrl: env.DENODO_BASE_URL ?? '',
        authType: env.DENODO_AUTH_TYPE,
        username: env.DENODO_USERNAME,
        password: env.DENODO_PASSWORD,
        token: env.DENODO_TOKEN,
        viewName: env.DENODO_VIEW_NAME ?? '',
        lookupColumn: env.DENODO_LOOKUP_COLUMN,
        classificationColumn: env.DENODO_CLASSIFICATION_COLUMN ?? '',
        timeoutMs: env.DENODO_TIMEOUT_MS,
      });

    default:
      throw new Error(`Unknown CLASSIFICATION_PROVIDER: ${env.CLASSIFICATION_PROVIDER}`);
  }
}
