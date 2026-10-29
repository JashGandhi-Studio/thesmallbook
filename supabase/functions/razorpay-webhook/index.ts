// ============================================================
// THE SMALL BOOK · edge function: razorpay-webhook (hardened v334)
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
  // v334: constant-time compare
  let diff = given.length === expect.length ? 0 : 1;
  for (let i = 0; i < Math.min(given.length, expect.length); i++) diff |= given.charCodeAt(i) ^ expect.charCodeAt(i);
  if (diff !== 0) return new Response("bad signature", { status: 401 });

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

  // book sponsorship ("fuel this breakdown")
  if (pay.notes?.type === "fuel" || pay.notes?.book_id) {
    const bookId = String(pay.notes.book_id || "");
    const sponsorName = String(pay.notes.sponsor_name || pay.notes.name || "A reader");
    const amount = Number(pay.amount || 0) / 100;
    try {
      await admin.from("book_sponsors").insert({
        book_id: bookId,
        sponsor_name: sponsorName,
        amount: amount,
        payment_id: pay.id,
        created_at: new Date().toISOString()
      });
    } catch (_) {}
    return ok();
  }

  // v334: Gold is granted ONLY for an order our server priced (gold-order),
  // passed to Razorpay as notes.order_id, and only when the captured amount
  // matches that order to the paisa. A payment we cannot tie to an order
  // grants nothing (before v334 any captured payment gave a year of Gold).
  const orderId = String(pay.notes?.order_id ?? "");
  if (!orderId) return ok();
  const { data: order } = await admin.from("gold_orders").select("*").eq("order_id", orderId).maybeSingle();
  if (!order || order.status === "paid") return ok();
  if (Number(pay.amount) !== Number(order.amount_paise) || String(pay.currency ?? "INR") !== "INR") {
    await admin.from("gold_orders").update({ status: "amount_mismatch" }).eq("order_id", orderId);
    return ok();
  }
  const { error: gErr } = await admin.rpc("grant_gold", { p_user: order.user_id, p_plan: order.plan });
  if (gErr) {
    if (eventId) await admin.from("gold_paid_events").delete().eq("event_id", eventId);   // let Razorpay retry
    return new Response("activation failed", { status: 500 });
  }
  await admin.from("gold_orders").update({ status: "paid", utr: String(pay.id ?? ""), paid_at: new Date().toISOString() }).eq("order_id", orderId);
  return ok();
});
