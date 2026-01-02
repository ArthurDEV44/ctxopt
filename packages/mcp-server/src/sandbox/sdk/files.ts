/**
 * SDK Files Functions
 *
 * Safe file operations for sandbox use.
 * Uses host callbacks for actual file I/O.
 * Returns Result types for type-safe error handling.
 */

import { Result, ok, err } from "neverthrow";
import type { HostCallbacks, FileStructure } from "../types.js";
import { FileError, fileError } from "../errors.js";
import { codeParse } from "./code.js";
import { detectLanguageFromPath } from "../../utils/language-detector.js";

/**
 * Create files API with host callbacks
 * All methods return Result<T, FileError> for type-safe error handling
 */
export function createFilesAPI(callbacks: HostCallbacks) {
  return {
    /**
     * Read file content
     */
    read(path: string): Result<string, FileError> {
      try {
        const content = callbacks.readFile(path);
        return ok(content);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (message.includes("not found") || message.includes("ENOENT")) {
          return err(fileError.notFound(path));
        }
        return err(fileError.readError(path, message));
      }
    },

    /**
     * Check if file exists
     */
    exists(path: string): Result<boolean, FileError> {
      try {
        return ok(callbacks.fileExists(path));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return err(fileError.readError(path, message));
      }
    },

    /**
     * Find files matching glob pattern
     */
    glob(pattern: string): Result<string[], FileError> {
      try {
        return ok(callbacks.glob(pattern));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (message.includes("Invalid") || message.includes("pattern")) {
          return err(fileError.patternInvalid(pattern, message));
        }
        return err(fileError.readError(pattern, message));
      }
    },

    /**
     * Read file and parse to structure
     */
    readStructure(path: string): Result<FileStructure, FileError> {
      try {
        const content = callbacks.readFile(path);
        const language = detectLanguageFromPath(path);
        return ok(codeParse(content, language));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (message.includes("not found") || message.includes("ENOENT")) {
          return err(fileError.notFound(path));
        }
        return err(fileError.readError(path, message));
      }
    },
  };
}

/**
 * Legacy API that throws on error (for backward compatibility)
 * Use createFilesAPI() for new code with Result types
 */
export function createFilesAPILegacy(callbacks: HostCallbacks) {
  const api = createFilesAPI(callbacks);

  return {
    read(path: string): string {
      const result = api.read(path);
      if (result.isErr()) throw new Error(result.error.message);
      return result.value;
    },

    exists(path: string): boolean {
      const result = api.exists(path);
      if (result.isErr()) throw new Error(result.error.message);
      return result.value;
    },

    glob(pattern: string): string[] {
      const result = api.glob(pattern);
      if (result.isErr()) throw new Error(result.error.message);
      return result.value;
    },

    readStructure(path: string): FileStructure {
      const result = api.readStructure(path);
      if (result.isErr()) throw new Error(result.error.message);
      return result.value;
    },
  };
}
