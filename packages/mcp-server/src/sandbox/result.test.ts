/**
 * Result Pattern Tests
 *
 * Tests for neverthrow Result-based error handling in SDK.
 */

import { describe, it, expect } from "vitest";
import { ok, err } from "neverthrow";
import { createFilesAPI } from "./sdk/files.js";
import { createGitAPI } from "./sdk/git.js";
import { createSearchAPI } from "./sdk/search.js";
import {
  fileError,
  gitError,
  parseError,
  searchError,
  compressError,
  executionError,
  isFileError,
  isGitError,
  isParseError,
  isSearchError,
  isCompressError,
  isExecutionError,
} from "./errors.js";
import { combine, collect, tryCatch, filterOk, firstSuccess } from "./result-utils.js";
import type { HostCallbacks } from "./types.js";
import * as fs from "fs";
import * as path from "path";

// Create mock callbacks for testing
function createMockCallbacks(): HostCallbacks {
  return {
    readFile(filePath: string): string {
      if (filePath.includes("nonexistent")) {
        throw new Error("File not found: " + filePath);
      }
      return "mock content";
    },
    fileExists(filePath: string): boolean {
      return !filePath.includes("nonexistent");
    },
    glob(_pattern: string): string[] {
      return ["file1.ts", "file2.ts"];
    },
  };
}

describe("Error Types", () => {
  describe("FileError", () => {
    it("should create FILE_NOT_FOUND error", () => {
      const error = fileError.notFound("/path/to/file.ts");
      expect(error.code).toBe("FILE_NOT_FOUND");
      expect(error.path).toBe("/path/to/file.ts");
      expect(error.message).toContain("File not found");
    });

    it("should create FILE_READ_ERROR", () => {
      const error = fileError.readError("/path/to/file.ts", "permission denied");
      expect(error.code).toBe("FILE_READ_ERROR");
      expect(error.message).toContain("permission denied");
    });

    it("should create PATH_VALIDATION_FAILED error", () => {
      const error = fileError.pathValidation("/etc/passwd", "path traversal");
      expect(error.code).toBe("PATH_VALIDATION_FAILED");
      expect(error.reason).toBe("path traversal");
    });

    it("should create PATTERN_INVALID error", () => {
      const error = fileError.patternInvalid("**[", "invalid regex");
      expect(error.code).toBe("PATTERN_INVALID");
      expect(error.pattern).toBe("**[");
    });
  });

  describe("GitError", () => {
    it("should create GIT_NOT_REPO error", () => {
      const error = gitError.notRepo("/tmp");
      expect(error.code).toBe("GIT_NOT_REPO");
      expect(error.path).toBe("/tmp");
    });

    it("should create GIT_COMMAND_FAILED error", () => {
      const error = gitError.commandFailed("git status", "fatal: not a git repository");
      expect(error.code).toBe("GIT_COMMAND_FAILED");
      expect(error.stderr).toBe("fatal: not a git repository");
    });

    it("should create GIT_BLOCKED_COMMAND error", () => {
      const error = gitError.blockedCommand("push");
      expect(error.code).toBe("GIT_BLOCKED_COMMAND");
      expect(error.command).toBe("push");
    });
  });

  describe("ParseError", () => {
    it("should create UNSUPPORTED_LANGUAGE error", () => {
      const error = parseError.unsupportedLanguage("cobol");
      expect(error.code).toBe("UNSUPPORTED_LANGUAGE");
      expect(error.language).toBe("cobol");
    });

    it("should create PARSE_FAILED error", () => {
      const error = parseError.parseFailed("typescript", "syntax error");
      expect(error.code).toBe("PARSE_FAILED");
      expect(error.error).toBe("syntax error");
    });

    it("should create ELEMENT_NOT_FOUND error", () => {
      const error = parseError.elementNotFound("function", "myFunc");
      expect(error.code).toBe("ELEMENT_NOT_FOUND");
      expect(error.type).toBe("function");
      expect(error.name).toBe("myFunc");
    });
  });

  describe("SearchError", () => {
    it("should create INVALID_REGEX error", () => {
      const error = searchError.invalidRegex("[invalid", "missing ]");
      expect(error.code).toBe("INVALID_REGEX");
      expect(error.pattern).toBe("[invalid");
    });
  });

  describe("CompressError", () => {
    it("should create INVALID_RATIO error", () => {
      const error = compressError.invalidRatio(1.5);
      expect(error.code).toBe("INVALID_RATIO");
      expect(error.ratio).toBe(1.5);
    });
  });

  describe("ExecutionError", () => {
    it("should create TIMEOUT error", () => {
      const error = executionError.timeout(5100, 5000);
      expect(error.code).toBe("TIMEOUT");
      expect(error.elapsed).toBe(5100);
      expect(error.limit).toBe(5000);
    });

    it("should create BLOCKED_CODE error", () => {
      const error = executionError.blockedCode(["eval", "require"]);
      expect(error.code).toBe("BLOCKED_CODE");
      expect(error.patterns).toContain("eval");
    });
  });
});

