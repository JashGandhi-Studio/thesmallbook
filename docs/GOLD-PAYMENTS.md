# TheSmallBook Gold payments (v334)

Your UPI ID: **9702510680@fam**. Money always goes straight to your bank. 0% fees.

Gold is switched on **only by the server**. Nothing in the app can turn it on by itself.

## How a purchase works

1. The reader taps a plan. `gold-order` creates an order and the **server** sets the price.
2. The reader pays by UPI.
3. Gold turns on in one of two ways:
   - **Automatic (YouPI, when it is running):** the YouPI Android app on your phone sees the bank SMS. The YouPI server then sends a signed message to `youpi-webhook`. The webhook checks the signature, the time, the amount and replays, then grants Gold. This takes about 5 to 30 seconds.
   - **Fallback (always available):** the reader pastes the 12-digit UPI reference (UTR) from their UPI app. `upi-claim` saves it.
     - If YouPI has already seen that exact payment, Gold turns on at once.
     - If not, it waits for you. Open **admin.html, then Payments**. Find the same UTR and amount in your bank app, then tap **Approve**. The reader's app switches on by itself.
4. A claim alone never grants anything. Each UTR can be used once, and claims are rate-limited.

## One-time setup (about 15 minutes)

1. **SQL:** in the Supabase SQL editor, run `supabase/sql/UPDATE-v334-payments-security.sql`. This also removes the email column that v298 put in the public profiles table (a privacy fix).
2. **Functions:** with the Supabase CLI, in the repo folder, run:
   ```
   supabase functions deploy gold-order
   supabase functions deploy upi-claim
   supabase functions deploy upi-admin
   supabase functions deploy redeem-gold
   supabase functions deploy youpi-webhook --no-verify-jwt
   supabase functions deploy razorpay-webhook --no-verify-jwt
   ```
3. **Admin:** your two emails are added to `app_admins` by the SQL. Sign in to the app with one of them, then open `/admin.html`.

At this point the fallback flow works end to end.

## Turning on automatic payments (YouPI)

YouPI-PG (github.com/youpi-pg/YouPI-PG) is free and open source. It needs:

- **An Android phone that stays on**, with the YouPI observer app and your bank SMS. An old phone on a charger is ideal.
- **A small always-on server** for YouPI (Node + SQLite). Free options:
  - Oracle Cloud "Always Free" VM.
  - The same old Android phone running Termux (Node works there), exposed with a free Cloudflare Tunnel for HTTPS.
- Then follow `docs/YOUPI-SETUP.md`. Set the webhook URL to `https://<your-project>.supabase.co/functions/v1/youpi-webhook` and run `supabase secrets set YOUPI_WEBHOOK_SECRET=...`. Paste your YouPI address and public key into `js/config.js`, under `YOUPI`.

The YouPI project calls itself experimental and suggests about 20 payments a day. If it goes offline, the UTR fallback keeps working, so a payment is never lost.

## Prices

The prices live in `supabase/functions/gold-order/index.ts` and `supabase/functions/upi-claim/index.ts`. Change both together.

## Security checklist (done in v334)

- **Server-side pricing:** the server sets every price and checks the amount to the paisa.
- **One function grants Gold:** `public.grant_gold`, which only the server can call.
  - It extends a live membership and never touches the founder row.
  - A PDF pass bought while you have Gold changes nothing.
- **Razorpay:** it now grants Gold only for a server-priced order with the exact amount. Before v334, any captured payment gave a year.
- **Failed activations:** YouPI and Razorpay retries can now land after a failed activation.
- **Admin:** checked on the server (`app_admins`). The old password that sat in `js/admin.js` is gone.
- **No secrets in the app:** the service role key, webhook secrets and Razorpay secret live only in Supabase secrets.
