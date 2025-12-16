/**
 * ESLint Error Parser
 *
 * Parses ESLint output in various formats (default, stylish, compact).
 */

import type { BuildParser, ParsedError, Severity } from "./types.js";

// Default/stylish format: /path/file.js
//   12:5  error  'foo' is not defined  no-undef
const ESLINT_DEFAULT_PATTERN = /^\s*(\d+):(\d+)\s+(error|warning)\s+(.+?)\s{2,}(\S+)\s*$/;

// File header pattern
const FILE_HEADER_PATTERN = /^([^\s].*\.(js|jsx|ts|tsx|mjs|cjs|vue|svelte))$/;

// Compact format: /path/file.js: line 12, col 5, Error - 'foo' is not defined (no-undef)
const ESLINT_COMPACT_PATTERN =
  /^(.+?):\s*line\s+(\d+),\s*col\s+(\d+),\s*(Error|Warning)\s+-\s+(.+?)\s*\((\S+)\)\s*$/;

// Summary pattern
const SUMMARY_PATTERN = /(\d+)\s+problems?\s*\((\d+)\s+errors?,\s*(\d+)\s+warnings?\)/;

/**
 * Get suggestion based on ESLint rule
 */
function getSuggestion(rule: string, message: string): string | undefined {
  switch (rule) {
    case "no-undef": {
      const undefMatch = message.match(/'(\w+)' is not defined/);
      if (undefMatch?.[1]) {
        return `Import or declare '${undefMatch[1]}' before using it.`;
      }
      break;
    }

    case "no-unused-vars":
      return "Remove the unused variable or use it in your code.";

    case "no-console":
      return "Remove console statements or disable the rule for development.";

    case "semi":
      return "Add or remove semicolons consistently.";

    case "quotes":
      return "Use consistent quote style (single or double).";

    case "indent":
      return "Fix indentation to match the configured style.";

    case "@typescript-eslint/no-explicit-any":
      return "Replace 'any' with a more specific type.";

    case "@typescript-eslint/no-unused-vars":
      return "Remove the unused variable or prefix with underscore.";

    case "react-hooks/rules-of-hooks":
      return "Hooks can only be called at the top level of a function component.";

    case "react-hooks/exhaustive-deps":
      return "Add missing dependencies to the dependency array.";

    case "import/no-unresolved":
      return "Check if the module exists and is properly installed.";
  }

  return undefined;
}

/**
 * Create error signature for grouping
 */
function createSignature(rule: string, message: string): string {
  const normalizedMessage = message
    .replace(/'[^']+'/g, "'X'")
    .replace(/"[^"]+"/g, '"X"')
    .replace(/\d+/g, "N")
    .replace(/\s+/g, " ")
    .trim();

  return `${rule}:${normalizedMessage}`;
}

export const eslintParser: BuildParser = {
  name: "eslint",
  supportedTools: ["eslint"],

  canParse(output: string): boolean {
    return (
      ESLINT_DEFAULT_PATTERN.test(output) ||
      ESLINT_COMPACT_PATTERN.test(output) ||
      SUMMARY_PATTERN.test(output) ||
      (output.includes("error") && output.includes("warning") && /\d+:\d+/.test(output))
    );
  },

  parse(output: string): ParsedError[] {
    const errors: ParsedError[] = [];
    const lines = output.split("\n");

    let currentFile = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check for file header
      const fileMatch = line.match(FILE_HEADER_PATTERN);
      if (fileMatch?.[1]) {
        currentFile = fileMatch[1];
        continue;
      }

      // Try default/stylish format
      const defaultMatch = trimmed.match(ESLINT_DEFAULT_PATTERN);
      if (defaultMatch && currentFile) {
        const lineNum = defaultMatch[1] ?? "0";
        const colNum = defaultMatch[2] ?? "0";
        const severityStr = defaultMatch[3] ?? "error";
        const message = defaultMatch[4] ?? "Unknown error";
        const rule = defaultMatch[5] ?? "unknown-rule";
        const severity: Severity = severityStr === "warning" ? "warning" : "error";

        errors.push({
          signature: createSignature(rule, message),
          code: rule,
          message,
          file: currentFile,
          line: parseInt(lineNum, 10),
          column: parseInt(colNum, 10),
          severity,
          raw: `${currentFile}: ${trimmed}`,
          context: getSuggestion(rule, message),
        });
        continue;
      }

      // Try compact format
      const compactMatch = trimmed.match(ESLINT_COMPACT_PATTERN);
      if (compactMatch) {
        const file = compactMatch[1] ?? "unknown";
        const lineNum = compactMatch[2] ?? "0";
        const colNum = compactMatch[3] ?? "0";
        const severityStr = compactMatch[4] ?? "Error";
        const message = compactMatch[5] ?? "Unknown error";
        const rule = compactMatch[6] ?? "unknown-rule";
        const severity: Severity = severityStr.toLowerCase() === "warning" ? "warning" : "error";

        errors.push({
          signature: createSignature(rule, message),
          code: rule,
          message,
          file,
          line: parseInt(lineNum, 10),
          column: parseInt(colNum, 10),
          severity,
          raw: trimmed,
          context: getSuggestion(rule, message),
        });
      }
    }

    return errors;
  },
};