describe("Type Guards", () => {
  it("should identify FileError", () => {
    const error = fileError.notFound("/path");
    expect(isFileError(error)).toBe(true);
    expect(isGitError(error)).toBe(false);
  });

  it("should identify GitError", () => {
    const error = gitError.notRepo("/tmp");
    expect(isGitError(error)).toBe(true);
    expect(isFileError(error)).toBe(false);
  });

  it("should identify ParseError", () => {
    const error = parseError.unsupportedLanguage("unknown");
    expect(isParseError(error)).toBe(true);
  });

  it("should identify SearchError", () => {
    const error = searchError.invalidRegex("[", "error");
    expect(isSearchError(error)).toBe(true);
  });

  it("should identify CompressError", () => {
    const error = compressError.invalidRatio(2);
    expect(isCompressError(error)).toBe(true);
  });

  it("should identify ExecutionError", () => {
    const error = executionError.timeout(1000, 500);
    expect(isExecutionError(error)).toBe(true);
  });
});

describe("Result Utilities", () => {
  describe("combine", () => {
    it("should combine multiple successful Results", () => {
      const results = [ok(1), ok(2), ok(3)];
      const combined = combine(results);
      expect(combined.isOk()).toBe(true);
      expect(combined._unsafeUnwrap()).toEqual([1, 2, 3]);
    });

    it("should return first error on failure", () => {
      const error = fileError.notFound("/missing");
      const results = [ok(1), err(error), ok(3)];
      const combined = combine(results);
      expect(combined.isErr()).toBe(true);
      expect(combined._unsafeUnwrapErr().code).toBe("FILE_NOT_FOUND");
    });
  });

  describe("collect", () => {
    it("should collect successes and errors separately", () => {
      const error = fileError.notFound("/missing");
      const results = [ok(1), err(error), ok(3)];
      const { successes, errors } = collect(results);
      expect(successes).toEqual([1, 3]);
      expect(errors.length).toBe(1);
      expect(errors[0]!.code).toBe("FILE_NOT_FOUND");
    });

    it("should return all successes when no errors", () => {
      const results = [ok("a"), ok("b"), ok("c")];
      const { successes, errors } = collect(results);
      expect(successes).toEqual(["a", "b", "c"]);
      expect(errors).toEqual([]);
    });
  });

  describe("tryCatch", () => {
    it("should wrap successful function", () => {
      const result = tryCatch(
        () => "success",
        (e) => fileError.readError("path", String(e))
      );
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe("success");
    });

    it("should wrap throwing function", () => {
      const result = tryCatch(
        () => {
          throw new Error("oops");
        },
        (e) => fileError.readError("path", String(e))
      );
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().code).toBe("FILE_READ_ERROR");
    });
  });

  describe("filterOk", () => {
    it("should filter only successful results", () => {
      const error = fileError.notFound("/missing");
      const results = [ok(1), err(error), ok(3)];
      const values = filterOk(results);
      expect(values).toEqual([1, 3]);
    });
  });

  describe("firstSuccess", () => {
    it("should return first success", () => {
      const e1 = fileError.notFound("/missing1");
      const e2 = fileError.notFound("/missing2");
      const results = [err(e1), ok("found"), err(e2)];
      const result = firstSuccess(results);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe("found");
    });

    it("should return all errors if no success", () => {
      const e1 = fileError.notFound("/missing1");
      const e2 = fileError.notFound("/missing2");
      const results = [err(e1), err(e2)];
      const result = firstSuccess(results);
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().length).toBe(2);
    });
  });
});

describe("Files API with Result", () => {
  it("should return Ok for successful read", () => {
    const callbacks = createMockCallbacks();
    const files = createFilesAPI(callbacks);
    const result = files.read("existing-file.ts");
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe("mock content");
  });

  it("should return Err for missing file", () => {
    const callbacks = createMockCallbacks();
    const files = createFilesAPI(callbacks);
    const result = files.read("nonexistent-file.ts");
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("FILE_NOT_FOUND");
  });

  it("should chain operations with andThen", () => {
    const callbacks = createMockCallbacks();
    const files = createFilesAPI(callbacks);

    const result = files
      .read("existing-file.ts")
      .map((content) => content.length)
      .map((len) => len > 0);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(true);
  });
});

describe("Git API with Result", () => {
  it("should return Err for non-git directory", () => {
    const git = createGitAPI("/tmp");
    const result = git.status();
    expect(result.isErr()).toBe(true);
    // Could be GIT_NOT_REPO or GIT_COMMAND_FAILED depending on error message
    const errorCode = result._unsafeUnwrapErr().code;
    expect(["GIT_NOT_REPO", "GIT_COMMAND_FAILED"]).toContain(errorCode);
  });
});

describe("Search API with Result", () => {
  it("should return Err for invalid regex", () => {
    const callbacks = createMockCallbacks();
    const search = createSearchAPI(process.cwd(), callbacks);
    const result = search.grep("[invalid", "**/*.ts");
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe("INVALID_REGEX");
  });
});
