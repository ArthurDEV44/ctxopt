/**
 * Token Budget Tests
 *
 * Ensures tool definitions stay within token budgets to prevent
 * context window bloat from MCP tool descriptions.
 *
 * These tests guard against regression - any change that increases
 * token consumption will fail the test.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { countTokens } from "../utils/token-counter.js";

// Import all tool definitions
import { autoOptimizeTool } from "./auto-optimize.js";
import { smartFileReadTool } from "./smart-file-read.js";
import { discoverToolsTool } from "./discover-tools.js";
import { analyzeBuildOutputTool } from "./analyze-build-output.js";
import { compressContextTool } from "./compress-context.js";
import { semanticCompressTool } from "./semantic-compress.js";
import { diffCompressTool } from "./diff-compress.js";
import { summarizeLogsTool } from "./summarize-logs.js";
import { codeSkeletonTool } from "./code-skeleton.js";
import { contextBudgetTool } from "./context-budget.js";
import { conversationCompressTool } from "./conversation-compress.js";
import { deduplicateErrorsTool } from "./deduplicate-errors.js";
import { smartCacheTool } from "./smart-cache-tool.js";
import { smartPipelineTool } from "./smart-pipeline.js";
import type { ToolDefinition } from "./registry.js";

// ============================================================================
// Token Budgets (in tokens)
// ============================================================================

/**
 * Maximum tokens allowed per tool definition.
 *
 * 2024-12: Tightened budgets after schema optimization
 * 2026-01: Increased budgets to accommodate MCP 2025-06-18 spec requirements:
 *          - Semantic property descriptions for better LLM tool selection
 *          - Output schemas for structured validation
 *          - Tool annotations (readOnlyHint, idempotentHint, etc.)
 */
const TOKEN_BUDGETS = {
  // Core tools (always loaded) - includes semantic descriptions + outputSchema
  auto_optimize: 200, // +110 for outputSchema + semantic descriptions
  smart_file_read: 280, // +160 for outputSchema + detailed property descriptions
  discover_tools: 180, // +100 for outputSchema + semantic hints

  // Compress category - with semantic descriptions
  compress_context: 95,
  semantic_compress: 60,
  diff_compress: 75,
  conversation_compress: 110,

  // Analyze category
  analyze_build_output: 95,
  context_budget: 105,

  // Logs category
  summarize_logs: 180, // +65 for outputSchema + semantic descriptions
  deduplicate_errors: 65,

  // Code category
  code_skeleton: 75,
  smart_cache: 90,

  // Pipeline category
  smart_pipeline: 80,
} as const;

/**
 * Maximum tokens for the entire ListTools response (core tools only).
 * Currently: auto_optimize + smart_file_read + discover_tools
 * 2024-12: Reduced from 500 after schema optimization
 * 2026-01: Increased to 700 for MCP 2025-06-18 compliance (outputSchemas + annotations)
 */
const CORE_TOOLS_BUDGET = 700;

/**
 * Maximum tokens for all tools combined.
 * 2024-12: Reduced from 1500 after aggressive schema optimization
 * 2026-01: Increased to 1800 for MCP 2025-06-18 compliance
 */
const ALL_TOOLS_BUDGET = 1800;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Serialize a tool definition as it would appear in ListTools response
 */
function serializeToolForMCP(tool: ToolDefinition): string {
  return JSON.stringify({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  });
}

/**
 * Count tokens in a tool definition
 */
function countToolTokens(tool: ToolDefinition): number {
  const serialized = serializeToolForMCP(tool);
  return countTokens(serialized);
}

// ============================================================================
// All Tools
// ============================================================================

const ALL_TOOLS: ToolDefinition[] = [
  autoOptimizeTool,
  smartFileReadTool,
  discoverToolsTool,
  analyzeBuildOutputTool,
  compressContextTool,
  semanticCompressTool,
  diffCompressTool,
  summarizeLogsTool,
  codeSkeletonTool,
  contextBudgetTool,
  conversationCompressTool,
  deduplicateErrorsTool,
  smartCacheTool,
  smartPipelineTool,
];

