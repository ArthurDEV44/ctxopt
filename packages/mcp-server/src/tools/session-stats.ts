/**
 * Session Stats Tool
 *
 * Provides session-wide statistics including:
 * - Total tokens saved
 * - Per-tool usage breakdown
 * - Estimated cost reduction
 * - Session duration and activity
 */

import { z } from "zod";

import type { ToolDefinition } from "./registry.js";
import {
  getSessionTracker,
  resetSessionTracker,
  type SessionStats,
} from "../analytics/session-tracker.js";

// Anthropic pricing (per 1M tokens) - Claude 3.5 Sonnet
const ANTHROPIC_PRICING = {
  input: 3.0, // $3 per 1M input tokens
  output: 15.0, // $15 per 1M output tokens
};

export const sessionStatsSchema = {
  type: "object" as const,
  properties: {
    action: {
      type: "string",
      enum: ["get", "reset", "export"],
      description: "Action to perform: get stats, reset session, or export JSON",
    },
    format: {
      type: "string",
      enum: ["summary", "detailed", "json"],
      description: "Output format (default: summary)",
    },
  },
  required: [],
};

const inputSchema = z.object({
  action: z.enum(["get", "reset", "export"]).optional().default("get"),
  format: z.enum(["summary", "detailed", "json"]).optional().default("summary"),
});

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Calculate cost reduction based on tokens saved
 */
function calculateCostReduction(tokensSaved: number): number {
  // Assume saved tokens would have been input tokens
  return (tokensSaved / 1_000_000) * ANTHROPIC_PRICING.input;
}

/**
 * Format summary output
 */
function formatSummary(stats: SessionStats): string {
  const durationMs = Date.now() - stats.startTime.getTime();
  const optimizationRate =
    stats.totalTokensIn > 0
      ? ((stats.totalTokensSaved / stats.totalTokensIn) * 100).toFixed(1)
      : "0";
  const costSaved = calculateCostReduction(stats.totalTokensSaved);

  const parts: string[] = [];

  parts.push("## Session Statistics\n");

  // Overview table
  parts.push("### Overview\n");
  parts.push("| Metric | Value |");
  parts.push("|--------|-------|");
  parts.push(`| Session Duration | ${formatDuration(durationMs)} |`);
  parts.push(`| Total Tool Calls | ${stats.totalInvocations} |`);
  parts.push(`| Tokens Processed | ${stats.totalTokensIn.toLocaleString()} |`);
  parts.push(`| Tokens Saved | ${stats.totalTokensSaved.toLocaleString()} |`);
  parts.push(`| Optimization Rate | ${optimizationRate}% |`);
  parts.push(`| Est. Cost Saved | $${costSaved.toFixed(4)} |`);

  if (stats.totalErrors > 0) {
    parts.push(`| Errors | ${stats.totalErrors} |`);
  }

  // Top tools
  const toolEntries = Object.entries(stats.toolStats)
    .sort((a, b) => b[1].tokensSaved - a[1].tokensSaved)
    .slice(0, 5);

  if (toolEntries.length > 0) {
    parts.push("\n### Top Tools by Savings\n");
    parts.push("| Tool | Calls | Saved |");
    parts.push("|------|-------|-------|");
    for (const [name, toolStats] of toolEntries) {
      parts.push(
        `| ${name} | ${toolStats.invocations} | ${toolStats.tokensSaved.toLocaleString()} |`
      );
    }
  }

  return parts.join("\n");
}

/**
 * Format detailed output
 */
