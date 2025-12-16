/**
 * Content Type Detector
 *
 * Auto-detects the type of content for optimal compression.
 */

import type { ContentType } from "../compressors/types.js";

// Log patterns
const LOG_LEVEL_PATTERN = /\[\s*(INFO|DEBUG|WARN|WARNING|ERROR|TRACE|FATAL)\s*\]/i;
const LOG_TIMESTAMP_PATTERN = /\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/;
const LOG_COMMON_FORMATS = /^(\d{4}-\d{2}-\d{2}|\[\d{2}:\d{2}:\d{2}\]|[A-Z]{3,5}\s+\d{1,2})/m;

// Stack trace patterns
const ERROR_START_PATTERN = /^(Error|TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError|AggregateError|Exception|Panic|panic):/m;
const STACK_FRAME_PATTERN = /^\s+at\s+/m;
const PYTHON_TRACEBACK = /^Traceback \(most recent call last\):/m;
const RUST_PANIC = /^thread '.*' panicked at/m;
const GO_PANIC = /^panic:/m;

// Config patterns
const JSON_START = /^\s*[\[{]/;
const YAML_PATTERN = /^[\w-]+:\s*(\n|.+)/m;

/**
 * Check if content is valid JSON
 */
export function isValidJSON(content: string): boolean {
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if content looks like YAML
 */
export function isLikelyYAML(content: string): boolean {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return false;

  // Check for YAML-like structure: key: value pairs
  let yamlLikeLines = 0;
  for (const line of lines.slice(0, 10)) {
    if (/^\s*[\w-]+:\s*.+$/.test(line) || /^\s*-\s+/.test(line)) {
      yamlLikeLines++;
    }
  }

  return yamlLikeLines >= 3;
}

/**
 * Check if content looks like code
 */
export function isLikelyCode(content: string): boolean {
  const codeIndicators = [
    /^(import|export|const|let|var|function|class|interface|type)\s+/m,
    /^(def|class|import|from|if|for|while|try|except)\s+/m,
    /^(fn|struct|impl|use|mod|pub|let|mut)\s+/m,
    /^(func|package|import|type|struct|interface)\s+/m,
  ];

  return codeIndicators.some((pattern) => pattern.test(content));
}

/**
 * Detect the type of content
 */
export function detectContentType(content: string): ContentType {
  // Empty or very short content
  if (!content || content.trim().length < 10) {
    return "generic";
  }

  // Stack trace detection (check first as it's most specific)
  if (
    ERROR_START_PATTERN.test(content) &&
    (STACK_FRAME_PATTERN.test(content) || content.includes("    at "))
  ) {
    return "stacktrace";
  }

  // Python traceback
  if (PYTHON_TRACEBACK.test(content)) {
    return "stacktrace";
  }

  // Rust/Go panic
  if (RUST_PANIC.test(content) || GO_PANIC.test(content)) {
    return "stacktrace";
  }

  // Log detection
  if (LOG_LEVEL_PATTERN.test(content) || LOG_TIMESTAMP_PATTERN.test(content)) {
    // Count log-like lines
    const lines = content.split("\n");
    const logLines = lines.filter(
      (line) => LOG_LEVEL_PATTERN.test(line) || LOG_TIMESTAMP_PATTERN.test(line)
    );
    if (logLines.length >= lines.length * 0.3) {
      return "logs";
    }
  }

  // Common log formats
  if (LOG_COMMON_FORMATS.test(content)) {
    const lines = content.split("\n");
    const matchingLines = lines.filter((line) => LOG_COMMON_FORMATS.test(line));
    if (matchingLines.length >= lines.length * 0.5) {
      return "logs";
    }
  }

  // Config detection (JSON)
  if (JSON_START.test(content.trim()) && isValidJSON(content)) {
    return "config";
  }

  // Config detection (YAML-like)
  if (YAML_PATTERN.test(content) && isLikelyYAML(content)) {
    return "config";
  }

  // Code detection
  if (isLikelyCode(content)) {
    return "code";
  }

  return "generic";
}

/**
 * Get a human-readable description of the content type
 */
export function getContentTypeDescription(type: ContentType): string {
  switch (type) {
    case "logs":
      return "Application logs";
    case "stacktrace":
      return "Stack trace / Error dump";
    case "config":
      return "Configuration file (JSON/YAML)";
    case "code":
      return "Source code";
    case "generic":
      return "Generic text content";
  }
}
