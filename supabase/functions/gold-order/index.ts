// ============================================================
// THE SMALL BOOK · edge function: gold-order   (v331, hardened v334)
// A signed-in reader asks to buy a plan. The SERVER decides the
// price (the browser only names the plan), writes a pending row
// in gold_orders and returns the order id the YouPI checkout
// uses. Nothing is unlocked here: only youpi-webhook, after the
// gateway has seen the money arrive, writes gold_members.
//   deploy: supabase functions deploy gold-order
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// the ONLY price list. Change prices here, never in the browser.
export const PLANS: Record<string, { paise: number; days: number; label: string }> = {
  gold_monthly: { paise: 9900, days: 30, label: "TheSmallBook Gold, monthly" },
  gold_yearly: { paise: 99900, days: 365, label: "TheSmallBook Gold, yearly" },
  pdf_75d: { paise: 4900, days: 75, label: "PDF cheat-sheet pass, 75 days" },
};

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
  const plan = String(body?.plan ?? "");
  const p = PLANS[plan];
  if (!p) return json({ ok: false, error: "Unknown plan." }, 400);

  // v334: no order floods. At most 12 orders a day per account.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin.from("gold_orders").select("order_id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= 12) return json({ ok: false, error: "Too many tries today. If you already paid, it will switch on by itself." }, 429);

  // v334: full Gold already includes cheat-sheets, so never sell a PDF pass on top
  if (plan === "pdf_75d") {
    const { data: cur } = await admin.from("gold_members").select("plan, expires_at").eq("user_id", user.id).maybeSingle();
    if (cur && new Date(cur.expires_at) > new Date() && cur.plan !== "pdf-75d") return json({ ok: false, error: "You already have Gold, and it includes cheat-sheets." }, 409);
  }

  // one order id per attempt; the gateway rejects a reused id with another amount
  const rnd = crypto.getRandomValues(new Uint8Array(5));
  const tail = Array.from(rnd).map((b) => b.toString(16).padStart(2, "0")).join("");
  const orderId = "TSB-" + Date.now().toString(36).toUpperCase() + "-" + tail.toUpperCase();

  const { error } = await admin.from("gold_orders").insert({
    order_id: orderId, user_id: user.id, plan, amount_paise: p.paise, status: "pending",
  });
  if (error) return json({ ok: false, error: "Could not start the payment. Try again in a minute." }, 500);

  return json({ ok: true, order_id: orderId, amount: (p.paise / 100).toFixed(2), amount_paise: p.paise, plan, label: p.label });
});
