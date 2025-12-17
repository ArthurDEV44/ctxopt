import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { polar } from "@/lib/polar";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    // Get user from database
    const [user] = await db
      .select({
        id: users.id,
        plan: users.plan,
        polarSubscriptionId: users.polarSubscriptionId,
      })
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    if (!user) {
      return Response.json({ plan: "free", subscription: null });
    }

    // If user has a subscription, fetch details from Polar
    if (user.polarSubscriptionId) {
      try {
        const subscription = await polar.subscriptions.get({
          id: user.polarSubscriptionId,
        });

        return Response.json({
          plan: user.plan,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          },
        });
      } catch {
        // Subscription not found in Polar, return just the plan
        return Response.json({ plan: user.plan, subscription: null });
      }
    }

    return Response.json({ plan: user.plan, subscription: null });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch subscription" } },
      { status: 500 }
    );
  }
}
