// TheSmallBook health-check Edge Function (v419)
// Deploy: Supabase Dashboard → Edge Functions → New function → name "health-check"
// → paste this file → Deploy (Verify JWT may stay ON or OFF; it reads nothing private).
//
// Answers one question: is the platform under the app actually alive?
// It pings the database through PostgREST, checks that the tables the
// current build depends on answer, and - when something fails - leaves
// one row in public.edge_errors (RUN-THIS-v419.sql) so the failure is
// somewhere a human will look, not just in a log nobody opens.
// Point any uptime pinger at it, or open it in a browser tab.

const SB = Deno.env.get("SUPABASE_URL") || "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const KEY = SERVICE || ANON;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const TABLES = ["profiles", "reading_state", "push_log", "events", "consents", "dm_typing", "case_plays"];

async function checkTable(name: string): Promise<boolean> {
  try {
    const r = await fetch(SB + "/rest/v1/" + name + "?select=*&limit=1", {
      headers: { apikey: KEY, Authorization: "Bearer " + KEY },
    });
    await r.text();
    return r.ok;
  } catch {
    return false;
  }
}

async function leaveError(message: string) {
  try {
    await fetch(SB + "/rest/v1/edge_errors", {
      method: "POST",
      headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ fn: "health-check", message: message.slice(0, 500) }),
    });
  } catch { /* the checker must never crash the platform it checks */ }
}

Deno.serve(async () => {
  const started = Date.now();
  if (!SB || !KEY) {
    await leaveError("health-check: SUPABASE_URL / key env missing");
    return json(500, { ok: false, error: "env missing" });
  }
  const tables: Record<string, boolean> = {};
  let down: string[] = [];
  for (const t of TABLES) {
    tables[t] = await checkTable(t);
    if (!tables[t]) down.push(t);
  }
  const ms = Date.now() - started;
  if (down.length) await leaveError("tables not answering: " + down.join(", "));
  return json(down.length ? 503 : 200, {
    ok: !down.length,
    fn: "health-check",
    build: 419,
    ms,
    tables,
    at: new Date().toISOString(),
  });
});
