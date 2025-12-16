/**
 * Logging Middleware
 *
 * Logs tool calls and results when verbose mode is enabled.
 */

import type { Middleware, ToolContext, ToolResult, MiddlewareConfig } from "./types.js";

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString();
  return `${(tokens / 1000).toFixed(1)}k`;
}

export function createLoggingMiddleware(config: MiddlewareConfig): Middleware {
  const verbose = config.verbose;

  return {
    name: "logging",
    priority: 0, // Run first

    async beforeTool(ctx: ToolContext): Promise<ToolContext> {
      if (!verbose) return ctx;

      const timestamp = new Date().toISOString().slice(11, 23);
      console.error(
        `${COLORS.dim}[${timestamp}]${COLORS.reset} ${COLORS.cyan}→${COLORS.reset} ${ctx.toolName}`,
        ctx.arguments
      );

      return ctx;
    },

    async afterTool(ctx: ToolContext, result: ToolResult): Promise<ToolResult> {
      if (!verbose) return result;

      const duration = Date.now() - ctx.startTime;
      const timestamp = new Date().toISOString().slice(11, 23);

      const statusColor = result.isError ? COLORS.red : COLORS.green;
      const statusIcon = result.isError ? "✗" : "✓";

      const parts = [
        `${COLORS.dim}[${timestamp}]${COLORS.reset}`,
        `${statusColor}${statusIcon}${COLORS.reset}`,
        ctx.toolName,
        `${COLORS.dim}(${formatDuration(duration)})${COLORS.reset}`,
      ];

      if (result.tokensOut > 0) {
        parts.push(`${COLORS.dim}tokens:${formatTokens(result.tokensOut)}${COLORS.reset}`);
      }

      if (result.tokensSaved > 0) {
        parts.push(`${COLORS.green}saved:${formatTokens(result.tokensSaved)}${COLORS.reset}`);
      }

      if (result.wasFiltered) {
        parts.push(`${COLORS.yellow}[filtered]${COLORS.reset}`);
      }

      console.error(parts.join(" "));

      return result;
    },

    async onError(ctx: ToolContext, error: Error): Promise<ToolResult | null> {
      if (!verbose) return null;

      const duration = Date.now() - ctx.startTime;
      const timestamp = new Date().toISOString().slice(11, 23);

      console.error(
        `${COLORS.dim}[${timestamp}]${COLORS.reset} ${COLORS.red}✗${COLORS.reset} ${ctx.toolName}`,
        `${COLORS.dim}(${formatDuration(duration)})${COLORS.reset}`,
        `${COLORS.red}Error: ${error.message}${COLORS.reset}`
      );

      // Don't handle the error, just log it
      return null;
    },
  };
}