const CORE_TOOLS: ToolDefinition[] = [
  autoOptimizeTool,
  smartFileReadTool,
  discoverToolsTool,
];

// ============================================================================
// Tests
// ============================================================================

describe("Tool Token Budgets", () => {
  describe("Individual tool budgets", () => {
    it.each(ALL_TOOLS.map((t) => [t.name, t]))(
      "%s should be under budget",
      (name, tool) => {
        const tokens = countToolTokens(tool as ToolDefinition);
        const budget = TOKEN_BUDGETS[name as keyof typeof TOKEN_BUDGETS];

        expect(tokens).toBeLessThanOrEqual(budget);

        // Log for visibility
        const usage = Math.round((tokens / budget) * 100);
        console.log(`  ${name}: ${tokens}/${budget} tokens (${usage}%)`);
      }
    );
  });

  describe("Aggregate budgets", () => {
    it("core tools should be under combined budget", () => {
      const totalTokens = CORE_TOOLS.reduce(
        (sum, tool) => sum + countToolTokens(tool),
        0
      );

      expect(totalTokens).toBeLessThanOrEqual(CORE_TOOLS_BUDGET);

      const usage = Math.round((totalTokens / CORE_TOOLS_BUDGET) * 100);
      console.log(
        `  Core tools total: ${totalTokens}/${CORE_TOOLS_BUDGET} tokens (${usage}%)`
      );
    });

    it("all tools should be under combined budget", () => {
      const totalTokens = ALL_TOOLS.reduce(
        (sum, tool) => sum + countToolTokens(tool),
        0
      );

      expect(totalTokens).toBeLessThanOrEqual(ALL_TOOLS_BUDGET);

      const usage = Math.round((totalTokens / ALL_TOOLS_BUDGET) * 100);
      console.log(
        `  All tools total: ${totalTokens}/${ALL_TOOLS_BUDGET} tokens (${usage}%)`
      );
    });
  });

  describe("Token distribution", () => {
    it("should have balanced token distribution (no tool > 20% of total)", () => {
      const totalTokens = ALL_TOOLS.reduce(
        (sum, tool) => sum + countToolTokens(tool),
        0
      );

      for (const tool of ALL_TOOLS) {
        const tokens = countToolTokens(tool);
        const percentage = (tokens / totalTokens) * 100;

        expect(percentage).toBeLessThan(20);
      }
    });
  });
});

describe("Tool Schema Constraints", () => {
  describe("Description length", () => {
    it.each(ALL_TOOLS.map((t) => [t.name, t]))(
      "%s description should be informative but not excessive (< 350 chars)",
      (name, tool) => {
        const description = (tool as ToolDefinition).description;
        // 2026-01: Increased from 150 to 350 chars per MCP best practices
        // Semantic descriptions improve LLM tool selection accuracy
        expect(description.length).toBeLessThan(350);
      }
    );
  });

  describe("Schema structure", () => {
    it.each(ALL_TOOLS.map((t) => [t.name, t]))(
      "%s should have well-documented properties",
      (name, tool) => {
        const schema = (tool as ToolDefinition).inputSchema;
        const serialized = JSON.stringify(schema);

        // Count "description" occurrences
        const descriptionCount = (serialized.match(/"description"/g) || [])
          .length;

        // 2026-01: Increased to 10 to allow semantic property descriptions
        // per MCP 2025-06-18 best practices for LLM guidance
        expect(descriptionCount).toBeLessThanOrEqual(10);
      }
    );
  });
});

