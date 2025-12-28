/**
 * BM25 Search Algorithm Tests
 */

import { describe, it, expect } from "vitest";
import { tokenize, createBM25Index } from "./bm25.js";

describe("BM25 utilities", () => {
  describe("tokenize", () => {
    it("should lowercase and split text", () => {
      const result = tokenize("Hello World Test");
      expect(result).toEqual(["hello", "world", "test"]);
    });

    it("should remove punctuation", () => {
      const result = tokenize("hello, world! how's it going?");
      expect(result).toEqual(["hello", "world", "how", "it", "going"]);
    });

    it("should filter short words (less than 2 chars)", () => {
      const result = tokenize("I am a test for x y z");
      expect(result).toEqual(["am", "test", "for"]);
    });

    it("should handle empty string", () => {
      const result = tokenize("");
      expect(result).toEqual([]);
    });

    it("should handle string with only punctuation", () => {
      const result = tokenize("!@#$%^&*()");
      expect(result).toEqual([]);
    });
  });

  describe("createBM25Index", () => {
    interface TestTool {
      name: string;
      description: string;
    }

    const testTools: TestTool[] = [
      { name: "compress", description: "Compress and reduce content size" },
      { name: "analyze", description: "Analyze build output and errors" },
      { name: "summarize", description: "Summarize log files" },
      { name: "optimize", description: "Optimize token usage" },
    ];

    const getSearchableText = (tool: TestTool) =>
      `${tool.name} ${tool.description}`;

    it("should return empty array for empty query", () => {
      const index = createBM25Index(testTools, getSearchableText);
      const results = index.search("");
      expect(results).toEqual([]);
    });

    it("should return empty array for query with only short words", () => {
      const index = createBM25Index(testTools, getSearchableText);
      const results = index.search("a x");
      expect(results).toEqual([]);
    });

    it("should return empty array for empty corpus", () => {
      const index = createBM25Index([], getSearchableText);
      const results = index.search("compress");
      expect(results).toEqual([]);
    });

    it("should find exact name matches", () => {
      const index = createBM25Index(testTools, getSearchableText);
      const results = index.search("compress");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.item.name).toBe("compress");
    });

    it("should find matches in description", () => {
      const index = createBM25Index(testTools, getSearchableText);
      const results = index.search("build output");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.item.name).toBe("analyze");
    });

    it("should rank exact matches higher", () => {
      const index = createBM25Index(testTools, getSearchableText);
      const results = index.search("compress content");

      expect(results.length).toBeGreaterThan(0);
      // "compress" tool should be first as it matches both query terms
      expect(results[0]!.item.name).toBe("compress");
      expect(results[0]!.matchedTerms).toContain("compress");
      expect(results[0]!.matchedTerms).toContain("content");
    });

    it("should handle multi-word queries", () => {
      const index = createBM25Index(testTools, getSearchableText);
      const results = index.search("analyze build errors");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.item.name).toBe("analyze");
      expect(results[0]!.matchedTerms.length).toBeGreaterThan(1);
    });

    it("should return matchedTerms for each result", () => {
      const index = createBM25Index(testTools, getSearchableText);
      const results = index.search("compress");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.matchedTerms).toContain("compress");
    });

    it("should return results sorted by score descending", () => {
      const index = createBM25Index(testTools, getSearchableText);
      const results = index.search("optimize token");

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
      }
    });

    it("should return positive scores for matching documents", () => {
      const index = createBM25Index(testTools, getSearchableText);
      const results = index.search("compress");

      for (const result of results) {
        expect(result.score).toBeGreaterThan(0);
      }
    });

    it("should not return documents without matching terms", () => {
      const index = createBM25Index(testTools, getSearchableText);
      const results = index.search("nonexistent");

      expect(results).toEqual([]);
    });

    it("should provide corpus statistics", () => {
      const index = createBM25Index(testTools, getSearchableText);
      const stats = index.stats();

      expect(stats.documentCount).toBe(4);
      expect(stats.avgDocLength).toBeGreaterThan(0);
      expect(stats.vocabularySize).toBeGreaterThan(0);
    });

    it("should handle custom BM25 parameters", () => {
      const index = createBM25Index(testTools, getSearchableText, {
        k1: 2.0,
        b: 0.5,
      });
      const results = index.search("compress");

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("BM25 ranking behavior", () => {
    it("should rank documents with rare terms higher", () => {
      const docs = [
        { id: 1, text: "common common common" },
        { id: 2, text: "common rare unique" },
        { id: 3, text: "common common" },
      ];

      const index = createBM25Index(docs, (d) => d.text);
      const results = index.search("unique");

      expect(results.length).toBe(1);
      expect(results[0]!.item.id).toBe(2);
    });

    it("should give higher scores to shorter documents (length normalization)", () => {
      const docs = [
        { id: 1, text: "compress file" },
        { id: 2, text: "compress file with additional words that make it longer" },
      ];

      const index = createBM25Index(docs, (d) => d.text);
      const results = index.search("compress file");

      // Shorter document should have higher score due to length normalization
      expect(results[0]!.item.id).toBe(1);
    });

    it("should handle repeated terms correctly", () => {
      const docs = [
        { id: 1, text: "error error error" },
        { id: 2, text: "error warning info" },
      ];

      const index = createBM25Index(docs, (d) => d.text);
      const results = index.search("error");

      // Both should match, with scores reflecting term frequency
      expect(results.length).toBe(2);
      // Document with more "error" terms should score higher (BM25 saturation)
      expect(results[0]!.item.id).toBe(1);
    });
  });
});
