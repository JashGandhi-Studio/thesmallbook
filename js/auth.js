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
  const ENABLED = !!(URL && ANON);

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
    const verifier = genVerifier();
    try { sessionStorage.setItem("tsb_code_verifier", verifier); } catch {}
    sha256(verifier).then((challenge) => {
      // callback lands on login.html (beautiful welcome screen), then
      // routes back to tsb_auth_return. NO client_id param — GoTrue
      // substitutes the configured Google Client ID automatically.
      const redirectTo = location.origin + "/login.html";
      const params = new URLSearchParams({
        redirect_to: redirectTo,
        response_type: "code",
        provider: provider,
        flow_type: "pkce",
        code_challenge: challenge,
        code_challenge_method: "S256",
        scope: "openid email profile"
      });
      location.href = URL + "/auth/v1/authorize?" + params.toString();
    });
  }

  /* exchange ?code= for a session right after Google redirects back */
  async function handleCallback() {
    const p = new URLSearchParams(location.search);
    const code = p.get("code");
    if (!code) return false;
    const verifier = uid();
    let ret = "";
    try { ret = sessionStorage.getItem("tsb_auth_return") || location.pathname; } catch {}
    try { sessionStorage.removeItem("tsb_code_verifier"); } catch {}
    try {
      const res = await fetch(URL + "/auth/v1/token?grant_type=pkce", {
        method: "POST",
        headers: { "apikey": ANON, "Content-Type": "application/json" },
        body: JSON.stringify({ auth_code: code, code_verifier: verifier || "" })
      });
      if (!res.ok) throw new Error("exchange " + res.status);
      session = await res.json();
      lsSet(AUTH_KEY, session);
      history.replaceState({}, "", ret);
      try { sessionStorage.removeItem("tsb_auth_return"); } catch {}
      return true;
    } catch (e) {
      console.warn("TSB auth callback failed:", e);
      try { history.replaceState({}, "", ret || location.pathname); } catch {}
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
    await Promise.all(tasks);
    return pushed > 0;
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
      .tsb-auth-chip--out{background:#4d7cff;color:#111}
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
        <p>Laptop pe padha, phone pe khatam? <b>Progress save karo</b> — bookmarks, lessons, streaks, sab sync. Free, 1 tap.</p>
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

  /* ---------------- navbar login button ---------------- */
  function renderNav() {
    const links = document.querySelectorAll("[data-nav-auth]");
    if (!links.length) return;
    injectStyles();
    const u = user();
    links.forEach((a) => {
      if (u) {
        const n = (u.user_metadata && (u.user_metadata.name || u.user_metadata.full_name)) || u.email || "Reader";
        const short = n.split(" ")[0].slice(0, 12);
        a.innerHTML = `👋 ${short}<i class="tsb-navuser__dot" title="Progress synced"></i>`;
        a.classList.add("tsb-navuser--in");
        a.classList.remove("tsb-navuser--login");
        a.setAttribute("title", short + " — tap for account");
      } else {
        a.textContent = "🔐 LOGIN";
        a.classList.add("tsb-navuser--login");
        a.classList.remove("tsb-navuser--in");
        a.setAttribute("title", "Save your progress across devices");
      }
    });
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

  /* ---------------- footer chip ---------------- */
  function renderChip() {
    const slot = document.getElementById("tsb-auth-slot");
    if (!slot) return;
    injectStyles();
    const u = user();
    if (u) {
      const name = (u.user_metadata && (u.user_metadata.name || u.user_metadata.full_name)) || u.email || "reader";
      slot.innerHTML = `<button class="tsb-auth-chip tsb-auth-chip--in" id="tsbAuthChip" title="Progress synced across devices">👋 ${name.split(" ")[0]} · SYNCED ✅</button>
        <button class="tsb-auth-chip" id="tsbAuthOut" style="margin-left:8px;background:#ff4d4d;color:#fff">LOGOUT</button>`;
      slot.querySelector("#tsbAuthOut").addEventListener("click", () => { signOut(); renderChip(); renderNav(); });
    } else {
      slot.innerHTML = `<a class="tsb-auth-chip tsb-auth-chip--out" href="login.html" id="tsbAuthChip">🔐 LOGIN — SAVE PROGRESS</a>`;
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
    const u = user();
    const nm = (u.user_metadata && (u.user_metadata.name || u.user_metadata.full_name)) || u.email || "Reader";
    const first = nm.split(" ")[0];
    toast("👋 Welcome back, " + first + "!", "welcome");
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    if (!ENABLED) {
      window.TSB_AUTH = { enabled: false };
      return;
    }
    const didCallback = await handleCallback();
    if (didCallback && user()) {
      // update UI IMMEDIATELY — never make the user wait on network sync
      renderNav();
      renderChip();
      try { window.dispatchEvent(new CustomEvent("tsb:loggedin")); } catch {}
      try { window.dispatchEvent(new CustomEvent("tsb:auth")); } catch {}
      // now sync in the background
      await syncProgress();
      injectStyles();
      toast("PROGRESS SYNCED ✅");
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
      syncProgress,
      queueSync,
      track,
      onBookComplete,
      renderNav,
      visits: () => (user() ? lsGet("tsb_auth_visits", { d: "", n: 0 }).n : 0)
    };
    try { window.dispatchEvent(new CustomEvent("tsb:auth")); } catch {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