describe("ListTools Response Size", () => {
  it("should generate ListTools response for core tools within budget", () => {
    const response = {
      tools: CORE_TOOLS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };

    const serialized = JSON.stringify(response);
    const tokens = countTokens(serialized);

    // 2026-01: Increased from 600 to 900 tokens for semantic descriptions
    expect(tokens).toBeLessThan(900);

    console.log(`  ListTools (core): ${serialized.length} chars, ${tokens} tokens`);
  });

  it("should generate ListTools response for all tools within budget", () => {
    const response = {
      tools: ALL_TOOLS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };

    const serialized = JSON.stringify(response);
    const tokens = countTokens(serialized);

    // 2026-01: Increased from 1800 to 2200 tokens for MCP 2025-06-18 compliance
    expect(tokens).toBeLessThan(2200);

    console.log(`  ListTools (all): ${serialized.length} chars, ${tokens} tokens`);
  });
});

describe("MCP 2025-06-18 Compliance Verification", () => {
  /**
   * 2026-01: Updated to verify MCP 2025-06-18 compliance instead of
   * token reduction. The semantic descriptions and outputSchemas
   * intentionally add tokens for better LLM tool selection.
   *
   * These tests verify tools have the required MCP 2025-06-18 features.
   */

  it("auto_optimize should have outputSchema and annotations", () => {
    expect(autoOptimizeTool.outputSchema).toBeDefined();
    expect(autoOptimizeTool.annotations).toBeDefined();
    expect(autoOptimizeTool.annotations?.readOnlyHint).toBe(true);
    expect(autoOptimizeTool.annotations?.idempotentHint).toBe(true);
  });

  it("smart_file_read should have outputSchema and annotations", () => {
    expect(smartFileReadTool.outputSchema).toBeDefined();
    expect(smartFileReadTool.annotations).toBeDefined();
    expect(smartFileReadTool.annotations?.readOnlyHint).toBe(true);
  });

  it("discover_tools should have outputSchema and annotations", () => {
    expect(discoverToolsTool.outputSchema).toBeDefined();
    expect(discoverToolsTool.annotations).toBeDefined();
    expect(discoverToolsTool.annotations?.readOnlyHint).toBe(true);
  });

  it("core tools should have semantic property descriptions", () => {
    for (const tool of CORE_TOOLS) {
      const schema = tool.inputSchema as Record<string, unknown>;
      const properties = schema.properties as Record<string, { description?: string }>;

      // Each property should have a description
      for (const [propName, propDef] of Object.entries(properties)) {
        expect(propDef.description).toBeDefined();
        expect(propDef.description?.length).toBeGreaterThan(10);
      }
    }
  });
});

describe("Regression Prevention", () => {
  /**
   * Snapshot of current token counts.
   * Update these when intentionally adding features.
   * Any unexpected change will fail the test.
   *
   * 2024-12: Optimized schemas to reduce token overhead
   * 2026-01: Updated for MCP 2025-06-18 compliance
   * - Added semantic property descriptions for LLM guidance
   * - Added outputSchema for structured validation
   * - Added annotations (readOnlyHint, idempotentHint, etc.)
   */
  const CURRENT_SNAPSHOT = {
    auto_optimize: 184, // +104 for outputSchema + semantic descriptions
    smart_file_read: 263, // +157 for outputSchema + property descriptions
    discover_tools: 167, // +89 for outputSchema + semantic hints
  };

  // Tolerance: ±10 tokens for minor changes
  const TOLERANCE = 10;

  it.each(Object.entries(CURRENT_SNAPSHOT))(
    "%s should match snapshot (±10 tokens)",
    (name, expected) => {
      const tool = ALL_TOOLS.find((t) => t.name === name);
      if (!tool) throw new Error(`Tool ${name} not found`);

      const actual = countToolTokens(tool);
      const diff = Math.abs(actual - expected);

      expect(diff).toBeLessThanOrEqual(TOLERANCE);

      if (diff > 0) {
        console.log(`  ${name}: expected ${expected}, got ${actual} (diff: ${diff})`);
      }
    }
  );
});
