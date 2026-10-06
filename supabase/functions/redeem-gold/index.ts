// ============================================================
// THE SMALL BOOK · edge function: redeem-gold
// Buyers type their TSB-XXXX-XXXX code; this function (and only
// this function) checks it against gold_codes, burns it single-
// use, and writes the gold_members row. Codes are never
// validated in the browser.
//   deploy: supabase functions deploy redeem-gold
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // who is asking: the signed-in reader from their own access token
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!token) return json({ ok: false, error: "Sign in first, then redeem your code." }, 401);
  const { data: userData } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (!user) return json({ ok: false, error: "Your session expired. Sign in again." }, 401);

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "").trim().toUpperCase();
  if (!/^TSB-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    return json({ ok: false, error: "That does not look like a code. Codes look like TSB-XXXX-XXXX." }, 400);
  }

  // single-use claim: the UPDATE only lands while the row is still unused
  // and unexpired; two people pasting the same code cannot both win.
  const now = new Date().toISOString();
  const { data: claimed } = await admin
    .from("gold_codes")
    .update({ used: true, used_by: user.id, used_at: now })
    .eq("code", code)
    .eq("used", false)
    .gt("expires_at", now)
    .select()
    .maybeSingle();

  if (!claimed) {
    return json({ ok: false, error: "This code does not exist, was already used, or has expired. Check it once and message us if you think this is wrong." }, 409);
  }

  // one year of Gold, extended from today or from a still-live membership
  const { data: cur } = await admin
    .from("gold_members")
    .select("expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const base = cur?.expires_at && new Date(cur.expires_at) > new Date() ? new Date(cur.expires_at) : new Date();
  const expires = new Date(base.getTime() + 365 * 24 * 3600 * 1000).toISOString();

  const { error: mErr } = await admin
    .from("gold_members")
    .upsert({ user_id: user.id, plan: "gold-yearly", activated_at: now, expires_at: expires });
  if (mErr) return json({ ok: false, error: "The code was accepted but activation failed. Message us, it is one tap to fix." }, 500);

  return json({ ok: true, expires_at: expires });
});
