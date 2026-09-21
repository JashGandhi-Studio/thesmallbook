# 🚢 DEPLOY GUIDE — getting updates LIVE on thesmallbook.in

## Why the last updates never appeared (read this once)

Dragging **`thesmallbook-update.zip` into GitHub uploads the zip as a single
file. GitHub never unzips it.** GitHub Pages kept serving the old files, so:

- new pages (`chat.html`, the new `login.html`) → **404 / "doesn't work"**
- sign-in returned to the **old app** (old `login.html` on the server)
- the chat / bar / onboarding changes were invisible on the real domain

The zip is a *transport box*. You must put its **contents** into the repo.
Use any option below. All of them end the same way: a commit on `main`
→ GitHub Pages redeploys in ~1 minute.

---

## Option A — GitHub website (no installs, ~4 minutes)

1. Unzip `thesmallbook-update.zip` on your computer → folder `update/`.
2. Open github.com/**JashGandhi-Studio/thesmallbook** (branch `main`).
3. Click **Add file → Upload files**.
4. Drag the **contents** of `update/` into the drop zone — the folders
   (`assets/ books/ css/ graveyard/ js/ docs/`) **and** every root file
   (`index.html`, `sw.js`, `chat.html`, …). Dragging folders keeps their
   structure intact.
5. Wait until every file finishes uploading, then **Commit changes**
   (message: `tsb-v175`).
6. Repo **Settings → Pages**: Source = *Deploy from a branch*,
   Branch = `main`, folder = `/ (root)`. (Already set — just verify once.)

> GitHub overwrites same-named files and adds new ones. Files we deleted
> (old duplicate covers) stay behind harmlessly; nothing links to them.

## Option B — git command line (recommended, ~2 minutes, exact)

```bash
git clone https://github.com/JashGandhi-Studio/thesmallbook.git tsb
# Mac / Linux:
rsync -a --delete update/ tsb/ --exclude .git
# Windows (PowerShell):
robocopy update tsb /MIR /XD .git
cd tsb
git add -A
git commit -m "tsb-v175 — you window, minimal chat, deploy-safe assets"
git push
```

## Option C — GitHub Desktop

File → Add local repository → pick the unzipped `update/` folder →
it shows all changes → Commit to main → Publish/ Push.

---

## ✅ Verify the deploy (30 seconds, do this every time)

1. `thesmallbook.in/sw.js` → must contain **`tsb-v175`**
2. `thesmallbook.in/chat.html` → loads the minimal chat (not a 404)
3. `thesmallbook.in/login.html` → the premium "SAVE WHAT YOU READ" page
4. Phone: open the site once, swipe the tab fully away, reopen — done.
   (The app now self-heals old caches; this one reopen finishes the job.)

If #1 shows an older number → the commit didn't include the root files
(check you uploaded the *contents*, not the zip) or Pages is pointed at a
different branch/folder (Settings → Pages).

---

## 🔑 One-time Google / Supabase checklist (sign-in redirects)

- **console.cloud.google.com → APIs & Services → Credentials → your OAuth
  client → Authorized redirect URIs** contains exactly:
  `https://thesmallbook.in/login.html`
  (add the `www.` variant only if you ever share www links)
- **Supabase → Authentication → URL Configuration**:
  Site URL `https://thesmallbook.in` · Redirect URLs `https://thesmallbook.in/**`
- Nothing else — CNAME, canonicals, manifest and sitemap already point at
  thesmallbook.in.

## 🔍 One-time Google Search refresh (old "220 books" snippet)

Search Console → Sitemaps → submit `https://thesmallbook.in/sitemap.xml`
(all lastmod dates are already bumped to 2026-09-05) → URL-inspect the home
page → **Request indexing**. The snippet updates after recrawl (2–7 days).

---

## 🆘 Troubleshooting

| Symptom | Fix |
|---|---|
| Site still old after commit | Settings → Pages shows *main / root*; wait for the Pages Action to finish; then reopen tab once |
| `chat.html` 404 | Upload included the zip, not its contents — redo Option A step 4 |
| Login returns to Google with an error | Redirect URI mismatch — copy the URI character-for-character from the checklist |
| Onboarding shows for a logged-in user | Impossible in v175+ (session check is synchronous); if seen, the deploy is older than v175 |
| Phone shows old UI once after deploy | Swipe tab away + reopen (last old shell dies); never needed again |
