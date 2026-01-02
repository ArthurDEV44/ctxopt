/**
 * Tests for Log Scoring Module
 */

import { describe, it, expect } from "vitest";
import {
  createLogScorer,
  quickScore,
  batchScoreEntries,
  getBalancedTopEntries,
  DEFAULT_WEIGHTS,
} from "./scoring.js";
import type { LogEntry } from "./types.js";

describe("Log Scoring", () => {
  const createEntry = (
    message: string,
    level: "error" | "warning" | "info" | "debug" = "info"
  ): LogEntry => ({
    message,
    level,
    count: 1,
    raw: message,
  });

  describe("createLogScorer", () => {
    it("should create a scorer for log entries", () => {
      const entries = [
        createEntry("Connection established", "info"),
        createEntry("Error: Connection failed", "error"),
        createEntry("Warning: High memory usage", "warning"),
      ];

      const scorer = createLogScorer(entries);
      expect(scorer).toBeDefined();
      expect(scorer.scoreAll).toBeDefined();
      expect(scorer.rankEntries).toBeDefined();
    });

    it("should score entries with higher score for errors", () => {
      const entries = [
        createEntry("Normal log message", "info"),
        createEntry("Critical error occurred", "error"),
      ];

      const scorer = createLogScorer(entries);
      const scored = scorer.scoreAll();

      const errorEntry = scored.find((e) => e.level === "error");
      const infoEntry = scored.find((e) => e.level === "info");

      expect(errorEntry!.score).toBeGreaterThan(infoEntry!.score);
    });

    it("should rank entries by score descending", () => {
      const entries = [
        createEntry("Debug message", "debug"),
        createEntry("Error message", "error"),
        createEntry("Info message", "info"),
        createEntry("Warning message", "warning"),
      ];

      const scorer = createLogScorer(entries);
      const ranked = scorer.rankEntries();

      // Error should be first
      expect(ranked[0]!.level).toBe("error");
      // Debug should be last
      expect(ranked[ranked.length - 1]!.level).toBe("debug");
    });

    it("should get top N entries", () => {
      const entries = Array.from({ length: 20 }, (_, i) =>
        createEntry(`Message ${i}`, i % 4 === 0 ? "error" : "info")
      );

      const scorer = createLogScorer(entries);
      const top5 = scorer.getTopEntries(5);

      expect(top5).toHaveLength(5);
      // Most top entries should be errors (higher score)
      const errorCount = top5.filter((e) => e.level === "error").length;
      expect(errorCount).toBeGreaterThanOrEqual(3);
    });

    it("should filter by level", () => {
      const entries = [
        createEntry("Error 1", "error"),
        createEntry("Error 2", "error"),
        createEntry("Warning 1", "warning"),
        createEntry("Info 1", "info"),
      ];

      const scorer = createLogScorer(entries);
      const errors = scorer.getByLevel("error");

      expect(errors).toHaveLength(2);
      expect(errors.every((e) => e.level === "error")).toBe(true);
    });

    it("should provide scoring statistics", () => {
      const entries = [
        createEntry("Error", "error"),
        createEntry("Warning", "warning"),
        createEntry("Info 1", "info"),
        createEntry("Info 2", "info"),
      ];

      const scorer = createLogScorer(entries);
      const stats = scorer.getStats();

      expect(stats.totalEntries).toBe(4);
      expect(stats.byLevel.error).toBe(1);
      expect(stats.byLevel.warning).toBe(1);
      expect(stats.byLevel.info).toBe(2);
      expect(stats.avgScore).toBeGreaterThan(0);
      expect(stats.avgScore).toBeLessThanOrEqual(1);
    });

    it("should include score breakdown", () => {
      const entries = [createEntry("Error: Critical failure", "error")];

      const scorer = createLogScorer(entries);
      const scored = scorer.scoreAll()[0]!;

      expect(scored.scoreBreakdown).toBeDefined();
      expect(scored.scoreBreakdown.level).toBe(1.0); // Error = 1.0
      expect(scored.scoreBreakdown.tfidf).toBeGreaterThanOrEqual(0);
      expect(scored.scoreBreakdown.position).toBeGreaterThanOrEqual(0);
      expect(scored.scoreBreakdown.rarity).toBeGreaterThanOrEqual(0);
    });

    it("should boost position score for first entries", () => {
      const entries = Array.from({ length: 10 }, (_, i) =>
        createEntry(`Message ${i}`, "info")
      );

      const scorer = createLogScorer(entries, { positionBoostCount: 3 });
      const scored = scorer.scoreAll();

      // First entry should have higher position score
      expect(scored[0]!.scoreBreakdown.position).toBeGreaterThan(
        scored[5]!.scoreBreakdown.position
      );
    });

    it("should boost position score for last entries", () => {
      const entries = Array.from({ length: 10 }, (_, i) =>
        createEntry(`Message ${i}`, "info")
      );

      const scorer = createLogScorer(entries, { positionBoostCount: 3 });
      const scored = scorer.scoreAll();

      // Last entry should have higher position score than middle
      expect(scored[9]!.scoreBreakdown.position).toBeGreaterThan(
        scored[5]!.scoreBreakdown.position
      );
    });
  });

  describe("quickScore", () => {
    it("should return high score for error entries", () => {
      const entry = createEntry("Fatal error occurred", "error");
      const score = quickScore(entry);

      expect(score).toBeGreaterThanOrEqual(0.5);
    });

    it("should return lower score for debug entries", () => {
      const entry = createEntry("Debug trace", "debug");
      const score = quickScore(entry);

      expect(score).toBeLessThan(0.5);
    });

    it("should boost score for error keywords", () => {
      const errorEntry = createEntry("Something crashed unexpectedly", "info");
      const normalEntry = createEntry("Normal operation completed", "info");

      expect(quickScore(errorEntry)).toBeGreaterThan(quickScore(normalEntry));
    });
  });

  describe("batchScoreEntries", () => {
    it("should score and rank all entries", () => {
      const entries = [
        createEntry("Info", "info"),
        createEntry("Error", "error"),
        createEntry("Debug", "debug"),
      ];

      const scored = batchScoreEntries(entries);

      expect(scored).toHaveLength(3);
      expect(scored[0]!.level).toBe("error"); // Highest rank
    });
  });

  describe("getBalancedTopEntries", () => {
    it("should return balanced representation of levels", () => {
      const entries = [
        createEntry("Error 1", "error"),
        createEntry("Error 2", "error"),
        createEntry("Error 3", "error"),
        createEntry("Warning 1", "warning"),
        createEntry("Warning 2", "warning"),
        createEntry("Info 1", "info"),
        createEntry("Info 2", "info"),
        createEntry("Info 3", "info"),
      ];

      const balanced = getBalancedTopEntries(entries, {
        errors: 2,
        warnings: 1,
        info: 2,
      });

      const errorCount = balanced.filter((e) => e.level === "error").length;
      const warningCount = balanced.filter((e) => e.level === "warning").length;
      const infoCount = balanced.filter((e) => e.level === "info").length;

      expect(errorCount).toBe(2);
      expect(warningCount).toBe(1);
      expect(infoCount).toBe(2);
    });
  });

  describe("DEFAULT_WEIGHTS", () => {
    it("should have weights summing to 1.0", () => {
      const sum =
        DEFAULT_WEIGHTS.level +
        DEFAULT_WEIGHTS.tfidf +
        DEFAULT_WEIGHTS.position +
        DEFAULT_WEIGHTS.rarity;

      expect(sum).toBe(1.0);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty entries", () => {
      const scorer = createLogScorer([]);
      const scored = scorer.scoreAll();

      expect(scored).toHaveLength(0);
    });

    it("should handle single entry", () => {
      const entries = [createEntry("Single entry", "info")];
      const scorer = createLogScorer(entries);
      const scored = scorer.scoreAll();

      expect(scored).toHaveLength(1);
      expect(scored[0]!.score).toBeGreaterThan(0);
    });

    it("should handle duplicate messages", () => {
      const entries = [
        createEntry("Same message", "info"),
        createEntry("Same message", "info"),
        createEntry("Same message", "info"),
      ];

      const scorer = createLogScorer(entries);
      const scored = scorer.scoreAll();

      // All should have similar scores (position may cause slight variance)
      expect(scored[0]!.score).toBeCloseTo(scored[1]!.score, 1);
      expect(scored[1]!.score).toBeCloseTo(scored[2]!.score, 1);
    });
  });
});
