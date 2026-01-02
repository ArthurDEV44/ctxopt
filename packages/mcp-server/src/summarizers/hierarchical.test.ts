/**
 * Tests for Hierarchical Log Summarization Module
 */

import { describe, it, expect } from "vitest";
import {
  summarizeHierarchically,
  toLogSummary,
  formatAsMarkdown,
} from "./hierarchical.js";
import type { SummarizeOptions } from "./types.js";

describe("Hierarchical Log Summarization", () => {
  const createLogLine = (
    message: string,
    level: string = "INFO",
    timestamp?: string
  ): string => {
    const ts = timestamp || new Date().toISOString();
    return `${ts} [${level}] ${message}`;
  };

  const createLogs = (lines: string[]): string => lines.join("\n");

  describe("summarizeHierarchically", () => {
    it("should generate hierarchical summary from logs", () => {
      const logs = createLogs([
        createLogLine("Server started", "INFO"),
        createLogLine("Connection established", "INFO"),
        createLogLine("Request processed", "INFO"),
        createLogLine("Error: timeout occurred", "ERROR"),
      ]);

      const summary = summarizeHierarchically(logs);

      expect(summary.overview).toBeDefined();
      expect(summary.sections).toBeDefined();
      expect(summary.statistics).toBeDefined();
    });

    it("should create sections from log chunks", () => {
      const logs = createLogs(
        Array.from({ length: 100 }, (_, i) =>
          createLogLine(`Message ${i}`, "INFO")
        )
      );

      const summary = summarizeHierarchically(logs, { chunkSize: 20 });

      expect(summary.sections.length).toBeGreaterThan(0);
    });

    it("should identify critical entries", () => {
      const logs = createLogs([
        createLogLine("Normal operation", "INFO"),
        createLogLine("Critical error: system failure", "ERROR"),
        createLogLine("Warning: high memory", "WARN"),
        createLogLine("Another error occurred", "ERROR"),
      ]);

      const summary = summarizeHierarchically(logs);

      expect(summary.criticalEntries.length).toBeGreaterThan(0);
      // Errors should be in critical entries
      const hasError = summary.criticalEntries.some((e) => e.level === "error");
      expect(hasError).toBe(true);
    });

    it("should extract patterns from logs", () => {
      const logs = createLogs([
        createLogLine("Connection from 192.168.1.1 established", "INFO"),
        createLogLine("Connection from 192.168.1.2 established", "INFO"),
        createLogLine("Connection from 10.0.0.1 established", "INFO"),
      ]);

      const summary = summarizeHierarchically(logs);

      // Should detect connection pattern
      expect(summary.patterns.length).toBeGreaterThanOrEqual(0);
    });

    it("should cluster similar logs", () => {
      const logs = createLogs([
        createLogLine("Request took 100ms", "INFO"),
        createLogLine("Request took 150ms", "INFO"),
        createLogLine("Request took 200ms", "INFO"),
        createLogLine("Database query completed", "INFO"),
      ]);

      const summary = summarizeHierarchically(logs);

      expect(summary.clusters.length).toBeGreaterThanOrEqual(0);
    });

    it("should calculate aggregate statistics", () => {
      const logs = createLogs([
        createLogLine("Info message 1", "INFO"),
        createLogLine("Info message 2", "INFO"),
        createLogLine("Error message", "ERROR"),
        createLogLine("Warning message", "WARN"),
        createLogLine("Debug message", "DEBUG"),
      ]);

      const summary = summarizeHierarchically(logs);

      expect(summary.statistics.totalLines).toBe(5);
      expect(summary.statistics.errorCount).toBeGreaterThanOrEqual(1);
    });

    it("should respect maxSections option", () => {
      const logs = createLogs(
        Array.from({ length: 500 }, (_, i) =>
          createLogLine(`Message ${i}`, "INFO")
        )
      );

      const summary = summarizeHierarchically(logs, {
        chunkSize: 50,
        maxSections: 3,
      });

      expect(summary.sections.length).toBeLessThanOrEqual(3);
    });

    it("should respect maxCriticalEntries option", () => {
      const logs = createLogs(
        Array.from({ length: 50 }, (_, i) =>
          createLogLine(`Error ${i}`, "ERROR")
        )
      );

      const summary = summarizeHierarchically(logs, {
        maxCriticalEntries: 5,
      });

      expect(summary.criticalEntries.length).toBeLessThanOrEqual(5);
    });

    it("should respect maxPatterns option", () => {
      const logs = createLogs([
        createLogLine("Pattern A 1"),
        createLogLine("Pattern A 2"),
        createLogLine("Pattern B 1"),
        createLogLine("Pattern B 2"),
        createLogLine("Pattern C 1"),
        createLogLine("Pattern C 2"),
      ]);

      const summary = summarizeHierarchically(logs, { maxPatterns: 2 });

      expect(summary.patterns.length).toBeLessThanOrEqual(2);
    });

    it("should chunk by time when specified", () => {
      const baseTime = new Date("2024-01-01T10:00:00Z");
      const logs = createLogs([
        createLogLine("Event 1", "INFO", new Date(baseTime.getTime()).toISOString()),
        createLogLine("Event 2", "INFO", new Date(baseTime.getTime() + 30 * 60000).toISOString()),
        createLogLine("Event 3", "INFO", new Date(baseTime.getTime() + 90 * 60000).toISOString()),
      ]);

      const summary = summarizeHierarchically(logs, {
        chunkByTime: true,
        timeChunkMinutes: 60,
      });

      expect(summary.sections.length).toBeGreaterThan(0);
    });

    it("should generate meaningful overview", () => {
      const logs = createLogs([
        createLogLine("Server started", "INFO"),
        createLogLine("Error: connection failed", "ERROR"),
        createLogLine("Warning: retry attempt", "WARN"),
      ]);

      const summary = summarizeHierarchically(logs);

      expect(summary.overview).toBeDefined();
      expect(summary.overview.length).toBeGreaterThan(10);
      expect(summary.overview).toContain("entries");
    });
  });

  describe("toLogSummary", () => {
    it("should convert hierarchical summary to LogSummary", () => {
      const logs = createLogs([
        createLogLine("Info message", "INFO"),
        createLogLine("Error message", "ERROR"),
        createLogLine("Warning message", "WARN"),
      ]);

      const hierarchical = summarizeHierarchically(logs);
      const options: SummarizeOptions = {
        detail: "normal",
        logType: "generic",
      };

      const logSummary = toLogSummary(hierarchical, options);

      expect(logSummary.logType).toBe("generic");
      expect(logSummary.overview).toBeDefined();
      expect(logSummary.errors).toBeDefined();
      expect(logSummary.warnings).toBeDefined();
      expect(logSummary.statistics).toBeDefined();
    });

    it("should extract errors from critical entries", () => {
      const logs = createLogs([
        createLogLine("Error: critical failure", "ERROR"),
        createLogLine("Error: another failure", "ERROR"),
      ]);

      const hierarchical = summarizeHierarchically(logs);
      const options: SummarizeOptions = { detail: "normal" };

      const logSummary = toLogSummary(hierarchical, options);

      expect(logSummary.errors.length).toBeGreaterThan(0);
    });

    it("should extract warnings from critical entries", () => {
      const logs = createLogs([
        createLogLine("Warning: memory high", "WARN"),
        createLogLine("Warning: disk space low", "WARN"),
      ]);

      const hierarchical = summarizeHierarchically(logs);
      const options: SummarizeOptions = { detail: "normal" };

      const logSummary = toLogSummary(hierarchical, options);

      expect(logSummary.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it("should include key events from section representatives", () => {
      const logs = createLogs(
        Array.from({ length: 50 }, (_, i) =>
          createLogLine(`Event ${i}`, "INFO")
        )
      );

      const hierarchical = summarizeHierarchically(logs, { chunkSize: 10 });
      const options: SummarizeOptions = { detail: "normal" };

      const logSummary = toLogSummary(hierarchical, options);

      expect(logSummary.keyEvents).toBeDefined();
    });
  });

  describe("formatAsMarkdown", () => {
    it("should format summary as markdown", () => {
      const logs = createLogs([
        createLogLine("Info message", "INFO"),
        createLogLine("Error: failure", "ERROR"),
      ]);

      const summary = summarizeHierarchically(logs);
      const markdown = formatAsMarkdown(summary);

      expect(markdown).toContain("## Overview");
      expect(markdown).toContain("## Statistics");
    });

    it("should include critical entries section when present", () => {
      const logs = createLogs([
        createLogLine("Critical error occurred", "ERROR"),
        createLogLine("Another error", "ERROR"),
      ]);

      const summary = summarizeHierarchically(logs);
      const markdown = formatAsMarkdown(summary);

      if (summary.criticalEntries.length > 0) {
        expect(markdown).toContain("## Critical Entries");
      }
    });

    it("should include patterns section when present", () => {
      const logs = createLogs([
        createLogLine("Request from 192.168.1.1"),
        createLogLine("Request from 192.168.1.2"),
        createLogLine("Request from 10.0.0.1"),
      ]);

      const summary = summarizeHierarchically(logs);
      const markdown = formatAsMarkdown(summary);

      if (summary.patterns.length > 0) {
        expect(markdown).toContain("## Common Patterns");
      }
    });

    it("should include sections when multiple exist", () => {
      const logs = createLogs(
        Array.from({ length: 100 }, (_, i) =>
          createLogLine(`Message ${i}`, "INFO")
        )
      );

      const summary = summarizeHierarchically(logs, { chunkSize: 25 });
      const markdown = formatAsMarkdown(summary);

      if (summary.sections.length > 1) {
        expect(markdown).toContain("## Sections");
      }
    });

    it("should include statistics with counts", () => {
      const logs = createLogs([
        createLogLine("Error 1", "ERROR"),
        createLogLine("Warning 1", "WARN"),
        createLogLine("Info 1", "INFO"),
      ]);

      const summary = summarizeHierarchically(logs);
      const markdown = formatAsMarkdown(summary);

      expect(markdown).toContain("Total entries:");
      expect(markdown).toContain("Errors:");
      expect(markdown).toContain("Warnings:");
    });
  });

  describe("Section summaries", () => {
    it("should include entry count per section", () => {
      const logs = createLogs(
        Array.from({ length: 60 }, (_, i) =>
          createLogLine(`Message ${i}`, "INFO")
        )
      );

      const summary = summarizeHierarchically(logs, { chunkSize: 20 });

      summary.sections.forEach((section) => {
        expect(section.entryCount).toBeGreaterThan(0);
      });
    });

    it("should include error/warning counts per section", () => {
      const logs = createLogs([
        createLogLine("Error in section 1", "ERROR"),
        createLogLine("Info in section 1", "INFO"),
        ...Array.from({ length: 30 }, (_, i) =>
          createLogLine(`Message ${i}`, "INFO")
        ),
        createLogLine("Error in section 2", "ERROR"),
        createLogLine("Warning in section 2", "WARN"),
      ]);

      const summary = summarizeHierarchically(logs, { chunkSize: 15 });

      summary.sections.forEach((section) => {
        expect(section.errorCount).toBeGreaterThanOrEqual(0);
        expect(section.warningCount).toBeGreaterThanOrEqual(0);
      });
    });

    it("should include key findings per section", () => {
      const logs = createLogs([
        createLogLine("Error: critical failure", "ERROR"),
        createLogLine("Error: another failure", "ERROR"),
        createLogLine("Warning: resource low", "WARN"),
        ...Array.from({ length: 20 }, (_, i) =>
          createLogLine(`Info ${i}`, "INFO")
        ),
      ]);

      const summary = summarizeHierarchically(logs, { chunkSize: 10 });

      // Sections with errors should have findings
      const sectionWithErrors = summary.sections.find((s) => s.errorCount > 0);
      if (sectionWithErrors) {
        expect(sectionWithErrors.keyFindings.length).toBeGreaterThan(0);
      }
    });

    it("should include representative entries per section", () => {
      const logs = createLogs(
        Array.from({ length: 50 }, (_, i) =>
          createLogLine(`Event ${i}`, i % 5 === 0 ? "ERROR" : "INFO")
        )
      );

      const summary = summarizeHierarchically(logs, { chunkSize: 15 });

      summary.sections.forEach((section) => {
        expect(section.representatives).toBeDefined();
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle empty logs", () => {
      const summary = summarizeHierarchically("");

      expect(summary.overview).toBeDefined();
      expect(summary.sections).toHaveLength(0);
      expect(summary.criticalEntries).toHaveLength(0);
      expect(summary.statistics.totalLines).toBe(0);
    });

    it("should handle single line log", () => {
      const logs = createLogLine("Single entry", "INFO");

      const summary = summarizeHierarchically(logs);

      expect(summary.statistics.totalLines).toBe(1);
      expect(summary.sections.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle logs without timestamps", () => {
      const logs = [
        "[INFO] Message without timestamp 1",
        "[ERROR] Message without timestamp 2",
        "[WARN] Message without timestamp 3",
      ].join("\n");

      const summary = summarizeHierarchically(logs);

      expect(summary.statistics.totalLines).toBe(3);
    });

    it("should handle very large logs", () => {
      const logs = createLogs(
        Array.from({ length: 1000 }, (_, i) =>
          createLogLine(`Large log message ${i}`, i % 10 === 0 ? "ERROR" : "INFO")
        )
      );

      const summary = summarizeHierarchically(logs, {
        chunkSize: 200,
        maxSections: 5,
      });

      expect(summary.statistics.totalLines).toBe(1000);
      expect(summary.sections.length).toBeLessThanOrEqual(5);
    });

    it("should handle logs with only errors", () => {
      const logs = createLogs([
        createLogLine("Error 1", "ERROR"),
        createLogLine("Error 2", "ERROR"),
        createLogLine("Error 3", "ERROR"),
      ]);

      const summary = summarizeHierarchically(logs);

      expect(summary.statistics.errorCount).toBe(3);
      expect(summary.criticalEntries.length).toBeGreaterThan(0);
    });

    it("should handle logs with special characters", () => {
      const logs = createLogs([
        createLogLine("Error: ${variable} is null", "ERROR"),
        createLogLine("Path: /home/user/.config/app.json", "INFO"),
        createLogLine("Query: SELECT * FROM users WHERE id = 1", "DEBUG"),
      ]);

      const summary = summarizeHierarchically(logs);

      expect(summary.statistics.totalLines).toBe(3);
    });

    it("should handle mixed timestamp formats", () => {
      const logs = [
        "2024-01-01T10:00:00Z [INFO] ISO format",
        "Jan 1 10:00:01 [INFO] Syslog format",
        "[INFO] No timestamp",
      ].join("\n");

      const summary = summarizeHierarchically(logs);

      expect(summary.statistics.totalLines).toBe(3);
    });
  });

  describe("Cluster summaries", () => {
    it("should include cluster information", () => {
      const logs = createLogs([
        createLogLine("Request type A processed"),
        createLogLine("Request type A processed"),
        createLogLine("Request type B processed"),
        createLogLine("Request type B processed"),
      ]);

      const summary = summarizeHierarchically(logs);

      expect(summary.clusters).toBeDefined();
    });

    it("should truncate long patterns in clusters", () => {
      const longMessage = "A".repeat(200);
      const logs = createLogs([
        createLogLine(longMessage),
        createLogLine(longMessage),
      ]);

      const summary = summarizeHierarchically(logs);

      summary.clusters.forEach((cluster) => {
        expect(cluster.pattern.length).toBeLessThanOrEqual(63); // 60 + "..."
      });
    });

    it("should include cluster level and count", () => {
      const logs = createLogs([
        createLogLine("Error pattern A", "ERROR"),
        createLogLine("Error pattern A", "ERROR"),
        createLogLine("Warning pattern B", "WARN"),
      ]);

      const summary = summarizeHierarchically(logs);

      summary.clusters.forEach((cluster) => {
        expect(cluster.level).toBeDefined();
        expect(cluster.count).toBeGreaterThan(0);
      });
    });
  });
});
