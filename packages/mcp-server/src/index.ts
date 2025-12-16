/**
 * @ctxopt/mcp-server
 *
 * MCP Server for CtxOpt - Context Engineering Optimizer
 *
 * Provides tools for analyzing and optimizing LLM context usage.
 */

// Server
export { createServer, runServer, type ServerConfig, type ServerInstance } from "./server.js";

// State management
export * from "./state/index.js";

// Middleware
export * from "./middleware/index.js";

// Tools
export { analyzeContext } from "./tools/analyze-context.js";
export { getStats } from "./tools/get-stats.js";
export { optimizationTips } from "./tools/optimization-tips.js";
export { sessionStatsTool, executeSessionStats } from "./tools/session-stats.js";
export { createToolRegistry, getToolRegistry, type ToolRegistry, type ToolDefinition } from "./tools/registry.js";

// Utils
export * from "./utils/index.js";
