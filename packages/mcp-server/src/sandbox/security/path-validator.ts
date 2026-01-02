/**
 * Path Validator
 *
 * Validates file paths for sandbox access.
 * Provides both legacy interface and Result-based API with branded types.
 */

import * as path from "path";
import * as fs from "fs";
import { ok, err, type Result } from "neverthrow";
import {
  type ValidatedPath,
  type SafePattern,
  brandAsValidatedPath,
  brandAsSafePattern,
} from "../branded-types.js";
import { fileError, type FileError } from "../errors.js";

/**
 * Blocked file patterns (sensitive files)
 * Uses satisfies to ensure type safety while preserving literal types
 */
const BLOCKED_PATTERNS = [
  /\.env($|\.)/i, // Environment files
  /\.pem$/i, // Private keys
  /\.key$/i, // Key files
  /id_rsa/i, // SSH keys
  /id_ed25519/i, // SSH keys
  /credentials/i, // Credentials
  /secrets?\./i, // Secret files
  /\.keystore$/i, // Java keystores
  /\.jks$/i, // Java keystores
  /password/i, // Password files
  /\.htpasswd/i, // Apache passwords
  /\.netrc/i, // Network credentials
  /\.npmrc/i, // NPM credentials
  /\.pypirc/i, // PyPI credentials
] as const satisfies readonly RegExp[];

/**
 * Validation result (legacy interface)
 */
export interface PathValidation {
  safe: boolean;
  error?: string;
  resolvedPath?: string;
}

/**
 * Validate a file path for sandbox access (legacy API)
 */
export function validatePath(
  filePath: string,
  workingDir: string
): PathValidation {
  try {
    // Normalize and resolve path
    const normalizedPath = path.normalize(filePath);
    const resolvedPath = path.isAbsolute(normalizedPath)
      ? normalizedPath
      : path.resolve(workingDir, normalizedPath);

    // Check if path is within working directory
    const relative = path.relative(workingDir, resolvedPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return {
        safe: false,
        error: `Path must be within working directory: ${workingDir}`,
      };
    }

    // Check for symlinks that might escape
    try {
      const realPath = fs.realpathSync(resolvedPath);
      const realRelative = path.relative(workingDir, realPath);
      if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) {
        return {
          safe: false,
          error: "Symlink escapes working directory",
        };
      }
    } catch {
      // File doesn't exist yet, that's okay for validation
    }

    // Check against blocked patterns
    const fileName = path.basename(resolvedPath);
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(fileName) || pattern.test(resolvedPath)) {
        return {
          safe: false,
          error: `Access to ${fileName} is blocked for security`,
        };
      }
    }

    return {
      safe: true,
      resolvedPath,
    };
  } catch (error) {
    return {
      safe: false,
      error: `Invalid path: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}

/**
 * Validate a glob pattern (legacy API)
 */
export function validateGlobPattern(
  pattern: string,
  workingDir: string
): PathValidation {
  // Check for path traversal in pattern
  if (pattern.includes("..")) {
    return {
      safe: false,
      error: "Glob pattern cannot contain path traversal (..)",
    };
  }

  // Check for absolute paths
  if (path.isAbsolute(pattern)) {
    return {
      safe: false,
      error: "Glob pattern must be relative to working directory",
    };
  }

  // Check for blocked patterns in glob
  for (const blocked of BLOCKED_PATTERNS) {
    if (blocked.test(pattern)) {
      return {
        safe: false,
        error: `Glob pattern matches blocked file types`,
      };
    }
  }

  return {
    safe: true,
    resolvedPath: path.join(workingDir, pattern),
  };
}

// ============================================================================
// Result-based API with Branded Types
// ============================================================================

/**
 * Validate a file path and return a branded ValidatedPath on success.
 *
 * @param filePath - The path to validate
 * @param workingDir - The sandbox working directory
 * @returns Result<ValidatedPath, FileError>
 *
 * @example
 * ```typescript
 * const result = validatePathResult("src/index.ts", "/project");
 * if (result.isOk()) {
 *   // result.value is ValidatedPath, safe to use
 *   const content = fs.readFileSync(result.value);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export function validatePathResult(
  filePath: string,
  workingDir: string
): Result<ValidatedPath, FileError> {
  const validation = validatePath(filePath, workingDir);

  if (!validation.safe) {
    return err(
      fileError.pathValidation(filePath, validation.error ?? "Unknown validation error")
    );
  }

  // Brand the validated path
  return ok(brandAsValidatedPath(validation.resolvedPath!));
}

/**
 * Validate a glob pattern and return a branded SafePattern on success.
 *
 * @param pattern - The glob pattern to validate
 * @param workingDir - The sandbox working directory
 * @returns Result<SafePattern, FileError>
 *
 * @example
 * ```typescript
 * const result = validatePatternResult("src/**\/*.ts", "/project");
 * if (result.isOk()) {
 *   // result.value is SafePattern, safe to use for glob operations
 *   const files = glob.sync(result.value);
 * }
 * ```
 */
export function validatePatternResult(
  pattern: string,
  workingDir: string
): Result<SafePattern, FileError> {
  const validation = validateGlobPattern(pattern, workingDir);

  if (!validation.safe) {
    return err(
      fileError.patternInvalid(pattern, validation.error ?? "Unknown validation error")
    );
  }

  // Brand the validated pattern
  return ok(brandAsSafePattern(pattern));
}

/**
 * Check if a path matches any blocked patterns.
 * Useful for pre-validation checks.
 */
export function isBlockedPath(filePath: string): boolean {
  const fileName = path.basename(filePath);
  return BLOCKED_PATTERNS.some(
    (pattern) => pattern.test(fileName) || pattern.test(filePath)
  );
}

/**
 * Get the list of blocked patterns (for documentation/testing).
 */
export function getBlockedPatterns(): readonly RegExp[] {
  return BLOCKED_PATTERNS;
}
