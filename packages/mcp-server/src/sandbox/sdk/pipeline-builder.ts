/**
 * Fluent Pipeline Builder
 *
 * Immutable, chainable API for pipeline operations with full TypeScript inference.
 */

import { Result, ResultAsync, ok, err } from "neverthrow";
import type {
  PipelineBuilder,
  PipelineContext,
  PipelineStepDef,
  PipelineError,
  PipelineBuildResult,
  PipelineStats,
  FileContent,
  ParsedFile,
  CompressOptions,
  PipelineFactory,
} from "./pipeline-builder.types.js";
import { pipelineError } from "./pipeline-builder.types.js";
import type { SupportedLanguage } from "../../ast/types.js";
import type { CompressResult, HostCallbacks } from "../types.js";
import { executeStep } from "./pipeline-executors.js";
import { createPipelinePresets } from "./pipeline-presets.js";

/**
 * Immutable pipeline builder implementation.
 * Each method returns a NEW Pipeline instance.
 */
class Pipeline<T = void> implements PipelineBuilder<T> {
  private constructor(
    private readonly steps: readonly PipelineStepDef[],
    private readonly context: PipelineContext,
    private readonly initialData?: unknown
  ) {
    // Freeze to ensure immutability
    Object.freeze(this.steps);
  }

  /**
   * Factory method to create initial pipeline.
   */
  static create(context: PipelineContext): Pipeline<void> {
    return new Pipeline<void>([], context);
  }

  /**
   * Factory method to create pipeline with initial data.
   * Uses const type parameter to preserve literal types.
   */
  static fromData<const T>(data: readonly T[], context: PipelineContext): Pipeline<T[]> {
    return new Pipeline<T[]>([], context, [...data]);
  }

  /**
   * Create new pipeline with additional step (immutable).
   */
  private withStep<U>(step: PipelineStepDef): Pipeline<U> {
    return new Pipeline<U>([...this.steps, step], this.context, this.initialData);
  }

  // --- Source Operations ---

  glob(pattern: string): Pipeline<string[]> {
    return this.withStep<string[]>({ type: "glob", pattern });
  }

  // --- Transform Operations ---

  exclude(pattern: string | RegExp): Pipeline<T> {
    return this.withStep<T>({ type: "exclude", pattern });
  }

  read(): T extends string[] ? Pipeline<FileContent[]> : never {
    return this.withStep<FileContent[]>({ type: "read" }) as T extends string[]
      ? Pipeline<FileContent[]>
      : never;
  }

  parse(language?: SupportedLanguage): T extends FileContent[] ? Pipeline<ParsedFile[]> : never {
    return this.withStep<ParsedFile[]>({ type: "parse", language }) as T extends FileContent[]
      ? Pipeline<ParsedFile[]>
      : never;
  }

  filter<S extends T extends (infer U)[] ? U : never>(
    predicate: (item: S) => boolean
  ): Pipeline<T> {
    return this.withStep<T>({
      type: "filter",
      predicate: predicate as (item: unknown) => boolean,
    });
  }

  map<U>(fn: (item: T extends (infer I)[] ? I : T) => U): Pipeline<U[]> {
    return this.withStep<U[]>({ type: "map", fn: fn as (item: unknown) => unknown });
  }

  flatMap<U>(fn: (item: T extends (infer I)[] ? I : T) => U[]): Pipeline<U[]> {
    return this.withStep<U[]>({ type: "flatMap", fn: fn as (item: unknown) => unknown[] });
  }

  take(count: number): Pipeline<T> {
    return this.withStep<T>({ type: "take", count });
  }

  skip(count: number): Pipeline<T> {
    return this.withStep<T>({ type: "skip", count });
  }

  sort(
    compareFn?: (a: T extends (infer U)[] ? U : T, b: T extends (infer U)[] ? U : T) => number
  ): Pipeline<T> {
    return this.withStep<T>({
      type: "sort",
      compareFn: compareFn as ((a: unknown, b: unknown) => number) | undefined,
    });
  }

  unique(keyFn?: (item: T extends (infer U)[] ? U : T) => unknown): Pipeline<T> {
    return this.withStep<T>({
      type: "unique",
      keyFn: keyFn as ((item: unknown) => unknown) | undefined,
    });
  }

  // --- Terminal Operations ---

  compress(options?: CompressOptions): Pipeline<CompressResult> {
    return this.withStep<CompressResult>({
      type: "compress",
      options: options ?? { mode: "auto" },
    });
  }

  tap(fn: (items: T) => void): Pipeline<T> {
    return this.withStep<T>({ type: "tap", fn: fn as (items: unknown) => void });
  }

  recover(fn: (error: PipelineError) => T): Pipeline<T> {
    return this.withStep<T>({ type: "recover", fn: fn as (error: PipelineError) => unknown });
  }

  // --- Build Methods ---

  build(): Result<PipelineBuildResult<T>, PipelineError> {
    // Allow empty pipeline if we have initial data
    if (this.steps.length === 0 && this.initialData === undefined) {
      return err(pipelineError.empty());
    }

    const startTime = Date.now();
    let data: unknown = this.initialData;
    let itemsProcessed = 0;
    const errors: PipelineError[] = [];

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i]!;
      const result = executeStep(step, data, this.context, i);

      if (result.isErr()) {
        // Check for recover step
        const nextStep = this.steps[i + 1];
        if (nextStep?.type === "recover") {
          try {
            const recoverFn = nextStep.fn as (error: PipelineError) => unknown;
            data = recoverFn(result.error);
            i++; // Skip recover step
            continue;
          } catch {
            errors.push(result.error);
            return err(result.error);
          }
        }
        errors.push(result.error);
        return err(result.error);
      }

      data = result.value;
      if (Array.isArray(data)) {
        itemsProcessed = data.length;
      }
    }

    const stats: PipelineStats = {
      stepsExecuted: this.steps.length,
      itemsProcessed,
      executionTimeMs: Date.now() - startTime,
      errors,
    };

    return ok({ data: data as T, stats });
  }

  buildAsync(): ResultAsync<PipelineBuildResult<T>, PipelineError> {
    return ResultAsync.fromPromise(
      Promise.resolve().then(() => {
        const result = this.build();
        if (result.isErr()) {
          throw result.error;
        }
        return result.value;
      }),
      (e) => e as PipelineError
    );
  }

  getSteps(): readonly PipelineStepDef[] {
    return this.steps;
  }
}

/**
 * Create the fluent pipeline API for SDK.
 */
export function createFluentPipelineAPI(
  workingDir: string,
  callbacks: HostCallbacks
): PipelineFactory {
  const context: PipelineContext = {
    workingDir,
    callbacks,
  };

  return {
    create(): PipelineBuilder<void> {
      return Pipeline.create(context);
    },

    from(pattern: string): PipelineBuilder<string[]> {
      return Pipeline.create(context).glob(pattern);
    },

    fromData<const T>(data: readonly T[]): PipelineBuilder<T[]> {
      return Pipeline.fromData(data, context);
    },

    presets: createPipelinePresets(context),
  };
}

export { Pipeline };
export type { PipelineBuilder, PipelineFactory };
