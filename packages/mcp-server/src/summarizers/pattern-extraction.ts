/**
 * Log Pattern Extraction Module
 *
 * Extracts recurring patterns and templates from log messages.
 * Inspired by CFTL (Clustering by First Token and Length) technique.
 *
 * References:
 * - CFTL: https://www.mdpi.com/2076-3417/15/4/1740
 * - LogOHC: Online Hierarchical Clustering for log templates
 */

import type { LogEntry } from "./types.js";

/**
 * A detected log pattern/template
 */
export interface LogPattern {
  /** Unique pattern ID */
  id: string;
  /** Template with placeholders (e.g., "Connection from <IP> failed") */
  template: string;
  /** Variable placeholders detected */
  variables: PatternVariable[];
  /** Number of log entries matching this pattern */
  occurrences: number;
  /** First occurrence timestamp */
  firstSeen?: string;
  /** Last occurrence timestamp */
  lastSeen?: string;
  /** Sample log entries (up to 3) */
  examples: string[];
  /** Pattern importance score (based on frequency and severity) */
  importance: number;
  /** First token for CFTL grouping */
  firstToken: string;
  /** Average message length for CFTL grouping */
  avgLength: number;
}

/**
 * Variable placeholder in a pattern
 */
export interface PatternVariable {
  /** Placeholder name (e.g., "<IP>", "<PATH>") */
  name: string;
  /** Position in the template */
  position: number;
  /** Example values seen */
  examples: string[];
  /** Regex pattern that matches this variable */
  regex: string;
}

/**
 * Pattern extraction configuration
 */
export interface PatternExtractionOptions {
  /** Minimum occurrences to be considered a pattern (default: 2) */
  minOccurrences?: number;
  /** Maximum patterns to return (default: 50) */
  maxPatterns?: number;
  /** Maximum examples per pattern (default: 3) */
  maxExamples?: number;
  /** Similarity threshold for grouping (0-1, default: 0.8) */
  similarityThreshold?: number;
}

/**
 * Variable detection patterns with named groups
 */
const VARIABLE_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  placeholder: string;
}> = [
  // IP addresses
  {
    name: "IP",
    pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?\b/g,
    placeholder: "<IP>",
  },
  // UUIDs
  {
    name: "UUID",
    pattern: /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi,
    placeholder: "<UUID>",
  },
  // Hex hashes (8+ chars)
  {
    name: "HASH",
    pattern: /\b[a-f0-9]{8,64}\b/gi,
    placeholder: "<HASH>",
  },
  // Timestamps ISO
  {
    name: "TIMESTAMP",
    pattern: /\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b/g,
    placeholder: "<TIMESTAMP>",
  },
  // File paths
  {
    name: "PATH",
    pattern: /(?:\/[\w\-.]+)+\/?/g,
    placeholder: "<PATH>",
  },
  // URLs
  {
    name: "URL",
    pattern: /https?:\/\/[^\s]+/g,
    placeholder: "<URL>",
  },
  // Numbers (integers and floats)
  {
    name: "NUM",
    pattern: /\b\d+(?:\.\d+)?\b/g,
    placeholder: "<NUM>",
  },
  // Quoted strings
  {
    name: "STRING",
    pattern: /"[^"]*"|'[^']*'/g,
    placeholder: "<STRING>",
  },
  // Email addresses
  {
    name: "EMAIL",
    pattern: /\b[\w.+-]+@[\w.-]+\.\w+\b/g,
    placeholder: "<EMAIL>",
  },
];

/**
 * Extract patterns from log entries
 */
