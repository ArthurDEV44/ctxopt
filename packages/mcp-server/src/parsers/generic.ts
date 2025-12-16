/**
 * Generic Build Error Parser
 *
 * Handles various build tools: Webpack, Vite, esbuild, Rust, Go, etc.
 */

import type { BuildParser, ParsedError, Severity, BuildTool } from "./types.js";

// Webpack error patterns
const WEBPACK_ERROR_PATTERN = /^ERROR in (.+?)(?::(\d+):(\d+))?$/;
const WEBPACK_MODULE_ERROR = /Module (?:build )?failed.+?:\s*(.+)/;

// Rust/Cargo error patterns
const RUST_ERROR_PATTERN = /^error\[E(\d+)\]: (.+)/;
const RUST_LOCATION_PATTERN = /^\s+--> (.+?):(\d+):(\d+)/;

// Go error patterns
const GO_ERROR_PATTERN = /^(.+?):(\d+):(\d+):\s*(.+)/;

// Generic error/warning patterns (fallback)
const GENERIC_ERROR_LINE = /^(?:error|Error|ERROR)(?:\[([^\]]+)\])?[:\s]+(.+)/i;
const GENERIC_WARNING_LINE = /^(?:warning|Warning|WARNING)(?:\[([^\]]+)\])?[:\s]+(.+)/i;
const GENERIC_LOCATION = /^(?:\s*(?:at|in|-->)\s+)?(.+?):(\d+)(?::(\d+))?/;

/**
 * Detect build tool from output
 */
function detectToolFromOutput(output: string): BuildTool {
  if (output.includes("ERROR in") || output.includes("webpack")) {
    return "webpack";
  }
  if (output.includes("[vite]") || output.includes("vite")) {
    return "vite";
  }
  if (output.includes("✘ [ERROR]") || output.includes("esbuild")) {
    return "esbuild";
  }
  if (output.includes("error[E") || output.includes("cargo") || output.includes("rustc")) {
    return "rust";
  }
  if (GO_ERROR_PATTERN.test(output)) {
    return "go";
  }
  return "generic";
}

/**
 * Create signature from code and message
 */
