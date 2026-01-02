/**
 * Hierarchical Log Summarization Module
 *
 * Implements Chain-of-Thought style summarization for large log files.
 * Chunks logs temporally or by size, summarizes each chunk, then aggregates.
 *
 * References:
 * - CoTHSSum: https://link.springer.com/article/10.1007/s44443-025-00041-2
 * - LLM Chat History Summarization: https://mem0.ai/blog/llm-chat-history-summarization-guide-2025
 */

import type { LogEntry, LogLevel, LogSummary, LogStatistics, SummarizeOptions } from "./types.js";
import { parseLogLine, calculateTimespan, deduplicateEntries } from "../utils/log-parser.js";
import { createLogScorer, type ScoredLogEntry } from "./scoring.js";
import { clusterLogs, selectRepresentatives, type LogCluster } from "./clustering.js";
import { extractPatterns, type LogPattern } from "./pattern-extraction.js";

/**
 * Hierarchical summary with multiple levels of detail
 */
export interface HierarchicalSummary {
  /** High-level overview (1-2 sentences) */
  overview: string;
  /** Section summaries (temporal or thematic chunks) */
  sections: SectionSummary[];
  /** Critical entries that require attention */
  criticalEntries: ScoredLogEntry[];
  /** Detected patterns across all logs */
  patterns: LogPattern[];
  /** Aggregate statistics */
  statistics: LogStatistics;
  /** Clustering information */
  clusters: ClusterSummary[];
}

/**
 * Summary of a single section/chunk
 */
export interface SectionSummary {
  /** Section identifier (e.g., "00:00-01:00" or "Chunk 1") */
  id: string;
  /** Section title/description */
  title: string;
  /** Number of entries in this section */
  entryCount: number;
  /** Time range if available */
  timeRange?: {
    start: string;
    end: string;
  };
  /** Key findings in this section */
  keyFindings: string[];
  /** Error count */
  errorCount: number;
  /** Warning count */
  warningCount: number;
  /** Representative entries */
  representatives: ScoredLogEntry[];
}

/**
 * Cluster summary for overview
 */
export interface ClusterSummary {
  /** Pattern template */
  pattern: string;
  /** Occurrence count */
  count: number;
  /** Dominant level */
  level: LogLevel;
  /** Example message */
  example: string;
}

/**
 * Configuration for hierarchical summarization
 */
export interface HierarchicalOptions {
  /** Number of entries per chunk (default: 500) */
  chunkSize?: number;
  /** Maximum sections in output (default: 10) */
  maxSections?: number;
  /** Maximum critical entries (default: 20) */
  maxCriticalEntries?: number;
  /** Maximum patterns to extract (default: 15) */
  maxPatterns?: number;
  /** Maximum clusters to show (default: 10) */
  maxClusters?: number;
  /** Chunk by time instead of count (default: false) */
  chunkByTime?: boolean;
  /** Time chunk duration in minutes (default: 60) */
  timeChunkMinutes?: number;
}

/**
 * Perform hierarchical summarization on logs
 */
export function summarizeHierarchically(
  logs: string,
  options: HierarchicalOptions = {}
): HierarchicalSummary {
  const chunkSize = options.chunkSize ?? 500;
  const maxSections = options.maxSections ?? 10;
  const maxCriticalEntries = options.maxCriticalEntries ?? 20;
  const maxPatterns = options.maxPatterns ?? 15;
  const maxClusters = options.maxClusters ?? 10;

  // Parse all entries
  const lines = logs.split("\n").filter((l) => l.trim());
  const entries = lines.map((line) => parseLogLine(line.trim()));

  if (entries.length === 0) {
    return createEmptyHierarchicalSummary();
  }

  // Create chunks
  const chunks = options.chunkByTime
    ? chunkByTime(entries, options.timeChunkMinutes ?? 60)
    : chunkBySize(entries, chunkSize);

  // Summarize each chunk
  const sections = chunks
    .map((chunk, index) => summarizeChunk(chunk, index))
    .slice(0, maxSections);

  // Find critical entries across all logs
  const scorer = createLogScorer(entries);
  const criticalEntries = scorer
    .getByLevel("error", maxCriticalEntries)
    .concat(scorer.getByLevel("warning", Math.floor(maxCriticalEntries / 2)))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCriticalEntries);

  // Extract patterns
  const patterns = extractPatterns(entries, { maxPatterns });

  // Cluster logs
  const clusters = clusterLogs(entries, { maxClusters })
    .slice(0, maxClusters)
    .map((c) => ({
      pattern: truncate(c.pattern, 60),
      count: c.entries.length,
      level: c.dominantLevel,
      example: truncate(c.representative.message, 80),
    }));

  // Calculate aggregate statistics
  const statistics = calculateStatistics(entries);

  // Generate overview
  const overview = generateOverview(statistics, sections, criticalEntries);

  return {
    overview,
    sections,
    criticalEntries,
    patterns,
    statistics,
    clusters,
  };
}

