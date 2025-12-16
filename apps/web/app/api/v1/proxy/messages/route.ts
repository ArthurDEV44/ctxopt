import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { apiKeys, requests, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { estimateInputTokens, countTokens } from "@/lib/tokenizer";
import { calculateCost, CTXOPT_HEADERS } from "@ctxopt/shared";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for long streaming responses

/**
 * Validate API key and return associated data
 */
async function validateApiKey(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header", status: 401 };
  }

  const apiKey = authHeader.slice(7);
  if (!apiKey.startsWith("ctx_")) {
    return { error: "Invalid API key format", status: 401 };
  }

  // Hash the key and look it up
  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  const [keyData] = await db
    .select({
      id: apiKeys.id,
      projectId: apiKeys.projectId,
      userId: apiKeys.userId,
      revokedAt: apiKeys.revokedAt,
      user: {
        id: users.id,
        plan: users.plan,
        monthlyTokenLimit: users.monthlyTokenLimit,
      },
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!keyData) {
    return { error: "Invalid API key", status: 401 };
  }

  if (keyData.revokedAt) {
    return { error: "API key has been revoked", status: 401 };
  }

  // Update last used timestamp (fire and forget)
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyData.id));

  return { data: keyData };
}

/**
 * Main proxy handler
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // 1. Validate API key
    const authResult = await validateApiKey(req.headers.get("Authorization"));
    if ("error" in authResult) {
      return Response.json(
        { error: { type: "authentication_error", message: authResult.error } },
        { status: authResult.status }
      );
    }

    const { data: keyData } = authResult;

    // 2. Get user's Anthropic API key from header or env
    const anthropicKey =
      req.headers.get("X-Anthropic-API-Key") || process.env.ANTHROPIC_API_KEY;

    if (!anthropicKey) {
      return Response.json(
        {
          error: {
            type: "invalid_request_error",
            message:
              "No Anthropic API key provided. Set X-Anthropic-API-Key header.",
          },
        },
        { status: 400 }
      );
    }

    // 3. Parse request body
    const body = await req.json();
    const { model, messages, system, stream = false, ...rest } = body;

    if (!model || !messages) {
      return Response.json(
        {
          error: {
            type: "invalid_request_error",
            message: "Missing required fields: model, messages",
          },
        },
        { status: 400 }
      );
    }

    // 4. Count input tokens
    const inputTokens = estimateInputTokens({ system, messages });

    // 5. TODO: Check rate limits and quotas here
    // For MVP, we'll skip this and just log

    // 6. Create Anthropic client and forward request
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    if (stream) {
      // Handle streaming response
      return handleStreamingResponse(
        anthropic,
        { model, messages, system, stream: true, ...rest },
        {
          requestId,
          projectId: keyData.projectId,
          apiKeyId: keyData.id,
          userId: keyData.userId,
          model,
          inputTokens,
          startTime,
        }
      );
    } else {
      // Handle non-streaming response
      return handleNonStreamingResponse(
        anthropic,
        { model, messages, system, ...rest },
        {
          requestId,
          projectId: keyData.projectId,
          apiKeyId: keyData.id,
          userId: keyData.userId,
          model,
          inputTokens,
          startTime,
        }
      );
    }
  } catch (error) {
    console.error("Proxy error:", error);

    if (error instanceof Anthropic.APIError) {
      return Response.json(
        {
          error: {
            type: "api_error",
            message: error.message,
          },
        },
        { status: error.status || 500 }
      );
    }

    return Response.json(
      {
        error: {
          type: "internal_error",
          message: "An unexpected error occurred",
        },
      },
      { status: 500 }
    );
  }
}

interface RequestMetadata {
  requestId: string;
  projectId: string;
  apiKeyId: string;
  userId: string;
  model: string;
  inputTokens: number;
  startTime: number;
}

async function handleNonStreamingResponse(
  anthropic: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
  metadata: RequestMetadata
) {
  const response = await anthropic.messages.create(params);

  const latencyMs = Date.now() - metadata.startTime;
  const outputTokens = response.usage.output_tokens;
  const costs = calculateCost(metadata.model, metadata.inputTokens, outputTokens);

  // Save metrics async
  void saveRequestMetrics({
    ...metadata,
    outputTokens,
    latencyMs,
    statusCode: 200,
    costs,
  });

  // Add custom headers
  const headers = new Headers();
  headers.set(CTXOPT_HEADERS.REQUEST_ID, metadata.requestId);
  headers.set(CTXOPT_HEADERS.INPUT_TOKENS, metadata.inputTokens.toString());
  headers.set(CTXOPT_HEADERS.OUTPUT_TOKENS, outputTokens.toString());
  headers.set(CTXOPT_HEADERS.TOTAL_COST_MICROS, costs.totalCostMicros.toString());
  headers.set(CTXOPT_HEADERS.LATENCY_MS, latencyMs.toString());

  return Response.json(response, { headers });
}

async function handleStreamingResponse(
  anthropic: Anthropic,
  params: Anthropic.MessageCreateParams & { stream: true },
  metadata: RequestMetadata
) {
  const stream = anthropic.messages.stream(params);

  let outputTokens = 0;

  // Create a transform stream to count output tokens
  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          // Count tokens from content deltas
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            outputTokens += countTokens(event.delta.text);
          }

          // Get final token count from message_delta if available
          if (event.type === "message_delta" && event.usage) {
            outputTokens = event.usage.output_tokens;
          }

          // Forward event as SSE
          const sseEvent = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(sseEvent));
        }

        // Stream completed - save metrics
        const latencyMs = Date.now() - metadata.startTime;
        const costs = calculateCost(metadata.model, metadata.inputTokens, outputTokens);

        void saveRequestMetrics({
          ...metadata,
          outputTokens,
          latencyMs,
          statusCode: 200,
          costs,
        });

        controller.close();
      } catch (error) {
        console.error("Stream error:", error);
        controller.error(error);
      }
    },
  });

  const headers = new Headers();
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", "no-cache");
  headers.set("Connection", "keep-alive");
  headers.set(CTXOPT_HEADERS.REQUEST_ID, metadata.requestId);
  headers.set(CTXOPT_HEADERS.INPUT_TOKENS, metadata.inputTokens.toString());

  return new Response(readableStream, { headers });
}

async function saveRequestMetrics(data: {
  requestId: string;
  projectId: string;
  apiKeyId: string;
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  statusCode: number;
  costs: { inputCostMicros: number; outputCostMicros: number; totalCostMicros: number };
}) {
  try {
    await db.insert(requests).values({
      id: data.requestId,
      projectId: data.projectId,
      apiKeyId: data.apiKeyId,
      userId: data.userId,
      model: data.model,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens: data.inputTokens + data.outputTokens,
      inputCostMicros: data.costs.inputCostMicros,
      outputCostMicros: data.costs.outputCostMicros,
      totalCostMicros: data.costs.totalCostMicros,
      latencyMs: data.latencyMs,
      statusCode: data.statusCode,
    });
  } catch (error) {
    console.error("Failed to save request metrics:", error);
  }
}
