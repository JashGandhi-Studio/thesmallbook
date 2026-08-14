/* ============================================================
   THESMALLBOOK — 🔐 SIGN-IN ENGINE (auth.js)
   - "Log in with Google" via Supabase Auth (PKCE, no CDN — SW friendly)
   - Anonymous progress (bookmarks + lessons) auto-migrates on login
   - Two-way sync: every device keeps the merged best of both
   - "Save your progress?" modal after 2nd completed book
   - If Supabase keys are empty in config.js → everything turns off
     gracefully, site behaves exactly like before. (No errors.)
   Include AFTER config.js on every app page.
   ============================================================ */
(function () {
  const CFG = window.TSB_CONFIG || {};
  const URL = (CFG.SUPABASE_URL || "").replace(/\/$/, "");
  const ANON = CFG.SUPABASE_ANON_KEY || "";
  const GCLIENT = CFG.GOOGLE_CLIENT_ID || ""; // direct-Google OAuth client (consent shows thesmallbook.in)
  const GSECRET = CFG.GOOGLE_CLIENT_SECRET || ""; // REQUIRED by Google for web-app token exchange
  const SITE_ORIGIN = CFG.SITE_URL || "https://thesmallbook.in"; // canonical origin (www vs bare doesn't matter)
  const REDIRECT_URI = SITE_ORIGIN + "/login.html"; // MUST be registered in Google Cloud Console
  const ENABLED = !!(URL && ANON);
  const COOKIE_DOMAIN = ".thesmallbook.in";

  /* ---------------- cookie helpers (verifier survives www ⇄ bare) ---------------- */
  function setCookie(name, val, mins) {
    try {
      document.cookie = name + "=" + encodeURIComponent(val) +
        "; domain=" + COOKIE_DOMAIN + "; path=/; max-age=" + (mins * 60) +
        "; samesite=lax" + (location.protocol === "https:" ? "; secure" : "");
    } catch (e) {}
  }
  function getCookie(name) {
    try {
      const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : "";
    } catch (e) { return ""; }
  }
  function delCookie(name) {
    try { document.cookie = name + "=; domain=" + COOKIE_DOMAIN + "; path=/; max-age=0; samesite=lax"; } catch (e) {}
  }
  function saveVerifier(v, n) {
    try { sessionStorage.setItem("tsb_code_verifier", v); sessionStorage.setItem("tsb_nonce", n || ""); } catch (e) {}
    setCookie("tsb_code_verifier", v, 10);
    setCookie("tsb_nonce", n || "", 10);
  }
  function readVerifier() {
    let v = ""; let n = "";
    try { v = sessionStorage.getItem("tsb_code_verifier") || ""; n = sessionStorage.getItem("tsb_nonce") || ""; } catch (e) {}
    if (!v) v = getCookie("tsb_code_verifier");
    if (!n) n = getCookie("tsb_nonce");
    return { v, n };
  }
  function clearVerifier() {
    try { sessionStorage.removeItem("tsb_code_verifier"); sessionStorage.removeItem("tsb_nonce"); } catch (e) {}
    delCookie("tsb_code_verifier"); delCookie("tsb_nonce");
  }

  const AUTH_KEY = "tsb_auth_session";      // session (tokens + user)
  const DONE_KEY = "tsb_auth_done";         // completed books count (pre-login)
  const OFFER_KEY = "tsb_auth_offer";       // has the modal been shown once?
  const TABLE = URL ? URL + "/rest/v1/progress" : "";

  const PROGRESS_KEY = "tsb_progress";      // { bookId: [lesson indexes] }
  const MARKS_KEY = "tsb_bookmarks";        // [bookId, ...]

  /* ---------------- tiny helpers ---------------- */
  function lsGet(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  function uid() { const s = sessionStorage; return (s && s.getItem("tsb_code_verifier")) || ""; }
  function now() { return Math.floor(Date.now() / 1000); }

  function b64url(bytes) {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  async function sha256(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return b64url(new Uint8Array(buf));
  }
  function genVerifier() {
    const arr = new Uint8Array(48);
    crypto.getRandomValues(arr);
    return b64url(arr);
  }

  /* ---------------- session ---------------- */
  let session = lsGet(AUTH_KEY, null);

  async function refreshSession() {
    if (!session || !session.refresh_token) return false;
    try {
      const res = await fetch(URL + "/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        headers: { "apikey": ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refresh_token })
      });
      if (!res.ok) throw new Error("refresh " + res.status);
      session = await res.json();
      lsSet(AUTH_KEY, session);
      return true;
    } catch (e) { console.warn("TSB auth refresh failed:", e); }
    return false;
  }

  async function ensureToken() {
    if (!session) return "";
    if (session.expires_at && now() >= session.expires_at - 90) {
      if (!(await refreshSession())) { signOut(); return ""; }
    }
    return session.access_token || "";
  }

  /* ---------------- OAuth (Google) via Supabase PKCE ---------------- */
  function signIn(provider) {
    provider = provider || "google";
    if (!ENABLED) return;
    // remember where to return after login (unless we're ON the login page)
    if (!/login\.html/.test(location.pathname)) {
      try { sessionStorage.setItem("tsb_auth_return", location.pathname + location.search); } catch {}
    }
    // ✅ THE PROVEN FLOW — Supabase-hosted redirect (the one that always
    // worked, no secret, no JS origins, no extra Google config):
    //   site → supabase.co/auth/v1/authorize → Google consent (GoTrue holds
    //   the client secret server-side) → back to login.html → session.
    hostedSignIn(provider);
  }

  function hostedSignIn(provider) {
    const verifier = genVerifier();
    const nonce = genVerifier();
    saveVerifier(verifier, nonce);
    sha256(verifier).then((challenge) => {
      // use the CANONICAL origin so www ⇄ bare both work (Supabase URL
      // config allows thesmallbook.in/** only)
      const redirectTo = SITE_ORIGIN + "/login.html";
      const params = new URLSearchParams({
        redirect_to: redirectTo,
        response_type: "code",
        provider: provider,
        flow_type: "pkce",
        code_challenge: challenge,
        code_challenge_method: "S256",
        scope: "openid email profile"
      });
      const url = URL + "/auth/v1/authorize?" + params.toString();
      window.TSB_AUTH && (window.TSB_AUTH._lastAuthUrl = url);
      location.href = url;
    });
  }

  /* exchange Google's ?code= for an id_token (public client, PKCE, no secret) */
  async function googleCodeToIdToken(code, verifier) {
    const body = {
      code: code,
      client_id: GCLIENT,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
      code_verifier: verifier
    };
    if (GSECRET) body.client_secret = GSECRET; // REQUIRED for web-app clients (verified live)
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body)
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error("google token " + res.status + " " + txt.slice(0, 120));
    }
    return await res.json(); // { id_token, access_token, expires_in, ... }
  }

  /* mint a Supabase session from Google's id_token */
  async function supabaseIdTokenSession(idToken) {
    const res = await fetch(URL + "/auth/v1/token?grant_type=id_token", {
      method: "POST",
      headers: { "apikey": ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "google", id_token: idToken })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error("supabase id_token " + res.status + " " + txt.slice(0, 120));
    }
    return await res.json(); // standard session
  }

  /* soft nonce check on the id_token payload */
  function nonceOk(idToken) {
    try {
      const payload = JSON.parse(atob(idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      const stored = readVerifier().n;
      return !payload.nonce || !stored || payload.nonce === stored;
    } catch (e) { return true; }
  }

  /* exchange ?code= for a session right after Google redirects back */
  async function handleCallback() {
    const p = new URLSearchParams(location.search);
    const code = p.get("code");
    if (!code) return false;
    const { v: verifier } = readVerifier();
    let ret = "";
    try { ret = sessionStorage.getItem("tsb_auth_return") || ""; } catch {}

    // 1) DIRECT GOOGLE flow — ONLY when a secret is configured (Mode 2)
    if (GCLIENT && GSECRET && verifier) {
      try {
        const gt = await googleCodeToIdToken(code, verifier);
        if (gt && gt.id_token) {
          if (nonceOk(gt.id_token)) {
            const s = await supabaseIdTokenSession(gt.id_token);
            if (s && s.access_token) {
              session = s;
              lsSet(AUTH_KEY, session);
              history.replaceState({}, "", location.pathname); // clean URL, stay on login page
              clearVerifier();
              return true;
            }
          }
          console.warn("TSB: google id_token nonce/session failed");
        }
      } catch (e) {
        console.warn("TSB direct google exchange failed:", e);
      }
    }

    // 2) SUPABASE-HOSTED flow (Mode 1 — DEFAULT): exchange the auth_code
    //    GoTrue gave us (it landed us here with ?code=). No secret needed.
    try {
      const res = await fetch(URL + "/auth/v1/token?grant_type=pkce", {
        method: "POST",
        headers: { "apikey": ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ auth_code: code, code_verifier: verifier || "" })
      });
      if (!res.ok) throw new Error("exchange " + res.status);
      session = await res.json();
      lsSet(AUTH_KEY, session);
      history.replaceState({}, "", location.pathname);
      clearVerifier();
      return true;
    } catch (e) {
      console.warn("TSB auth callback failed:", e);
      try { history.replaceState({}, "", location.pathname); } catch {}
      clearVerifier();
      // tell the login page: something went wrong, show friendly retry
      try { window.dispatchEvent(new CustomEvent("tsb:auth-error", { detail: "login-failed" })); } catch {}
      return false;
    }
  }

  function signOut() {
    session = null;
    try { localStorage.removeItem(AUTH_KEY); } catch {}
    try { window.dispatchEvent(new CustomEvent("tsb:auth")); } catch {}
  }

  function user() { return (session && session.user) || null; }

  /* ---------------- progress sync ---------------- */
  function authHeaders(extra) {
    return Object.assign({
      "apikey": ANON,
      "Content-Type": "application/json"
    }, extra || {});
  }

  async function pullRemote() {
    const tok = await ensureToken();
    if (!tok) return [];
    try {
      const res = await fetch(TABLE + "?select=*&user_id=eq." + encodeURIComponent(session.user.id), {
        headers: authHeaders({ "Authorization": "Bearer " + tok })
      });
      if (!res.ok) throw new Error("pull " + res.status);
      return await res.json();
    } catch (e) { console.warn("TSB sync pull failed:", e); return []; }
  }

  function pushRow(tok, bookId, lessons, bookmarked) {
    return fetch(TABLE + "?on_conflict=user_id,book_id", {
      method: "POST",
      headers: authHeaders({
        "Authorization": "Bearer " + tok,
        "Prefer": "resolution=merge-duplicates,return=minimal"
      }),
      body: JSON.stringify({
        user_id: session.user.id,
        book_id: bookId,
        lessons_done: lessons,
        bookmarked: !!bookmarked,
        updated_at: new Date().toISOString()
      })
    }).then((r) => {
      if (!r.ok) throw new Error("push " + r.status);
      return true;
    });
  }

  /* merge remote rows into localStorage (union of both worlds) */
  function applyMerge(rows) {
    const prog = lsGet(PROGRESS_KEY, {});
    let marks = lsGet(MARKS_KEY, []);
    let changed = false;

    for (const r of rows) {
      const rid = r.book_id;
      const remoteLessons = Array.isArray(r.lessons_done) ? r.lessons_done.filter((n) => Number.isFinite(+n)).map(Number) : [];
      const localLessons = prog[rid] || [];

      const merged = [...new Set([...localLessons, ...remoteLessons])].sort((a, b) => a - b);
      if (merged.length !== localLessons.length || merged.some((v, i) => v !== localLessons[i])) {
        prog[rid] = merged;
        changed = true;
      }

      if (r.bookmarked && !marks.includes(rid)) { marks.push(rid); changed = true; }
    }
    if (changed) {
      lsSet(PROGRESS_KEY, prog);
      lsSet(MARKS_KEY, marks);
      try { window.dispatchEvent(new CustomEvent("tsb:sync")); } catch {}
    }
    return changed;
  }

  /* push every local book the cloud doesn't know / is behind on */
  async function pushLocal() {
    const tok = await ensureToken();
    if (!tok) return false;
    const rows = await pullRemote();
    const remoteMap = {};
    rows.forEach((r) => { remoteMap[r.book_id] = r; });

    const prog = lsGet(PROGRESS_KEY, {});
    const marks = lsGet(MARKS_KEY, []);
    let pushed = 0;
    const seen = new Set();
    const tasks = [];

    for (const id of Object.keys(prog)) {
      seen.add(id);
      const lessons = (prog[id] || []).filter((n) => Number.isFinite(+n)).map(Number);
      const bookmarked = marks.includes(id);
      const r = remoteMap[id];
      if (!r) { tasks.push(pushRow(tok, id, lessons, bookmarked).then(() => pushed++)); }
      else {
        const remoteLessons = Array.isArray(r.lessons_done) ? r.lessons_done.map(Number) : [];
        const same = lessons.length === remoteLessons.length && lessons.every((v, i) => v === remoteLessons[i]);
        if (!same || !!r.bookmarked !== bookmarked) tasks.push(pushRow(tok, id, [...new Set([...remoteLessons, ...lessons])].sort((a, b) => a - b), bookmarked || r.bookmarked).then(() => pushed++));
      }
    }
    for (const id of marks) {
      if (seen.has(id)) continue;
      const r = remoteMap[id];
      if (!r || !r.bookmarked) tasks.push(pushRow(tok, id, (r && Array.isArray(r.lessons_done) ? r.lessons_done : []), true).then(() => pushed++));
    }
    /* carry the local streak on the first row we push (any book_id) */
    try {
      const st = JSON.parse(localStorage.getItem("tsb_streak")) || null;
      if (st && st.last) {
        const sid = Object.keys(remoteMap)[0] || "tsb-streak";
        const r0 = remoteMap[sid];
        const rStreak = r0 && r0.streak ? r0.streak : null;
        const localHasNewer = !rStreak || (st.last >= rStreak.last && (st.count || 0) >= (rStreak.count || 0));
        if (localHasNewer) {
          tasks.push(fetch(TABLE + "?on_conflict=user_id,book_id", {
            method: "POST",
            headers: authHeaders({ "Authorization": "Bearer " + tok, "Prefer": "resolution=merge-duplicates,return=minimal" }),
            body: JSON.stringify({ user_id: session.user.id, book_id: sid, lessons_done: r0 && r0.lessons_done ? r0.lessons_done : [], bookmarked: !!(r0 && r0.bookmarked), streak: st, updated_at: new Date().toISOString() })
          }).then(() => pushed++).catch(() => {}));
        }
      }
    } catch (e) {}
    await Promise.all(tasks);
    return pushed > 0;
  }

  /* streak cross-device merge: latest 'last' date wins, same date → max count */
  function mergeStreak(remote) {
    try {
      const local = JSON.parse(localStorage.getItem("tsb_streak")) || { last: "", count: 0 };
      const r = (remote && remote.streak) || null;
      if (!r) return false;
      const a = local.last || "", b = r.last || "";
      if (a === b) {
        if ((r.count || 0) > (local.count || 0)) {
          local.count = r.count;
          localStorage.setItem("tsb_streak", JSON.stringify(local));
          return true;
        }
        return false;
      }
      if (b > a) {
        localStorage.setItem("tsb_streak", JSON.stringify({ last: b, count: r.count || 0 }));
        return true;
      }
      return false;
    } catch (e) { return false; }
  }

  /* full sync: pull → merge → push back */
  async function syncProgress() {
    if (!ENABLED || !user()) return { ok: false, reason: "no-user" };
    try {
      const rows = await pullRemote();
      applyMerge(rows);
      await pushLocal();
      return { ok: true };
    } catch (e) { console.warn("TSB sync failed:", e); return { ok: false, reason: "error" }; }
  }

  /* debounced per-book sync (called on every mark-read / bookmark) */
  let syncTimer = null;
  function queueSync() {
    if (!ENABLED || !user()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => { syncProgress(); }, 2500);
  }

  /* ---------------- "Save your progress?" modal ---------------- */
  function injectStyles() {
    if (document.getElementById("tsb-auth-style")) return;
    const st = document.createElement("style");
    st.id = "tsb-auth-style";
    st.textContent = `
      #tsb-auth-slot{margin-top:14px;text-align:center}
      .tsb-auth-chip{display:inline-flex;align-items:center;gap:8px;border:3px solid #111;background:#fffdf5;box-shadow:4px 4px 0 #111;padding:8px 16px;font-family:"Archivo Black",sans-serif;font-size:12px;letter-spacing:.5px;cursor:pointer;color:#111;text-decoration:none}
      .tsb-auth-chip:hover{transform:translate(-1px,-1px);box-shadow:6px 6px 0 #111}
      .tsb-auth-chip--in{background:#00c48c;color:#111}
      .tsb-auth-chip--out{background:#fff;color:#111;border:3px solid #111;box-shadow:3px 3px 0 #111;gap:8px;padding:10px 18px;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;align-items:center;justify-content:center;text-decoration:none;display:inline-flex}
      .tsb-auth-chip--out svg{flex:none}
      .tsb-auth-chip--out:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 #111}
      /* ---- navbar user chip / login button ---- */
      .tsb-navuser{display:inline-flex;align-items:center;gap:7px;border:3px solid var(--ink);font-family:"Space Grotesk",sans-serif;font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase;padding:9px 14px;cursor:pointer;text-decoration:none;line-height:1;transition:transform .12s ease, box-shadow .12s ease;color:#111}
      .tsb-navuser:hover{transform:translate(-1px,-1px)}
      .tsb-navuser--login{background:var(--blue);box-shadow:3.5px 3.5px 0 var(--ink)}
      .tsb-navuser--login:hover{box-shadow:5px 5px 0 var(--ink)}
      .tsb-navuser--in{background:var(--paper);color:var(--ink);text-transform:none;letter-spacing:0;font-size:12px;font-weight:600;padding:7px 12px;box-shadow:3px 3px 0 var(--green)}
      .tsb-navuser--in:hover{box-shadow:5px 5px 0 var(--green)}
      .tsb-navuser__dot{width:8px;height:8px;border-radius:50%;background:var(--green);border:2px solid var(--ink);flex:none;animation:tsbDotPulse 2.2s ease-in-out infinite}
      @keyframes tsbDotPulse{0%,100%{opacity:1}50%{opacity:.35}}
      .tsb-auth-toast--welcome{background:#ffc800;color:#111;border-color:var(--ink);box-shadow:6px 6px 0 #00c48c}
      .tsb-auth-ov{position:fixed;inset:0;background:rgba(17,17,17,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px;animation:tsbAuthFade .25s ease}
      .tsb-auth-box{background:#fffdf5;border:4px solid #111;box-shadow:10px 10px 0 #ffc800;max-width:400px;width:100%;padding:26px 22px;text-align:center;position:relative;animation:tsbAuthPop .3s cubic-bezier(.2,1.4,.4,1)}
      .tsb-auth-x{position:absolute;top:10px;right:12px;border:2.5px solid #111;background:#fffdf5;width:32px;height:32px;cursor:pointer;font-weight:700}
      .tsb-auth-box h3{font-family:"Archivo Black",sans-serif;font-size:21px;margin:6px 0 8px}
      .tsb-auth-box p{font-size:14px;line-height:1.55;color:#333;margin:0 0 16px}
      .tsb-auth-g{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;border:3px solid #111;background:#fff;box-shadow:4px 4px 0 #111;padding:12px 16px;font-family:"Archivo Black",sans-serif;font-size:14px;cursor:pointer;color:#111;margin-bottom:10px}
      .tsb-auth-g:hover{transform:translate(-1px,-1px);box-shadow:6px 6px 0 #111}
      .tsb-auth-g img{width:20px;height:20px}
      .tsb-auth-later{background:none;border:none;text-decoration:underline;cursor:pointer;font-size:12.5px;color:#666;padding:6px}
      .tsb-auth-chips{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin-bottom:12px}
      .tsb-auth-chips span{font-size:10.5px;font-weight:700;letter-spacing:.4px;border:2.5px solid #111;padding:4px 8px;background:#ffc800}
      .tsb-auth-chips span:nth-child(2){background:#ff90e8}
      .tsb-auth-chips span:nth-child(3){background:#00c48c}
      .tsb-auth-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:10000;background:#111;color:#ffc800;border:3px solid #00c48c;box-shadow:6px 6px 0 #00c48c;padding:12px 22px;font-family:"Archivo Black",sans-serif;font-size:13px;letter-spacing:.5px;animation:tsbAuthFade .3s ease}
      @keyframes tsbAuthFade{from{opacity:0}to{opacity:1}}
      @keyframes tsbAuthPop{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}
    `;
    document.head.appendChild(st);
  }

  function toast(msg, variant) {
    try { document.querySelectorAll(".tsb-auth-toast").forEach((t) => t.remove()); } catch {}
    const t = document.createElement("div");
    t.className = "tsb-auth-toast" + (variant === "welcome" ? " tsb-auth-toast--welcome" : "");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3600);
  }

  function showSaveModal() {
    if (!ENABLED || user()) return;
    try { if (lsGet(OFFER_KEY, false)) return; } catch {}
    injectStyles();
    const ov = document.createElement("div");
    ov.className = "tsb-auth-ov";
    ov.innerHTML = `
      <div class="tsb-auth-box" role="dialog" aria-label="Save your progress">
        <button class="tsb-auth-x" aria-label="Close">✕</button>
        <div style="font-size:44px">🔥</div>
        <h3>2 BOOKS DOWN!</h3>
        <p>Read on one device, finish on another? <b>Save your progress</b> — bookmarks, lessons and streaks, all synced. Free, 1 tap.</p>
        <div class="tsb-auth-chips"><span>📱 DEVICE SYNC</span><span>❤️ BOOKMARKS</span><span>🛡️ SAFE</span></div>
        <button class="tsb-auth-g" id="tsbAuthGoogle">
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          LOG IN WITH GOOGLE
        </button>
        <button class="tsb-auth-later" id="tsbAuthLater">Maybe later</button>
      </div>`;
    document.body.appendChild(ov);
    ov.querySelector(".tsb-auth-x").addEventListener("click", () => ov.remove());
    ov.querySelector("#tsbAuthLater").addEventListener("click", () => { lsSet(OFFER_KEY, true); ov.remove(); });
    ov.querySelector("#tsbAuthGoogle").addEventListener("click", () => { lsSet(OFFER_KEY, true); signIn("google"); });
  }

  /* count completed books (called by book.js on BOOK COMPLETE) */
  function onBookComplete(bookId) {
    if (!ENABLED) return;
    if (user()) { queueSync(); return; }
    let done = lsGet(DONE_KEY, []);
    if (!done.includes(bookId)) {
      done.push(bookId);
      lsSet(DONE_KEY, done);
    }
    if (done.length === 2) showSaveModal();
  }

  /* track any read/bookmark change for debounced cloud sync */
  function track() { if (ENABLED) queueSync(); }

  /* ---------------- display name (editable override) ---------------- */
  function displayName() {
    const u = user();
    if (!u) return "";
    const over = lsGet("tsb_display_name", "");
    if (over) return over;
    return (u.user_metadata && (u.user_metadata.name || u.user_metadata.full_name || u.user_metadata.user_name)) ||
           (u.email || "").split("@")[0] || "Reader";
  }
  function setDisplayName(nm) {
    nm = String(nm || "").trim().slice(0, 24);
    if (nm) lsSet("tsb_display_name", nm);
    renderNav(); renderChip();
    return nm;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------------- navbar login button / user chip (top-right slot) ---------------- */
  var GOOGLE_G = '<svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

  function renderNav() {
    const anchors = document.querySelectorAll("[data-nav-auth]");
    const chipSlot = document.getElementById("tsb-nav-auth");
    if (!anchors.length && !chipSlot) return;
    injectStyles();
    const u = user();
    /* flag on <html> so CSS can position the chip correctly on mobile */
    try { document.documentElement.classList.toggle("tsb-logged-in", !!u); } catch (e) {}
    /* legacy anchors (if any) are always hidden — login lives in the slot now */
    anchors.forEach((a) => { a.style.display = "none"; });
    /* top-right account slot: LOG IN button (out) or 👋 chip (in) */
    if (chipSlot) {
      if (u) {
        const nm = displayName();
        const first = nm.split(" ")[0].slice(0, 12);
        chipSlot.innerHTML = '<a class="tsb-navchip" href="login.html" title="' + escapeHtml(nm) + ' — account">👋 ' + escapeHtml(first) + '<i class="tsb-navuser__dot" aria-hidden="true"></i></a>';
      } else if (!/login\.html/.test(location.pathname)) {
        chipSlot.innerHTML = '<a class="tsb-loginbtn" href="login.html" title="Save your progress across devices">' + GOOGLE_G + '<span>LOG IN</span></a>';
        const btn = chipSlot.querySelector(".tsb-loginbtn");
        if (btn) btn.addEventListener("click", function () {
          try { sessionStorage.setItem("tsb_auth_return", location.pathname + location.search); } catch (e) {}
        });
      } else {
        chipSlot.innerHTML = "";
      }
    }
  }

  /* remember current page when user clicks a nav LOGIN link */
  function attachNavHandlers() {
    document.querySelectorAll("[data-nav-auth]").forEach((a) => {
      a.addEventListener("click", () => {
        if (!/login\.html/.test(location.pathname)) {
          try { sessionStorage.setItem("tsb_auth_return", location.pathname + location.search); } catch {}
        }
      });
    });
  }

  /* ---------------- logout with confirmation ---------------- */
  function confirmLogout() {
    injectStyles();
    const ov = document.createElement("div");
    ov.className = "tsb-auth-ov";
    ov.innerHTML = `
      <div class="tsb-auth-box" role="alertdialog" aria-label="Log out?">
        <button class="tsb-auth-x" aria-label="Close">✕</button>
        <div style="font-size:40px">🚪</div>
        <h3>LOG OUT?</h3>
        <p>Are you sure you want to log out? Your progress stays <b>safe</b> — just log back in with Google anytime.</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="tsb-auth-g" id="tsbLogoutYes" style="background:#ff4d4d;color:#fff;margin-bottom:0">YES, LOG OUT</button>
          <button class="tsb-auth-g" id="tsbLogoutNo" style="background:#fffdf5;color:#111;margin-bottom:0">CANCEL</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.querySelector(".tsb-auth-x").addEventListener("click", close);
    ov.querySelector("#tsbLogoutNo").addEventListener("click", close);
    ov.querySelector("#tsbLogoutYes").addEventListener("click", () => {
      close();
      signOut();
      renderChip();
      renderNav();
    });
  }

  /* ---------------- footer chip ---------------- */
  function renderChip() {
    const slot = document.getElementById("tsb-auth-slot");
    if (!slot) return;
    injectStyles();
    const u = user();
    if (u) {
      const nm = displayName();
      slot.innerHTML = `<button class="tsb-auth-chip tsb-auth-chip--in" id="tsbAuthChip" title="Progress synced across devices">👋 ${escapeHtml(nm.split(" ")[0])} · SYNCED ✅</button>
        <button class="tsb-auth-chip" id="tsbAuthOut" style="margin-left:8px;background:#ff4d4d;color:#fff">LOGOUT</button>`;
      slot.querySelector("#tsbAuthOut").addEventListener("click", confirmLogout);
    } else {
      slot.innerHTML = `<a class="tsb-auth-chip tsb-auth-chip--out" href="login.html" id="tsbAuthChip">${GOOGLE_G} LOG IN — SAVE PROGRESS</a>`;
      slot.querySelector("#tsbAuthChip").addEventListener("click", () => {
        try { sessionStorage.setItem("tsb_auth_return", location.pathname + location.search); } catch {}
      });
    }
  }

  /* ---------------- returning-user welcome ("Welcome back") ---------------- */
  function visitDay() { try { return new Date().toISOString().slice(0, 10); } catch (e) { return ""; } }
  function trackVisit() {
    if (!user()) return 0;
    const today = visitDay();
    if (!today) return 0;
    let v = lsGet("tsb_auth_visits", { d: "", n: 0 });
    if (v.d !== today) { v = { d: today, n: (v.n || 0) + 1 }; lsSet("tsb_auth_visits", v); }
    return v.n;
  }
  function welcomeBack() {
    if (!user()) return;
    const n = trackVisit();
    if (n < 2) return; // only returning users (2nd+ distinct day)
    // (toast removed — no more black popups)
  }

  /* ---------------- boot ---------------- */
  /* ---- common post-login steps (GIS popup or redirect callback) ---- */
  function afterLogin(showToastMsg) {
    /* logged-in users are returning users — never re-ask the onboarding */
    try { localStorage.setItem("tsb_onboarded", JSON.stringify(true)); } catch (e) {}
    try { sessionStorage.removeItem("tsb_onboarded_pending"); } catch (e2) {}
    renderNav();
    renderChip();
    try { window.dispatchEvent(new CustomEvent("tsb:loggedin")); } catch {}
    try { window.dispatchEvent(new CustomEvent("tsb:auth")); } catch {}
    if (showToastMsg) {
      setTimeout(() => {
        syncProgress().catch(() => {});
      }, 200);
    } else {
      syncProgress().catch(() => {});
    }
  }

  async function boot() {
    try {
      if (!ENABLED) {
        window.TSB_AUTH = { enabled: false };
        return;
      }
      const didCallback = await handleCallback();
      if (didCallback && user()) {
        // update UI IMMEDIATELY — never make the user wait on network sync
        afterLogin(true);
      }
      if (user() && session.expires_at && now() >= session.expires_at - 90) await refreshSession();
      renderNav();
      renderChip();
      attachNavHandlers();
      welcomeBack();
      try { window.addEventListener("tsb:sync", () => { renderChip(); renderNav(); }); } catch {}
      try { window.addEventListener("tsb:auth", () => { renderChip(); renderNav(); }); } catch {}
      window.TSB_AUTH = {
        enabled: true,
        user,
        signIn,
        signOut,
        confirmLogout,
        displayName,
        setDisplayName,
        syncProgress,
        queueSync,
        track,
        onBookComplete,
        renderNav,
        clientId: GCLIENT,
        visits: () => (user() ? lsGet("tsb_auth_visits", { d: "", n: 0 }).n : 0)
      };
      try { window.dispatchEvent(new CustomEvent("tsb:auth")); } catch {}
    } catch (e) {
      console.warn("TSB boot error:", e);
      // never leave the app without TSB_AUTH — degrade gracefully
      window.TSB_AUTH = window.TSB_AUTH || { enabled: !!ENABLED, user, signIn, signOut, confirmLogout, displayName, setDisplayName, syncProgress, queueSync, track, onBookComplete, renderNav, clientId: GCLIENT };
      try { window.dispatchEvent(new CustomEvent("tsb:auth")); } catch {}
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
