#!/usr/bin/env node

import { runServer } from "../dist/server.js";

const args = process.argv.slice(2);

const config = {
  apiKey: undefined,
  apiBaseUrl: "https://app.ctxopt.dev/api",
};

// Parse command line arguments
for (const arg of args) {
  if (arg.startsWith("--api-key=")) {
    config.apiKey = arg.split("=")[1];
  } else if (arg.startsWith("--api-url=")) {
    config.apiBaseUrl = arg.split("=")[1];
  } else if (arg === "--help" || arg === "-h") {
    console.log(`
CtxOpt MCP Server - Context Engineering Optimizer

Usage:
  npx @ctxopt/mcp-server [options]

Options:
  --api-key=KEY    Your CtxOpt API key (optional, enables cloud sync)
  --api-url=URL    Custom API URL (default: https://app.ctxopt.dev/api)
  --help, -h       Show this help message

Examples:
  npx @ctxopt/mcp-server
  npx @ctxopt/mcp-server --api-key=ctx_xxx

For Claude Code integration, add to your settings.json:
  {
    "mcpServers": {
      "ctxopt": {
        "command": "npx",
        "args": ["@ctxopt/mcp-server", "--api-key=YOUR_KEY"]
      }
    }
  }

Learn more: https://ctxopt.dev/docs/mcp
`);
    process.exit(0);
  }
}

runServer(config).catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
