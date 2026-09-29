import "server-only";
import Stripe from "stripe";
import { adminClient } from "@/lib/supabase/admin";
import type { PlanId } from "@/lib/domain/plans";
import type { Viewer } from "@/lib/viewer";

/** Billing stays off until launch (BILLING_ENABLED=1 and Stripe keys set). */
export const BILLING_ENABLED = process.env.BILLING_ENABLED === "1" && Boolean(process.env.STRIPE_SECRET_KEY);

let stripe: Stripe | null = null;
function client() {
  if (!BILLING_ENABLED) throw new Error("Billing is not enabled");
  stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY!);
  return stripe;
}

const PRICE: Record<Exclude<PlanId, "free">, string | undefined> = {
  premium: process.env.STRIPE_PRICE_PREMIUM,
  premium_exam: process.env.STRIPE_PRICE_PREMIUM_EXAM,
};
const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function customerFor(v: Viewer) {
  const db = adminClient();
  const { data } = await db.from("subscriptions").select("stripe_customer_id").eq("user_id", v.userId).maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id as string;
  const c = await client().customers.create({ email: v.email, metadata: { user_id: v.userId } });
  await db.from("subscriptions").upsert({ user_id: v.userId, stripe_customer_id: c.id });
  return c.id;
}

/** Stripe Checkout for a monthly AUD subscription. */
export async function checkoutUrl(v: Viewer, plan: Exclude<PlanId, "free">): Promise<string> {
  const price = PRICE[plan];
  if (!price) throw new Error(`No Stripe price for ${plan}`);
  const session = await client().checkout.sessions.create({
    mode: "subscription",
    customer: await customerFor(v),
    line_items: [{ price, quantity: 1 }],
    currency: "aud",
    allow_promotion_codes: true,
    client_reference_id: v.userId,
    subscription_data: { metadata: { user_id: v.userId, plan } },
    success_url: `${site()}/plans?billing=success`,
    cancel_url: `${site()}/plans?billing=cancelled`,
  });
  return session.url!;
}

/** Customer portal: upgrade, downgrade, cancel, invoices. */
export async function portalUrl(v: Viewer): Promise<string> {
  const s = await client().billingPortal.sessions.create({ customer: await customerFor(v), return_url: `${site()}/settings/subscription` });
  return s.url;
}

export async function billingHistory(v: Viewer) {
  if (!BILLING_ENABLED) return [];
  const { data } = await adminClient().from("subscriptions").select("stripe_customer_id").eq("user_id", v.userId).maybeSingle();
  if (!data?.stripe_customer_id) return [];
  const inv = await client().invoices.list({ customer: data.stripe_customer_id, limit: 24 });
  return inv.data.map((i) => ({ id: i.id, date: new Date(i.created * 1000).toISOString(), amount: i.amount_paid / 100, currency: i.currency.toUpperCase(), status: i.status ?? "", url: i.hosted_invoice_url ?? null }));
}

function planForPrice(priceId: string | undefined): PlanId {
  if (priceId && priceId === PRICE.premium_exam) return "premium_exam";
  if (priceId && priceId === PRICE.premium) return "premium";
  return "free";
}

/** Verifies and applies a Stripe webhook. Keeps profiles.plan in sync with the subscription. */
export async function handleWebhook(body: string, signature: string) {
  const event = client().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  if (!event.type.startsWith("customer.subscription.")) return;
  const sub = event.data.object as Stripe.Subscription;
  const db = adminClient();
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { data: row } = await db.from("subscriptions").select("user_id").eq("stripe_customer_id", customer).maybeSingle();
  const userId = row?.user_id ?? sub.metadata?.user_id;
  if (!userId) return;
  const active = ["active", "trialing", "past_due"].includes(sub.status) && event.type !== "customer.subscription.deleted";
  const item = sub.items.data[0];
  const plan = active ? planForPrice(item?.price.id) : "free";
  await db.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customer,
    stripe_subscription_id: sub.id,
    plan,
    status: sub.status,
    current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  });
  await db.from("profiles").update({ plan }).eq("id", userId);
}
