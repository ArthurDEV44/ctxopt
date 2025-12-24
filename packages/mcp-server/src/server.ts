/**
 * CtxOpt MCP Server
 *
 * Main server implementation with dynamic tool loading.
 * Only core tools are loaded at startup to minimize token consumption.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Middleware
import { createMiddlewareChain, type MiddlewareChain } from "./middleware/chain.js";
import { createLoggingMiddleware } from "./middleware/logging.js";

// Tools
import { createToolRegistry, type ToolRegistry } from "./tools/registry.js";
import { getDynamicLoader, resetDynamicLoader } from "./tools/dynamic-loader.js";
import { discoverToolsTool } from "./tools/discover-tools.js";

export interface ServerConfig {
  verbose?: boolean;
  /** Load all tools at startup instead of using dynamic loading */
  loadAllTools?: boolean;
}

export interface ServerInstance {
  server: Server;
  middleware: MiddlewareChain;
  tools: ToolRegistry;
}

/**
 * Create and configure the MCP server
 */
export async function createServer(config: ServerConfig = {}): Promise<ServerInstance> {
  // Reset dynamic loader for fresh start
  resetDynamicLoader();
  const loader = getDynamicLoader();

  // Create middleware chain
  const middleware = createMiddlewareChain();
  middleware.use(createLoggingMiddleware({ verbose: config.verbose ?? false }));

  // Create tool registry
  const tools = createToolRegistry();
  tools.setMiddlewareChain(middleware);

  // Register the discover_tools meta-tool (always available)
  tools.register(discoverToolsTool);

  // Load tools based on configuration
  if (config.loadAllTools) {
    // Fallback: load all tools for clients that don't support dynamic loading
    const allTools = await loader.loadAllTools();
    for (const tool of allTools) {
      tools.register(tool);
    }
  } else {
    // Default: load only core tools (auto_optimize, smart_file_read)
    const coreTools = await loader.loadCoreTools();
    for (const tool of coreTools) {
      tools.register(tool);
    }
  }

  // Connect dynamic loader to registry
  loader.onToolsChanged(() => {
    // Register newly loaded tools
    for (const tool of loader.getLoadedTools()) {
      if (!tools.get(tool.name)) {
        tools.register(tool);
      }
    }
  });

  // Create MCP server
  const server = new Server(
    {
      name: "@ctxopt/mcp-server",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle ListTools request
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.getToolDefinitions(),
  }));

  // Handle CallTool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Try to load tool dynamically if not found
    if (!tools.get(name)) {
      const loaded = await loader.loadByNames([name]);
      for (const tool of loaded) {
        tools.register(tool);
      }
    }

    const result = await tools.execute(name, args);

    return {
      content: result.content,
      isError: result.isError,
    };
  });

  // Set up notification for tool list changes
  tools.onToolsChanged(() => {
    // Send notification to client that tool list has changed
    server.notification({
      method: "notifications/tools/list_changed",
    });
  });

  return {
    server,
    middleware,
    tools,
  };
}

/**
 * Run the MCP server on stdio transport
 */
export async function runServer(config: ServerConfig = {}): Promise<void> {
  const { server } = await createServer(config);

  const transport = new StdioServerTransport();

  // Handle server close event
  server.onclose = async () => {
    if (config.verbose) {
      console.error("[ctxopt] Server connection closed");
    }
    process.exit(0);
  };

  await server.connect(transport);

  console.error("CtxOpt MCP Server running on stdio");
}
