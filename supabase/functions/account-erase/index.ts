// TheSmallBook account-erase Edge Function (v419, DPDP erasure)
// Deploy: Supabase Dashboard → Edge Functions → New function → name "account-erase"
// → paste this file → Deploy. Requires the secret SUPABASE_SERVICE_ROLE_KEY.
//
// A reader's right to erasure, as one honest call:
//   POST { "confirm": "erase" } with the reader's own access token.
// The function verifies the token, then deletes the reader's rows from
// every public table that holds them, and finally the auth user itself.
// The receipt is returned to the caller; the only trace left behind is
// one anonymous line in edge_errors ("erasure done") - the fact that an
// erasure happened, never whose.
//
// Nothing here can erase anyone but the caller: the user id comes
// from the verified token, never from the request body.

const SB = Deno.env.get("SUPABASE_URL") || "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/* tables with a user-shaped column; erased in this order */
const OWNED: Array<[string, string]> = [
  ["reading_state", "user_id"],
  ["consents", "user_id"],
  ["push_log", "user_id"],
  ["events", "user_id"],
  ["case_plays", "user_id"],
  ["dm_typing", "user_id"],
  ["weekly_digest_subscriptions", "user_id"],
  ["messages", "sender_id"],
  ["posts", "author_id"],
  ["comments", "author_id"],
  ["profiles", "id"],
];

async function rest(path: string, init: RequestInit): Promise<Response> {
  return fetch(SB + "/rest/v1/" + path, {
    ...init,
    headers: { apikey: SERVICE, Authorization: "Bearer " + SERVICE, "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

async function note(message: string) {
  try {
    await rest("edge_errors", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ fn: "account-erase", message }) });
  } catch { /* never block an erasure on its own receipt */ }
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") return json(200, { ok: true, fn: "account-erase" });
  if (!SB || !SERVICE) return json(500, { error: "set SUPABASE_SERVICE_ROLE_KEY secret" });

  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "sign in first" });

  // who is calling? the token answers, nobody else
  const meRes = await fetch(SB + "/auth/v1/user", { headers: { apikey: ANON, Authorization: "Bearer " + token } });
  if (!meRes.ok) return json(401, { error: "session expired" });
  const me = await meRes.json().catch(() => null);
  const uid = me && me.id;
  if (!uid) return json(401, { error: "session expired" });

  const body: any = await req.json().catch(() => ({}));
  if (body.confirm !== "erase") return json(400, { error: "send { confirm: \"erase\" } to erase this account" });

  const erased: Record<string, string> = {};
  for (const [table, col] of OWNED) {
    try {
      const r = await rest(table + "?" + col + "=eq." + encodeURIComponent(uid), { method: "DELETE", headers: { Prefer: "return=minimal" } });
      erased[table] = r.ok ? "deleted" : "skipped (" + r.status + ")";
      await r.text();
    } catch {
      erased[table] = "skipped (error)";
    }
  }

  // finally the auth user itself
  const del = await fetch(SB + "/auth/v1/admin/users/" + encodeURIComponent(uid), {
    method: "DELETE",
    headers: { apikey: SERVICE, Authorization: "Bearer " + SERVICE },
  });
  await del.text();
  await note("erasure done");
  return json(del.ok ? 200 : 207, { ok: del.ok, erased, authUser: del.ok ? "deleted" : "failed (" + del.status + ")" });
});
