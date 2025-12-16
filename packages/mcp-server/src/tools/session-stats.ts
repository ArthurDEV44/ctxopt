/**
 * Session Stats Tool
 *
 * Returns real-time statistics from the current session state.
 */

import { z } from "zod";
import type { SessionState } from "../state/session.js";
import { getSessionStats, getRecentCommands } from "../state/session.js";
import type { ToolDefinition } from "./registry.js";

export const sessionStatsSchema = {
  type: "object" as const,
  properties: {
    includeHistory: {
      type: "boolean",
      description: "Include recent command history (default: false)",
    },
    historyLimit: {
      type: "number",
      description: "Number of recent commands to include (default: 5)",
    },
  },
  required: [],
};

const inputSchema = z.object({
  includeHistory: z.boolean().optional().default(false),
  historyLimit: z.number().optional().default(5),
});

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

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}k`;
  }
  return tokens.toString();
}

export async function executeSessionStats(
  args: unknown,
  state: SessionState
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { includeHistory, historyLimit } = inputSchema.parse(args);

  const stats = getSessionStats(state);

  let result = `## Session Statistics

**Session ID:** \`${stats.sessionId}\`
**Duration:** ${formatDuration(stats.duration)}
**Commands Executed:** ${stats.commandCount}

### Token Usage
- **Tokens Used:** ${formatTokens(stats.tokensUsed)}
- **Tokens Saved:** ${formatTokens(stats.tokensSaved)}
- **Savings:** ${stats.savingsPercent}%

### Patterns Detected
- **Unique Errors Cached:** ${stats.uniqueErrors}
- **Retry Patterns:** ${stats.retryPatterns}
`;

  if (state.project) {
    result += `
### Project Info
- **Name:** ${state.project.name}
- **Type:** ${state.project.type}
- **Path:** \`${state.project.rootPath}\`
`;
  }

  if (includeHistory && stats.commandCount > 0) {
    const recentCommands = getRecentCommands(state, historyLimit);

    result += `
### Recent Commands

| Tool | Tokens In | Tokens Out | Saved | Filtered |
|------|-----------|------------|-------|----------|
`;

    for (const cmd of recentCommands) {
      result += `| ${cmd.toolName} | ${formatTokens(cmd.tokensIn)} | ${formatTokens(cmd.tokensOut)} | ${formatTokens(cmd.tokensSaved)} | ${cmd.wasFiltered ? "Yes" : "No"} |\n`;
    }
  }

  result += `
---
*Stats from CtxOpt MCP Server*`;

  return {
    content: [{ type: "text", text: result }],
  };
}

export const sessionStatsTool: ToolDefinition = {
  name: "session_stats",
  description:
    "Get real-time statistics for the current MCP session including token usage, savings, patterns detected, and command history.",
  inputSchema: sessionStatsSchema,
  execute: executeSessionStats,
};