/**
 * Chunk entries by count
 */
function chunkBySize(entries: LogEntry[], chunkSize: number): LogEntry[][] {
  const chunks: LogEntry[][] = [];

  for (let i = 0; i < entries.length; i += chunkSize) {
    chunks.push(entries.slice(i, i + chunkSize));
  }

  return chunks;
}

/**
 * Chunk entries by time intervals
 */
function chunkByTime(entries: LogEntry[], intervalMinutes: number): LogEntry[][] {
  const chunks: LogEntry[][] = [];
  let currentChunk: LogEntry[] = [];
  let chunkStart: Date | null = null;

  const intervalMs = intervalMinutes * 60 * 1000;

  for (const entry of entries) {
    if (!entry.timestamp) {
      currentChunk.push(entry);
      continue;
    }

    const entryTime = new Date(entry.timestamp);

    if (!chunkStart) {
      chunkStart = entryTime;
      currentChunk.push(entry);
    } else if (entryTime.getTime() - chunkStart.getTime() < intervalMs) {
      currentChunk.push(entry);
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      currentChunk = [entry];
      chunkStart = entryTime;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Summarize a single chunk of entries
 */
function summarizeChunk(entries: LogEntry[], index: number): SectionSummary {
  if (entries.length === 0) {
    return {
      id: `section_${index + 1}`,
      title: `Section ${index + 1} (empty)`,
      entryCount: 0,
      keyFindings: [],
      errorCount: 0,
      warningCount: 0,
      representatives: [],
    };
  }

  // Calculate time range
  const timespan = calculateTimespan(entries);
  const timeRange = timespan
    ? { start: timespan.start, end: timespan.end }
    : undefined;

  // Count by level
  const errorCount = entries.filter((e) => e.level === "error").length;
  const warningCount = entries.filter((e) => e.level === "warning").length;

  // Score and get representatives
  const scorer = createLogScorer(entries);
  const representatives = scorer.getTopEntries(3);

  // Generate key findings
  const keyFindings = generateKeyFindings(entries, errorCount, warningCount);

  // Create section title
  const title = timeRange
    ? `${timeRange.start} - ${timeRange.end}`
    : `Entries ${index * entries.length + 1}-${(index + 1) * entries.length}`;

  return {
    id: `section_${index + 1}`,
    title,
    entryCount: entries.length,
    timeRange,
    keyFindings,
    errorCount,
    warningCount,
    representatives,
  };
}

/**
 * Generate key findings for a chunk
 */
function generateKeyFindings(
  entries: LogEntry[],
  errorCount: number,
  warningCount: number
): string[] {
  const findings: string[] = [];

  if (errorCount > 0) {
    findings.push(`${errorCount} error${errorCount > 1 ? "s" : ""} detected`);
  }

  if (warningCount > 0) {
    findings.push(`${warningCount} warning${warningCount > 1 ? "s" : ""}`);
  }

  // Look for patterns
  const errorMessages = entries
    .filter((e) => e.level === "error")
    .map((e) => e.message);

  if (errorMessages.length > 0) {
    // Find common error patterns
    const patterns = findCommonPatterns(errorMessages);
    if (patterns.length > 0) {
      findings.push(`Common error: ${truncate(patterns[0]!, 50)}`);
    }
  }

  // Check for spikes
  const entryCounts = countByMinute(entries);
  const avgCount = entryCounts.reduce((a, b) => a + b, 0) / (entryCounts.length || 1);
  const maxCount = Math.max(...entryCounts, 0);

  if (maxCount > avgCount * 3) {
    findings.push(`Activity spike detected (${maxCount}x normal)`);
  }

  return findings.slice(0, 4);
}

/**
 * Find common patterns in messages
 */
function findCommonPatterns(messages: string[]): string[] {
  if (messages.length === 0) return [];

  const normalized = messages.map((m) =>
    m
      .replace(/\d+/g, "<N>")
      .replace(/[a-f0-9]{8,}/gi, "<H>")
      .toLowerCase()
  );

  const counts = new Map<string, number>();
  for (const n of normalized) {
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pattern]) => pattern);
}

/**
 * Count entries per minute
 */
function countByMinute(entries: LogEntry[]): number[] {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    if (!entry.timestamp) continue;

    const minute = entry.timestamp.slice(0, 16); // YYYY-MM-DDTHH:MM
    counts.set(minute, (counts.get(minute) ?? 0) + 1);
  }

  return Array.from(counts.values());
}

/**
 * Calculate aggregate statistics
 */
