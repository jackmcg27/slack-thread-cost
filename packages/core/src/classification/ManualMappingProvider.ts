import { readFile } from 'node:fs/promises';
import {
  ClassificationLookupInput,
  ClassificationResult,
  StaffClassificationProvider,
} from './StaffClassificationProvider';

export interface ManualMappingProviderConfig {
  filePath: string;
  keyedBy: 'slackUserId' | 'email';
  defaultCode?: string;
}

const SOURCE = 'manual';

/**
 * Default classification provider: a CSV of `key,classification_code`
 * rows loaded into memory. Re-read on every init()/refresh() call — the
 * whole workflow for updating a mapping is "edit the CSV, re-run sync,"
 * no file-watching or hot-reload machinery needed for this data size.
 */
export class ManualMappingProvider extends StaffClassificationProvider {
  private mapping = new Map<string, string>();

  constructor(private readonly config: ManualMappingProviderConfig) {
    super();
  }

  async init(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const raw = await readFile(this.config.filePath, 'utf-8');
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const mapping = new Map<string, string>();
    // First non-empty line is a header (key column, classification_code);
    // skip it rather than assuming a fixed literal header string.
    for (const line of lines.slice(1)) {
      const [key, code] = line.split(',').map((part) => part.trim());
      if (!key || !code) continue;
      mapping.set(this.normalizeKey(key), code);
    }

    this.mapping = mapping;
  }

  async getClassification(
    input: ClassificationLookupInput
  ): Promise<ClassificationResult | null> {
    const key = this.config.keyedBy === 'email' ? input.email : input.slackUserId;
    if (!key) return this.fallback();

    const code = this.mapping.get(this.normalizeKey(key));
    if (!code) return this.fallback();

    return { classificationCode: code, source: SOURCE };
  }

  async getAllMappings(): Promise<Map<string, string>> {
    return new Map(this.mapping);
  }

  private fallback(): ClassificationResult | null {
    return this.config.defaultCode
      ? { classificationCode: this.config.defaultCode, source: SOURCE }
      : null;
  }

  private normalizeKey(key: string): string {
    return this.config.keyedBy === 'email' ? key.toLowerCase() : key;
  }
}
