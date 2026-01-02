/**
 * Code Execute Tool
 *
 * Executes TypeScript code with Distill SDK in a sandboxed environment.
 * Reduces MCP token overhead by ~98% compared to individual tool calls.
 */

import type { ToolDefinition } from "./registry.js";
import { executeSandbox, DEFAULT_LIMITS } from "../sandbox/index.js";

/**
 * Input schema with semantic descriptions
 */
const codeExecuteSchema = {
  type: "object" as const,
  properties: {
    code: {
      type: "string",
      description:
        "TypeScript code to execute. Use 'return' to output results. " +
        "Access SDK via 'ctx' object (ctx.files, ctx.compress, ctx.code, etc.)",
    },
    timeout: {
      type: "number",
      description: "Execution timeout in ms (1000-30000)",
      minimum: 1000,
      maximum: 30000,
      default: 5000,
    },
  },
  required: ["code"],
};

/**
 * Output schema per MCP 2025-06-18 spec
 */
const codeExecuteOutputSchema = {
  type: "object" as const,
  properties: {
    success: { type: "boolean", description: "Whether execution succeeded" },
    output: { type: "string", description: "Execution result or error message" },
    executionTimeMs: { type: "number", description: "Time taken in milliseconds" },
    tokensUsed: { type: "number", description: "Tokens in output" },
  },
  required: ["success", "output"],
};

interface CodeExecuteArgs {
  code: string;
  timeout?: number;
}

/**
 * Execute code in sandbox
 */
async function executeCodeExecute(
  args: unknown
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { code, timeout = DEFAULT_LIMITS.timeout } = args as CodeExecuteArgs;

  // Validate timeout
  const safeTimeout = Math.min(
    Math.max(timeout, 1000), // Min 1 second
    DEFAULT_LIMITS.maxTimeout // Max 30 seconds
  );

  // Execute in sandbox
  const result = await executeSandbox(code, {
    workingDir: process.cwd(),
    timeout: safeTimeout,
    memoryLimit: DEFAULT_LIMITS.memoryLimit,
    maxOutputTokens: DEFAULT_LIMITS.maxOutputTokens,
  });

  if (!result.success) {
    return {
      content: [
        {
          type: "text",
          text: `[ERR] ${result.error}\n\nExecution time: ${result.stats.executionTimeMs}ms`,
        },
      ],
      isError: true,
    };
  }

  // Format output
  let output: string;
  if (typeof result.output === "string") {
    output = result.output;
  } else if (result.output === null || result.output === undefined) {
    output = "(no output)";
  } else {
    output = JSON.stringify(result.output, null, 2);
  }

  const header = `[OK] ${result.stats.executionTimeMs}ms, ${result.stats.tokensUsed} tokens`;

  return {
    content: [
      {
        type: "text",
        text: `${header}\n\n${output}`,
      },
    ],
  };
}

/**
 * Tool description with SDK reference
 */
const DESCRIPTION = `Execute TypeScript with Distill SDK. 98% fewer tokens than tool calls.

SDK (ctx):
  compress: auto(content,hint?) logs(logs) diff(diff) semantic(content,ratio?)
  code: parse(content,lang) extract(content,lang,{type,name}) skeleton(content,lang)
  files: read(path) exists(path) glob(pattern)
  utils: countTokens(text) detectType(content) detectLanguage(path)

Example: return ctx.compress.auto(ctx.files.read("logs.txt"))`;

export const codeExecuteTool: ToolDefinition = {
  name: "code_execute",
  description: DESCRIPTION,
  inputSchema: codeExecuteSchema,
  outputSchema: codeExecuteOutputSchema,
  annotations: {
    title: "Execute TypeScript Code",
    readOnlyHint: false, // Can modify files via ctx.files
    idempotentHint: false, // Results depend on filesystem state
    longRunningHint: true, // May take up to 30s
  },
  execute: executeCodeExecute,
};