function calculateStatistics(entries: LogEntry[]): LogStatistics {
  const timespan = calculateTimespan(entries);

  return {
    timespan,
    totalLines: entries.length,
    errorCount: entries.filter((e) => e.level === "error").length,
    warningCount: entries.filter((e) => e.level === "warning").length,
    infoCount: entries.filter((e) => e.level === "info").length,
    debugCount: entries.filter((e) => e.level === "debug").length,
  };
}

/**
 * Generate high-level overview text
 */
function generateOverview(
  statistics: LogStatistics,
  sections: SectionSummary[],
  criticalEntries: ScoredLogEntry[]
): string {
  const parts: string[] = [];

  // Total lines and duration
  parts.push(`${statistics.totalLines.toLocaleString()} log entries`);

  if (statistics.timespan) {
    parts.push(`over ${statistics.timespan.durationFormatted}`);
  }

  // Error/warning summary
  if (statistics.errorCount > 0 || statistics.warningCount > 0) {
    const issues: string[] = [];
    if (statistics.errorCount > 0) {
      issues.push(`${statistics.errorCount} errors`);
    }
    if (statistics.warningCount > 0) {
      issues.push(`${statistics.warningCount} warnings`);
    }
    parts.push(`with ${issues.join(" and ")}`);
  }

  // Section summary
  if (sections.length > 1) {
    const errorSections = sections.filter((s) => s.errorCount > 0).length;
    if (errorSections > 0) {
      parts.push(`(errors in ${errorSections}/${sections.length} sections)`);
    }
  }

  return parts.join(" ") + ".";
}

/**
 * Create empty hierarchical summary
 */
function createEmptyHierarchicalSummary(): HierarchicalSummary {
  return {
    overview: "No log entries found.",
    sections: [],
    criticalEntries: [],
    patterns: [],
    statistics: {
      totalLines: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      debugCount: 0,
    },
    clusters: [],
  };
}

/**
 * Truncate string with ellipsis
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Convert hierarchical summary to LogSummary for compatibility
 */
export function toLogSummary(
  hierarchical: HierarchicalSummary,
  options: SummarizeOptions
): LogSummary {
  const errors = hierarchical.criticalEntries
    .filter((e) => e.level === "error")
    .map((e) => ({
      timestamp: e.timestamp,
      level: e.level,
      message: e.message,
      count: e.count,
      raw: e.raw,
    }));

  const warnings = hierarchical.criticalEntries
    .filter((e) => e.level === "warning")
    .map((e) => ({
      timestamp: e.timestamp,
      level: e.level,
      message: e.message,
      count: e.count,
      raw: e.raw,
    }));

  // Key events from section representatives
  const keyEvents = hierarchical.sections
    .flatMap((s) => s.representatives)
    .slice(0, 10)
    .map((e) => ({
      timestamp: e.timestamp,
      level: e.level,
      message: e.message,
      count: e.count,
      raw: e.raw,
    }));

  return {
    logType: options.logType ?? "generic",
    overview: hierarchical.overview,
    errors: deduplicateEntries(errors),
    warnings: deduplicateEntries(warnings),
    keyEvents,
    statistics: hierarchical.statistics,
  };
}

/**
 * Format hierarchical summary as markdown
 */
export function formatAsMarkdown(summary: HierarchicalSummary): string {
  const lines: string[] = [];

  // Overview
  lines.push("## Overview");
  lines.push(summary.overview);
  lines.push("");

  // Statistics
  lines.push("## Statistics");
  lines.push(`- Total entries: ${summary.statistics.totalLines.toLocaleString()}`);
  lines.push(`- Errors: ${summary.statistics.errorCount}`);
  lines.push(`- Warnings: ${summary.statistics.warningCount}`);
  if (summary.statistics.timespan) {
    lines.push(`- Duration: ${summary.statistics.timespan.durationFormatted}`);
  }
  lines.push("");

  // Critical entries
  if (summary.criticalEntries.length > 0) {
    lines.push("## Critical Entries");
    for (const entry of summary.criticalEntries.slice(0, 5)) {
      lines.push(`- [${entry.level.toUpperCase()}] ${truncate(entry.message, 100)}`);
    }
    lines.push("");
  }

  // Patterns
  if (summary.patterns.length > 0) {
    lines.push("## Common Patterns");
    for (const pattern of summary.patterns.slice(0, 5)) {
      lines.push(`- ${pattern.template} (${pattern.occurrences}x)`);
    }
    lines.push("");
  }

  // Sections
  if (summary.sections.length > 1) {
    lines.push("## Sections");
    for (const section of summary.sections) {
      lines.push(`### ${section.title}`);
      lines.push(`- Entries: ${section.entryCount}`);
      if (section.errorCount > 0) {
        lines.push(`- Errors: ${section.errorCount}`);
      }
      for (const finding of section.keyFindings) {
        lines.push(`- ${finding}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
