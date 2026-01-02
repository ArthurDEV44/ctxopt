/**
 * Fluent Pipeline Builder Types
 *
 * Type definitions for the immutable, chainable pipeline API.
 * Provides full TypeScript inference through the chain.
 */

import type { Result, ResultAsync } from "neverthrow";
import type { SupportedLanguage } from "../../ast/types.js";
import type { FileStructure, CompressResult, HostCallbacks } from "../types.js";

// ============================================================================
// Pipeline Error Types
// ============================================================================

export type PipelineErrorCode =
  | "GLOB_ERROR"
  | "READ_ERROR"
  | "PARSE_ERROR"
  | "COMPRESS_ERROR"
  | "FILTER_ERROR"
  | "MAP_ERROR"
  | "STEP_ERROR"
  | "EMPTY_PIPELINE";

export interface PipelineError {
  code: PipelineErrorCode;
  step: number;
  stepType: string;
  message: string;
  cause?: unknown;
}

/** Helper functions to create PipelineError instances */
export const pipelineError = {
  glob: (step: number, pattern: string, cause: unknown): PipelineError => ({
    code: "GLOB_ERROR",
    step,
    stepType: "glob",
    message: `Glob failed for pattern '${pattern}'`,
    cause,
  }),

  read: (step: number, path: string, cause: unknown): PipelineError => ({
    code: "READ_ERROR",
    step,
    stepType: "read",
    message: `Failed to read file '${path}'`,
    cause,
  }),

  parse: (step: number, file: string, cause: unknown): PipelineError => ({
    code: "PARSE_ERROR",
    step,
    stepType: "parse",
    message: `Parse failed for '${file}'`,
    cause,
  }),

  compress: (step: number, cause: unknown): PipelineError => ({
    code: "COMPRESS_ERROR",
    step,
    stepType: "compress",
    message: "Compression failed",
    cause,
  }),

  filter: (step: number, cause: unknown): PipelineError => ({
    code: "FILTER_ERROR",
    step,
    stepType: "filter",
    message: "Filter predicate threw an error",
    cause,
  }),

  map: (step: number, cause: unknown): PipelineError => ({
    code: "MAP_ERROR",
    step,
    stepType: "map",
    message: "Map function threw an error",
    cause,
  }),

  step: (step: number, stepType: string, message: string): PipelineError => ({
    code: "STEP_ERROR",
    step,
    stepType,
    message,
  }),

  empty: (): PipelineError => ({
    code: "EMPTY_PIPELINE",
    step: 0,
    stepType: "build",
    message: "Pipeline has no steps to execute",
  }),
};

/** Type guard for PipelineError */
export function isPipelineError(error: unknown): error is PipelineError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "step" in error &&
    "stepType" in error
  );
}

// ============================================================================
// File Content Types
// ============================================================================

export interface FileContent {
  path: string;
  content: string;
}

export interface ParsedFile {
  path: string;
  content: string;
  structure: FileStructure;
}

// ============================================================================
// Compress Options
// ============================================================================

export type CompressMode = "auto" | "semantic" | "logs" | "diff";

export interface CompressOptions {
  mode?: CompressMode;
  ratio?: number; // For semantic compression (0.0 - 1.0)
}

// ============================================================================
// Pipeline Step Definitions (Internal)
// ============================================================================

export type PipelineStepDef =
  | { type: "glob"; pattern: string }
  | { type: "exclude"; pattern: string | RegExp }
  | { type: "read" }
  | { type: "parse"; language?: SupportedLanguage }
  | { type: "filter"; predicate: (item: unknown) => boolean }
  | { type: "map"; fn: (item: unknown) => unknown }
  | { type: "flatMap"; fn: (item: unknown) => unknown[] }
  | { type: "take"; count: number }
  | { type: "skip"; count: number }
  | { type: "sort"; compareFn?: (a: unknown, b: unknown) => number }
  | { type: "unique"; keyFn?: (item: unknown) => unknown }
  | { type: "compress"; options: CompressOptions }
  | { type: "tap"; fn: (items: unknown) => void }
  | { type: "recover"; fn: (error: PipelineError) => unknown };

// ============================================================================
// Pipeline Execution Stats
// ============================================================================

export interface PipelineStats {
  stepsExecuted: number;
  itemsProcessed: number;
  executionTimeMs: number;
  errors: PipelineError[];
}

export interface PipelineBuildResult<T> {
  data: T;
  stats: PipelineStats;
}

// ============================================================================
// Pipeline Context (Internal)
// ============================================================================

export interface PipelineContext {
  workingDir: string;
  callbacks: HostCallbacks;
}

// ============================================================================
// Fluent Builder Interface
// ============================================================================

/**
 * Immutable pipeline builder with full TypeScript type inference.
 * Each method returns a NEW builder instance with updated type parameter.
 */
export interface PipelineBuilder<T = void> {
  // --- Source Operations (start the pipeline) ---

  /**
   * Start pipeline with file glob pattern.
   * @example pipe.glob("src/**\/*.ts")
   */
  glob(pattern: string): PipelineBuilder<string[]>;

