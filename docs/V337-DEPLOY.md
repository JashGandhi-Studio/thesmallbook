# TheSmallBook v337 deployment

Run these in Supabase SQL Editor in this order, only once:

1. `supabase/sql/RETIRE-v337-WEEKLY-DIGEST.sql` if the old weekly-email migration was ever deployed. It unschedules the job and switches every old subscription off without deleting records.
2. `supabase/sql/UPDATE-v337-reading-sync.sql` to create the private `reading_state` table and its owner-only policies.

Then upload the release contents. Daily device push is unchanged. It still requires the existing OneSignal configuration and `push-notify` Edge Function secrets described in `docs/PUSH-NOTIFICATIONS.md`.

The Android plan remains PWA first. The site is the source of truth, and a signed Android wrapper can come after this sync migration has been confirmed live.
