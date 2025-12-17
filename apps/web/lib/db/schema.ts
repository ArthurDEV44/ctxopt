import {
  pgTable,
  text,
  timestamp,
  integer,
  bigint,
  uuid,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// USERS (synced from Clerk via webhook)
// ============================================
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").notNull().unique(),
    email: text("email").notNull(),
    name: text("name"),
    imageUrl: text("image_url"),
    plan: text("plan").notNull().default("free"), // 'free' | 'pro' | 'enterprise'
    polarSubscriptionId: text("polar_subscription_id"),
    monthlyTokenLimit: bigint("monthly_token_limit", { mode: "number" })
      .notNull()
      .default(100000),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_clerk_id_idx").on(table.clerkId),
    index("users_email_idx").on(table.email),
  ]
);

// ============================================
// PROJECTS
// ============================================
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    settings: jsonb("settings")
      .$type<{
        defaultModel?: string;
        maxTokensPerRequest?: number;
        enableSuggestions?: boolean;
      }>()
      .default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("projects_user_id_idx").on(table.userId),
    uniqueIndex("projects_slug_user_idx").on(table.slug, table.userId),
  ]
);

// ============================================
// API KEYS
// ============================================
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull().unique(), // SHA-256 hash
    keyPrefix: text("key_prefix").notNull(), // First 12 chars: "ctx_abc1..."
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permissions: jsonb("permissions")
      .$type<{
        allowedModels?: string[];
        maxTokensPerRequest?: number;
      }>()
      .default({}),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("api_keys_hash_idx").on(table.keyHash),
    index("api_keys_project_id_idx").on(table.projectId),
    index("api_keys_user_id_idx").on(table.userId),
  ]
);

// ============================================
// REQUESTS (individual API calls)
// ============================================
export const requests = pgTable(
  "requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    apiKeyId: uuid("api_key_id")
      .notNull()
      .references(() => apiKeys.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    // Request details
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    totalTokens: integer("total_tokens").notNull(),

    // Cost calculation (in microdollars)
    inputCostMicros: integer("input_cost_micros").notNull(),
    outputCostMicros: integer("output_cost_micros").notNull(),
    totalCostMicros: integer("total_cost_micros").notNull(),

    // Performance
    latencyMs: integer("latency_ms").notNull(),
    statusCode: integer("status_code").notNull(),

    // Context analysis
    contextWindowUsage: integer("context_window_usage"), // % of max
    hasSystemPrompt: boolean("has_system_prompt").default(false),
    messageCount: integer("message_count"),

    // Metadata
    metadata: jsonb("metadata").$type<{
      userAgent?: string;
      clientIp?: string;
      region?: string;
    }>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("requests_project_id_idx").on(table.projectId),
    index("requests_user_id_idx").on(table.userId),
    index("requests_created_at_idx").on(table.createdAt),
    index("requests_analytics_idx").on(table.projectId, table.createdAt),
  ]
);

// ============================================
// USAGE DAILY (aggregated for fast queries)
// ============================================
export const usageDaily = pgTable(
  "usage_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    date: timestamp("date").notNull(),

    // Aggregated metrics
    requestCount: integer("request_count").notNull().default(0),
    inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
    outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
    totalTokens: bigint("total_tokens", { mode: "number" }).notNull().default(0),
    totalCostMicros: bigint("total_cost_micros", { mode: "number" })
      .notNull()
      .default(0),

    // Model breakdown
    modelBreakdown: jsonb("model_breakdown")
      .$type<
        Record<
          string,
          {
            requestCount: number;
            inputTokens: number;
            outputTokens: number;
            costMicros: number;
          }
        >
      >()
      .default({}),

    // Performance
    avgLatencyMs: integer("avg_latency_ms"),
    p95LatencyMs: integer("p95_latency_ms"),
    errorCount: integer("error_count").default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("usage_daily_user_date_idx").on(table.userId, table.date),
    index("usage_daily_project_date_idx").on(table.projectId, table.date),
  ]
);

// ============================================
// SUGGESTIONS (optimization recommendations)
// ============================================
export const suggestions = pgTable(
  "suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").references(() => requests.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    type: text("type").notNull(), // 'context_too_large' | 'redundant_content' | etc.
    severity: text("severity").notNull(), // 'low' | 'medium' | 'high'
    title: text("title").notNull(),
    description: text("description").notNull(),

    // Potential savings
    estimatedTokenSavings: integer("estimated_token_savings"),
    estimatedCostSavingsMicros: integer("estimated_cost_savings_micros"),

    // Context
    context: jsonb("context").$type<{
      currentTokens?: number;
      suggestedTokens?: number;
      snippet?: string;
      recommendation?: string;
    }>(),

    // Status
    status: text("status").notNull().default("active"), // 'active' | 'dismissed' | 'applied'
    dismissedAt: timestamp("dismissed_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("suggestions_project_id_idx").on(table.projectId),
    index("suggestions_user_id_idx").on(table.userId),
    index("suggestions_status_idx").on(table.status),
  ]
);

// ============================================
// RELATIONS
// ============================================
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  apiKeys: many(apiKeys),
  requests: many(requests),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  apiKeys: many(apiKeys),
  requests: many(requests),
}));

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  project: one(projects, { fields: [apiKeys.projectId], references: [projects.id] }),
  user: one(users, { fields: [apiKeys.userId], references: [users.id] }),
  requests: many(requests),
}));

export const requestsRelations = relations(requests, ({ one }) => ({
  project: one(projects, { fields: [requests.projectId], references: [projects.id] }),
  apiKey: one(apiKeys, { fields: [requests.apiKeyId], references: [apiKeys.id] }),
  user: one(users, { fields: [requests.userId], references: [users.id] }),
}));

// ============================================
// TYPE EXPORTS
// ============================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;
export type UsageDaily = typeof usageDaily.$inferSelect;
export type NewUsageDaily = typeof usageDaily.$inferInsert;
export type Suggestion = typeof suggestions.$inferSelect;
export type NewSuggestion = typeof suggestions.$inferInsert;
