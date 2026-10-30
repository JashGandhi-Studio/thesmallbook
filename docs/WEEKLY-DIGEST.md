# Weekly reading digest, v336

The app asks readers before sending the Sunday email. The public database stores only a reader id and an on/off choice, never an email address. At send time, the protected Edge Function reads the address from Supabase Auth using its service-role secret.

## One-time deploy

1. In Supabase, create an Edge Function named `weekly-digest` and paste `supabase/functions/weekly-digest/index.ts`. Turn **Verify JWT off**.
2. Add these function secrets:
   - `RESEND_API_KEY`: an API key from [Resend](https://resend.com).
   - `DIGEST_FROM`: a verified sender, for example `TheSmallBook <hello@thesmallbook.in>`.
   - `SUPABASE_SERVICE_ROLE_KEY`: Project Settings → API. Keep this server-side only.
   - `CRON_SECRET`: choose a value and use the same value in the SQL scheduler.
3. Run `supabase/sql/UPDATE-v336-retention.sql` in the SQL editor. If you choose a different cron secret, replace the placeholder there before running it.
4. In **You → Notifications & sound**, turn on **Weekly reading digest** from a real signed-in account. It should show `Email on`.

The SQL schedules Sunday 10:00 AM India time. It is safe to rerun and will replace only the digest cron job.

## Test without waiting

In the Edge Function dashboard, invoke `weekly-digest` with a POST body `{ "type": "weekly" }` and header `x-cron-secret` set to your secret. The function response reports `subscribed` and `sent`.

## Daily phone nudge

Daily phone notifications already use `push-notify` and OneSignal. Its setup remains in `docs/PUSH-NOTIFICATIONS.md`. It sends one personalised nudge at 6:30 PM India time only to readers who enabled browser push.
