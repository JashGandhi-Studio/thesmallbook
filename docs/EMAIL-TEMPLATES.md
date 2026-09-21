# 📧 TheSmallBook — the 3 email templates (paste-ready)

The card below looks like a page from the app: cream paper, thick ink border,
hard yellow shadow, one big code. No images, no clutter — so it loads instantly
in every mail app, and if a mail app ignores the styling it still reads
perfectly as plain text.

**Where to paste:** Supabase Dashboard → **Authentication → Emails → Templates**

---

## 1 · Confirm signup

**Subject:**
```
Your TheSmallBook code — one step and you're in 📬
```

**Body (replace everything in the editor with this):**

```html
<div style="margin:0;padding:24px 10px;background:#f1ebdd;font-family:'Space Grotesk',-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <div style="max-width:480px;margin:0 auto 16px;text-align:left;font-family:'Archivo Black','Arial Black',sans-serif;font-size:14px;letter-spacing:2px;color:#111;">📕 THE SMALL BOOK</div>
    <div style="max-width:480px;background:#fffdf5;border:3px solid #111;border-radius:18px;box-shadow:8px 8px 0 #ffc800;padding:30px 26px;text-align:center;">
      <div style="font-size:34px;">📬</div>
      <h1 style="margin:10px 0 6px;font-family:'Archivo Black','Arial Black',sans-serif;font-size:21px;color:#111;">ONE CODE AND YOU'RE IN</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#3c3c34;">Your @name is already reserved for you.<br>Type these 6 digits where you left off:</p>
      <div style="display:inline-block;background:#ffc800;border:3px solid #111;border-radius:14px;box-shadow:4px 4px 0 #111;padding:14px 24px;font-family:'Archivo Black','Arial Black',sans-serif;font-size:30px;letter-spacing:.3em;color:#111;">{{ .Token }}</div>
      <p style="margin:16px 0 0;font-size:12px;color:#8f8a80;">works once, then it's gone — request a fresh code any time</p>
      <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:20px auto 0;"><tr><td align="center" style="background:#00c48c;border:3px solid #111;border-radius:999px;box-shadow:4px 4px 0 #111;">
        <a href="{{ .ConfirmationLink }}" style="display:inline-block;padding:12px 26px;font-family:'Space Grotesk',Arial,sans-serif;font-weight:700;font-size:13px;letter-spacing:1px;color:#111;text-decoration:none;">CONFIRM MY EMAIL →</a>
      </td></tr></table>
      <p style="margin:18px 0 0;font-size:11.5px;line-height:1.5;color:#8f8a80;">Button shy? Paste this in your browser:<br><span style="word-break:break-all;color:#6b7280;">{{ .ConfirmationLink }}</span></p>
      <div style="margin-top:20px;padding-top:14px;border-top:2px dashed #d9d2bd;font-size:11px;line-height:1.6;color:#8f8a80;">Free to read · no ads · no trackers · we never post without asking<br><b style="color:#111;">thesmallbook.in</b></div>
    </div>
  </td></tr></table>
</div>
```

---

## 2 · Magic Link (sign-in codes)

**Subject:**
```
Your sign-in code 🔑 — TheSmallBook
```

**Body (replace everything):**

```html
<div style="margin:0;padding:24px 10px;background:#f1ebdd;font-family:'Space Grotesk',-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <div style="max-width:480px;margin:0 auto 16px;text-align:left;font-family:'Archivo Black','Arial Black',sans-serif;font-size:14px;letter-spacing:2px;color:#111;">📕 THE SMALL BOOK</div>
    <div style="max-width:480px;background:#fffdf5;border:3px solid #111;border-radius:18px;box-shadow:8px 8px 0 #4d7cff;padding:30px 26px;text-align:center;">
      <div style="font-size:34px;">🔑</div>
      <h1 style="margin:10px 0 6px;font-family:'Archivo Black','Arial Black',sans-serif;font-size:21px;color:#111;">YOUR SIGN-IN CODE</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#3c3c34;">No password needed.<br>Type these 6 digits in the app and you're back on your shelf:</p>
      <div style="display:inline-block;background:#ffc800;border:3px solid #111;border-radius:14px;box-shadow:4px 4px 0 #111;padding:14px 24px;font-family:'Archivo Black','Arial Black',sans-serif;font-size:30px;letter-spacing:.3em;color:#111;">{{ .Token }}</div>
      <p style="margin:16px 0 0;font-size:12px;color:#8f8a80;">works once, then it's gone — request a fresh code any time</p>
      <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:20px auto 0;"><tr><td align="center" style="background:#4d7cff;border:3px solid #111;border-radius:999px;box-shadow:4px 4px 0 #111;">
        <a href="{{ .ConfirmationLink }}" style="display:inline-block;padding:12px 26px;font-family:'Space Grotesk',Arial,sans-serif;font-weight:700;font-size:13px;letter-spacing:1px;color:#111;text-decoration:none;">SIGN IN →</a>
      </td></tr></table>
      <p style="margin:18px 0 0;font-size:11.5px;line-height:1.5;color:#8f8a80;">Button shy? Paste this in your browser:<br><span style="word-break:break-all;color:#6b7280;">{{ .ConfirmationLink }}</span></p>
      <div style="margin-top:20px;padding-top:14px;border-top:2px dashed #d9d2bd;font-size:11px;line-height:1.6;color:#8f8a80;">Free to read · no ads · no trackers · we never post without asking<br><b style="color:#111;">thesmallbook.in</b></div>
    </div>
  </td></tr></table>
</div>
```

