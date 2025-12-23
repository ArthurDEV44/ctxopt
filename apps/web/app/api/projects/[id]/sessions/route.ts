import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, users, usageRecords } from "@/lib/db/schema";
import { eq, and, gte, count, desc } from "drizzle-orm";
import { UsagePeriodEnum } from "@ctxopt/shared";

type RouteContext = { params: Promise<{ id: string }> };

function getPeriodStartDate(period: string): Date {
  const now = new Date();
  const days = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "365d": 365,
  }[period] ?? 30;

  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * GET /api/projects/[id]/sessions - Get individual sessions for a project
 *
 * Query params:
 * - period: "7d" | "30d" | "90d" | "365d" (default: "30d")
 * - limit: number (default: 10, max: 50)
 * - offset: number (default: 0)
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
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

    // Get project and verify ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Project not found" } },
        { status: 404 }
      );
    }

    if (project.userId !== user.id) {
      return Response.json(
        { error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Parse query params
    const url = new URL(request.url);
    const periodParam = url.searchParams.get("period") ?? "30d";
    const parsedPeriod = UsagePeriodEnum.safeParse(periodParam);
    const period = parsedPeriod.success ? parsedPeriod.data : "30d";
    const startDate = getPeriodStartDate(period);

    const limitParam = parseInt(url.searchParams.get("limit") ?? "10", 10);
    const limit = Math.min(Math.max(1, limitParam), 50);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

    // Get total count
    const [countResult] = await db
      .select({ total: count() })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.projectId, projectId),
          gte(usageRecords.createdAt, startDate)
        )
      );

    const total = countResult?.total ?? 0;

    // Get sessions
    const sessionsResult = await db
      .select({
        id: usageRecords.id,
        sessionId: usageRecords.sessionId,
        startedAt: usageRecords.startedAt,
        tokensUsed: usageRecords.tokensUsed,
        tokensSaved: usageRecords.tokensSaved,
        savingsPercent: usageRecords.savingsPercent,
        costMicros: usageRecords.estimatedCostMicros,
        model: usageRecords.model,
        durationMs: usageRecords.durationMs,
      })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.projectId, projectId),
          gte(usageRecords.createdAt, startDate)
        )
      )
      .orderBy(desc(usageRecords.startedAt))
      .limit(limit)
      .offset(offset);

    const sessions = sessionsResult.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      date: row.startedAt.toISOString(),
      tokensUsed: row.tokensUsed,
      tokensSaved: row.tokensSaved,
      savingsPercent: row.savingsPercent,
      costMicros: row.costMicros,
      model: row.model,
      duration: formatDuration(row.durationMs),
    }));

    return Response.json({
      sessions,
      total,
      hasMore: offset + sessions.length < total,
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch sessions" } },
      { status: 500 }
    );
  }
}
