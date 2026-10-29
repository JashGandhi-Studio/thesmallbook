// ============================================================
// THE SMALL BOOK · edge function: upi-claim   (v334)
// The reader paid by UPI and pastes the 12-digit UPI reference (UTR).
//   POST { plan, utr, order_id? }   -> files a claim
//   POST { op: "status" }           -> their latest claim + Gold state
// A claim grants NOTHING by itself. Gold switches on only when:
//   (a) the signed youpi-webhook already recorded that exact credit
//       (same UTR, same amount) in upi_credits, or
//   (b) an admin checks the bank app and approves it in upi-admin.
// The server sets the price; the UTR is unique, so one payment can
// never be claimed twice.
//   deploy: supabase functions deploy upi-claim
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// must match gold-order. Change prices in both places.
const PLANS: Record<string, number> = { gold_monthly: 9900, gold_yearly: 99900, pdf_75d: 4900 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!token) return json({ ok: false, error: "Sign in first." }, 401);
  const { data: u } = await admin.auth.getUser(token);
  const user = u?.user;
  if (!user) return json({ ok: false, error: "Your session expired. Sign in again." }, 401);

  const body = await req.json().catch(() => ({}));

  if (body?.op === "status") {
    const { data: c } = await admin.from("upi_claims").select("plan, status, created_at, decided_at, note").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return json({ ok: true, claim: c ?? null });
  }

  const plan = String(body?.plan ?? "");
  const paise = PLANS[plan];
  if (!paise) return json({ ok: false, error: "Unknown plan." }, 400);
  const utr = String(body?.utr ?? "").replace(/\s+/g, "");
  if (!/^[0-9]{12}$/.test(utr)) return json({ ok: false, error: "The UPI reference is the 12-digit number in your UPI app's payment details." }, 400);

  // no floods: 5 claims a day, 3 waiting at once
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: today } = await admin.from("upi_claims").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((today ?? 0) >= 5) return json({ ok: false, error: "Too many tries today. Write to thesmallbook.in@gmail.com and we will sort it out." }, 429);
  const { count: waiting } = await admin.from("upi_claims").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "pending");
  if ((waiting ?? 0) >= 3) return json({ ok: false, error: "You already have payments waiting for a check. They switch on by themselves." }, 429);

  // the order, if the app made one, must be theirs and priced the same
  let orderId: string | null = null;
  if (body?.order_id) {
    const { data: o } = await admin.from("gold_orders").select("order_id, user_id, plan, amount_paise, status").eq("order_id", String(body.order_id)).maybeSingle();
    if (o && o.user_id === user.id && o.plan === plan && o.amount_paise === paise && o.status !== "paid") orderId = o.order_id;
  }

  const { data: claim, error } = await admin.from("upi_claims")
    .insert({ user_id: user.id, order_id: orderId, plan, amount_paise: paise, utr })
    .select("id").single();
  if (error) {
    if (String(error.code) === "23505") return json({ ok: false, error: "This UPI reference was already used. Check the number once more." }, 409);
    return json({ ok: false, error: "Could not save that. Try again in a minute." }, 500);
  }

  // (a) has the gateway already seen this exact credit? then switch on now
  const { data: credit } = await admin.from("upi_credits").update({ used_by: user.id })
    .eq("utr", utr).eq("amount_paise", paise).is("used_by", null).select("utr").maybeSingle();
  if (credit) {
    const { data: exp, error: gErr } = await admin.rpc("grant_gold", { p_user: user.id, p_plan: plan });
    if (!gErr) {
      await admin.from("upi_claims").update({ status: "approved", decided_at: new Date().toISOString(), note: "matched by gateway" }).eq("id", claim.id);
      if (orderId) await admin.from("gold_orders").update({ status: "paid", utr, paid_at: new Date().toISOString() }).eq("order_id", orderId);
      return json({ ok: true, status: "approved", expires_at: exp });
    }
    await admin.from("upi_credits").update({ used_by: null }).eq("utr", utr);
  }
  if (orderId) await admin.from("gold_orders").update({ status: "claimed", utr }).eq("order_id", orderId);
  return json({ ok: true, status: "pending" });
});
