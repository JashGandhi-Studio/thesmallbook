# Gold UPI activation: what makes it automatic

The phone payment button already opens a UPI payment intent using the configured `PAYWALL.UPI_ID`. A UPI intent can launch GPay, PhonePe, Paytm or another installed UPI app, but it does not return a trustworthy bank-confirmed payment result to a browser.

A typed UTR is therefore **not enough on its own** to activate Gold securely. An automatic UTR match requires a payment gateway or bank-credit listener that sends a signed confirmation to the server.

## Existing supported automatic path

The release already contains this server-side path:

1. `gold-order` creates the signed-in reader's server-priced order.
2. The hosted YouPI-PG gateway observes the incoming bank credit.
3. The gateway POSTs the signed event to `youpi-webhook`.
4. `youpi-webhook` checks its HMAC, exact amount, order ID and duplicate event ID.
5. The server grants Gold through `grant_gold`. The browser only polls the resulting account state.
6. If a reader entered a UTR first, `upi-claim` immediately matches it to the authenticated gateway credit and turns Gold on.

## Required operator setup

This cannot be switched on by a browser-only ZIP because it needs your private payment infrastructure.

- Host a gateway endpoint that can receive and reconcile credits for your UPI VPA.
- Set `YOUPI.GATEWAY_URL` and `YOUPI.PUBLIC_KEY` in `js/config.js` to your real public gateway values.
- Set the `YOUPI_WEBHOOK_SECRET` Edge Function secret to the shared signing secret. Never put it in frontend code.
- Deploy `gold-order`, `upi-claim` and `youpi-webhook`, along with the existing payments SQL migration.
- Send a ₹1 test payment from a separate account and confirm that the signed webhook, not the browser redirect, activates a test Gold account.

Until those values and the gateway are live, the app correctly uses the secure fallback: it opens the UPI app, accepts a 12-digit UTR, stores a pending claim, and activates only after a gateway match or an administrator bank check. It must not pretend a UTR has been automatically verified when it has not.
