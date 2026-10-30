// TheSmallBook weekly reading digest, v336
// Deploy as Supabase Edge Function: weekly-digest. Verify JWT OFF.
// Secrets: RESEND_API_KEY, DIGEST_FROM, CRON_SECRET.
// It never stores email addresses in public tables. At send time it joins an
// explicit user_id subscription with Supabase Auth using the service-role key.

const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const FROM = Deno.env.get("DIGEST_FROM") || "TheSmallBook <hello@thesmallbook.in>";
const SECRET = Deno.env.get("CRON_SECRET") || "";
const SITE = "https://thesmallbook.in";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
async function rest(path: string) {
  const r = await fetch(URL + "/rest/v1/" + path, { headers: { apikey: SERVICE, Authorization: "Bearer " + SERVICE } });
  return r.ok ? await r.json() : [];
}
async function authUsers() {
  const out: any[] = [];
  for (let page = 1; page < 50; page++) {
    const r = await fetch(URL + "/auth/v1/admin/users?page=" + page + "&per_page=1000", { headers: { apikey: SERVICE, Authorization: "Bearer " + SERVICE } });
    if (!r.ok) break;
    const j = await r.json(); const users = Array.isArray(j.users) ? j.users : [];
    out.push(...users); if (users.length < 1000) break;
  }
  return out;
}
function esc(s: string) { return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)); }
function pick(interests: string[]) {
  const low = interests.map((x) => String(x).toLowerCase()).join(" ");
  if (/money|finance|invest/.test(low)) return { title: "The Algebra of Wealth", line: "Build security with focus, patience and diversification.", id: "algebra-of-wealth" };
  if (/focus|productiv|habit/.test(low)) return { title: "The 8 PM Reset", line: "A small evening ritual that makes tomorrow easier.", id: "the-8-pm-reset" };
  if (/people|psycholog|relationship/.test(low)) return { title: "The Listening Bench", line: "One small practice for conversations that feel safer.", id: "the-listening-bench" };
  return { title: "The Attention Garden", line: "Plant one cue that protects what you want to notice.", id: "the-attention-garden" };
}
async function send(to: string, name: string, item: { title: string; line: string; id: string }) {
  const safeName = esc(name || "Reader"), safeTitle = esc(item.title), safeLine = esc(item.line);
  const html = '<!doctype html><html><body style="margin:0;background:#fbf8f1;color:#16130f;font-family:Arial,sans-serif"><main style="max-width:580px;margin:0 auto;padding:34px 24px"><p style="font-size:11px;letter-spacing:2px;color:#8a6910;font-weight:700">THE SMALLBOOK · SUNDAY READING</p><h1 style="font-family:Georgia,serif;font-size:34px;line-height:1.05;margin:12px 0">One good place to return, ' + safeName + '.</h1><section style="margin:26px 0;padding:24px;border-radius:20px;background:#fff1bf"><p style="font-size:11px;letter-spacing:1px;font-weight:700;margin:0 0 8px">THIS WEEK</p><h2 style="font-family:Georgia,serif;font-size:27px;margin:0 0 10px">' + safeTitle + '</h2><p style="line-height:1.55;margin:0">' + safeLine + '</p><a href="' + SITE + '/book.html?id=' + encodeURIComponent(item.id) + '" style="display:inline-block;margin-top:18px;padding:13px 18px;border-radius:999px;background:#ffc800;color:#16130f;font-weight:700;text-decoration:none">Open the small read</a></section><p style="font-size:13px;line-height:1.5;color:#6e6658">You chose this weekly email in TheSmallBook. Change it any time in You → Notifications &amp; sound.</p></main></body></html>';
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + RESEND, "Content-Type": "application/json" }, body: JSON.stringify({ from: FROM, to: [to], subject: "A quiet Sunday read: " + item.title, html }) });
  return r.ok;
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") return json(200, { ok: true, fn: "weekly-digest" });
  if (req.headers.get("x-cron-secret") !== SECRET) return json(401, { error: "bad cron secret" });
  if (!URL || !SERVICE || !RESEND || !SECRET) return json(500, { error: "set SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, DIGEST_FROM and CRON_SECRET" });
  const [subs, profiles, users] = await Promise.all([
    rest("weekly_digest_subscriptions?enabled=eq.true&select=user_id"),
    rest("profiles?select=id,name,interests"),
    authUsers()
  ]);
  const wanted = new Set((subs || []).map((x: any) => x.user_id));
  const byProfile = new Map((profiles || []).map((p: any) => [p.id, p]));
  let sent = 0;
  for (const u of users) {
    if (!wanted.has(u.id) || !u.email) continue;
    const p: any = byProfile.get(u.id) || {};
    if (await send(u.email, p.name || u.user_metadata?.full_name || "Reader", pick(p.interests || []))) sent++;
  }
  return json(200, { sent, subscribed: wanted.size });
});
