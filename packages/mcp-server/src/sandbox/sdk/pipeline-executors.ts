/**
 * Pipeline Step Executors
 *
 * Functions to execute each type of pipeline step.
 */

import { Result, ok, err } from "neverthrow";
import * as path from "node:path";
import type {
  PipelineStepDef,
  PipelineContext,
  PipelineError,
  FileContent,
  ParsedFile,
  CompressOptions,
} from "./pipeline-builder.types.js";
import { pipelineError } from "./pipeline-builder.types.js";
import type { SupportedLanguage } from "../../ast/types.js";
import type { CompressResult } from "../types.js";
import { codeParse } from "./code.js";
import { compressAuto, compressSemantic, compressLogs, compressDiff } from "./compress.js";

/**
 * Detect language from file path extension.
 */
function detectLanguageFromPath(filePath: string): SupportedLanguage {
  const ext = path.extname(filePath).toLowerCase();
  const langMap: Record<string, SupportedLanguage> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "typescript",
    ".jsx": "typescript",
    ".py": "python",
    ".go": "go",
    ".rs": "rust",
    ".php": "php",
    ".swift": "swift",
  };
  return langMap[ext] ?? "typescript";
}

/**
 * Execute a single pipeline step.
 */
export function executeStep(
  step: PipelineStepDef,
  input: unknown,
  ctx: PipelineContext,
  stepIndex: number
): Result<unknown, PipelineError> {
  try {
    switch (step.type) {
      case "glob":
        return executeGlob(step.pattern, ctx, stepIndex);

      case "exclude":
        return executeExclude(input as string[], step.pattern, stepIndex);

      case "read":
        return executeRead(input as string[], ctx, stepIndex);

      case "parse":
        return executeParse(input as FileContent[], step.language, stepIndex);

      case "filter":
        return executeFilter(input as unknown[], step.predicate, stepIndex);

      case "map":
        return executeMap(input as unknown[], step.fn, stepIndex);

      case "flatMap":
        return executeFlatMap(input as unknown[], step.fn, stepIndex);

      case "take":
        return ok((input as unknown[]).slice(0, step.count));

      case "skip":
        return ok((input as unknown[]).slice(step.count));

      case "sort":
        return executeSort(input as unknown[], step.compareFn, stepIndex);

      case "unique":
        return executeUnique(input as unknown[], step.keyFn, stepIndex);

      case "compress":
        return executeCompress(input, step.options, stepIndex);

      case "tap":
        step.fn(input);
        return ok(input);

      case "recover":
        // Handled in Pipeline.build()
        return ok(input);

      default:
        return err(pipelineError.step(stepIndex, "unknown", "Unknown step type"));
    }
  } catch (e) {
    return err(pipelineError.step(stepIndex, step.type, String(e)));
  }
}

// --- Individual Executors ---

function executeGlob(
  pattern: string,
  ctx: PipelineContext,
  stepIndex: number
): Result<string[], PipelineError> {
  try {
    const files = ctx.callbacks.glob(pattern);
    return ok(files);
  } catch (e) {
    return err(pipelineError.glob(stepIndex, pattern, e));
  }
}

function executeExclude(
  files: string[],
  pattern: string | RegExp,
  stepIndex: number
): Result<string[], PipelineError> {
  try {
    const regex =
      typeof pattern === "string"
        ? new RegExp(pattern.replace(/\./g, "\\.").replace(/\*/g, ".*"))
        : pattern;
    return ok(files.filter((f) => !regex.test(f)));
  } catch (e) {
    return err(pipelineError.filter(stepIndex, e));
  }
}

function executeRead(
  files: string[],
  ctx: PipelineContext,
  stepIndex: number
): Result<FileContent[], PipelineError> {
  const results: FileContent[] = [];

  for (const file of files) {
    try {
      const content = ctx.callbacks.readFile(file);
      results.push({ path: file, content });
    } catch (e) {
      return err(pipelineError.read(stepIndex, file, e));
    }
  }

  return ok(results);
}

function executeParse(
  files: FileContent[],
  language: SupportedLanguage | undefined,
  stepIndex: number
): Result<ParsedFile[], PipelineError> {
  const results: ParsedFile[] = [];

  for (const file of files) {
    try {
      const lang = language ?? detectLanguageFromPath(file.path);
      const structure = codeParse(file.content, lang);
      results.push({
        path: file.path,
        content: file.content,
        structure,
      });
    } catch (e) {
      return err(pipelineError.parse(stepIndex, file.path, e));
    }
  }

  return ok(results);
}

function executeFilter(
  items: unknown[],
  predicate: (item: unknown) => boolean,
  stepIndex: number
): Result<unknown[], PipelineError> {
  try {
    return ok(items.filter(predicate));
  } catch (e) {
    return err(pipelineError.filter(stepIndex, e));
  }
}

function executeMap(
  items: unknown[],
  fn: (item: unknown) => unknown,
  stepIndex: number
): Result<unknown[], PipelineError> {
  try {
    return ok(items.map(fn));
  } catch (e) {
    return err(pipelineError.map(stepIndex, e));
  }
}

function executeFlatMap(
  items: unknown[],
  fn: (item: unknown) => unknown[],
  stepIndex: number
): Result<unknown[], PipelineError> {
  try {
    return ok(items.flatMap(fn));
  } catch (e) {
    return err(pipelineError.map(stepIndex, e));
  }
}

function executeSort(
  items: unknown[],
  compareFn: ((a: unknown, b: unknown) => number) | undefined,
  stepIndex: number
): Result<unknown[], PipelineError> {
  try {
    const sorted = [...items];
    if (compareFn) {
      sorted.sort(compareFn);
    } else {
      sorted.sort();
    }
    return ok(sorted);
  } catch (e) {
    return err(pipelineError.step(stepIndex, "sort", String(e)));
  }
}

function executeUnique(
  items: unknown[],
  keyFn: ((item: unknown) => unknown) | undefined,
  stepIndex: number
): Result<unknown[], PipelineError> {
  try {
    if (keyFn) {
      const seen = new Set<unknown>();
      return ok(
        items.filter((item) => {
          const key = keyFn(item);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
      );
    }
    // For primitive values, use Set directly
    const seen = new Set<string>();
    return ok(
      items.filter((item) => {
        const key = JSON.stringify(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
    );
  } catch (e) {
    return err(pipelineError.step(stepIndex, "unique", String(e)));
  }
}

function executeCompress(
  input: unknown,
  options: CompressOptions,
  stepIndex: number
): Result<CompressResult, PipelineError> {
  try {
    const content = typeof input === "string" ? input : JSON.stringify(input, null, 2);
    const mode = options.mode ?? "auto";

    switch (mode) {
      case "semantic":
        return ok(compressSemantic(content, options.ratio));
      case "logs": {
        const logResult = compressLogs(content);
        return ok({
          compressed: logResult.summary,
          stats: {
            original: content.length,
            compressed: logResult.summary.length,
            reductionPercent: Math.round((1 - logResult.summary.length / content.length) * 100),
          },
        });
      }
      case "diff":
        return ok(compressDiff(content));
      case "auto":
      default:
        return ok(compressAuto(content));
    }
  } catch (e) {
    return err(pipelineError.compress(stepIndex, e));
  }
}
