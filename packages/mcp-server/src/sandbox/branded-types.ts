/**
 * Branded Types for Compile-Time Path Safety
 *
 * Branded types provide compile-time guarantees that values have been validated.
 * A branded type cannot be assigned from a plain string - it must go through
 * a validation function first.
 *
 * @example
 * ```typescript
 * const path: string = "/some/path";
 * const validated: ValidatedPath = path; // Error: string not assignable to ValidatedPath
 *
 * const result = validatePathResult(path, workingDir);
 * if (result.isOk()) {
 *   const validated: ValidatedPath = result.value; // OK
 * }
 * ```
 */

// Brand symbol for nominal typing
declare const __brand: unique symbol;

/**
 * Brand utility type - creates a nominal type from a base type
 * The brand is purely compile-time and has no runtime overhead
 */
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// ============================================================================
// Branded Types
// ============================================================================

/**
 * A file path that has been validated to be:
 * - Within the sandbox working directory
 * - Not containing path traversal attacks
 * - Not matching blocked sensitive file patterns
 * - Symlink-resolved to prevent escapes
 */
export type ValidatedPath = Brand<string, "ValidatedPath">;

/**
 * A glob pattern that has been validated to be:
 * - Not containing path traversal (..)
 * - Not an absolute path
 * - Not matching sensitive file patterns
 */
export type SafePattern = Brand<string, "SafePattern">;

/**
 * A git command argument that has been sanitized:
 * - No shell metacharacters
 * - No newlines or control characters
 * - Safe for shell execution
 */
export type SanitizedGitArg = Brand<string, "SanitizedGitArg">;

/**
 * User code that has passed security checks:
 * - No blocked patterns (require, process, etc.)
 * - Safe for sandbox execution
 */
export type SanitizedCode = Brand<string, "SanitizedCode">;

// ============================================================================
// Branding Utilities
// ============================================================================

/**
 * Brand a string as a ValidatedPath.
 * INTERNAL USE ONLY - call this only after validation succeeds.
 *
 * @internal
 */
export function brandAsValidatedPath(path: string): ValidatedPath {
  return path as ValidatedPath;
}

/**
 * Brand a string as a SafePattern.
 * INTERNAL USE ONLY - call this only after validation succeeds.
 *
 * @internal
 */
export function brandAsSafePattern(pattern: string): SafePattern {
  return pattern as SafePattern;
}

/**
 * Brand a string as a SanitizedGitArg.
 * INTERNAL USE ONLY - call this only after sanitization succeeds.
 *
 * @internal
 */
export function brandAsSanitizedGitArg(arg: string): SanitizedGitArg {
  return arg as SanitizedGitArg;
}

/**
 * Brand a string as SanitizedCode.
 * INTERNAL USE ONLY - call this only after code validation succeeds.
 *
 * @internal
 */
export function brandAsSanitizedCode(code: string): SanitizedCode {
  return code as SanitizedCode;
}

// ============================================================================
// Type Guards (Runtime checks)
// ============================================================================

/**
 * Runtime type guard for ValidatedPath.
 * Note: This only checks if the value is a string - the actual validation
 * must be done through validatePathResult().
 */
export function isValidatedPath(value: unknown): value is ValidatedPath {
  return typeof value === "string";
}

/**
 * Runtime type guard for SafePattern.
 * Note: This only checks if the value is a string - the actual validation
 * must be done through validatePatternResult().
 */
export function isSafePattern(value: unknown): value is SafePattern {
  return typeof value === "string";
}

/**
 * Runtime type guard for SanitizedGitArg.
 * Note: This only checks if the value is a string - the actual sanitization
 * must be done through sanitizeGitArg().
 */
export function isSanitizedGitArg(value: unknown): value is SanitizedGitArg {
  return typeof value === "string";
}

/**
 * Runtime type guard for SanitizedCode.
 * Note: This only checks if the value is a string - the actual validation
 * must be done through code validation.
 */
export function isSanitizedCode(value: unknown): value is SanitizedCode {
  return typeof value === "string";
}

// ============================================================================
// Unwrap Utilities
// ============================================================================

/**
 * Extract the underlying string from a branded type.
 * Use when you need to pass to external APIs that expect plain strings.
 */
export function unwrapBrandedString<T extends string>(branded: Brand<string, T>): string {
  return branded as string;
}
