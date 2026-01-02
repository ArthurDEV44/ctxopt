/**
 * Result Utilities
 *
 * Helper functions for working with neverthrow Results.
 * Provides combine, collect, and try-catch wrappers.
 */

import { Result, ok, err, ResultAsync } from "neverthrow";

/**
 * Combine multiple Results into one.
 * Returns the first error encountered, or all values on success.
 */
export function combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (result.isErr()) {
      return err(result.error);
    }
    values.push(result.value);
  }
  return ok(values);
}

/**
 * Collect all successes and errors separately.
 * Useful for batch operations where partial success is acceptable.
 */
export function collect<T, E>(
  results: Result<T, E>[]
): { successes: T[]; errors: E[] } {
  const successes: T[] = [];
  const errors: E[] = [];

  for (const result of results) {
    if (result.isOk()) {
      successes.push(result.value);
    } else {
      errors.push(result.error);
    }
  }

  return { successes, errors };
}

/**
 * Wrap a synchronous function in a Result.
 * Maps thrown errors using the provided function.
 */
export function tryCatch<T, E>(
  fn: () => T,
  mapError: (e: unknown) => E
): Result<T, E> {
  try {
    return ok(fn());
  } catch (e) {
    return err(mapError(e));
  }
}

/**
 * Wrap an async function in a ResultAsync.
 * Maps thrown errors using the provided function.
 */
export function tryCatchAsync<T, E>(
  fn: () => Promise<T>,
  mapError: (e: unknown) => E
): ResultAsync<T, E> {
  return ResultAsync.fromPromise(fn(), mapError);
}

/**
 * Map over an array and collect Results.
 * Returns all successes with their errors.
 */
export function mapCollect<T, U, E>(
  items: T[],
  fn: (item: T) => Result<U, E>
): { successes: U[]; errors: E[] } {
  return collect(items.map(fn));
}

/**
 * Sequence an array of Results, short-circuiting on first error.
 * Alias for combine() with clearer intent.
 */
export function sequence<T, E>(results: Result<T, E>[]): Result<T[], E> {
  return combine(results);
}

/**
 * Apply a function to each item, returning first success or all errors.
 * Useful for trying multiple fallback strategies.
 */
export function firstSuccess<T, E>(
  items: Result<T, E>[]
): Result<T, E[]> {
  const errors: E[] = [];

  for (const result of items) {
    if (result.isOk()) {
      return ok(result.value);
    }
    errors.push(result.error);
  }

  return err(errors);
}

/**
 * Filter Results, keeping only successes.
 * Discards errors silently - use collect() if you need error info.
 */
export function filterOk<T, E>(results: Result<T, E>[]): T[] {
  return results.filter((r) => r.isOk()).map((r) => r._unsafeUnwrap());
}

/**
 * Unwrap a Result or throw with a custom message.
 * Use at system boundaries where throwing is acceptable.
 */
export function unwrapOrThrow<T, E extends { message: string }>(
  result: Result<T, E>,
  prefix?: string
): T {
  if (result.isErr()) {
    const message = prefix
      ? `${prefix}: ${result.error.message}`
      : result.error.message;
    throw new Error(message);
  }
  return result.value;
}

/**
 * Convert a Result to a promise-style object.
 * Useful for legacy code that expects { success, data, error }.
 */
export function toPromiseStyle<T, E extends { message: string }>(
  result: Result<T, E>
): { success: boolean; data?: T; error?: string } {
  if (result.isOk()) {
    return { success: true, data: result.value };
  }
  return { success: false, error: result.error.message };
}
