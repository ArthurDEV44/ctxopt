/**
 * Detect Retry Loop Tool
 *
 * Analyzes command history to detect retry loops - patterns where
 * the same command is being executed repeatedly, often indicating
 * an unresolved build/test failure.
 */

import { z } from "zod";

import type { ToolDefinition } from "./registry.js";
import {
  normalizeCommand,
  getBaseCommand,
  areCommandsSimilar,
  isCommonRetryCommand,
} from "../utils/command-normalizer.js";

export const detectRetryLoopSchema = {
  type: "object" as const,
  properties: {
    commands: {
      type: "array",
      items: { type: "string" },
      description: "Recent command history (most recent last)",
    },
    errors: {
      type: "array",
      items: { type: "string" },
      description: "Optional: error outputs associated with commands",
    },
    threshold: {
      type: "number",
      description: "Minimum repetitions to consider a loop (default: 3)",
    },
  },
  required: ["commands"],
};

const inputSchema = z.object({
  commands: z.array(z.string()).min(1),
  errors: z.array(z.string()).optional(),
  threshold: z.number().min(2).optional().default(3),
});

interface RetryLoopResult {
  isLoop: boolean;
  loopType: string | null;
  baseCommand: string | null;
  repetitions: number;
  consecutiveRuns: number;
  suggestions: string[];
  analysis: string;
}

/**
 * Analyze commands to find retry patterns
 */
function analyzeRetryPatterns(
  commands: string[],
  threshold: number
): { groups: Map<string, string[]>; maxRepetitions: number; mostRepeated: string | null } {
  const groups = new Map<string, string[]>();

  for (const cmd of commands) {
    const normalized = normalizeCommand(cmd);
    const existing = groups.get(normalized) || [];
    existing.push(cmd);
    groups.set(normalized, existing);
  }

  let maxRepetitions = 0;
  let mostRepeated: string | null = null;

  for (const [normalized, cmds] of groups.entries()) {
    if (cmds.length > maxRepetitions) {
      maxRepetitions = cmds.length;
      mostRepeated = normalized;
    }
  }

  return { groups, maxRepetitions, mostRepeated };
}

/**
 * Count consecutive runs of similar commands at the end of history
 */
