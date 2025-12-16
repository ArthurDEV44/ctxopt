/**
 * Build Output Parser Types
 *
 * Common types for parsing build tool outputs.
 */

export type BuildTool = "tsc" | "eslint" | "webpack" | "vite" | "esbuild" | "rust" | "go" | "generic";

export type Severity = "error" | "warning" | "info";

export interface ParsedError {
  /** Unique signature for grouping (e.g., "TS2304:Cannot find name") */
  signature: string;
  /** Error code (e.g., "TS2304", "E0433") */
  code: string;
  /** Error message */
  message: string;
  /** Source file path */
  file: string;
  /** Line number */
  line: number;
  /** Column number */
  column: number;
  /** Error severity */
  severity: Severity;
  /** Original raw line from output */
  raw: string;
  /** Additional context (surrounding lines, suggestions) */
  context?: string;
}

export interface ErrorGroup {
  /** Unique signature */
  signature: string;
  /** Error code */
  code: string;
  /** Canonical error message */
  message: string;
  /** Severity */
  severity: Severity;
  /** Total occurrences */
  count: number;
  /** First occurrence */
  firstOccurrence: {
    file: string;
    line: number;
    column: number;
  };
  /** All affected files */
  affectedFiles: string[];
  /** Sample of raw errors (max 3) */
  samples: string[];
  /** Suggested fix if available */
  suggestion?: string;
}

export interface BuildAnalysisResult {
  /** Detected build tool */
  buildTool: BuildTool;
  /** Whether the build succeeded */
  success: boolean;
  /** Compressed summary */
  summary: string;
  /** Statistics */
  stats: {
    totalErrors: number;
    totalWarnings: number;
    uniqueErrorTypes: number;
    uniqueWarningTypes: number;
    tokensOriginal: number;
    tokensCompressed: number;
    reductionPercent: number;
  };
  /** Grouped errors */
  errorGroups: ErrorGroup[];
  /** Grouped warnings */
  warningGroups: ErrorGroup[];
}

export interface BuildParser {
  /** Name of the parser */
  name: string;
  /** Supported build tools */
  supportedTools: BuildTool[];
  /** Check if this parser can handle the output */
  canParse(output: string): boolean;
  /** Parse the output and extract errors */
  parse(output: string): ParsedError[];
}
