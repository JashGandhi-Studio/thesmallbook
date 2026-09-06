# 📲 Push notifications (outside the app) — 5-minute free setup

In-app toasts + red dots already work with zero setup. To reach readers
**even when the app is closed** (phone lock screen / desktop), we use
OneSignal's free tier.

## Steps
1. Go to https://onesignal.com → sign up free → **Add App** → name it
   "TheSmallBook" → choose **Web Push**.
2. Pick **WordPress & Website Builder → "No platform / plain site"**:
   - Site URL: `https://thesmallbook.in`
   - Add your site icon when asked.
3. OneSignal gives you an **App ID** (looks like `a1b2c3d4-....`).
4. Open `js/config.js` in the repo → set:
   `ONESIGNAL_APP_ID: "paste-your-app-id-here",`
5. Deploy. In the app: You → **📲 Enable push** → browser asks
   permission → allow. Done — OneSignal delivers pushes even when the
   tab is closed (Chrome/Edge desktop + Android; iOS requires the site
   to be added to Home Screen first, which our install prompt covers).

## Sending a push to everyone
OneSignal dashboard → **New Message** → title + body → Send to All.
(Per-event pushes — "X liked your story" while the app is closed —
need a tiny server hook; say the word and we'll build a Supabase
Edge Function for it next round.)
