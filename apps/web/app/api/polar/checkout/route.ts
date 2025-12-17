import { auth } from "@clerk/nextjs/server";
import { polar, POLAR_PRODUCTS } from "@/lib/polar";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { plan, interval } = body as { plan: string; interval: "month" | "year" };

    if (plan !== "pro") {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "Invalid plan" } },
        { status: 400 }
      );
    }

    // Get user from database
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    if (!user) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    // Select product based on interval
    const productId = interval === "year"
      ? POLAR_PRODUCTS.pro_yearly
      : POLAR_PRODUCTS.pro_monthly;

    if (!productId) {
      return Response.json(
        { error: { code: "CONFIG_ERROR", message: "Product not configured" } },
        { status: 500 }
      );
    }

    // Create checkout session with Polar
    const checkout = await polar.checkouts.create({
      products: [productId],
      customerEmail: user.email ?? undefined,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
      metadata: {
        userId: user.id,
        clerkId,
      },
    });

    return Response.json({ checkoutUrl: checkout.url });
  } catch (error) {
    console.error("Polar checkout error:", error);
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create checkout" } },
      { status: 500 }
    );
  }
}
