/* ============================================================
   THESMALLBOOK — 🎯 FIRST-VISIT ONBOARDING (onboard.js)
   3 quick questions (not a paywall):
     1. Pick what you're here for  → filters the shelf
     2. Pick how you read          → saved as preference
     3. Save your progress?        → sign-in CTA (login.html)
   Runs ONCE (localStorage tsb_onboarded). Skips for returning users.
   ============================================================ */
(function () {
  var GOAL_MAP = {
    "self":    { label: "Self-Improvement", emoji: "🧠" },
    "money":   { label: "Money & Finance",  emoji: "💰" },
    "business":{ label: "Business & Startups", emoji: "🚀" },
    "people":  { label: "Psychology & People", emoji: "❤️" },
    "creativity": { label: "Creativity",    emoji: "🎨" },
    "productivity": { label: "Productivity", emoji: "⚡" },
    "power":   { label: "Power & Strategy", emoji: "🏛️" }
  };

  /* storage that never dies: localStorage → sessionStorage → in-memory.
     (sandboxed previews / private mode block localStorage — without this
     fallback the onboarding would re-ask on every single page load) */
  var memStore = {};
  function get(key, def) {
    try {
      var v = JSON.parse(localStorage.getItem(key));
      return v === null || v === undefined ? def : v;
    } catch (e) {}
    try {
      var v2 = JSON.parse(sessionStorage.getItem(key));
      return v2 === null || v2 === undefined ? def : v2;
    } catch (e2) {}
    return key in memStore ? memStore[key] : def;
  }
  function set(key, val) {
    memStore[key] = val;
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    try { sessionStorage.setItem(key, JSON.stringify(val)); } catch (e2) {}
  }

  function shouldShow() {
    /* returning from the login CTA inside onboarding → never re-ask */
    try { if (sessionStorage.getItem("tsb_onboarded_pending")) { set("tsb_onboarded", true); sessionStorage.removeItem("tsb_onboarded_pending"); } } catch (e) {}
    if (get("tsb_onboarded", false)) return false;
    // logged-in users are returning users — never interrupt them
    try { if (window.TSB_AUTH && TSB_AUTH.user && TSB_AUTH.user()) return false; } catch (e) {}
    // only on the main app pages, not 404
    if (/404\.html|login\.html|story\.html/.test(location.pathname)) return false;
    // don't interrupt right after a Google callback
    if (/[?&]code=/.test(location.search)) return false;
    return true;
  }

  var GOALS = [
    { id: "self", emoji: "🧠", label: "Self-improvement" },
    { id: "money", emoji: "💰", label: "Money" },
    { id: "business", emoji: "🚀", label: "Business" },
    { id: "people", emoji: "❤️", label: "People" },
    { id: "creativity", emoji: "🎨", label: "Creativity" },
    { id: "productivity", emoji: "⚡", label: "Productivity" },
    { id: "power", emoji: "🏛️", label: "Power" }
  ];
  var STYLES = [
    { id: "quick", emoji: "⚡", label: "5-min reads", desc: "Big idea + top lessons, fast" },
    { id: "full", emoji: "📖", label: "Full lessons", desc: "Every lesson, example & action step" },
    { id: "audio", emoji: "🎧", label: "Audio", desc: "Listen to the whole book like a podcast" }
  ];

  var TIMES = [
    { id: "5",  emoji: "⚡", label: "5 minutes a day",  desc: "Quick daily lesson — busy schedule" },
    { id: "15", emoji: "⏰", label: "15 minutes a day", desc: "One full lesson + example" },
    { id: "30", emoji: "🧘", label: "30+ minutes a day", desc: "Deep dives & full chapters" }
  ];

  var state = { goal: null, style: null, time: null };

  function css() {
    if (document.getElementById("tsb-onboard-style")) return;
    var st = document.createElement("style");
    st.id = "tsb-onboard-style";
    st.textContent = `
      .ob-ov{position:fixed;inset:0;background:rgba(17,17,17,.6);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px;animation:obFade .25s ease}
      .ob-box{background:#fffdf5;border:4px solid #111;box-shadow:10px 10px 0 #ffc800;max-width:440px;width:100%;padding:26px 22px;position:relative;animation:obPop .3s cubic-bezier(.2,1.4,.4,1);max-height:92vh;overflow:auto}
      .ob-box h3{font-family:"Archivo Black",sans-serif;font-size:20px;margin:4px 0 4px;letter-spacing:.3px}
      .ob-box .ob-sub{font-size:13px;color:#666;margin-bottom:16px}
      .ob-goals{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .ob-goals button,.ob-styles button{display:flex;align-items:center;gap:8px;border:3px solid #111;background:#fffdf5;box-shadow:3px 3px 0 #111;font-family:"Space Grotesk",sans-serif;font-weight:700;font-size:13px;padding:11px 10px;cursor:pointer;text-align:left;color:#111;transition:transform .1s,box-shadow .1s}
      .ob-goals button:hover,.ob-styles button:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 #111}
      .ob-goals button.sel,.ob-styles button.sel{background:#ffc800;transform:translate(-1px,-1px);box-shadow:5px 5px 0 #111}
      .ob-styles{display:flex;flex-direction:column;gap:8px}
      .ob-styles button{width:100%}
      .ob-styles button small{display:block;font-weight:400;font-size:11px;color:#666}
      .ob-next{margin-top:16px;width:100%;border:3px solid #111;background:#00c48c;color:#111;font-family:"Archivo Black",sans-serif;font-size:13px;letter-spacing:1.5px;padding:13px 10px;cursor:pointer;box-shadow:4px 4px 0 #111}
      .ob-next:disabled{opacity:.45;cursor:not-allowed}
      .ob-next:hover:not(:disabled){transform:translate(-1px,-1px);box-shadow:6px 6px 0 #111}
      .ob-skip{background:none;border:none;text-decoration:underline;font-size:12px;color:#888;cursor:pointer;margin-top:10px;display:block;margin-left:auto;margin-right:auto}
      .ob-dots{display:flex;gap:6px;justify-content:center;margin-bottom:12px}
      .ob-dots i{width:10px;height:10px;border:2px solid #111;border-radius:50%;background:#fff}
      .ob-dots i.on{background:#ffc800}
      .ob-signin{display:flex;gap:10px;flex-direction:column;margin-top:4px}
      .ob-signin .g{border:3px solid #111;background:#fff;color:#111;box-shadow:4px 4px 0 #111;font-family:"Archivo Black",sans-serif;font-size:13px;padding:13px 10px;cursor:pointer;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px}
      .ob-signin .g:hover{transform:translate(-1px,-1px);box-shadow:6px 6px 0 #111}
      .ob-signin .skip2{border:3px solid #111;background:#fffdf5;font-family:"Archivo Black",sans-serif;font-size:12px;letter-spacing:1px;padding:12px 10px;cursor:pointer;color:#111;box-shadow:3px 3px 0 #111}
      @keyframes obFade{from{opacity:0}to{opacity:1}}
      @keyframes obPop{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}
    `;
    document.head.appendChild(st);
  }

  function finish(skipSignIn) {
    set("tsb_onboarded", true);
    set("tsb_prefs", { goal: state.goal, style: state.style, time: state.time || "15", ts: Date.now() });
    var ov = document.getElementById("tsb-onboard-ov");
    if (ov) ov.remove();
    // apply the category filter on the library shelf (if chips exist)
    try {
      var goalInfo = GOAL_MAP[state.goal];
      if (goalInfo) {
        var chips = document.querySelectorAll(".chip");
        var target = null;
        chips.forEach(function (c) {
          if (c.textContent.trim() === goalInfo.label) target = c;
        });
        if (target) {
          target.click();
          setTimeout(function () {
            try { document.getElementById("library") && document.getElementById("library").scrollIntoView({ behavior: "smooth" }); } catch (e) {}
          }, 150);
        }
      }
    } catch (e) {}
    /* (welcome toast removed — no more black boxes) */
  }

  function renderSlide(n) {
    var box = document.getElementById("obBox");
    if (!box) return;
    var dots = "";
    for (var i = 0; i < 4; i++) dots += "<i class='" + (i === n ? "on" : "") + "'></i>";
    if (n === 0) {
      box.innerHTML =
        '<div class="ob-dots">' + dots + '</div>' +
        '<div style="font-size:34px">🎯</div>' +
        '<h3>WHAT BRINGS YOU HERE?</h3>' +
        '<p class="ob-sub">Pick one — we\'ll build your shelf around it.</p>' +
        '<div class="ob-goals">' + GOALS.map(function (g) {
          return '<button data-g="' + g.id + '" class="' + (state.goal === g.id ? "sel" : "") + '">' + g.emoji + ' ' + g.label + '</button>';
        }).join("") + '</div>' +
        '<button class="ob-next" id="obNext" ' + (state.goal ? "" : "disabled") + '>CONTINUE →</button>' +
        '<button class="ob-skip" id="obSkip">Skip — show me everything</button>';
      box.querySelectorAll("[data-g]").forEach(function (b) {
        b.addEventListener("click", function () {
          state.goal = b.dataset.g;
          box.querySelectorAll("[data-g]").forEach(function (x) { x.classList.remove("sel"); });
          b.classList.add("sel");
          var nx = document.getElementById("obNext");
          if (nx) nx.disabled = false;
        });
      });
      document.getElementById("obNext").addEventListener("click", function () { renderSlide(1); });
      document.getElementById("obSkip").addEventListener("click", function () { finish(true); });
    } else if (n === 1) {
      box.innerHTML =
        '<div class="ob-dots">' + dots + '</div>' +
        '<div style="font-size:34px">📖</div>' +
        '<h3>HOW DO YOU READ?</h3>' +
        '<p class="ob-sub">We\'ll surface the right books first.</p>' +
        '<div class="ob-styles">' + STYLES.map(function (s) {
          return '<button data-s="' + s.id + '" class="' + (state.style === s.id ? "sel" : "") + '">' + s.emoji + ' ' + s.label + '<small>' + s.desc + '</small></button>';
        }).join("") + '</div>' +
        '<button class="ob-next" id="obNext" ' + (state.style ? "" : "disabled") + '>CONTINUE →</button>' +
        '<button class="ob-skip" id="obSkip">Skip for now</button>';
      box.querySelectorAll("[data-s]").forEach(function (b) {
        b.addEventListener("click", function () {
          state.style = b.dataset.s;
          box.querySelectorAll("[data-s]").forEach(function (x) { x.classList.remove("sel"); });
          b.classList.add("sel");
          var nx = document.getElementById("obNext");
          if (nx) nx.disabled = false;
        });
      });
      document.getElementById("obNext").addEventListener("click", function () { renderSlide(2); });
      document.getElementById("obSkip").addEventListener("click", function () { state.style = state.style || "quick"; renderSlide(2); });
    } else if (n === 2) {
      box.innerHTML =
        '<div class="ob-dots">' + dots + '</div>' +
        '<div style="font-size:34px">⏰</div>' +
        '<h3>HOW MUCH TIME DO YOU HAVE?</h3>' +
        '<p class="ob-sub">We\'ll match the lesson length to your day.</p>' +
        '<div class="ob-styles">' + TIMES.map(function (t) {
          return '<button data-t="' + t.id + '" class="' + (state.time === t.id ? "sel" : "") + '">' + t.emoji + ' ' + t.label + '<small>' + t.desc + '</small></button>';
        }).join("") + '</div>' +
        '<button class="ob-next" id="obNext" ' + (state.time ? "" : "disabled") + '>CONTINUE →</button>' +
        '<button class="ob-skip" id="obSkip">Skip for now</button>';
      box.querySelectorAll("[data-t]").forEach(function (b) {
        b.addEventListener("click", function () {
          state.time = b.dataset.t;
          box.querySelectorAll("[data-t]").forEach(function (x) { x.classList.remove("sel"); });
          b.classList.add("sel");
          var nx = document.getElementById("obNext");
          if (nx) nx.disabled = false;
        });
      });
      document.getElementById("obNext").addEventListener("click", function () { renderSlide(3); });
      document.getElementById("obSkip").addEventListener("click", function () { state.time = state.time || "15"; finish(true); });
    } else {
      /* the 3 questions are answered — the sign-in slide is just a CTA.
         Mark done NOW so even leaving via LOG IN never re-triggers it. */
      set("tsb_onboarded", true);
      set("tsb_prefs", { goal: state.goal, style: state.style, time: state.time || "15", ts: Date.now() });
      box.innerHTML =
        '<div class="ob-dots">' + dots + '</div>' +
        '<div style="font-size:34px">🔐</div>' +
        '<h3>ONE MORE THING…</h3>' +
        '<p class="ob-sub">Save your progress so it follows you to every device — free, 1 tap, no password.</p>' +
        '<div class="ob-signin">' +
        '<a class="g" href="login.html">🔐 LOG IN WITH GOOGLE — SAVE PROGRESS</a>' +
        '<button class="skip2" id="obNo">SKIP — START READING</button>' +
        '</div>';
      document.getElementById("obNo").addEventListener("click", function () { finish(true); });
      // if user logs in from here, mark onboarded so it never shows again after return
      try { sessionStorage.setItem("tsb_onboarded_pending", "1"); } catch (e) {}
    }
  }

  function boot() {
    if (!shouldShow()) return;
    // wait for the page's own UI to settle a little
    setTimeout(function () {
      css();
      var ov = document.createElement("div");
      ov.className = "ob-ov";
      ov.id = "tsb-onboard-ov";
      ov.innerHTML = '<div class="ob-box" id="obBox" role="dialog" aria-label="Welcome"></div>';
      document.body.appendChild(ov);
      renderSlide(0);
    }, 900);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.TSB_ONBOARD = {
    done: function () { return get("tsb_onboarded", false); },
    prefs: function () { return get("tsb_prefs", null); },
    markDone: function () { set("tsb_onboarded", true); }
  };
})();
