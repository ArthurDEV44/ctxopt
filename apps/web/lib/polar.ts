import { Polar } from "@polar-sh/sdk";

// Initialize Polar client
export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
});

// Product IDs from Polar dashboard
export const POLAR_PRODUCTS = {
  pro_monthly: process.env.POLAR_PRO_MONTHLY_PRODUCT_ID!,
  pro_yearly: process.env.POLAR_PRO_YEARLY_PRODUCT_ID!,
} as const;

// Webhook event types we handle
export const POLAR_WEBHOOK_EVENTS = {
  CHECKOUT_CREATED: "checkout.created",
  SUBSCRIPTION_CREATED: "subscription.created",
  SUBSCRIPTION_UPDATED: "subscription.updated",
  SUBSCRIPTION_CANCELED: "subscription.canceled",
  SUBSCRIPTION_REVOKED: "subscription.revoked",
} as const;

// Verify webhook signature
export async function verifyWebhookSignature(
  payload: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.POLAR_WEBHOOK_SECRET!;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedSignature === signature;
}