export function extractPatterns(
  entries: LogEntry[],
  options: PatternExtractionOptions = {}
): LogPattern[] {
  const minOccurrences = options.minOccurrences ?? 2;
  const maxPatterns = options.maxPatterns ?? 50;
  const maxExamples = options.maxExamples ?? 3;

  // Group entries by first token and length (CFTL approach)
  const groups = groupByCFTL(entries);

  // Extract patterns from each group
  const patterns: Map<string, LogPattern> = new Map();

  for (const group of groups.values()) {
    const groupPatterns = extractGroupPatterns(group, maxExamples);

    for (const pattern of groupPatterns) {
      const existing = patterns.get(pattern.template);
      if (existing) {
        // Merge with existing pattern
        existing.occurrences += pattern.occurrences;
        existing.lastSeen = pattern.lastSeen ?? existing.lastSeen;
        if (existing.examples.length < maxExamples) {
          existing.examples.push(
            ...pattern.examples.slice(0, maxExamples - existing.examples.length)
          );
        }
      } else {
        patterns.set(pattern.template, pattern);
      }
    }
  }

  // Filter by minimum occurrences and sort by importance
  return Array.from(patterns.values())
    .filter((p) => p.occurrences >= minOccurrences)
    .map((p) => ({
      ...p,
      importance: calculatePatternImportance(p, entries.length),
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, maxPatterns);
}

/**
 * Group entries by first token and message length (CFTL technique)
 */
function groupByCFTL(entries: LogEntry[]): Map<string, LogEntry[]> {
  const groups = new Map<string, LogEntry[]>();

  for (const entry of entries) {
    const firstToken = extractFirstToken(entry.message);
    const lengthBucket = Math.floor(entry.message.length / 50) * 50; // 50-char buckets
    const key = `${firstToken}:${lengthBucket}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  return groups;
}

/**
 * Extract the first meaningful token from a message
 */
function extractFirstToken(message: string): string {
  // Remove common prefixes (timestamps, log levels)
  const cleaned = message
    .replace(/^\[.*?\]\s*/g, "") // [timestamp] or [level]
    .replace(/^[\d\-:T.Z]+\s*/g, "") // Timestamps
    .replace(/^(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)\s*[-:.]?\s*/i, "")
    .trim();

  // Extract first word/token
  const match = cleaned.match(/^[\w]+/);
  return match ? match[0].toLowerCase() : "unknown";
}

/**
 * Extract patterns from a group of similar entries
 */
function extractGroupPatterns(
  entries: LogEntry[],
  maxExamples: number
): LogPattern[] {
  if (entries.length === 0) return [];

  // Create templates for each entry
  const templates = new Map<string, { entries: LogEntry[]; variables: Map<string, string[]> }>();

  for (const entry of entries) {
    const { template, variables } = createTemplate(entry.message);

    if (!templates.has(template)) {
      templates.set(template, { entries: [], variables: new Map() });
    }

    const group = templates.get(template)!;
    group.entries.push(entry);

    // Collect variable examples
    for (const [name, value] of Object.entries(variables)) {
      if (!group.variables.has(name)) {
        group.variables.set(name, []);
      }
      const examples = group.variables.get(name)!;
      if (examples.length < 5 && !examples.includes(value)) {
        examples.push(value);
      }
    }
  }

  // Convert to LogPattern objects
  return Array.from(templates.entries()).map(([template, data]) => {
    const sortedEntries = data.entries.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return a.timestamp.localeCompare(b.timestamp);
    });

    const firstToken = extractFirstToken(template);
    const avgLength =
      data.entries.reduce((sum, e) => sum + e.message.length, 0) / data.entries.length;

    const variables: PatternVariable[] = Array.from(data.variables.entries()).map(
      ([name, examples], position) => ({
        name,
        position,
        examples: examples.slice(0, 3),
        regex: getVariableRegex(name),
      })
    );

    return {
      id: generatePatternId(template),
      template,
      variables,
      occurrences: data.entries.length,
      firstSeen: sortedEntries[0]?.timestamp,
      lastSeen: sortedEntries[sortedEntries.length - 1]?.timestamp,
      examples: data.entries.slice(0, maxExamples).map((e) => e.raw),
      importance: 0, // Calculated later
      firstToken,
      avgLength,
    };
  });
}

/**
 * Create a template from a log message by replacing variables
 */
function createTemplate(message: string): {
  template: string;
  variables: Record<string, string>;
} {
  let template = message;
  const variables: Record<string, string> = {};
  let varCount = 0;

  // Apply variable patterns in order (more specific first)
  for (const { name, pattern, placeholder } of VARIABLE_PATTERNS) {
    template = template.replace(pattern, (match) => {
      const varKey = `${name}_${varCount++}`;
      variables[varKey] = match;
      return placeholder;
    });
  }

  return { template, variables };
}

/**
 * Get regex pattern for a variable type
 */
function getVariableRegex(name: string): string {
  const varType = name.split("_")[0];
  const pattern = VARIABLE_PATTERNS.find((p) => p.name === varType);
  return pattern?.pattern.source ?? ".*";
}

/**
 * Generate a unique ID for a pattern
 */
function generatePatternId(template: string): string {
  // Simple hash based on template content
  let hash = 0;
  for (let i = 0; i < template.length; i++) {
    const char = template.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `pat_${Math.abs(hash).toString(36)}`;
}

/**
 * Calculate pattern importance score
 */
function calculatePatternImportance(pattern: LogPattern, totalEntries: number): number {
  // Frequency score (normalized)
  const frequencyScore = Math.min(pattern.occurrences / totalEntries, 1);

  // Rarity score (rare patterns might indicate anomalies)
  const rarityScore = pattern.occurrences < 5 ? 0.8 : pattern.occurrences < 20 ? 0.5 : 0.2;

  // Error keyword boost
  const errorKeywords = ["error", "exception", "failed", "crash", "fatal"];
  const hasErrorKeyword = errorKeywords.some((kw) =>
    pattern.template.toLowerCase().includes(kw)
  );
  const errorBoost = hasErrorKeyword ? 0.3 : 0;

  // Variable count penalty (too many variables = too generic)
  const variablePenalty = Math.min(pattern.variables.length * 0.05, 0.3);

  return Math.min(1, frequencyScore * 0.4 + rarityScore * 0.3 + errorBoost - variablePenalty);
}

/**
 * Find anomalous patterns (rare occurrences that might indicate issues)
 */
export function findAnomalousPatterns(
  patterns: LogPattern[],
  threshold: number = 0.1
): LogPattern[] {
  if (patterns.length === 0) return [];

  const totalOccurrences = patterns.reduce((sum, p) => sum + p.occurrences, 0);
  const avgOccurrences = totalOccurrences / patterns.length;

  // Patterns with significantly fewer occurrences than average
  return patterns
    .filter((p) => p.occurrences < avgOccurrences * threshold)
    .filter((p) => {
      // But also check if they contain error indicators
      const hasErrorIndicator = /error|exception|fail|crash|timeout|refused/i.test(
        p.template
      );
      return hasErrorIndicator || p.occurrences === 1;
    })
    .sort((a, b) => a.occurrences - b.occurrences);
}

/**
 * Get pattern summary statistics
 */
export function getPatternStats(patterns: LogPattern[]): PatternStats {
  if (patterns.length === 0) {
    return {
      totalPatterns: 0,
      totalOccurrences: 0,
      avgOccurrences: 0,
      mostCommon: [],
      leastCommon: [],
      errorPatterns: 0,
    };
  }

  const totalOccurrences = patterns.reduce((sum, p) => sum + p.occurrences, 0);
  const sorted = [...patterns].sort((a, b) => b.occurrences - a.occurrences);

  const errorPatterns = patterns.filter((p) =>
    /error|exception|fail|crash|fatal/i.test(p.template)
  ).length;

  return {
    totalPatterns: patterns.length,
    totalOccurrences,
    avgOccurrences: totalOccurrences / patterns.length,
    mostCommon: sorted.slice(0, 5).map((p) => ({
      template: p.template,
      count: p.occurrences,
    })),
    leastCommon: sorted.slice(-5).map((p) => ({
      template: p.template,
      count: p.occurrences,
    })),
    errorPatterns,
  };
}

/**
 * Pattern statistics
 */
export interface PatternStats {
  totalPatterns: number;
  totalOccurrences: number;
  avgOccurrences: number;
  mostCommon: Array<{ template: string; count: number }>;
  leastCommon: Array<{ template: string; count: number }>;
  errorPatterns: number;
}

/**
 * Match a log message against known patterns
 */
export function matchPattern(
  message: string,
  patterns: LogPattern[]
): LogPattern | null {
  const { template } = createTemplate(message);

  return patterns.find((p) => p.template === template) ?? null;
}

/**
 * Generate a human-readable pattern description
 */
export function describePattern(pattern: LogPattern): string {
  const parts: string[] = [];

  parts.push(`Pattern: "${truncate(pattern.template, 80)}"`);
  parts.push(`Occurrences: ${pattern.occurrences}`);

  if (pattern.variables.length > 0) {
    parts.push(`Variables: ${pattern.variables.map((v) => v.name).join(", ")}`);
  }

  if (pattern.firstSeen && pattern.lastSeen) {
    parts.push(`Time range: ${pattern.firstSeen} - ${pattern.lastSeen}`);
  }

  return parts.join(" | ");
}

/**
 * Truncate string with ellipsis
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}
