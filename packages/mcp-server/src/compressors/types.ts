/**
 * Compressor Types
 *
 * Shared type definitions for context compressors.
 */

export type ContentType = "logs" | "stacktrace" | "config" | "code" | "generic";

export type DetailLevel = "minimal" | "normal" | "detailed";

export interface CompressOptions {
  /** Target compression ratio (0.1 = 10% of original) */
  targetRatio?: number;
  /** Patterns to preserve (will not be compressed) */
  preservePatterns?: RegExp[];
  /** Level of detail in output */
  detail: DetailLevel;
}

export interface CompressedResult {
  /** Compressed content */
  compressed: string;
  /** Compression statistics */
  stats: CompressionStats;
  /** Description of omitted information */
  omittedInfo?: string;
}

export interface CompressionStats {
  /** Number of lines in original content */
  originalLines: number;
  /** Number of lines after compression */
  compressedLines: number;
  /** Token count of original content */
  originalTokens: number;
  /** Token count after compression */
  compressedTokens: number;
  /** Percentage of tokens saved */
  reductionPercent: number;
  /** Technique used for compression */
  technique: string;
}

export interface Compressor {
  /** Compressor name */
  name: string;
  /** Content types this compressor can handle */
  supportedTypes: ContentType[];
  /** Check if this compressor can handle the content */
  canCompress(content: string): boolean;
  /** Compress the content */
  compress(content: string, options: CompressOptions): CompressedResult;
}

/**
 * Line group for deduplication
 */
export interface LineGroup {
  /** Normalized pattern for matching */
  pattern: string;
  /** First occurrence of this pattern */
  sample: string;
  /** All lines matching this pattern */
  lines: string[];
  /** Number of occurrences */
  count: number;
  /** Whether this group contains errors */
  hasError: boolean;
  /** Whether this group contains warnings */
  hasWarning: boolean;
}
