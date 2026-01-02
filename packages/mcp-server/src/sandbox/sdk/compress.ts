/**
 * SDK Compress Functions
 *
 * Wraps compression functionality for sandbox use.
 * Returns Result types for type-safe error handling.
 */

import { Result, ok, err } from "neverthrow";
import { compressContent, analyzeContent, semanticCompressor } from "../../compressors/index.js";
import { getSummarizer } from "../../summarizers/index.js";
import { countTokens } from "../../utils/token-counter.js";
import type { CompressResult, LogSummary } from "../types.js";
import { CompressError, compressError } from "../errors.js";

/**
 * Auto-detect content type and apply optimal compression
 */
export function compressAuto(content: string, hint?: string): CompressResult {
  const analysis = analyzeContent(content);
  const contentType = hint || analysis.detectedType;

  const result = compressContent(content, {
    contentType: contentType as "logs" | "stacktrace" | "config" | "generic",
  });

  const originalTokens = countTokens(content);
  const compressedTokens = countTokens(result.compressed);

  return {
    compressed: result.compressed,
    stats: {
      original: originalTokens,
      compressed: compressedTokens,
      reductionPercent: Math.round((1 - compressedTokens / originalTokens) * 100),
    },
  };
}

/**
 * Auto-detect content type and apply optimal compression with Result type
 */
export function compressAutoResult(
  content: string,
  hint?: string
): Result<CompressResult, CompressError> {
  try {
    return ok(compressAuto(content, hint));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(compressError.failed(hint || "auto", message));
  }
}

/**
 * Summarize log output
 */
export function compressLogs(logs: string): LogSummary {
  const summarizer = getSummarizer(logs);
  const result = summarizer.summarize(logs, { detail: "normal" });

  return {
    summary: result.overview,
    stats: {
      totalLines: logs.split("\n").length,
      errorCount: result.errors?.length || 0,
      warningCount: result.warnings?.length || 0,
    },
  };
}

/**
 * Summarize log output with Result type
 */
export function compressLogsResult(logs: string): Result<LogSummary, CompressError> {
  try {
    return ok(compressLogs(logs));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(compressError.failed("logs", message));
  }
}

/**
 * Compress git diff output
 */
export function compressDiff(diff: string): CompressResult {
  // Extract key changes from diff
  const lines = diff.split("\n");
  const importantLines: string[] = [];

  let addedCount = 0;
  let removedCount = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      const match = line.match(/diff --git a\/(.*) b\/(.*)/);
      if (match) {
        importantLines.push(`\n## ${match[2]}`);
      }
    } else if (line.startsWith("@@")) {
      importantLines.push(line);
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      addedCount++;
      if (line.trim().length > 1) {
        importantLines.push(line);
      }
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      removedCount++;
      if (line.trim().length > 1) {
        importantLines.push(line);
      }
    }
  }

  const header = `[diff] +${addedCount}/-${removedCount} lines`;
  const compressed = [header, ...importantLines].join("\n");

  const originalTokens = countTokens(diff);
  const compressedTokens = countTokens(compressed);

  return {
    compressed,
    stats: {
      original: originalTokens,
      compressed: compressedTokens,
      reductionPercent: Math.round((1 - compressedTokens / originalTokens) * 100),
    },
  };
}

/**
 * Compress git diff output with Result type
 */
export function compressDiffResult(diff: string): Result<CompressResult, CompressError> {
  try {
    return ok(compressDiff(diff));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(compressError.failed("diff", message));
  }
}

/**
 * TF-IDF based semantic compression
 */
export function compressSemantic(content: string, ratio: number = 0.5): CompressResult {
  // Validate ratio
  if (ratio <= 0 || ratio > 1) {
    throw new Error(`Invalid compression ratio: ${ratio} (must be between 0 and 1)`);
  }

  const result = semanticCompressor.compress(content, {
    targetRatio: ratio,
    detail: "normal",
  });

  const originalTokens = countTokens(content);
  const compressedTokens = countTokens(result.compressed);

  return {
    compressed: result.compressed,
    stats: {
      original: originalTokens,
      compressed: compressedTokens,
      reductionPercent: Math.round((1 - compressedTokens / originalTokens) * 100),
    },
  };
}

/**
 * TF-IDF based semantic compression with Result type
 */
export function compressSemanticResult(
  content: string,
  ratio: number = 0.5
): Result<CompressResult, CompressError> {
  // Validate ratio
  if (ratio <= 0 || ratio > 1) {
    return err(compressError.invalidRatio(ratio));
  }

  try {
    return ok(compressSemantic(content, ratio));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(compressError.failed("semantic", message));
  }
}
