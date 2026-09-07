# Push notifications that work with the app CLOSED — full setup (v205)

Real-time pushes for: **new follower · new message · new like · new comment · new story
from someone you follow**, plus a **daily 6:30 pm IST study nudge** ("Stuck on something?
Read this chapter →"). Everything below is one-time, ~15 minutes, all free tiers.

Order matters. Do steps 1 → 6 exactly.

---

## 1) Create the OneSignal app (2 min)
1. onesignal.com → Sign up (free, Google login works) → **Create app**.
2. Name: `TheSmallBook`. SDK: **Web** → platform **Typical Site**.
3. Site URL: `https://thesmallbook.in` → Save.
4. Go to **Settings → Keys & IDs**. Copy:
   - **App ID**
   - **REST API Key**
5. Keep the tab open — you need both.

## 2) Put the App ID in the app (1 min)
Open `js/config.js`, set:
```js
ONESIGNAL_APP_ID: "paste-your-app-id-here",
```
Commit/deploy with the rest of v205.

## 3) Deploy the Edge Function (3 min)
1. Supabase Dashboard → **Edge Functions** → **New function**.
2. Name: `push-notify` (exact). **Create** (ignore the template code).
3. Open the function's code editor, delete everything, paste the full contents of
   `supabase/functions/push-notify/index.ts` from this repo → **Deploy**.
4. Edge Functions → push-notify → **Settings → Secrets** → add:
   - `ONESIGNAL_APP_ID` = (from step 1)
   - `ONESIGNAL_REST_KEY` = (REST key from step 1)
   - `CRON_SECRET` = `tsb-cron-2026` (or your own string — keep it matching SQL #7)
5. Redeploy once after adding secrets (Deploy button).

## 4) Point Database Webhooks at it (4 min)
Supabase Dashboard → **Database → Webhooks** → **New hook**, five times:

| Table    | Event  | HTTP URL                                              |
|----------|--------|-------------------------------------------------------|
| follows  | INSERT | `https://<PROJECT>.supabase.co/functions/v1/push-notify` |
| messages | INSERT | same                                                  |
| likes    | INSERT | same                                                  |
| comments | INSERT | same                                                  |
| posts    | INSERT | same                                                  |

Method POST, and add ONE header row on each hook: name `x-tsb-hook`, value `tsb-cron-2026`
(the same string as CRON_SECRET — it's the function's bouncer now that Verify JWT is off).
(Dashboard → Database → Webhooks lists them; you can delete/re-add any time — webhooks
never touch your data.)

Also: create/keep the function with **Verify JWT OFF** (Settings tab toggle, or untick it
in the deploy dialog). Webhooks and pg_cron cannot send Supabase JWTs; the `x-tsb-hook`
header + CRON_SECRET are the auth instead.

## 5) Run SQL #7 + SQL #8 — nudge library, scheduler, smart matching (3 min)
SQL Editor → New query → paste **SQL #7** from `SUPABASE-STEP-BY-STEP.md` (bottom of the
file), run it; then new query → paste **SQL #8**, run it. Replace the project URL inside
the cron line if needed.
- SQL #7 = nudge library + daily 6:30 pm IST cron.
- SQL #8 = `interests` column + nudge tags → makes every push **match what that reader
  actually reads** (book categories, story tags, onboarding shelves).
- The red "destructive operations" banner appears because the script creates
  extensions/a table — it is **additive only**: nothing deleted, nothing altered.
- Re-runnable: seeds only if empty, reschedules the job cleanly.

## 6) Turn pushes on, on your phone (1 min)
App → **You** → **📲 Enable push** → allow the browser prompt.
The button now also links your device to your account id (OneSignal "external id"),
which is what lets the server push *your* events to *your* phone.

---

## Test it (prove it works)
1. **Follower push:** from a second account (or a friend's phone), open your profile →
   🔔 Subscribe. Your phone should buzz within ~5 s: "🔔 New follower — X started
   following you." App can be fully closed.
2. **Message push:** second account sends you a DM → "💬 X: …" opens straight into the
   thread.
3. **Nudge:** SQL Editor →
   `select net.http_post(url:'https://<PROJECT>.supabase.co/functions/v1/push-notify', body:'{"type":"nudge"}', headers:jsonb_build_object('Content-Type','application/json','x-cron-secret','tsb-cron-2026'));`
   → every subscribed device gets today's chapter nudge instantly.

## How the smart matching works (v207)
- While reading, the app quietly notes signals **on the device**: each lesson you tick
  adds that book's category; each story you open adds its tags; your onboarding shelves
  count double.
- Signed-in devices sync only the **top-4 category words** to `profiles.interests`
  (throttled to every 6 h) — never your raw history.
- At 6:30 pm IST the cron wakes the Edge Function; it compares each reader's interests
  with the nudge tags and sends **that person's** chapter: a money reader gets
  Psychology of Money, a focus reader gets Deep Work. No signals yet → random nudge.
- Event pushes (follow/DM/like/comment/new story) are always personal — they go only
  to the one affected phone, via the external-id alias set by the Enable-push button.

## In-app notifications (already live, no setup)
The 🔔 bell + paper toasts cover the same events while you're inside the app, with
dedupe (seen-in-app never re-pops). The **Pop-up alerts** toggle in You controls the
in-app toasts only; browser pushes follow the phone's own notification permission.

## If something doesn't buzz
- OneSignal dashboard → **Audience → Subscriptions**: is your device listed with an
  `external_id` = your user id? If not, tap Enable push again while signed in.
- Edge Function logs: Dashboard → Edge Functions → push-notify → Logs (webhook hits
  appear per event).
- Phone: site notifications allowed in browser settings? Android Chrome:
  site settings → notifications → allow.
- Webhook not firing? Database → Webhooks → check the hook's delivery log.