function formatDetailed(stats: SessionStats): string {
  const durationMs = Date.now() - stats.startTime.getTime();
  const optimizationRate =
    stats.totalTokensIn > 0
      ? ((stats.totalTokensSaved / stats.totalTokensIn) * 100).toFixed(1)
      : "0";
  const costSaved = calculateCostReduction(stats.totalTokensSaved);

  const parts: string[] = [];

  parts.push("## Session Statistics (Detailed)\n");

  // Session info
  parts.push("### Session Info\n");
  parts.push(`- **Started**: ${stats.startTime.toISOString()}`);
  parts.push(`- **Duration**: ${formatDuration(durationMs)}`);
  parts.push(`- **Last Activity**: ${stats.lastActivityTime.toISOString()}`);

  // Token metrics
  parts.push("\n### Token Metrics\n");
  parts.push("| Metric | Value |");
  parts.push("|--------|-------|");
  parts.push(`| Tokens In | ${stats.totalTokensIn.toLocaleString()} |`);
  parts.push(`| Tokens Out | ${stats.totalTokensOut.toLocaleString()} |`);
  parts.push(`| Tokens Saved | ${stats.totalTokensSaved.toLocaleString()} |`);
  parts.push(`| Optimization Rate | ${optimizationRate}% |`);
  parts.push(`| Est. Cost Saved | $${costSaved.toFixed(4)} |`);

  // All tools breakdown
  const toolEntries = Object.entries(stats.toolStats).sort(
    (a, b) => b[1].invocations - a[1].invocations
  );

  if (toolEntries.length > 0) {
    parts.push("\n### Tool Breakdown\n");
    parts.push("| Tool | Calls | In | Out | Saved | Avg Time |");
    parts.push("|------|-------|-----|-----|-------|----------|");

    for (const [name, toolStats] of toolEntries) {
      const avgTime =
        toolStats.invocations > 0
          ? Math.round(toolStats.totalDurationMs / toolStats.invocations)
          : 0;
      parts.push(
        `| ${name} | ${toolStats.invocations} | ${toolStats.tokensIn.toLocaleString()} | ${toolStats.tokensOut.toLocaleString()} | ${toolStats.tokensSaved.toLocaleString()} | ${avgTime}ms |`
      );
    }
  }

  // Error summary
  if (stats.totalErrors > 0) {
    parts.push(`\n### Errors: ${stats.totalErrors} total`);
  }

  return parts.join("\n");
}

/**
 * Format JSON export
 */
function formatJson(stats: SessionStats): string {
  const durationMs = Date.now() - stats.startTime.getTime();
  const optimizationRate =
    stats.totalTokensIn > 0 ? stats.totalTokensSaved / stats.totalTokensIn : 0;

  return JSON.stringify(
    {
      session: {
        startTime: stats.startTime.toISOString(),
        lastActivityTime: stats.lastActivityTime.toISOString(),
        durationMs,
      },
      totals: {
        invocations: stats.totalInvocations,
        tokensIn: stats.totalTokensIn,
        tokensOut: stats.totalTokensOut,
        tokensSaved: stats.totalTokensSaved,
        optimizationRate: Math.round(optimizationRate * 1000) / 10, // percentage with 1 decimal
        estimatedCostSavedUsd: calculateCostReduction(stats.totalTokensSaved),
        errors: stats.totalErrors,
      },
      tools: stats.toolStats,
    },
    null,
    2
  );
}

export async function executeSessionStats(
  args: unknown
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { action, format } = inputSchema.parse(args);

  if (action === "reset") {
    resetSessionTracker();
    return {
      content: [{ type: "text", text: "Session statistics have been reset." }],
    };
  }

  const tracker = getSessionTracker();
  const stats = tracker.getStats();

  let output: string;

  if (action === "export" || format === "json") {
    output = formatJson(stats);
  } else if (format === "detailed") {
    output = formatDetailed(stats);
  } else {
    output = formatSummary(stats);
  }

  return {
    content: [{ type: "text", text: output }],
  };
}

export const sessionStatsTool: ToolDefinition = {
  name: "session_stats",
  description:
    "Get session-wide statistics including tokens saved, cost reduction, and per-tool usage breakdown. Use action='reset' to start fresh or action='export' for JSON output.",
  inputSchema: sessionStatsSchema,
  execute: executeSessionStats,
};
