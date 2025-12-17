import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, requests, usageDaily } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc, count, sum, avg } from "drizzle-orm";
import { getMonthStart, getNextMonthStart } from "@ctxopt/shared";

type Period = "this_month" | "last_month" | "last_7_days" | "last_30_days";

function getPeriodDates(period: Period): { start: Date; end: Date } {
  const now = new Date();

  switch (period) {
    case "this_month":
      return {
        start: getMonthStart(),
        end: getNextMonthStart(),
      };
    case "last_month": {
      const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const thisMonth = getMonthStart();
      return { start: lastMonth, end: thisMonth };
    }
    case "last_7_days": {
      const start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 7);
      start.setUTCHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case "last_30_days": {
      const start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 30);
      start.setUTCHours(0, 0, 0, 0);
      return { start, end: now };
    }
    default:
      return {
        start: getMonthStart(),
        end: getNextMonthStart(),
      };
  }
}

// GET /api/usage - Get usage statistics
export async function GET(request: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    // Get internal user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    if (!user) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    // Parse query params
    const url = new URL(request.url);
    const period = (url.searchParams.get("period") as Period) || "this_month";
    const { start, end } = getPeriodDates(period);

    // Get summary statistics from requests table
    const [summary] = await db
      .select({
        totalRequests: count(),
        totalTokens: sum(requests.totalTokens),
        inputTokens: sum(requests.inputTokens),
        outputTokens: sum(requests.outputTokens),
        totalCostMicros: sum(requests.totalCostMicros),
        avgLatencyMs: avg(requests.latencyMs),
        errorCount: sql<number>`COUNT(CASE WHEN ${requests.statusCode} >= 400 THEN 1 END)`,
      })
      .from(requests)
      .where(
        and(
          eq(requests.userId, user.id),
          gte(requests.createdAt, start),
          lte(requests.createdAt, end)
        )
      );

    const totalRequests = summary?.totalRequests ?? 0;
    const errorCount = Number(summary?.errorCount ?? 0);
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    // Get daily breakdown
    const dailyData = await db
      .select({
        date: sql<string>`DATE(${requests.createdAt})`,
        requests: count(),
        tokens: sum(requests.totalTokens),
        inputTokens: sum(requests.inputTokens),
        outputTokens: sum(requests.outputTokens),
        costMicros: sum(requests.totalCostMicros),
      })
      .from(requests)
      .where(
        and(
          eq(requests.userId, user.id),
          gte(requests.createdAt, start),
          lte(requests.createdAt, end)
        )
      )
      .groupBy(sql`DATE(${requests.createdAt})`)
      .orderBy(sql`DATE(${requests.createdAt})`);

    // Get usage by model
    const modelData = await db
      .select({
        model: requests.model,
        requests: count(),
        tokens: sum(requests.totalTokens),
        costMicros: sum(requests.totalCostMicros),
      })
      .from(requests)
      .where(
        and(
          eq(requests.userId, user.id),
          gte(requests.createdAt, start),
          lte(requests.createdAt, end)
        )
      )
      .groupBy(requests.model);

    // Build byModel object
    const byModel: Record<string, { requests: number; tokens: number; costMicros: number }> = {};
    for (const row of modelData) {
      byModel[row.model] = {
        requests: row.requests,
        tokens: Number(row.tokens ?? 0),
        costMicros: Number(row.costMicros ?? 0),
      };
    }

    // Calculate quota usage (for this month only)
    const monthlyUsed = period === "this_month" ? Number(summary?.totalTokens ?? 0) : 0;
    let quotaUsed = monthlyUsed;

    // If not this_month period, fetch current month usage separately
    if (period !== "this_month") {
      const [currentMonthUsage] = await db
        .select({
          totalTokens: sum(requests.totalTokens),
        })
        .from(requests)
        .where(
          and(
            eq(requests.userId, user.id),
            gte(requests.createdAt, getMonthStart()),
            lte(requests.createdAt, getNextMonthStart())
          )
        );
      quotaUsed = Number(currentMonthUsage?.totalTokens ?? 0);
    }

    const quotaLimit = user.monthlyTokenLimit;
    const quotaPercentage = quotaLimit > 0 ? Math.round((quotaUsed / quotaLimit) * 100) : 0;

    return Response.json({
      summary: {
        totalRequests,
        totalTokens: Number(summary?.totalTokens ?? 0),
        inputTokens: Number(summary?.inputTokens ?? 0),
        outputTokens: Number(summary?.outputTokens ?? 0),
        totalCostMicros: Number(summary?.totalCostMicros ?? 0),
        avgLatencyMs: Math.round(Number(summary?.avgLatencyMs ?? 0)),
        errorRate: Math.round(errorRate * 100) / 100,
      },
      daily: dailyData.map((d) => ({
        date: d.date,
        requests: d.requests,
        tokens: Number(d.tokens ?? 0),
        inputTokens: Number(d.inputTokens ?? 0),
        outputTokens: Number(d.outputTokens ?? 0),
        costMicros: Number(d.costMicros ?? 0),
      })),
      byModel,
      quotaUsage: {
        used: quotaUsed,
        limit: quotaLimit,
        percentage: Math.min(quotaPercentage, 100),
        resetDate: getNextMonthStart().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch usage data" } },
      { status: 500 }
    );
  }
}
