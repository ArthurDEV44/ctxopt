// ============================================
// Anthropic Model Pricing (per million tokens)
// Updated: December 2025
// ============================================

export const ANTHROPIC_MODELS = {
  "claude-opus-4-20250514": {
    name: "Claude Opus 4",
    inputPricePerMillion: 15_000_000, // $15.00 in microdollars
    outputPricePerMillion: 75_000_000, // $75.00 in microdollars
    contextWindow: 200_000,
  },
  "claude-sonnet-4-20250514": {
    name: "Claude Sonnet 4",
    inputPricePerMillion: 3_000_000, // $3.00 in microdollars
    outputPricePerMillion: 15_000_000, // $15.00 in microdollars
    contextWindow: 200_000,
  },
  "claude-3-5-haiku-20241022": {
    name: "Claude 3.5 Haiku",
    inputPricePerMillion: 800_000, // $0.80 in microdollars
    outputPricePerMillion: 4_000_000, // $4.00 in microdollars
    contextWindow: 200_000,
  },
} as const;

export type AnthropicModel = keyof typeof ANTHROPIC_MODELS;

// ============================================
// Plan Limits
// ============================================

export const PLAN_LIMITS = {
  free: {
    monthlyTokenLimit: 100_000,
    maxProjects: 3,
    maxApiKeysPerProject: 2,
    retentionDays: 7,
    suggestionsEnabled: true,
    exportEnabled: false,
  },
  pro: {
    monthlyTokenLimit: 10_000_000,
    maxProjects: 20,
    maxApiKeysPerProject: 10,
    retentionDays: 90,
    suggestionsEnabled: true,
    exportEnabled: true,
  },
  enterprise: {
    monthlyTokenLimit: 100_000_000,
    maxProjects: -1, // unlimited
    maxApiKeysPerProject: -1, // unlimited
    retentionDays: 365,
    suggestionsEnabled: true,
    exportEnabled: true,
  },
} as const;

// ============================================
// API Key Constants
// ============================================

export const API_KEY_PREFIX = "ctx_";
export const API_KEY_LENGTH = 32; // bytes, before base64url encoding
export const API_KEY_DISPLAY_PREFIX_LENGTH = 12; // e.g., "ctx_abc12345..."

// ============================================
// Rate Limiting
// ============================================

export const RATE_LIMITS = {
  free: {
    requestsPerMinute: 20,
    tokensPerMinute: 10_000,
  },
  pro: {
    requestsPerMinute: 100,
    tokensPerMinute: 100_000,
  },
  enterprise: {
    requestsPerMinute: 1000,
    tokensPerMinute: 1_000_000,
  },
} as const;

// ============================================
// Suggestion Thresholds
// ============================================

export const SUGGESTION_THRESHOLDS = {
  contextTooLarge: {
    warningPercent: 50, // Warn when context is > 50% of max
    criticalPercent: 80, // Critical when > 80%
  },
  redundantContent: {
    similarityThreshold: 0.85, // Content similarity > 85%
    minTokensToCheck: 100,
  },
  repetitivePrompts: {
    minOccurrences: 3, // Same prompt pattern 3+ times
    timeWindowHours: 24,
  },
} as const;

// ============================================
// HTTP Headers
// ============================================

export const CTXOPT_HEADERS = {
  REQUEST_ID: "X-CtxOpt-Request-Id",
  INPUT_TOKENS: "X-CtxOpt-Input-Tokens",
  OUTPUT_TOKENS: "X-CtxOpt-Output-Tokens",
  TOTAL_COST_MICROS: "X-CtxOpt-Total-Cost-Micros",
  LATENCY_MS: "X-CtxOpt-Latency-Ms",
} as const;

// ============================================
// Misc
// ============================================

export const DEFAULT_MODEL: AnthropicModel = "claude-sonnet-4-20250514";
export const MAX_REQUEST_BODY_SIZE = 10 * 1024 * 1024; // 10MB
export const PROXY_TIMEOUT_MS = 300_000; // 5 minutes for long streaming responses
