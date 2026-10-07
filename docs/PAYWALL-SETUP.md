# TSB GOLD - SERVER-SIDE SETUP (v298)

Gold cannot be forged any more because nothing gold-related is decided in the
browser. Membership lives in `gold_members`; the site can only read its own row.
This is the full runbook, in order.

## 1. DATABASE (once)
Run `supabase/sql/UPDATE-v298-gold.sql` in the Supabase SQL editor.
It creates `gold_members` (RLS on, one policy: read own row), `gold_codes`
(single-use activation codes, no client policies) and `gold_paid_events`
(webhook idempotency), and adds `profiles.email` for webhook matching.

## 2. EDGE FUNCTIONS (once)
```
supabase functions deploy redeem-gold
supabase functions deploy razorpay-webhook
```

## 3. RAZORPAY (once)
1. Create a **Payment Link** for ₹999 (yearly). Paste it into `js/config.js`:
   `PAYWALL.RAZORPAY_LINK: "https://rzp.io/l/xxxx"`.
2. In the Razorpay dashboard add a **webhook** pointing at the deployed
   `razorpay-webhook` function URL. Subscribe to `payment.captured`.
3. Copy the webhook secret, then:
   `supabase secrets set RAZORPAY_WEBHOOK_SECRET=<the same secret>`

## 4. TURN THE WALL ON (when ready)
In `js/config.js`: `PAYWALL.ENABLED: true` and list the feature keys to gate.

## 5. SELLING WITH UPI / WHATSAPP (manual flow)
1. Buyer pays ₹999 by UPI (button on gold.html) or messages on WhatsApp.
2. You verify the payment, then mint a code in the SQL editor:
   `insert into public.gold_codes (code, expires_at)
    values ('TSB-ABCD-1234', now() + interval '90 days');`
3. Send the code to the buyer. On gold.html they sign in, type it, and the
   `redeem-gold` function burns it (single-use) and writes their membership
   for one year. Codes never get validated in the browser.

## 6. WHAT EACH FAILURE MODE DOES
- DevTools/localStorage edits: nothing. `isGold()` reads only the table.
- A guessed code: `redeem-gold` 409s (the row exists but is used/expired, or doesn't exist).
- Two people, one code: the single-use UPDATE lets exactly one claim land.
- Replayed Razorpay webhook: the event id is claimed once in `gold_paid_events`.
- Failed / cancelled payment: no `payment.captured`, no grant.
- Payer email not on any account: recorded, granted to no one; match it later
  by adding their email to `profiles` and re-delivering a code.

## 7. MAINTENANCE
Monthly (or via a trigger later): refresh `profiles.email` from `auth.users`
so new accounts are webhook-matchable - the snippet is at the bottom of the SQL file.
