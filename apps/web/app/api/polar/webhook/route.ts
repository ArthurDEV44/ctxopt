import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyWebhookSignature, POLAR_WEBHOOK_EVENTS } from "@/lib/polar";

interface WebhookPayload {
  type: string;
  data: {
    id: string;
    metadata?: {
      userId?: string;
      clerkId?: string;
    };
    customer?: {
      email?: string;
    };
    subscription?: {
      id: string;
      status: string;
    };
  };
}

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("webhook-signature") ?? "";

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(payload, signature);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return Response.json(
        { error: { code: "INVALID_SIGNATURE", message: "Invalid webhook signature" } },
        { status: 401 }
      );
    }

    const event = JSON.parse(payload) as WebhookPayload;
    console.log("Polar webhook event:", event.type);

    switch (event.type) {
      case POLAR_WEBHOOK_EVENTS.SUBSCRIPTION_CREATED:
      case POLAR_WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED: {
        const { metadata } = event.data;

        if (!metadata?.userId) {
          console.error("No userId in webhook metadata");
          return Response.json({ received: true });
        }

        // Update user plan to pro
        await db
          .update(users)
          .set({
            plan: "pro",
            polarSubscriptionId: event.data.subscription?.id,
            updatedAt: new Date(),
          })
          .where(eq(users.id, metadata.userId));

        console.log(`Updated user ${metadata.userId} to pro plan`);
        break;
      }

      case POLAR_WEBHOOK_EVENTS.SUBSCRIPTION_CANCELED:
      case POLAR_WEBHOOK_EVENTS.SUBSCRIPTION_REVOKED: {
        const { metadata } = event.data;

        if (!metadata?.userId) {
          console.error("No userId in webhook metadata");
          return Response.json({ received: true });
        }

        // Downgrade user plan to free
        await db
          .update(users)
          .set({
            plan: "free",
            polarSubscriptionId: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, metadata.userId));

        console.log(`Downgraded user ${metadata.userId} to free plan`);
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("Polar webhook error:", error);
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Webhook processing failed" } },
      { status: 500 }
    );
  }
}
