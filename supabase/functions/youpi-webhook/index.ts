// ============================================================
// THE SMALL BOOK · edge function: youpi-webhook   (v331)
// Your self-hosted YouPI-PG gateway (github.com/youpi-pg/YouPI-PG)
// calls this when it has matched a real UPI credit to an order.
// We trust NOTHING from the browser. This function:
//   1. verifies X-Gateway-Signature-V2 = HMAC-SHA256(secret,
//      "<timestamp>.<raw body>")  (falls back to the v1 header,
//      HMAC over the raw body), with a constant-time compare;
//   2. ignores replays (deliveryId stored in gold_paid_events);
//   3. finds the pending gold_orders row and checks the amount in
//      paise matches exactly what the server priced;
//   4. only then grants Gold through public.grant_gold (v334), and
//   5. remembers the credit (upi_credits) so a pasted UTR matches it.
//   deploy: supabase functions deploy youpi-webhook --no-verify-jwt
//   secret: supabase secrets set YOUPI_WEBHOOK_SECRET=...
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const res = (status: number, msg: string) => new Response(JSON.stringify({ ok: status < 300, msg }), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return res(405, "POST only");
  const secret = Deno.env.get("YOUPI_WEBHOOK_SECRET") ?? "";
  if (!secret) return res(500, "webhook secret not configured");

  const raw = await req.text();
  const ts = req.headers.get("x-gateway-timestamp") ?? "";
  const v2 = (req.headers.get("x-gateway-signature-v2") ?? "").replace(/^sha256=/, "");
  const v1 = (req.headers.get("x-gateway-signature") ?? "").replace(/^sha256=/, "");
  let good = false;
  if (v2 && ts) good = same(v2, await hmacHex(secret, ts + "." + raw));
  else if (v1) good = same(v1, await hmacHex(secret, raw));
  if (!good) return res(401, "bad signature");
  // the gateway retries for up to an hour with the ORIGINAL timestamp; allow 2 h
  // the timestamp may arrive in seconds, milliseconds or ISO form; read all three
  if (ts) {
    const n = Number(ts);
    const tsMs = Number.isFinite(n) ? (n < 1e12 ? n * 1000 : n) : Date.parse(ts);
    if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > 2 * 3600 * 1000) return res(401, "stale delivery");
  }

  let ev: Record<string, unknown> = {};
  try { ev = JSON.parse(raw || "{}"); } catch (_) { return res(400, "bad json"); }
  if (ev.event !== "SUCCESS") return res(200, "ignored");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const did = "youpi:" + String(ev.deliveryId || req.headers.get("x-gateway-delivery-id") || ev.paymentId || "");
  const { error: dupErr } = await admin.from("gold_paid_events").insert({ event_id: did });
  if (dupErr) return res(200, "already processed");
  // v334: if anything below fails, forget the delivery so the gateway's retry can land
  const fail = async (status: number, msg: string) => { await admin.from("gold_paid_events").delete().eq("event_id", did); return res(status, msg); };

  const utr = String(ev.utr || "").replace(/\s+/g, "");
  const paise = Number(ev.amountPaise);
  if (!Number.isFinite(paise) || paise <= 0) return res(400, "bad amount");
  // v334: every real credit is remembered, so a reader who pastes this UTR is matched at once
  if (/^[0-9]{12}$/.test(utr)) await admin.from("upi_credits").upsert({ utr, amount_paise: paise, order_id: String(ev.orderId || "") || null }, { onConflict: "utr", ignoreDuplicates: true });

  const { data: order } = await admin.from("gold_orders").select("*").eq("order_id", String(ev.orderId || "")).maybeSingle();
  if (!order) {
    // no order: maybe a reader already filed a claim with this UTR
    if (/^[0-9]{12}$/.test(utr)) {
      const { data: c } = await admin.from("upi_claims").update({ status: "approved", decided_at: new Date().toISOString(), note: "matched by gateway" })
        .eq("utr", utr).eq("amount_paise", paise).eq("status", "pending").select("*").maybeSingle();
      if (c) {
        const { error: gErr } = await admin.rpc("grant_gold", { p_user: c.user_id, p_plan: c.plan });
        if (gErr) { await admin.from("upi_claims").update({ status: "pending", decided_at: null, note: null }).eq("id", c.id); return fail(500, "activation failed"); }
        await admin.from("upi_credits").update({ used_by: c.user_id }).eq("utr", utr);
        return res(200, "gold active (claim)");
      }
    }
    return res(404, "unknown order");
  }
  if (order.status === "paid") return res(200, "already paid");
  if (paise !== Number(order.amount_paise)) {
    await admin.from("gold_orders").update({ status: "amount_mismatch", utr }).eq("order_id", order.order_id);
    return res(409, "amount mismatch");
  }

  const { error: gErr } = await admin.rpc("grant_gold", { p_user: order.user_id, p_plan: order.plan });
  if (gErr) return fail(500, "activation failed");
  await admin.from("gold_orders").update({ status: "paid", utr, paid_at: new Date().toISOString() }).eq("order_id", order.order_id);
  if (/^[0-9]{12}$/.test(utr)) {
    await admin.from("upi_credits").update({ used_by: order.user_id }).eq("utr", utr);
    await admin.from("upi_claims").update({ status: "approved", decided_at: new Date().toISOString(), note: "matched by gateway" }).eq("utr", utr).eq("user_id", order.user_id).eq("status", "pending");
  }
  return res(200, "gold active");
});
