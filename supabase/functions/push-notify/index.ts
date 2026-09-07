// TheSmallBook push-notify Edge Function (v205)
// Deploy: Supabase Dashboard → Edge Functions → New function → name "push-notify"
// → paste this file → Deploy. Then set secrets (below) in the function's Settings.
//
// Secrets required (Edge Functions → push-notify → Settings → Secrets):
//   ONESIGNAL_APP_ID    from your OneSignal app → Settings → Keys & IDs
//   ONESIGNAL_REST_KEY  from the same page (REST API key)
//   CRON_SECRET         any string you invent, e.g. tsb-cron-2026 (used by SQL #7)
//
// It receives TWO kinds of calls:
//   1) Database Webhooks (Dashboard → Database → Webhooks) on INSERT for tables:
//      follows, messages, likes, comments, posts  → pushes to the affected user
//   2) A daily pg_cron job (SQL #7) with { "type": "nudge" } → sends the daily
//      "stuck on something? read this chapter" nudge to ALL subscribed users.

const APP = Deno.env.get("ONESIGNAL_APP_ID") || "";
const REST = Deno.env.get("ONESIGNAL_REST_KEY") || "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
const SB = Deno.env.get("SUPABASE_URL") || "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SITE = "https://thesmallbook.in";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function sb(path: string): Promise<any> {
  const r = await fetch(SB + "/rest/v1/" + path, { headers: { apikey: ANON, Authorization: "Bearer " + ANON } });
  return r.ok ? await r.json() : [];
}

async function pushTo(externalIds: string[], heading: string, content: string, url: string) {
  if (!externalIds.length) return 0;
  const r = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Key " + REST },
    body: JSON.stringify({
      app_id: APP,
      include_aliases: { external_id: externalIds.slice(0, 2000) },
      headings: { en: heading },
      contents: { en: content },
      url,
      ttl: 86400,
    }),
  });
  return r.ok ? externalIds.length : 0;
}

async function pushToAll(heading: string, content: string, url: string) {
  const r = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Key " + REST },
    body: JSON.stringify({
      app_id: APP,
      included_segments: ["Subscribed Users"],
      headings: { en: heading },
      contents: { en: content },
      url,
      ttl: 86400,
    }),
  });
  return r.ok;
}

async function nameOf(id: string): Promise<string> {
  const rows = await sb("profiles?id=eq." + id + "&select=name");
  return (rows && rows[0] && rows[0].name) || "A reader";
}

Deno.serve(async (req: Request) => {
  // friendly health-check for browser tabs (carries no secrets, does nothing)
  if (req.method === "GET") return json(200, { ok: true, fn: "push-notify" });
  if (!APP || !REST) return json(500, { error: "set ONESIGNAL_APP_ID + ONESIGNAL_REST_KEY secrets" });
  const body: any = await req.json().catch(() => ({}));

  // ---- daily nudge from pg_cron (SQL #7) — v207: personalised per reader ----
  if (body.type === "nudge") {
    if (CRON_SECRET && req.headers.get("x-cron-secret") !== CRON_SECRET) return json(401, { error: "bad cron secret" });
    const [nudges, profiles] = await Promise.all([
      sb("push_nudges?select=*&order=id.asc&limit=100"),
      sb("profiles?select=id,interests&limit=10000"),
    ]);
    if (!nudges.length) return json(200, { sent: 0, note: "push_nudges empty — run SQL #7" });
    // bucket readers by the nudge that matches THEIR interests (SQL #8 tags)
    const groups = new Map<number, string[]>();
    for (const pr of profiles || []) {
      const ints = ((pr.interests || []) as string[]).map((x) => String(x).toLowerCase());
      let pick: any = null;
      if (ints.length) {
        outer: for (const n of nudges) {
          for (const kw of String(n.tag || "").split(",")) {
            const k = kw.trim();
            if (!k) continue;
            for (const i of ints) {
              if (i.includes(k) || k.includes(i)) { pick = n; break outer; }
            }
          }
        }
      }
      if (!pick) pick = nudges[Math.floor(Math.random() * nudges.length)];
      const arr = groups.get(pick.id) || [];
      arr.push(pr.id);
      groups.set(pick.id, arr);
    }
    let sent = 0;
    for (const [nid, ids] of groups) {
      const n = nudges.find((x: any) => x.id === nid);
      if (n) sent += await pushTo(ids, n.heading, n.body, SITE + "/" + (n.url || "stories.html"));
    }
    return json(200, { personalised: groups.size, sent });
  }

  // ---- Supabase Database Webhook payload: { type: "INSERT", table, record } ----
  // webhooks must carry our shared secret header (x-tsb-hook), set on each hook —
  // this replaces the Supabase JWT gate we switched off, so strangers can't spam pushes
  if (req.headers.get("x-tsb-hook") !== CRON_SECRET) return json(401, { error: "bad hook secret" });
  const table = String(body.table || "");
  const rec = body.record || {};
  let sent = 0;

  if (table === "follows" && rec.author_id) {
    const who = await nameOf(rec.follower_id || "");
    sent = await pushTo([rec.author_id], "🔔 New follower", who + " started following you.", SITE + "/profile.html?id=" + rec.follower_id);
  } else if (table === "messages" && rec.receiver_id) {
    const who = await nameOf(rec.sender_id || "");
    const txt = rec.book_id ? "sent you a book 📕" : "“" + String(rec.body || "").slice(0, 70) + "”";
    sent = await pushTo([rec.receiver_id], "💬 " + who, txt, SITE + "/dm.html?u=" + rec.sender_id);
  } else if (table === "likes" && rec.post_id) {
    const posts = await sb("posts?id=eq." + rec.post_id + "&select=author_id,title");
    const post = posts && posts[0];
    if (post && post.author_id !== rec.user_id) {
      const who = await nameOf(rec.user_id || "");
      sent = await pushTo([post.author_id], "♥️ New like", who + " liked “" + String(post.title || "your story").slice(0, 50) + "”.", SITE + "/story.html?id=" + rec.post_id);
    }
  } else if (table === "comments" && rec.post_id) {
    const posts = await sb("posts?id=eq." + rec.post_id + "&select=author_id,title");
    const post = posts && posts[0];
    if (post && post.author_id !== rec.author_id) {
      sent = await pushTo([post.author_id], "💬 New comment", (rec.author_name || "A reader") + ": “" + String(rec.body || "").slice(0, 70) + "”", SITE + "/story.html?id=" + rec.post_id + "#comments");
    }
  } else if (table === "posts" && rec.author_id) {
    const fols = await sb("follows?author_id=eq." + rec.author_id + "&select=follower_id");
    const ids = (fols || []).map((f: any) => f.follower_id).filter((x: string) => x !== rec.author_id);
    if (ids.length) sent = await pushTo(ids, "📕 New story", (rec.author_name || "A reader") + " posted “" + String(rec.title || "").slice(0, 50) + "”.", SITE + "/story.html?id=" + rec.id);
  }

  return json(200, { table, sent });
});