function countConsecutiveRuns(commands: string[]): number {
  if (commands.length === 0) return 0;

  const lastCmd = commands[commands.length - 1]!;
  let count = 1;

  for (let i = commands.length - 2; i >= 0; i--) {
    if (areCommandsSimilar(commands[i]!, lastCmd)) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

/**
 * Detect the type of command (build, test, lint, etc.)
 */
function detectCommandType(cmd: string): string {
  const lower = cmd.toLowerCase();

  if (/\btest\b|vitest|jest|mocha|ava/.test(lower)) return "test";
  if (/\bbuild\b|compile|tsc\b/.test(lower)) return "build";
  if (/\blint\b|eslint|prettier/.test(lower)) return "lint";
  if (/\bcheck\b|type-check/.test(lower)) return "typecheck";
  if (/\bformat\b/.test(lower)) return "format";
  if (/cargo\s+(build|test|check)/.test(lower)) return lower.includes("test") ? "test" : "build";
  if (/go\s+(build|test)/.test(lower)) return lower.includes("test") ? "test" : "build";

  return "command";
}

/**
 * Generate suggestions based on the loop type and errors
 */
function generateSuggestions(
  loopType: string,
  baseCommand: string,
  errors?: string[]
): string[] {
  const suggestions: string[] = [];

  // Common suggestions based on loop type
  switch (loopType) {
    case "build":
      suggestions.push("Check the specific error message for the root cause");
      suggestions.push("Try `git stash` to test with a clean working state");
      suggestions.push("Look for circular dependencies or missing imports");
      break;
    case "test":
      suggestions.push("Run a single failing test to isolate the issue");
      suggestions.push("Check if tests depend on external state or services");
      suggestions.push("Review test fixtures and mock data");
      break;
    case "lint":
      suggestions.push("Run with --fix flag to auto-correct issues");
      suggestions.push("Check if rules are conflicting with each other");
      suggestions.push("Consider disabling the problematic rule temporarily");
      break;
    case "typecheck":
      suggestions.push("Check for missing type definitions (@types/*)");
      suggestions.push("Look for incorrect generic type usage");
      suggestions.push("Review recent changes to shared type files");
      break;
  }

  // Error-based suggestions
  if (errors && errors.length > 0) {
    const errorText = errors.join("\n").toLowerCase();

    if (errorText.includes("cannot find module") || errorText.includes("module not found")) {
      suggestions.unshift("Run `npm install` or `bun install` to install missing dependencies");
    }
    if (errorText.includes("enoent") || errorText.includes("no such file")) {
      suggestions.unshift("Check if referenced files exist and paths are correct");
    }
    if (errorText.includes("permission denied") || errorText.includes("eacces")) {
      suggestions.unshift("Check file permissions or run with appropriate privileges");
    }
    if (errorText.includes("out of memory") || errorText.includes("heap")) {
      suggestions.unshift("Increase Node.js memory limit with --max-old-space-size");
    }
    if (errorText.includes("timeout") || errorText.includes("timed out")) {
      suggestions.unshift("Check for infinite loops or long-running operations");
    }
  }

  // General suggestion
  suggestions.push("Consider using `deduplicate_errors` to group similar errors");

  return [...new Set(suggestions)].slice(0, 5);
}

/**
 * Format the analysis result
 */
function formatResult(result: RetryLoopResult): string {
  const parts: string[] = [];

  if (result.isLoop) {
    parts.push("## Retry Loop Detected\n");
    parts.push(`**Command**: \`${result.baseCommand}\``);
    parts.push(`**Type**: ${result.loopType}`);
    parts.push(`**Total runs**: ${result.repetitions}`);
    parts.push(`**Consecutive runs**: ${result.consecutiveRuns}`);
    parts.push("");
    parts.push("### Suggestions\n");
    result.suggestions.forEach((s, i) => {
      parts.push(`${i + 1}. ${s}`);
    });
  } else {
    parts.push("## No Retry Loop Detected\n");
    parts.push(result.analysis);
  }

  return parts.join("\n");
}

export async function executeDetectRetryLoop(
  args: unknown
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { commands, errors, threshold } = inputSchema.parse(args);

  // Analyze patterns
  const { maxRepetitions, mostRepeated } = analyzeRetryPatterns(commands, threshold);
  const consecutiveRuns = countConsecutiveRuns(commands);

  // Determine if this is a retry loop
  const isLoop = maxRepetitions >= threshold || consecutiveRuns >= threshold;

  let result: RetryLoopResult;

  if (isLoop && mostRepeated) {
    const loopType = detectCommandType(mostRepeated);
    const baseCommand = getBaseCommand(mostRepeated);
    const suggestions = generateSuggestions(loopType, baseCommand, errors);

    result = {
      isLoop: true,
      loopType,
      baseCommand: mostRepeated,
      repetitions: maxRepetitions,
      consecutiveRuns,
      suggestions,
      analysis: `Detected ${maxRepetitions} runs of similar ${loopType} command`,
    };
  } else {
    result = {
      isLoop: false,
      loopType: null,
      baseCommand: null,
      repetitions: maxRepetitions,
      consecutiveRuns,
      suggestions: [],
      analysis: `No retry loop detected. Max command repetitions: ${maxRepetitions}, Consecutive: ${consecutiveRuns}`,
    };
  }

  const output = formatResult(result);

  return {
    content: [{ type: "text", text: output }],
  };
}

export const detectRetryLoopTool: ToolDefinition = {
  name: "detect_retry_loop",
  description:
    "Detect retry loops in command history. Identifies when build/test commands are being repeatedly executed without success, and suggests alternative approaches.",
  inputSchema: detectRetryLoopSchema,
  execute: executeDetectRetryLoop,
};
