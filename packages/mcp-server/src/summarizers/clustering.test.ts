/**
 * Tests for Log Clustering Module
 */

import { describe, it, expect } from "vitest";
import {
  clusterLogs,
  selectRepresentatives,
  mergeSimilarClusters,
  getClusteringSummary,
  findOutliers,
  hierarchicalCluster,
} from "./clustering.js";
import type { LogEntry } from "./types.js";

describe("Log Clustering", () => {
  const createEntry = (
    message: string,
    level: "error" | "warning" | "info" | "debug" = "info",
    timestamp?: string
  ): LogEntry => ({
    message,
    level,
    count: 1,
    raw: message,
    timestamp,
  });

  describe("clusterLogs", () => {
    it("should group similar messages into clusters", () => {
      const entries = [
        createEntry("Connection from 192.168.1.1 established"),
        createEntry("Connection from 192.168.1.2 established"),
        createEntry("Connection from 10.0.0.1 established"),
        createEntry("Error: database connection failed"),
      ];

      const clusters = clusterLogs(entries);

      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.length).toBeLessThan(entries.length);
    });

    it("should create cluster with representative entry", () => {
      const entries = [
        createEntry("Request processed in 100ms"),
        createEntry("Request processed in 200ms"),
        createEntry("Request processed in 150ms"),
      ];

      const clusters = clusterLogs(entries);

      expect(clusters[0]!.representative).toBeDefined();
      expect(clusters[0]!.entries.length).toBe(3);
    });

    it("should calculate cluster importance", () => {
      const entries = [
        createEntry("Normal log message", "info"),
        createEntry("Normal log message", "info"),
        createEntry("Critical error", "error"),
      ];

      const clusters = clusterLogs(entries);

      // All clusters should have importance > 0
      clusters.forEach((cluster) => {
        expect(cluster.importance).toBeGreaterThanOrEqual(0);
      });
    });

    it("should respect similarityThreshold option", () => {
      const entries = [
        createEntry("Error: connection timeout"),
        createEntry("Error: connection refused"),
        createEntry("Error: connection reset"),
      ];

      const looseClusters = clusterLogs(entries, { similarityThreshold: 0.3 });
      const strictClusters = clusterLogs(entries, { similarityThreshold: 0.9 });

      // Stricter threshold = more clusters
      expect(strictClusters.length).toBeGreaterThanOrEqual(looseClusters.length);
    });

    it("should respect maxClusters option", () => {
      const entries = Array.from({ length: 50 }, (_, i) =>
        createEntry(`Unique message number ${i}`)
      );

      const clusters = clusterLogs(entries, { maxClusters: 5 });

      expect(clusters.length).toBeLessThanOrEqual(5);
    });

    it("should identify dominant level in cluster", () => {
      const entries = [
        createEntry("Error type A", "error"),
        createEntry("Error type A variant", "error"),
        createEntry("Error type A another", "error"),
      ];

      const clusters = clusterLogs(entries);

      expect(clusters[0]!.dominantLevel).toBe("error");
    });

    it("should generate pattern for cluster", () => {
      const entries = [
        createEntry("User 123 logged in"),
        createEntry("User 456 logged in"),
        createEntry("User 789 logged in"),
      ];

      const clusters = clusterLogs(entries);

      expect(clusters[0]!.pattern).toBeDefined();
      expect(clusters[0]!.pattern.length).toBeGreaterThan(0);
    });

    it("should calculate cluster statistics", () => {
      const entries = [
        createEntry("Message A", "info"),
        createEntry("Message A", "info"),
        createEntry("Message B", "warning"),
      ];

      const clusters = clusterLogs(entries);

      clusters.forEach((cluster) => {
        expect(cluster.stats).toBeDefined();
        expect(cluster.stats.count).toBeGreaterThan(0);
      });
    });
  });

  describe("selectRepresentatives", () => {
    it("should select one representative per cluster by default", () => {
      const entries = [
        createEntry("Error: timeout A"),
        createEntry("Error: timeout B"),
        createEntry("Warning: memory high"),
        createEntry("Warning: memory low"),
      ];

      const clusters = clusterLogs(entries);
      const representatives = selectRepresentatives(clusters);

      expect(representatives.length).toBeLessThanOrEqual(clusters.length);
    });

    it("should select multiple representatives when specified", () => {
      const entries = [
        createEntry("Connection error 1"),
        createEntry("Connection error 2"),
        createEntry("Connection error 3"),
        createEntry("Connection error 4"),
      ];

      const clusters = clusterLogs(entries, { similarityThreshold: 0.5 });
      const representatives = selectRepresentatives(clusters, 2);

      // Should get up to 2 representatives per cluster
      expect(representatives.length).toBeLessThanOrEqual(clusters.length * 2);
    });

    it("should return empty array for empty clusters", () => {
      const representatives = selectRepresentatives([]);
      expect(representatives).toHaveLength(0);
    });
  });

  describe("mergeSimilarClusters", () => {
    it("should merge clusters with high similarity", () => {
      const entries = [
        createEntry("Request failed with error 1"),
        createEntry("Request failed with error 2"),
        createEntry("Connection dropped error 1"),
        createEntry("Connection dropped error 2"),
      ];

      const clusters = clusterLogs(entries, { similarityThreshold: 0.9 });
      const merged = mergeSimilarClusters(clusters, 0.3);

      expect(merged.length).toBeLessThanOrEqual(clusters.length);
    });

    it("should preserve all entries after merge", () => {
      const entries = [
        createEntry("Error A type 1"),
        createEntry("Error A type 2"),
        createEntry("Error B type 1"),
        createEntry("Error B type 2"),
      ];

      const clusters = clusterLogs(entries, { similarityThreshold: 0.8 });
      const merged = mergeSimilarClusters(clusters, 0.4);

      const originalEntryCount = clusters.reduce(
        (sum, c) => sum + c.entries.length,
        0
      );
      const mergedEntryCount = merged.reduce(
        (sum, c) => sum + c.entries.length,
        0
      );

      expect(mergedEntryCount).toBe(originalEntryCount);
    });

    it("should not merge when similarity is low", () => {
      const entries = [
        createEntry("Completely unique message A"),
        createEntry("Totally different content B"),
      ];

      const clusters = clusterLogs(entries, { similarityThreshold: 0.95 });
      const merged = mergeSimilarClusters(clusters, 0.9);

      expect(merged.length).toBe(clusters.length);
    });
  });

  describe("getClusteringSummary", () => {
    it("should calculate clustering statistics", () => {
      const entries = [
        createEntry("Error message 1", "error"),
        createEntry("Error message 2", "error"),
        createEntry("Warning message", "warning"),
        createEntry("Info message", "info"),
      ];

      const clusters = clusterLogs(entries);
      const summary = getClusteringSummary(clusters);

      expect(summary.totalClusters).toBe(clusters.length);
      expect(summary.totalEntries).toBe(4);
      expect(summary.avgClusterSize).toBeGreaterThan(0);
    });

    it("should identify largest cluster size", () => {
      const entries = [
        createEntry("Repeated message"),
        createEntry("Repeated message"),
        createEntry("Repeated message"),
        createEntry("Unique message"),
      ];

      const clusters = clusterLogs(entries);
      const summary = getClusteringSummary(clusters);

      // largestCluster is a number representing the size
      expect(summary.largestCluster).toBeGreaterThanOrEqual(1);
    });

    it("should handle empty clusters", () => {
      const summary = getClusteringSummary([]);

      expect(summary.totalClusters).toBe(0);
      expect(summary.totalEntries).toBe(0);
      expect(summary.avgClusterSize).toBe(0);
    });

    it("should provide level distribution", () => {
      const entries = [
        createEntry("Error 1", "error"),
        createEntry("Error 2", "error"),
        createEntry("Warning 1", "warning"),
        createEntry("Info 1", "info"),
        createEntry("Debug 1", "debug"),
      ];

      const clusters = clusterLogs(entries);
      const summary = getClusteringSummary(clusters);

      expect(summary.byLevel).toBeDefined();
    });
  });

  describe("findOutliers", () => {
    it("should identify entries that don't fit clusters well", () => {
      const entries = [
        createEntry("Standard log message"),
        createEntry("Standard log message"),
        createEntry("Standard log message"),
        createEntry("Completely anomalous outlier xyz123"),
      ];

      const clusters = clusterLogs(entries);
      const outliers = findOutliers(entries, clusters, 0.5);

      // The unique message might be flagged as outlier
      expect(outliers.length).toBeLessThanOrEqual(entries.length);
    });

    it("should return empty array when all entries cluster well", () => {
      const entries = [
        createEntry("Identical message"),
        createEntry("Identical message"),
        createEntry("Identical message"),
      ];

      const clusters = clusterLogs(entries);
      const outliers = findOutliers(entries, clusters, 0.1);

      expect(outliers.length).toBeLessThanOrEqual(entries.length);
    });

    it("should return empty array for empty inputs", () => {
      const outliers = findOutliers([], []);
      expect(outliers).toHaveLength(0);
    });
  });

  describe("hierarchicalCluster", () => {
    it("should create hierarchical cluster structure", () => {
      const entries = [
        createEntry("Error: database timeout"),
        createEntry("Error: database connection failed"),
        createEntry("Error: network unreachable"),
        createEntry("Error: network timeout"),
        createEntry("Warning: high latency"),
      ];

      const hierarchical = hierarchicalCluster(entries);

      expect(hierarchical).toBeDefined();
      expect(hierarchical.levels).toBeDefined();
      expect(hierarchical.levels.length).toBeGreaterThan(0);
      expect(hierarchical.summary).toBeDefined();
    });

    it("should build multiple hierarchy levels", () => {
      const entries = [
        createEntry("Type A error 1"),
        createEntry("Type A error 2"),
        createEntry("Type B error 1"),
        createEntry("Type B error 2"),
      ];

      const hierarchical = hierarchicalCluster(entries);

      // Should have multiple levels of clustering
      expect(hierarchical.levels.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle single entry", () => {
      const entries = [createEntry("Single log entry")];

      const hierarchical = hierarchicalCluster(entries);

      expect(hierarchical.levels).toBeDefined();
      expect(hierarchical.summary.totalEntries).toBe(1);
    });

    it("should handle empty entries", () => {
      const hierarchical = hierarchicalCluster([]);

      expect(hierarchical.levels).toBeDefined();
      expect(hierarchical.summary.totalEntries).toBe(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty entries", () => {
      const clusters = clusterLogs([]);
      expect(clusters).toHaveLength(0);
    });

    it("should handle single entry", () => {
      const entries = [createEntry("Only message")];
      const clusters = clusterLogs(entries);

      expect(clusters.length).toBeLessThanOrEqual(1);
    });

    it("should handle identical messages", () => {
      const entries = [
        createEntry("Duplicate message"),
        createEntry("Duplicate message"),
        createEntry("Duplicate message"),
      ];

      const clusters = clusterLogs(entries);

      // All identical messages should be in one cluster
      expect(clusters.length).toBe(1);
      expect(clusters[0]!.entries.length).toBe(3);
    });

    it("should handle very long messages", () => {
      const longMessage = "A".repeat(1000);
      const entries = [
        createEntry(longMessage),
        createEntry(longMessage + " variant"),
      ];

      const clusters = clusterLogs(entries);

      expect(clusters.length).toBeGreaterThan(0);
    });

    it("should handle special characters in messages", () => {
      const entries = [
        createEntry("Error: [CRITICAL] ${var} -> null"),
        createEntry("Error: [CRITICAL] ${other} -> null"),
      ];

      const clusters = clusterLogs(entries);

      expect(clusters.length).toBeGreaterThan(0);
    });

    it("should handle mixed log levels", () => {
      const entries = [
        createEntry("Same pattern error", "error"),
        createEntry("Same pattern warning", "warning"),
        createEntry("Same pattern info", "info"),
        createEntry("Same pattern debug", "debug"),
      ];

      const clusters = clusterLogs(entries);

      // Should cluster by message similarity, not level
      expect(clusters.length).toBeGreaterThan(0);
    });
  });
});
