import { encodingForModel, type Tiktoken } from "js-tiktoken";

let encoder: Tiktoken | null = null;

/**
 * Get or create the tiktoken encoder
 * Uses cl100k_base which is compatible with Claude models
 */
function getEncoder(): Tiktoken {
  if (!encoder) {
    encoder = encodingForModel("gpt-4"); // Uses cl100k_base
  }
  return encoder;
}

/**
 * Count tokens in a string
 */
export function countTokens(text: string): number {
  const enc = getEncoder();
  const tokens = enc.encode(text);
  return tokens.length;
}

/**
 * Count tokens in an Anthropic messages array
 */
export function countMessageTokens(
  messages: Array<{ role: string; content: string | Array<{ type: string; text?: string }> }>
): number {
  let totalTokens = 0;

  for (const message of messages) {
    // Add role tokens (approximately 4 tokens per message for role/formatting)
    totalTokens += 4;

    if (typeof message.content === "string") {
      totalTokens += countTokens(message.content);
    } else if (Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === "text" && block.text) {
          totalTokens += countTokens(block.text);
        }
        // TODO: Handle image blocks (estimate based on resolution)
      }
    }
  }

  return totalTokens;
}

/**
 * Count tokens in a system prompt
 */
export function countSystemTokens(
  system?: string | Array<{ type: string; text?: string }>
): number {
  if (!system) return 0;

  if (typeof system === "string") {
    return countTokens(system) + 4; // Add formatting overhead
  }

  let tokens = 4; // Formatting overhead
  for (const block of system) {
    if (block.type === "text" && block.text) {
      tokens += countTokens(block.text);
    }
  }
  return tokens;
}

/**
 * Estimate total input tokens for an Anthropic API request
 */
export function estimateInputTokens(request: {
  system?: string | Array<{ type: string; text?: string }>;
  messages: Array<{ role: string; content: string | Array<{ type: string; text?: string }> }>;
}): number {
  const systemTokens = countSystemTokens(request.system);
  const messageTokens = countMessageTokens(request.messages);
  return systemTokens + messageTokens;
}

/**
 * Reset the encoder (for cleanup if needed)
 */
export function resetEncoder(): void {
  encoder = null;
}
