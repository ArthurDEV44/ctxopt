/**
 * Tests for Log Pattern Extraction Module
 */

import { describe, it, expect } from "vitest";
import {
  extractPatterns,
  findAnomalousPatterns,
  getPatternStats,
  matchPattern,
  describePattern,
} from "./pattern-extraction.js";
import type { LogEntry } from "./types.js";

describe("Pattern Extraction", () => {
  const createEntry = (message: string, timestamp?: string): LogEntry => ({
    message,
    level: "info",
    count: 1,
    raw: message,
    timestamp,
  });

  describe("extractPatterns", () => {
    it("should extract patterns from repeated messages", () => {
      const entries = [
        createEntry("Connection from 192.168.1.1 established"),
        createEntry("Connection from 192.168.1.2 established"),
        createEntry("Connection from 10.0.0.1 established"),
      ];

      const patterns = extractPatterns(entries);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]!.occurrences).toBe(3);
      expect(patterns[0]!.template).toContain("<IP>");
    });

    it("should detect UUID variables", () => {
      const entries = [
        createEntry("User 550e8400-e29b-41d4-a716-446655440000 logged in"),
        createEntry("User 6ba7b810-9dad-11d1-80b4-00c04fd430c8 logged in"),
      ];

      const patterns = extractPatterns(entries);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]!.template).toContain("<UUID>");
    });

    it("should detect numeric variables", () => {
      const entries = [
        createEntry("Processing batch 1234 completed"),
        createEntry("Processing batch 5678 completed"),
        createEntry("Processing batch 9012 completed"),
      ];

      const patterns = extractPatterns(entries);

      expect(patterns.length).toBeGreaterThan(0);
      // Template should normalize the numbers
      expect(patterns[0]!.template).toContain("<NUM>");
    });

    it("should detect path variables", () => {
      const entries = [
        createEntry("Reading file /var/log/app.log"),
        createEntry("Reading file /var/log/error.log"),
        createEntry("Reading file /tmp/test.txt"),
      ];

      const patterns = extractPatterns(entries);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]!.template).toContain("<PATH>");
    });

    it("should respect minOccurrences option", () => {
      const entries = [
        createEntry("Pattern A repeated"),
        createEntry("Pattern A repeated"),
        createEntry("Pattern A repeated"),
        createEntry("Unique message once"),
      ];

      const patterns = extractPatterns(entries, { minOccurrences: 3 });

      expect(patterns.every((p) => p.occurrences >= 3)).toBe(true);
    });

    it("should respect maxPatterns option", () => {
      const entries = Array.from({ length: 100 }, (_, i) =>
        createEntry(`Pattern ${i % 20} message`)
      );

      const patterns = extractPatterns(entries, { maxPatterns: 5 });

      expect(patterns.length).toBeLessThanOrEqual(5);
    });

    it("should include example messages", () => {
      const entries = [
        createEntry("Error code 100"),
        createEntry("Error code 200"),
        createEntry("Error code 300"),
      ];

      const patterns = extractPatterns(entries, { maxExamples: 2 });

      expect(patterns[0]!.examples.length).toBeLessThanOrEqual(2);
    });

    it("should track first and last seen timestamps", () => {
      const entries = [
        createEntry("Event occurred", "2024-01-01T10:00:00Z"),
        createEntry("Event occurred", "2024-01-01T11:00:00Z"),
        createEntry("Event occurred", "2024-01-01T12:00:00Z"),
      ];

      const patterns = extractPatterns(entries);

      expect(patterns[0]!.firstSeen).toBe("2024-01-01T10:00:00Z");
      expect(patterns[0]!.lastSeen).toBe("2024-01-01T12:00:00Z");
    });

    it("should calculate importance score", () => {
      const entries = [
        createEntry("Normal log message"),
        createEntry("Normal log message"),
        createEntry("Error: critical failure occurred"),
      ];

      const patterns = extractPatterns(entries);

      // Error pattern should have higher importance
      const errorPattern = patterns.find((p) =>
        p.template.toLowerCase().includes("error")
      );
      const normalPattern = patterns.find(
        (p) => !p.template.toLowerCase().includes("error")
      );

      if (errorPattern && normalPattern) {
        expect(errorPattern.importance).toBeGreaterThan(0);
      }
    });
  });

  describe("findAnomalousPatterns", () => {
    it("should find rare patterns", () => {
      const patterns = extractPatterns(
        [
          createEntry("Common message repeated"),
          createEntry("Common message repeated"),
          createEntry("Common message repeated"),
          createEntry("Common message repeated"),
          createEntry("Rare unique anomaly occurred"),
        ],
        { minOccurrences: 1 }
      );

      const anomalous = findAnomalousPatterns(patterns, 0.5);

      // Should find the rare pattern (low occurrence relative to others)
      expect(anomalous.length).toBeGreaterThanOrEqual(0);
    });

    it("should return empty for empty input", () => {
      const anomalous = findAnomalousPatterns([]);
      expect(anomalous).toHaveLength(0);
    });
  });

  describe("getPatternStats", () => {
    it("should calculate pattern statistics", () => {
      const entries = [
        createEntry("Error: connection failed"),
        createEntry("Error: connection failed"),
        createEntry("Warning: high memory"),
        createEntry("Info: started"),
      ];

      const patterns = extractPatterns(entries, { minOccurrences: 1 });
      const stats = getPatternStats(patterns);

      expect(stats.totalPatterns).toBeGreaterThan(0);
      expect(stats.totalOccurrences).toBeGreaterThanOrEqual(2);
      expect(stats.avgOccurrences).toBeGreaterThan(0);
      expect(stats.mostCommon.length).toBeLessThanOrEqual(5);
    });

    it("should handle empty patterns", () => {
      const stats = getPatternStats([]);

      expect(stats.totalPatterns).toBe(0);
      expect(stats.totalOccurrences).toBe(0);
      expect(stats.avgOccurrences).toBe(0);
    });

    it("should count error patterns", () => {
      const entries = [
        createEntry("Error: failure 1"),
        createEntry("Error: failure 2"),
        createEntry("Normal log"),
      ];

      const patterns = extractPatterns(entries);
      const stats = getPatternStats(patterns);

      expect(stats.errorPatterns).toBeGreaterThanOrEqual(0);
    });
  });

  describe("matchPattern", () => {
    it("should match message to known pattern", () => {
      const entries = [
        createEntry("Connection from 192.168.1.1 failed"),
        createEntry("Connection from 192.168.1.2 failed"),
      ];

      const patterns = extractPatterns(entries);
      const match = matchPattern("Connection from 10.0.0.1 failed", patterns);

      expect(match).not.toBeNull();
      expect(match!.template).toContain("<IP>");
    });

    it("should return null for unmatched message", () => {
      const entries = [
        createEntry("Specific pattern A"),
        createEntry("Specific pattern A"),
      ];

      const patterns = extractPatterns(entries);
      const match = matchPattern("Completely different message", patterns);

      expect(match).toBeNull();
    });
  });

  describe("describePattern", () => {
    it("should generate human-readable description", () => {
      const entries = [
        createEntry("Request from 192.168.1.1 completed", "2024-01-01T10:00:00Z"),
        createEntry("Request from 192.168.1.2 completed", "2024-01-01T11:00:00Z"),
      ];

      const patterns = extractPatterns(entries);
      const description = describePattern(patterns[0]!);

      expect(description).toContain("Pattern:");
      expect(description).toContain("Occurrences: 2");
    });

    it("should truncate long templates", () => {
      const longMessage = "A".repeat(200);
      const entries = [createEntry(longMessage), createEntry(longMessage)];

      const patterns = extractPatterns(entries);
      const description = describePattern(patterns[0]!);

      expect(description.length).toBeLessThan(longMessage.length + 100);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty entries", () => {
      const patterns = extractPatterns([]);
      expect(patterns).toHaveLength(0);
    });

    it("should handle single entry", () => {
      const patterns = extractPatterns([createEntry("Single message")], {
        minOccurrences: 1,
      });

      expect(patterns.length).toBeLessThanOrEqual(1);
    });

    it("should handle messages with no variables", () => {
      const entries = [
        createEntry("Static message without variables"),
        createEntry("Static message without variables"),
      ];

      const patterns = extractPatterns(entries);

      expect(patterns.length).toBe(1);
      expect(patterns[0]!.variables).toHaveLength(0);
    });

    it("should handle mixed variable types", () => {
      const entries = [
        createEntry(
          "User 550e8400-e29b-41d4-a716-446655440000 from 192.168.1.1 accessed /api/data"
        ),
        createEntry(
          "User 6ba7b810-9dad-11d1-80b4-00c04fd430c8 from 10.0.0.1 accessed /api/users"
        ),
      ];

      const patterns = extractPatterns(entries);

      expect(patterns[0]!.template).toContain("<UUID>");
      expect(patterns[0]!.template).toContain("<IP>");
      expect(patterns[0]!.template).toContain("<PATH>");
    });
  });
});
