/**
 * Output Estimator Tests
 */

import { describe, it, expect } from "vitest";
import {
  estimateOutputTokens,
  isQuestion,
  isInstruction,
  getOutputRatio,
} from "./output-estimator.js";

describe("Output Estimator", () => {
  describe("isQuestion", () => {
    it("should detect questions starting with question words", () => {
      expect(isQuestion("What is TypeScript?")).toBe(true);
      expect(isQuestion("How do I fix this error?")).toBe(true);
      expect(isQuestion("Why is this happening?")).toBe(true);
      expect(isQuestion("Can you explain this?")).toBe(true);
    });

    it("should detect questions ending with question mark", () => {
      expect(isQuestion("This is broken?")).toBe(true);
      expect(isQuestion("Is this correct?")).toBe(true);
    });

    it("should detect explain/describe patterns", () => {
      expect(isQuestion("Explain how promises work")).toBe(true);
      expect(isQuestion("Describe the architecture")).toBe(true);
      expect(isQuestion("Tell me about this function")).toBe(true);
    });

    it("should not detect non-questions", () => {
      expect(isQuestion("Fix this bug")).toBe(false);
      expect(isQuestion("Create a new function")).toBe(false);
      expect(isQuestion("const x = 5")).toBe(false);
    });
  });

  describe("isInstruction", () => {
    it("should detect imperative commands", () => {
      expect(isInstruction("Create a new function")).toBe(true);
      expect(isInstruction("Write a test for this")).toBe(true);
      expect(isInstruction("Fix the authentication bug")).toBe(true);
      expect(isInstruction("Add error handling")).toBe(true);
      expect(isInstruction("Refactor this code")).toBe(true);
    });

    it("should detect polite requests", () => {
      expect(isInstruction("Please update the README")).toBe(true);
      expect(isInstruction("Can you implement this feature")).toBe(true);
      expect(isInstruction("Could you review this PR")).toBe(true);
    });

    it("should detect creation patterns", () => {
      expect(isInstruction("I need a function to parse JSON")).toBe(false); // Not at start
      expect(isInstruction("Write a utility for caching")).toBe(true);
    });

    it("should not detect non-instructions", () => {
      expect(isInstruction("What is this?")).toBe(false);
      expect(isInstruction("const x = 5")).toBe(false);
      expect(isInstruction("Error: something failed")).toBe(false);
    });
  });

  describe("estimateOutputTokens", () => {
    it("should estimate output for code content", () => {
      const codeContent = `
function hello() {
  return "world";
}
      `.trim();

      const result = estimateOutputTokens(codeContent, 500, "code");

      // Code default ratio is 0.8x
      expect(result.estimated).toBeGreaterThan(0);
      expect(result.estimated).toBeLessThanOrEqual(500 * 1.5);
      expect(result.confidence).toBe("medium");
    });

    it("should estimate lower output for logs", () => {
      const logsContent = `
[2025-12-23 10:00:00] INFO: Server started
[2025-12-23 10:00:01] DEBUG: Loading config
      `.trim();

      const result = estimateOutputTokens(logsContent, 1000, "logs");

      // Logs ratio is 0.2x, so output should be much smaller than input
      expect(result.estimated).toBeLessThan(500);
    });

    it("should estimate higher output for questions", () => {
      const question = "What is the difference between let and const?";

      const result = estimateOutputTokens(question, 100, "generic");

      // Questions get 1.0x ratio by default
      expect(result.estimated).toBeGreaterThanOrEqual(50); // Minimum floor
      expect(result.confidence).toBeDefined();
    });

    it("should apply minimum floor of 50 tokens", () => {
      const shortContent = "Hi";
      const result = estimateOutputTokens(shortContent, 5, "generic");

      expect(result.estimated).toBeGreaterThanOrEqual(50);
    });

    it("should apply maximum ceiling of 16000 tokens", () => {
      const longContent = "x".repeat(100000);
      const result = estimateOutputTokens(longContent, 50000, "generic");

      expect(result.estimated).toBeLessThanOrEqual(16000);
    });

    it("should have low confidence for short inputs", () => {
      const shortInput = "Help";
      const result = estimateOutputTokens(shortInput, 50, "generic");

      expect(result.confidence).toBe("low");
      expect(result.reasoning).toContain("Short input");
    });

    it("should adjust for very long inputs", () => {
      const longInput = "x".repeat(50000);
      const result = estimateOutputTokens(longInput, 15000, "generic");

      expect(result.reasoning).toContain("Long input");
    });
  });

  describe("getOutputRatio", () => {
    it("should return ratio config for known types", () => {
      const codeRatio = getOutputRatio("code");
      expect(codeRatio.defaultRatio).toBe(0.8);

      const logsRatio = getOutputRatio("logs");
      expect(logsRatio.defaultRatio).toBe(0.2);
    });

    it("should return generic ratio for unknown types", () => {
      const ratio = getOutputRatio("generic");
      expect(ratio.defaultRatio).toBe(0.5);
    });
  });
});
