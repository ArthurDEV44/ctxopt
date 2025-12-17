import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, suggestions, projects } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/suggestions - Get optimization suggestions
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
    const status = url.searchParams.get("status"); // active, dismissed, applied
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    // Build query conditions
    const conditions = [eq(suggestions.userId, user.id)];
    if (status) {
      conditions.push(eq(suggestions.status, status));
    }

    // Get suggestions with project info
    const userSuggestions = await db
      .select({
        id: suggestions.id,
        type: suggestions.type,
        severity: suggestions.severity,
        title: suggestions.title,
        description: suggestions.description,
        estimatedTokenSavings: suggestions.estimatedTokenSavings,
        estimatedCostSavingsMicros: suggestions.estimatedCostSavingsMicros,
        context: suggestions.context,
        status: suggestions.status,
        projectId: suggestions.projectId,
        projectName: projects.name,
        createdAt: suggestions.createdAt,
      })
      .from(suggestions)
      .innerJoin(projects, eq(suggestions.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(suggestions.createdAt))
      .limit(limit);

    // Calculate total potential savings
    const activeSuggestions = userSuggestions.filter((s) => s.status === "active");
    const totalPotentialSavingsMicros = activeSuggestions.reduce(
      (sum, s) => sum + (s.estimatedCostSavingsMicros ?? 0),
      0
    );
    const totalPotentialTokenSavings = activeSuggestions.reduce(
      (sum, s) => sum + (s.estimatedTokenSavings ?? 0),
      0
    );

    return Response.json({
      suggestions: userSuggestions,
      summary: {
        total: userSuggestions.length,
        active: activeSuggestions.length,
        totalPotentialSavingsMicros,
        totalPotentialTokenSavings,
      },
    });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch suggestions" } },
      { status: 500 }
    );
  }
}