---

## 3 · Reset Password

**Subject:**
```
Your TheSmallBook reset code 🔐
```

**Body (replace everything):**

```html
<div style="margin:0;padding:24px 10px;background:#f1ebdd;font-family:'Space Grotesk',-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <div style="max-width:480px;margin:0 auto 16px;text-align:left;font-family:'Archivo Black','Arial Black',sans-serif;font-size:14px;letter-spacing:2px;color:#111;">📕 THE SMALL BOOK</div>
    <div style="max-width:480px;background:#fffdf5;border:3px solid #111;border-radius:18px;box-shadow:8px 8px 0 #ff90e8;padding:30px 26px;text-align:center;">
      <div style="font-size:34px;">🔐</div>
      <h1 style="margin:10px 0 6px;font-family:'Archivo Black','Arial Black',sans-serif;font-size:21px;color:#111;">SET A NEW PASSWORD</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#3c3c34;">Forgotten is fine — your shelf is exactly where you left it.<br>Type these 6 digits, then choose your new password:</p>
      <div style="display:inline-block;background:#ffc800;border:3px solid #111;border-radius:14px;box-shadow:4px 4px 0 #111;padding:14px 24px;font-family:'Archivo Black','Arial Black',sans-serif;font-size:30px;letter-spacing:.3em;color:#111;">{{ .Token }}</div>
      <p style="margin:16px 0 0;font-size:12px;color:#8f8a80;">works once, then it's gone — request a fresh code any time</p>
      <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:20px auto 0;"><tr><td align="center" style="background:#ff90e8;border:3px solid #111;border-radius:999px;box-shadow:4px 4px 0 #111;">
        <a href="{{ .ConfirmationLink }}" style="display:inline-block;padding:12px 26px;font-family:'Space Grotesk',Arial,sans-serif;font-weight:700;font-size:13px;letter-spacing:1px;color:#111;text-decoration:none;">CHOOSE NEW PASSWORD →</a>
      </td></tr></table>
      <p style="margin:18px 0 0;font-size:11.5px;line-height:1.5;color:#8f8a80;">Button shy? Paste this in your browser:<br><span style="word-break:break-all;color:#6b7280;">{{ .ConfirmationLink }}</span></p>
      <div style="margin-top:20px;padding-top:14px;border-top:2px dashed #d9d2bd;font-size:11px;line-height:1.6;color:#8f8a80;">Didn't ask for this? Ignore it — nothing changes without the code.<br><b style="color:#111;">thesmallbook.in</b></div>
    </div>
  </td></tr></table>
</div>
```

---

## The steps (once, ~2 minutes)

1. Supabase Dashboard → **Authentication → Emails → Templates**
2. Click **Confirm signup** → paste the **Subject**, then select-all in the body editor, delete, paste block 1 → **Save**
3. Same for **Magic Link** (block 2) and **Reset Password** (block 3)
4. Test it for real: open thesmallbook.in → sign in → "✉️ sign in with a code" → your own email → the card arrives

**Notes**
- Works right now with Supabase's default sender. When you reset your Gmail
  password someday, do the SMTP switch (Settings → Authentication → SMTP) and
  the same cards will arrive from **thesmallbook.in@gmail.com**.
- The `{{ .Token }}` chip is the 6 digits; the button and the pasted link both
  keep working as backups — nothing to break.
- Mail apps that ignore fancy styling still show the code as plain text.
