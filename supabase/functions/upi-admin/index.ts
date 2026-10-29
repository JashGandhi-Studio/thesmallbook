// ============================================================
// THE SMALL BOOK · edge function: upi-admin   (v334)
// For the people listed in public.app_admins only (checked here, on
// the server, from the caller's own sign-in token).
//   POST { op: "whoami" }                    -> { admin: true|false }
//   POST { op: "list" }                      -> waiting + recent claims
//   POST { op: "approve", id }               -> grants Gold (grant_gold)
//   POST { op: "reject",  id, note? }        -> marks it rejected
// Approve only after you see the same amount and UTR in your bank app.
//   deploy: supabase functions deploy upi-admin
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!token) return json({ ok: false, admin: false, error: "Sign in first." }, 401);
  const { data: u } = await admin.auth.getUser(token);
  const me = u?.user;
  if (!me) return json({ ok: false, admin: false, error: "Session expired." }, 401);
  const { data: row } = await admin.from("app_admins").select("user_id").eq("user_id", me.id).maybeSingle();
  const body = await req.json().catch(() => ({}));
  if (body?.op === "whoami") return json({ ok: true, admin: !!row });
  if (!row) return json({ ok: false, error: "Not an admin." }, 403);

  if (body?.op === "list") {
    const { data: rows } = await admin.from("upi_claims")
      .select("id, user_id, plan, amount_paise, utr, status, created_at, decided_at, note")
      .order("created_at", { ascending: false }).limit(60);
    const out = [];
    for (const c of rows ?? []) {
      let who = "";
      try {
        const { data: p } = await admin.from("profiles").select("username, full_name").eq("id", c.user_id).maybeSingle();
        const { data: au } = await admin.auth.admin.getUserById(c.user_id);
        who = [p?.full_name, p?.username ? "@" + p.username : "", au?.user?.email].filter(Boolean).join(" · ");
      } catch (_) { /* name is a convenience only */ }
      out.push({ ...c, who });
    }
    return json({ ok: true, claims: out });
  }

  const id = String(body?.id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ ok: false, error: "Bad id." }, 400);

  if (body?.op === "reject") {
    const { data: c } = await admin.from("upi_claims")
      .update({ status: "rejected", decided_at: new Date().toISOString(), decided_by: me.id, note: String(body?.note ?? "").slice(0, 200) || null })
      .eq("id", id).eq("status", "pending").select("id").maybeSingle();
    return c ? json({ ok: true }) : json({ ok: false, error: "Already decided." }, 409);
  }

  if (body?.op === "approve") {
    // claim it first, so two taps (or two admins) can never grant twice
    const { data: c } = await admin.from("upi_claims")
      .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: me.id })
      .eq("id", id).eq("status", "pending").select("*").maybeSingle();
    if (!c) return json({ ok: false, error: "Already decided." }, 409);
    const { data: exp, error } = await admin.rpc("grant_gold", { p_user: c.user_id, p_plan: c.plan });
    if (error) {
      await admin.from("upi_claims").update({ status: "pending", decided_at: null, decided_by: null }).eq("id", id);
      return json({ ok: false, error: "Could not switch Gold on. Try again." }, 500);
    }
    if (c.order_id) await admin.from("gold_orders").update({ status: "paid", utr: c.utr, paid_at: new Date().toISOString() }).eq("order_id", c.order_id);
    return json({ ok: true, expires_at: exp });
  }

  return json({ ok: false, error: "Unknown op." }, 400);
});
