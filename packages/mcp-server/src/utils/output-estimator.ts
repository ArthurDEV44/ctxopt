/**
 * Output Token Estimator
 *
 * Heuristic-based estimation of LLM output tokens based on:
 * - Content type (code, logs, questions, instructions)
 * - Input length
 * - Content patterns
 */

import type { ContentType } from "../compressors/types.js";

/**
 * Output estimation result
 */
export interface OutputEstimate {
  /** Estimated output tokens */
  estimated: number;
  /** Confidence level of the estimate */
  confidence: "low" | "medium" | "high";
  /** Human-readable reasoning for the estimate */
  reasoning: string;
}

/**
 * Output ratio configuration per content type
 */
interface OutputRatio {
  /** Minimum output/input ratio */
  minRatio: number;
  /** Maximum output/input ratio */
  maxRatio: number;
  /** Default output/input ratio */
  defaultRatio: number;
}

/**
 * Extended content types including conversational patterns
 */
type ExtendedContentType = ContentType | "question" | "instruction";

/**
 * Output estimation ratios by content type
 * Based on typical LLM response patterns
 */
const OUTPUT_RATIOS: Record<ExtendedContentType, OutputRatio> = {
  // Code input often results in code output (similar length)
  code: { minRatio: 0.3, maxRatio: 1.5, defaultRatio: 0.8 },

  // Logs/errors need concise summaries
  logs: { minRatio: 0.1, maxRatio: 0.3, defaultRatio: 0.2 },
  stacktrace: { minRatio: 0.1, maxRatio: 0.4, defaultRatio: 0.25 },

  // Config analysis is usually brief
  config: { minRatio: 0.2, maxRatio: 0.5, defaultRatio: 0.3 },

  // Generic text might get similar-length responses
  generic: { minRatio: 0.3, maxRatio: 1.0, defaultRatio: 0.5 },

  // Questions typically get expansive answers
  question: { minRatio: 0.5, maxRatio: 2.0, defaultRatio: 1.0 },

  // Instructions (do X) get acknowledgment + result
  instruction: { minRatio: 0.3, maxRatio: 1.5, defaultRatio: 0.6 },
};

/**
 * Patterns that indicate a question
 */
const QUESTION_PATTERNS = [
  /^(what|how|why|when|where|who|which|can|could|would|should|is|are|do|does)\b/i,
  /\?[\s]*$/,
  /\b(explain|describe|tell me|help me understand|what is|what are)\b/i,
];

/**
 * Patterns that indicate an instruction/command
 */
const INSTRUCTION_PATTERNS = [
  /^(create|write|build|implement|add|remove|fix|update|change|modify|generate|make|refactor)\b/i,
  /^(please|can you|could you|would you|I need you to|I want you to)\b/i,
  /\b(write a|create a|build a|implement a|add a|generate a)\b/i,
];

/**
 * Detect if content is a question
 */
export function isQuestion(content: string): boolean {
  const trimmed = content.trim();
  return QUESTION_PATTERNS.some((p) => p.test(trimmed));
}

/**
 * Detect if content is an instruction/command
 */
export function isInstruction(content: string): boolean {
  const trimmed = content.trim();
  return INSTRUCTION_PATTERNS.some((p) => p.test(trimmed));
}

/**
 * Estimate output tokens based on content analysis
 *
 * @param content - The input content
 * @param inputTokens - Pre-calculated input token count
 * @param contentType - Detected content type
 * @returns Estimation with confidence and reasoning
 */
export function estimateOutputTokens(
  content: string,
  inputTokens: number,
  contentType: ContentType
): OutputEstimate {
  // Determine effective content type by checking conversational patterns
  let effectiveType: ExtendedContentType = contentType;

  if (contentType === "generic") {
    if (isQuestion(content)) {
      effectiveType = "question";
    } else if (isInstruction(content)) {
      effectiveType = "instruction";
    }
  }

  const ratios = OUTPUT_RATIOS[effectiveType];

  // Base estimation using default ratio
  let estimated = Math.round(inputTokens * ratios.defaultRatio);
  let confidence: "low" | "medium" | "high" = "medium";
  let reasoning = "";

  // Adjust based on input length
  if (inputTokens < 100) {
    // Short inputs often get longer outputs (elaboration needed)
    estimated = Math.max(estimated, Math.round(inputTokens * ratios.maxRatio));
    confidence = "low";
    reasoning = "Short input - output length may vary significantly";
  } else if (inputTokens > 10000) {
    // Very long inputs typically get more concise responses
    estimated = Math.round(inputTokens * ratios.minRatio);
    confidence = "medium";
    reasoning = "Long input - expecting summarized/focused response";
  } else {
    confidence = "medium";
    reasoning = `Based on ${effectiveType} content pattern (${ratios.defaultRatio}x ratio)`;
  }

  // Apply minimum floor (responses are rarely < 50 tokens)
  const MIN_OUTPUT = 50;
  if (estimated < MIN_OUTPUT) {
    estimated = MIN_OUTPUT;
    reasoning += "; minimum output floor applied";
  }

  // Apply maximum ceiling (practical limit for single response)
  const MAX_OUTPUT = 16000;
  if (estimated > MAX_OUTPUT) {
    estimated = MAX_OUTPUT;
    confidence = "low";
    reasoning = "Very long input - capped at practical response limit";
  }

  return { estimated, confidence, reasoning };
}

/**
 * Get the output ratio for a content type (for display purposes)
 */
export function getOutputRatio(contentType: ContentType): OutputRatio {
  return OUTPUT_RATIOS[contentType] || OUTPUT_RATIOS.generic;
}
