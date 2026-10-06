// ============================================================
// THE SMALL BOOK · edge function: razorpay-webhook
// Razorpay calls this on payment.captured. The signature is the
// HMAC-SHA256 of the RAW body with the webhook secret, compared
// to the X-Razorpay-Signature header. A captured payment writes
// the gold_members row for the matching account; replays do
// nothing twice; failed or cancelled payments grant nothing.
//   deploy: supabase functions deploy razorpay-webhook
//   secret: supabase secrets set RAZORPAY_WEBHOOK_SECRET=...
//   then set the same secret as the webhook secret in the
//   Razorpay dashboard, pointed at this function's URL.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const ok = () => new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const raw = await req.text();
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";
  const given = req.headers.get("x-razorpay-signature") ?? "";
  if (!secret) return new Response("webhook secret not configured", { status: 500 });
  const expect = await hmacHex(secret, raw);
  if (given !== expect) return new Response("bad signature", { status: 401 });

  const ev = JSON.parse(raw || "{}");
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // idempotency: the first copy of an event claims its id; replays stop here
  const eventId = String(ev?.id ?? "");
  if (eventId) {
    const { error } = await admin.from("gold_paid_events").insert({ event_id: eventId });
    if (error) return ok();   // already seen this exact event: do nothing, twice is once
  }

  if (ev?.event !== "payment.captured") return ok();
  const pay = ev?.payload?.payment?.entity ?? {};

  // match the account: notes.user_id when the link carried it, else the
  // payer email mapped through profiles (see UPDATE-v298-gold.sql step 4)
  let userId: string | null = (pay.notes?.user_id ?? null) || null;
  if (!userId) {
    const email = String(pay.email ?? pay.contact ?? "").toLowerCase().trim();
    if (email) {
      const { data } = await admin.from("profiles").select("id").eq("email", email).limit(1).maybeSingle();
      userId = data?.id ?? null;
    }
  }
  if (!userId) return ok();   // a payment we cannot attribute: recorded, granted to no one

  const { data: cur } = await admin
    .from("gold_members")
    .select("expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  const base = cur?.expires_at && new Date(cur.expires_at) > new Date() ? new Date(cur.expires_at) : new Date();
  const expires = new Date(base.getTime() + 365 * 24 * 3600 * 1000).toISOString();

  await admin.from("gold_members").upsert({
    user_id: userId, plan: "gold-yearly",
    activated_at: new Date().toISOString(), expires_at: expires,
  });
  return ok();
});
