# 💛 TSB GOLD PAYWALL — STEP-BY-STEP (v223)

**The promise that never changes:** reading the library stays **free to read**.
Gold is the premium layer on top — better cards, pro filters, human audio, PDFs.
People pay for *more*, never for *the books*.

---

## What is gated (the deal)

| Feature                          | Free | Gold (₹999/yr) |
|----------------------------------|:----:|:--------------:|
| Read all 400 books / 2,637 lessons | ✅ | ✅ |
| Story Card Studio (ratios, filters, quote layout) | ✅ | ✅ |
| Export share cards | ✅ with 📕 watermark | ✅ clean |
| Pro filters (Gold, Film) | 🔒 | ✅ |
| Human-narration audio (Gold samples live on gold.html) | 🔒 | ✅ |
| PDF cheat-sheets | 🔒 | ✅ |
| Gold badge + priority in People tab | 🔒 | ✅ |

The watermark is not a lock — it is your **growth engine**: every free card
is a signpost that says `thesmallbook.in`.

---

## PHASE 0 — SHIPPED IN THIS ZIP (works today, zero new backend)

Already wired in this codebase:

1. `js/gold.js` — one source of truth: `TSB_GOLD.isGold()`.
2. `gold.html` — "ALREADY PAID? ACTIVATE GOLD" box (code format `TSB-XXXX-XXXX`).
3. `js/upi.js` — UPI deep-link engine (₹999 pre-filled, GPay/PhonePe/Paytm + copy-UPI fallback).
4. Watermark chips on book/lesson cards (`js/book.js → drawWatermark`) and Studio exports (`js/studio.js → drawMark`) — shown only when not Gold.
5. Pro filter lock in the Studio.

**Operating routine (10 min/week):**
1. Reader pays via UPI button or WhatsApp link on gold.html.
2. You see the payment in your UPI app.
3. You send them a code (`TSB-` + two 4-char groups — keep a simple sheet: code → name → date).
4. They type it in gold.html → Gold on, instantly, on their device.

Honest limit: codes live in the browser. That is fine for Phase 0 —
the first 500 buyers are your fans, not crackers. Phase 2 moves the truth to the server.

---

## PHASE 1 — Razorpay Payment Links (≈1 day, no server code)

1. Create a Razorpay account (individual works; KYC with PAN).
2. Dashboard → Payment Links → New → ₹999, label "TSB Gold (1 year)".
3. Turn on "collect customer email/phone".
4. Replace the UPI anchor on gold.html with the Payment Link button (keep UPI as alt).
5. Razorpay emails you per payment → you email the code (or automate with a Gmail filter + canned reply).

You now have: automatic receipts, card/UPI/netbanking acceptance, and a paper trail.

---

## PHASE 2 — Auto-unlock: Razorpay webhook → Supabase (≈2–3 days)

**1. Database (SQL editor, run once):**
```sql
alter table public.profiles add column if not exists plan text not null default 'free';
alter table public.profiles add column if not exists plan_until timestamptz;
-- readers can read their own plan but not set it:
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and plan = (select plan from public.profiles where id = auth.uid()));
```
(The `with check` trick stops self-upgrades; the webhook uses the service key.)

**2. Supabase Edge Function `razorpay-webhook` (Deno):**
```ts
const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;
Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get("x-razorpay-signature")!;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  const hex = [...mac].map(b => b.toString(16).padStart(2, "0")).join("");
  if (hex !== sig) return new Response("bad signature", { status: 401 });

  const ev = JSON.parse(body);
  if (ev.event === "payment.captured" && (ev.payload.payment.entity.notes?.sku === "gold-yearly")) {
    const email = ev.payload.payment.entity.email;
    await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
      method: "PATCH",
      headers: { apikey: Deno.env.get("SUPABASE_SERVICE_KEY")!, Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_KEY")!}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ plan: "gold", plan_until: new Date(Date.now() + 365 * 864e5).toISOString() }),
    });
  }
  return new Response("ok");
});
```
3. Razorpay Dashboard → Webhooks → add the function URL, event `payment.captured`.
4. Client sync (Phase-2 hook already exists): after sign-in, `auth.js` fetches `profiles.plan` and calls `TSB_GOLD.setFromServer(plan, plan_until)`. Server is now the truth; the code box stays as a fallback for offline/WhatsApp sales.

---

## PHASE 3 — Pricing psychology & retention

- **Anchor hard:** show ₹129/month struck through next to ₹999/year ("2 months free ×5").
- **First-500 lock** (already on gold.html) — scarcity that is actually true.
- **Student plan ₹499/yr** with college-ID photo on WhatsApp — students are your Instagram growth loop.
- **Festival drops:** Diwali/exams-season ₹799 for 48h, announced only via story cards.
- **Ship the PDFs first:** 10 one-page cheat-sheets (your best 10 books) makes Gold instantly worth ₹999; the card on gold.html already promises them.
- **Renewal:** 30-day-before email/WhatsApp with "your streak" (books read, cards shared) — retention is a receipt of value.

---

## 📈 GROWTH — steal like Substack & Instagram

1. **Instagram = your ad account.** One lesson-card per day per book (the Studio/`book.js` canvas code is the generator). Always watermarked → profile bio → site. Reels: 30 s of the Gold TTS audio over a card = the best possible Gold ad.
2. **Substack cross-post.** Every story becomes a Sunday issue ("TheSmallBook Sunday"); free issue + paid issue mirrors Gold; each issue ends with one CTA link. (See `STORIES-SUBSTACK-PLAN.md`.)
3. **Referral loop:** shared links carry `?ref=`; 3 sign-ups → 30 days Pro filters; 10 → a year of Gold. Codes are already your mechanic.
4. **Fuel the Library:** sponsor-a-book ₹499 — "This breakdown was fuelled by {name}" on the book page. Fans love being named.
5. **B2B later:** study-club / college bundle ₹19,999/yr for 100 seats; invoice-friendly via Razorpay.
6. **WhatsApp-status first:** India shares on Status; the 9:16 Studio ratio + native share sheet is built for exactly that.

**Numbers to watch weekly:** cards exported, sign-ins from gate, gold.html visits, codes activated, ₹ in. One sheet, five numbers.

---

*Free to read is the brand. Gold is the thank-you. Never invert them.*
