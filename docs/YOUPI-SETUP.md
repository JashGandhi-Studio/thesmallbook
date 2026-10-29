# TSB Gold payments with YouPI-PG (v331)

Gold is switched on **only by the server**. The browser can never turn Gold on by itself:
no local flag, no developer option, no "founder" email list. Gold lives in the
`gold_members` table, and only three server functions can write to it:

| Writer | When |
|---|---|
| `youpi-webhook` | YouPI-PG confirms a real UPI credit for an order |
| `razorpay-webhook` | (optional, older path) Razorpay confirms a payment |
| `redeem-gold` | a single-use code that you issued is redeemed once |

`gold-order` sets the price of every order on the server, so a changed amount in
the browser cannot buy Gold for less.

> **Honest note:** YouPI-PG (github.com/youpi-pg/YouPI-PG) is a free, open-source,
> **self-hosted** gateway. Its own README labels it a research project and
> experimental. It matches UPI credits by watching your bank SMS and notifications
> on an Android phone (plus optional Gmail / Google Messages observers), so keep it
> to small daily volumes (the project suggests about 20 payments a day per account).
> 0% fees, money goes straight to your bank.

Until `GATEWAY_URL` and `PUBLIC_KEY` are filled in, checkout falls back to
"pay by UPI, then enter the code we send you", which `redeem-gold` checks on the server.

---

## 1. Run the SQL once

Supabase dashboard, SQL editor, run:

```
supabase/sql/UPDATE-v331-payments-profiles.sql
```

It adds the `gold_orders` table, the profile columns (age, name, username) and the
`username_available()` function the sign-up screen uses.

## 2. Host YouPI-PG

1. Clone `https://github.com/youpi-pg/YouPI-PG` on a small server (any VPS with Node 20).
2. Follow its README to start the three services: payment API (6100), checkout portal
   (7000) and admin (6001). Put them behind HTTPS, for example `https://pay.thesmallbook.in`.
3. In the YouPI admin, add your UPI ID (VPA) and install the Android observer APK on
   the phone that receives the bank SMS for that UPI ID.
4. In the admin, create a **public key** and a **webhook secret**.
5. Set the webhook URL to:

```
https://wdmxcewmyofihgrheuas.supabase.co/functions/v1/youpi-webhook
```

## 3. Deploy the two functions

```
supabase functions deploy gold-order
supabase functions deploy youpi-webhook --no-verify-jwt
supabase secrets set YOUPI_WEBHOOK_SECRET=<the secret from step 2.4>
```

`youpi-webhook` checks the `X-Gateway-Signature-V2` HMAC (with the timestamp) or the
older `X-Gateway-Signature`, ignores repeats of the same `deliveryId`, and only
grants Gold when the amount paid matches the order that `gold-order` priced.

## 4. Fill in the app config

`js/config.js`:

```js
YOUPI: {
  GATEWAY_URL: "https://pay.thesmallbook.in",
  PUBLIC_KEY: "<public key from step 2.4>"
},
```

Commit and push. The Gold page now opens the YouPI checkout, and Gold switches on
by itself a few seconds after the bank credit is matched.

## 5. Test it

1. Sign in with a test account, open `gold.html`, pick **₹99 a month**.
2. Pay ₹99 from any UPI app.
3. Within a minute the page says Gold is on. In Supabase, `gold_members` has a row for
   that user and `gold_orders` shows the order as `paid` with its UTR.
4. Try again with a wrong amount: Gold must **not** switch on.

## Plans (priced on the server)

| Plan key | Price | Days |
|---|---|---|
| `gold_monthly` | ₹99 | 30 |
| `gold_yearly` | ₹999 | 365 |
| `pdf_75d` | ₹49 | 75 (PDF cheat-sheets only) |
