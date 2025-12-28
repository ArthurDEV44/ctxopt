/**
 * Centralized Token Counter
 *
 * Provides accurate token counting using js-tiktoken with a fallback
 * approximation when the encoder is unavailable.
 */

import { encodingForModel, type Tiktoken } from "js-tiktoken";

// Singleton encoder instance
let encoder: Tiktoken | null = null;

/**
 * Get or create the tiktoken encoder
 */
function getEncoder(): Tiktoken | null {
  if (encoder === null) {
    try {
      encoder = encodingForModel("gpt-4");
    } catch (error) {
      console.error("[distill] Failed to initialize tiktoken encoder:", error);
      return null;
    }
  }
  return encoder;
}

/**
 * Approximate token count when encoder is unavailable
 * Uses ~4 characters per token as a rough estimate
 */
function approximateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Count tokens in a string using tiktoken
 * Falls back to approximation if encoder unavailable
 *
 * @param text - The text to count tokens for
 * @returns The number of tokens
 */
export function countTokens(text: string): number {
  const enc = getEncoder();
  if (enc) {
    return enc.encode(text).length;
  }
  return approximateTokens(text);
}

/**
 * Count tokens with explicit fallback behavior
 *
 * @param text - The text to count tokens for
 * @returns Object with token count and whether approximation was used
 */
export function countTokensWithInfo(text: string): {
  tokens: number;
  isApproximate: boolean;
} {
  const enc = getEncoder();
  if (enc) {
    return {
      tokens: enc.encode(text).length,
      isApproximate: false,
    };
  }
  return {
    tokens: approximateTokens(text),
    isApproximate: true,
  };
}

/**
 * Estimate cost in microdollars based on token count
 * Uses Claude Sonnet pricing as default
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param model - Model name for pricing lookup
 * @returns Cost in microdollars (1 microdollar = $0.000001)
 */
export function estimateCostMicros(
  inputTokens: number,
  outputTokens: number,
  model: string = "claude-sonnet-4"
): number {
  // Pricing in microdollars per token
  const pricing: Record<string, { input: number; output: number }> = {
    "claude-opus-4": { input: 15, output: 75 }, // $15/$75 per 1M tokens
    "claude-sonnet-4": { input: 3, output: 15 }, // $3/$15 per 1M tokens
    "claude-3-5-haiku": { input: 1, output: 5 }, // $1/$5 per 1M tokens
  };

  const modelPricing = pricing[model] ?? pricing["claude-sonnet-4"]!;
  return inputTokens * modelPricing.input + outputTokens * modelPricing.output;
}