function createSignature(code: string, message: string): string {
  const normalizedMessage = message
    .replace(/'[^']+'/g, "'X'")
    .replace(/"[^"]+"/g, '"X"')
    .replace(/`[^`]+`/g, "`X`")
    .replace(/\d+/g, "N")
    .replace(/\s+/g, " ")
    .slice(0, 100)
    .trim();

  return `${code}:${normalizedMessage}`;
}

/**
 * Parse Webpack output
 */
function parseWebpack(output: string): ParsedError[] {
  const errors: ParsedError[] = [];
  const lines = output.split("\n");

  let currentError: Partial<ParsedError> | null = null;

  for (const line of lines) {
    const errorMatch = line.match(WEBPACK_ERROR_PATTERN);
    if (errorMatch) {
      if (currentError?.message) {
        errors.push(currentError as ParsedError);
      }

      const file = errorMatch[1] ?? "unknown";
      const lineNum = errorMatch[2] ?? "0";
      const colNum = errorMatch[3] ?? "0";

      currentError = {
        file,
        line: parseInt(lineNum, 10),
        column: parseInt(colNum, 10),
        severity: "error",
        code: "WEBPACK",
        message: "",
        raw: line,
        signature: "",
      };
      continue;
    }

    const moduleError = line.match(WEBPACK_MODULE_ERROR);
    if (moduleError?.[1] && currentError) {
      currentError.message = moduleError[1];
      currentError.signature = createSignature("WEBPACK", moduleError[1]);
    }
  }

  if (currentError?.message) {
    errors.push(currentError as ParsedError);
  }

  return errors;
}

/**
 * Parse Rust/Cargo output
 */
function parseRust(output: string): ParsedError[] {
  const errors: ParsedError[] = [];
  const lines = output.split("\n");

  let currentError: Partial<ParsedError> | null = null;

  for (const line of lines) {
    const errorMatch = line.match(RUST_ERROR_PATTERN);
    if (errorMatch) {
      if (currentError?.message) {
        errors.push(currentError as ParsedError);
      }

      const code = `E${errorMatch[1] ?? "0000"}`;
      const message = errorMatch[2] ?? "Unknown error";

      currentError = {
        code,
        message,
        severity: "error",
        file: "unknown",
        line: 0,
        column: 0,
        raw: line,
        signature: createSignature(code, message),
      };
      continue;
    }

    const locationMatch = line.match(RUST_LOCATION_PATTERN);
    if (locationMatch && currentError) {
      currentError.file = locationMatch[1] ?? "unknown";
      currentError.line = parseInt(locationMatch[2] ?? "0", 10);
      currentError.column = parseInt(locationMatch[3] ?? "0", 10);
    }
  }

  if (currentError?.message) {
    errors.push(currentError as ParsedError);
  }

  return errors;
}

/**
 * Parse Go output
 */
function parseGo(output: string): ParsedError[] {
  const errors: ParsedError[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    const match = line.match(GO_ERROR_PATTERN);
    if (match) {
      const file = match[1] ?? "unknown";
      const lineNum = match[2] ?? "0";
      const colNum = match[3] ?? "0";
      const message = match[4] ?? "Unknown error";

      errors.push({
        signature: createSignature("GO", message),
        code: "GO",
        message,
        file,
        line: parseInt(lineNum, 10),
        column: parseInt(colNum, 10),
        severity: "error",
        raw: line,
      });
    }
  }

  return errors;
}

/**
 * Parse generic output (fallback)
 */
function parseGeneric(output: string): ParsedError[] {
  const errors: ParsedError[] = [];
  const lines = output.split("\n");

  let lastLocation: { file: string; line: number; column: number } | null = null;

  for (const line of lines) {
    // Check for location
    const locationMatch = line.match(GENERIC_LOCATION);
    if (locationMatch) {
      lastLocation = {
        file: locationMatch[1] ?? "unknown",
        line: parseInt(locationMatch[2] ?? "0", 10),
        column: locationMatch[3] ? parseInt(locationMatch[3], 10) : 0,
      };
    }

    // Check for error
    const errorMatch = line.match(GENERIC_ERROR_LINE);
    if (errorMatch) {
      const code = errorMatch[1] ?? "ERROR";
      const message = errorMatch[2] ?? "Unknown error";
      errors.push({
        signature: createSignature(code, message),
        code,
        message,
        file: lastLocation?.file ?? "unknown",
        line: lastLocation?.line ?? 0,
        column: lastLocation?.column ?? 0,
        severity: "error",
        raw: line,
      });
      lastLocation = null;
      continue;
    }

    // Check for warning
    const warningMatch = line.match(GENERIC_WARNING_LINE);
    if (warningMatch) {
      const code = warningMatch[1] ?? "WARNING";
      const message = warningMatch[2] ?? "Unknown warning";
      errors.push({
        signature: createSignature(code, message),
        code,
        message,
        file: lastLocation?.file ?? "unknown",
        line: lastLocation?.line ?? 0,
        column: lastLocation?.column ?? 0,
        severity: "warning",
        raw: line,
      });
      lastLocation = null;
    }
  }

  return errors;
}

export const genericParser: BuildParser = {
  name: "generic",
  supportedTools: ["webpack", "vite", "esbuild", "rust", "go", "generic"],

  canParse(_output: string): boolean {
    return true;
  },

  parse(output: string): ParsedError[] {
    const tool = detectToolFromOutput(output);

    switch (tool) {
      case "webpack":
      case "vite":
      case "esbuild":
        return parseWebpack(output);
      case "rust":
        return parseRust(output);
      case "go":
        return parseGo(output);
      default:
        return parseGeneric(output);
    }
  },
};
