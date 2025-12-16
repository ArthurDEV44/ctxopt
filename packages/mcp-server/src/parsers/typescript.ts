/**
 * TypeScript Error Parser
 *
 * Parses TypeScript compiler (tsc) output and extracts structured errors.
 */

import type { BuildParser, ParsedError, Severity } from "./types.js";

// TypeScript error format: src/file.ts(12,5): error TS2304: Cannot find name 'foo'.
const TS_ERROR_PATTERN = /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)$/;

// Alternative format: src/file.ts:12:5 - error TS2304: Cannot find name 'foo'.
const TS_ERROR_ALT_PATTERN = /^(.+?):(\d+):(\d+)\s*-\s*(error|warning)\s+(TS\d+):\s*(.+)$/;

// Build summary pattern
const BUILD_SUMMARY_PATTERN = /Found (\d+) errors?/;

/**
 * Generate suggestion based on error code
 */
function getSuggestion(code: string, message: string): string | undefined {
  switch (code) {
    case "TS2304": {
      const nameMatch = message.match(/Cannot find name '(\w+)'/);
      if (nameMatch?.[1]) {
        return `Check if '${nameMatch[1]}' needs to be imported or declared.`;
      }
      break;
    }

    case "TS2339": {
      const propMatch = message.match(/Property '(\w+)' does not exist on type '(.+)'/);
      if (propMatch?.[1] && propMatch[2]) {
        return `Property '${propMatch[1]}' may have been renamed or removed from type '${propMatch[2]}'.`;
      }
      break;
    }

    case "TS2345":
      return "Check the function signature and ensure argument types match.";

    case "TS2322":
      return "Verify the types are compatible or add explicit type casting.";

    case "TS7006":
      return "Add explicit type annotation to the parameter.";

    case "TS2307": {
      const moduleMatch = message.match(/Cannot find module '(.+)'/);
      if (moduleMatch?.[1]) {
        return `Install the module with: npm install ${moduleMatch[1].replace(/^@types\//, "")}`;
      }
      break;
    }

    case "TS1005":
      return "Check for syntax errors like missing brackets, commas, or semicolons.";

    case "TS2551":
      return "Check the suggested name in the error message.";
  }

  return undefined;
}

/**
 * Create error signature for grouping
 */
function createSignature(code: string, message: string): string {
  const normalizedMessage = message
    .replace(/'[^']+'/g, "'X'")
    .replace(/\d+/g, "N")
    .replace(/\s+/g, " ")
    .trim();

  return `${code}:${normalizedMessage}`;
}

export const typescriptParser: BuildParser = {
  name: "typescript",
  supportedTools: ["tsc"],

  canParse(output: string): boolean {
    return (
      TS_ERROR_PATTERN.test(output) ||
      TS_ERROR_ALT_PATTERN.test(output) ||
      output.includes("error TS") ||
      output.includes("warning TS") ||
      BUILD_SUMMARY_PATTERN.test(output)
    );
  },

  parse(output: string): ParsedError[] {
    const errors: ParsedError[] = [];
    const lines = output.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Try main pattern
      let match = trimmed.match(TS_ERROR_PATTERN);
      if (!match) {
        match = trimmed.match(TS_ERROR_ALT_PATTERN);
      }

      if (match) {
        const file = match[1] ?? "unknown";
        const lineNum = match[2] ?? "0";
        const colNum = match[3] ?? "0";
        const severityStr = match[4] ?? "error";
        const code = match[5] ?? "TS0000";
        const message = match[6] ?? "Unknown error";
        const severity: Severity = severityStr === "warning" ? "warning" : "error";

        errors.push({
          signature: createSignature(code, message),
          code,
          message,
          file: file.trim(),
          line: parseInt(lineNum, 10),
          column: parseInt(colNum, 10),
          severity,
          raw: trimmed,
          context: getSuggestion(code, message),
        });
      }
    }

    return errors;
  },
};