  // --- Transform Operations (work on current data) ---

  /**
   * Exclude files matching pattern.
   * Only valid after glob().
   */
  exclude(pattern: string | RegExp): PipelineBuilder<T>;

  /**
   * Read file contents. Transforms string[] to FileContent[].
   * Only valid after glob().
   */
  read(): T extends string[] ? PipelineBuilder<FileContent[]> : never;

  /**
   * Parse files to AST structure. Transforms FileContent[] to ParsedFile[].
   * Auto-detects language from file extension if not specified.
   */
  parse(language?: SupportedLanguage): T extends FileContent[]
    ? PipelineBuilder<ParsedFile[]>
    : never;

  /**
   * Filter items using predicate function.
   */
  filter<S extends T extends (infer U)[] ? U : never>(
    predicate: (item: S) => boolean
  ): PipelineBuilder<T>;

  /**
   * Transform each item using mapping function.
   */
  map<U>(fn: (item: T extends (infer I)[] ? I : T) => U): PipelineBuilder<U[]>;

  /**
   * Transform each item and flatten results.
   */
  flatMap<U>(fn: (item: T extends (infer I)[] ? I : T) => U[]): PipelineBuilder<U[]>;

  /**
   * Take first N items.
   */
  take(count: number): PipelineBuilder<T>;

  /**
   * Skip first N items.
   */
  skip(count: number): PipelineBuilder<T>;

  /**
   * Sort items using optional compare function.
   */
  sort(
    compareFn?: (a: T extends (infer U)[] ? U : T, b: T extends (infer U)[] ? U : T) => number
  ): PipelineBuilder<T>;

  /**
   * Remove duplicate items using optional key function.
   */
  unique(keyFn?: (item: T extends (infer U)[] ? U : T) => unknown): PipelineBuilder<T>;

  // --- Terminal Operations ---

  /**
   * Compress the pipeline output.
   */
  compress(options?: CompressOptions): PipelineBuilder<CompressResult>;

  /**
   * Execute side effect without modifying pipeline data.
   * Useful for debugging/logging.
   */
  tap(fn: (items: T) => void): PipelineBuilder<T>;

  /**
   * Recover from errors by providing fallback data.
   */
  recover(fn: (error: PipelineError) => T): PipelineBuilder<T>;

  // --- Build Methods ---

  /**
   * Execute pipeline synchronously and return Result.
   */
  build(): Result<PipelineBuildResult<T>, PipelineError>;

  /**
   * Execute pipeline asynchronously and return ResultAsync.
   * Useful for large file operations.
   */
  buildAsync(): ResultAsync<PipelineBuildResult<T>, PipelineError>;

  /**
   * Get the pipeline steps for inspection/debugging.
   */
  getSteps(): readonly PipelineStepDef[];
}

// ============================================================================
// Preset Result Types
// ============================================================================

export interface DeadCodeResult {
  files: Array<{
    path: string;
    unusedExports: string[];
    privateUnused: string[];
  }>;
  totalUnused: number;
}

export interface SignatureResult {
  functions: Array<{
    file: string;
    name: string;
    signature: string;
    isExported: boolean;
  }>;
  totalCount: number;
}

// ============================================================================
// Pipeline Presets Interface
// ============================================================================

/**
 * Common preset pipeline operations.
 */
export interface PipelinePresets {
  /**
   * Get codebase overview with file statistics.
   */
  codebaseOverview(dir?: string): Result<import("../types.js").CodebaseOverview, PipelineError>;

  /**
   * Find all usages of a symbol across codebase.
   */
  findUsages(
    symbol: string,
    glob?: string
  ): Result<import("../types.js").SymbolUsage, PipelineError>;

  /**
   * Analyze import dependencies for a file.
   */
  analyzeDeps(
    file: string,
    depth?: number
  ): Result<import("../types.js").DependencyAnalysis, PipelineError>;

  /**
   * Find potentially dead code (unexported, unreferenced).
   */
  findDeadCode(glob?: string): Result<DeadCodeResult, PipelineError>;

  /**
   * Get function signatures across codebase.
   */
  getAllSignatures(glob?: string): Result<SignatureResult, PipelineError>;
}

// ============================================================================
// Pipeline Factory Interface
// ============================================================================

/**
 * Entry point for creating pipelines.
 */
export interface PipelineFactory {
  /**
   * Create a new empty pipeline builder.
   */
  create(): PipelineBuilder<void>;

  /**
   * Create pipeline starting with glob pattern.
   */
  from(pattern: string): PipelineBuilder<string[]>;

  /**
   * Create pipeline from existing data.
   * Uses const type parameter to preserve literal types.
   *
   * @example
   * // T is inferred as readonly ["a", "b", "c"]
   * pipe.fromData(["a", "b", "c"] as const)
   */
  fromData<const T>(data: readonly T[]): PipelineBuilder<T[]>;

  /**
   * Access preset pipelines.
   */
  presets: PipelinePresets;
}
