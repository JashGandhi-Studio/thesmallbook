/* ✋ THE SMALL SCROLLER (v293) - hands-free reading.
   One module, one job: scroll and tap any page with your hand.
   Open palm flick up = page scrolls down. Fist you release = page scrolls up.
   Pinch = a soft cursor appears, release over a button or link to tap it.

   Everything runs on the device: the camera feed never leaves the phone,
   nothing records, nothing uploads. The hand engine (MediaPipe HandLandmarker,
   free and keyless) is fetched once on first use and cached by the browser.
   No accounts, no keys, no servers of ours in the middle. */
(function () {
  if (window.TSB_SCROLLER) return;

  /* ---------- config ---------- */
  var ENGINE_JS = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
  var ENGINE_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
  var STORE_KEY = "tsb_scroller";
  var FLICK_V = 1.15;          /* palm speed (screen heights per second) for a flick */
  var OPEN_R = 1.32;           /* avg fingertip distance / hand size: open palm */
  var PINCH_ON = 0.5;          /* thumb-index distance / hand size */
  var PINCH_OFF = 0.68;        /* hysteresis so the cursor does not flicker */
  var BECK_CURL = 1.14;        /* fingertip height while the fingers curl in */
  var BECK_MS = 650, BECK_BACK_MS = 750, BECK_MAX_MS = 1500;
  var BECK_DRIFT = 0.10;       /* the palm stays put while the fingers do the work */
  var RANGE_MIN = 0.13, RANGE_MAX = 0.58;  /* hand size vs frame: the sweet zone */
  var COOLDOWN_FLICK = 750, COOLDOWN_CYCLE = 500, COOLDOWN_TAP = 700;

  /* ---------- state ---------- */
  function cfg() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function save(c) { try { localStorage.setItem(STORE_KEY, JSON.stringify(c)); } catch (e) {} }
  function enabled() { return !!cfg().on; }

  var session = null;   /* live session object when running */

  /* ---------- tiny dom helpers ---------- */
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

  function support() {
    var ok1 = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    return ok1 && (window.isSecureContext !== false);
  }

  /* ---------- the hand engine, fetched once, cached forever ---------- */
  var enginePromise = null;
  function engine() {
    if (enginePromise) return enginePromise;
    enginePromise = (async function () {
      var mod = await import(/* webpackIgnore: true */ ENGINE_JS);
      var files = await mod.FilesetResolver.forVisionTasks(ENGINE_JS + "/wasm");
      var lm = await mod.HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: ENGINE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.55
      });
      return lm;
    })().catch(function (err) { enginePromise = null; throw err; });
    return enginePromise;
  }

  /* ---------- the overlay: camera behind, skeleton in front ---------- */
  function buildOverlay() {
    var root = el("div", "tss-root");
    root.id = "tss-root";
    root.innerHTML =
      '<video class="tss-video" id="tss-video" playsinline muted autoplay></video>' +
      '<canvas class="tss-canvas" id="tss-canvas"></canvas>' +
      '<div class="tss-reticle" id="tss-reticle">' +
        '<svg viewBox="0 0 100 100"><circle class="tss-ring__bg" cx="50" cy="50" r="46"/><circle class="tss-ring" id="tss-ring" cx="50" cy="50" r="46"/></svg>' +
        '<i></i>' +
      '</div>' +
      '<div class="tss-pill" id="tss-pill"><span class="tss-pill__dot"></span><span id="tss-pilltxt">Checking your hands</span></div>' +
      '<div class="tss-cursor" id="tss-cursor"><i></i></div>' +
      '<div class="tss-topbar">' +
        '<button class="tss-btn" id="tss-stop" aria-label="Stop hands-free">✕</button>' +
        '<button class="tss-btn" id="tss-flip" aria-label="Flip camera">🔄</button>' +
      "</div>" +
      '<div class="tss-legend" id="tss-legend">' +
        '<button class="tss-legend__item" id="tss-again">✋ flick up = down · 🤙 beckon = up · 🤏 pinch = tap</button>' +
      "</div>";
    document.body.appendChild(root);
    return root;
  }

  /* the gesture flash: a glyph pops right where the palm is */
  function flash(s, glyph) {
    if (!s || !s.root) return;
    s.root.classList.add("tss-root--hit");
    setTimeout(function () { if (s.root) s.root.classList.remove("tss-root--hit"); }, 240);
    var f = s.root.querySelector(".tss-flash");
    if (!f) {
      f = document.createElement("div");
      f.className = "tss-flash";
      s.root.appendChild(f);
    }
    var p = s.lastPt || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    f.style.left = p.x + "px";
    f.style.top = p.y + "px";
    f.textContent = glyph;
    f.classList.remove("tss-flash--go");
    void f.offsetWidth;
    f.classList.add("tss-flash--go");
  }

  function pill(root, txt, kind) {
    var p = root.querySelector("#tss-pill"), t = root.querySelector("#tss-pilltxt");
    p.classList.remove("tss-pill--ok", "tss-pill--warn");
    if (kind) p.classList.add("tss-pill--" + kind);
    t.textContent = txt;
  }

  /* ---------- the tutorial, animated, replayable any time ---------- */
  var tutRoot = null;
  function showTutorial(onDone) {
    if (tutRoot) return;
    tutRoot = el("div", "tss-tut");
    tutRoot.innerHTML =
      '<div class="tss-tut__sheet">' +
        '<div class="tss-tut__head"><span>✋ THE SMALL SCROLLER</span><button id="tss-tutx" aria-label="Close">✕</button></div>' +
        '<div class="tss-tut__slides" id="tss-slides">' +

          '<div class="tss-step is-on" data-step="0">' +
            '<div class="tss-demo tss-demo--flick">' +
              '<svg viewBox="0 0 120 120" aria-hidden="true">' +
                '<g class="tss-hand tss-hand--open">' +
                  '<rect x="48" y="52" width="26" height="34" rx="10"/>' +
                  '<rect x="47" y="24" width="8" height="30" rx="4"/>' +
                  '<rect x="57" y="16" width="8" height="38" rx="4"/>' +
                  '<rect x="67" y="20" width="8" height="34" rx="4"/>' +
                  '<rect x="77" y="28" width="7" height="28" rx="3.5"/>' +
                  '<rect x="38" y="58" width="10" height="22" rx="5" transform="rotate(18 43 69)"/>' +
                '</g>' +
                '<g class="tss-arrows tss-arrows--up">' +
                  '<path d="M60 66 L60 18 M52 27 L60 18 L68 27" fill="none"/>' +
                '</g>' +
              '</svg>' +
            '</div>' +
            '<h3>Flick up to go down</h3>' +
            '<p>Hold your open palm facing the phone, then flick it up. The page scrolls down toward your latest, one comfortable step per flick.</p>' +
          '</div>' +

          '<div class="tss-step" data-step="1">' +
            '<div class="tss-demo tss-demo--fist">' +
              '<svg viewBox="0 0 120 120" aria-hidden="true">' +
                '<rect x="42" y="56" width="38" height="34" rx="12"/>' +
                '<g class="tss-hand--curl">' +
                  '<rect x="43" y="26" width="8" height="34" rx="4"/>' +
                  '<rect x="53" y="20" width="8" height="40" rx="4"/>' +
                  '<rect x="63" y="24" width="8" height="36" rx="4"/>' +
                  '<rect x="73" y="30" width="7" height="30" rx="3.5"/>' +
                '</g>' +
                '<g class="tss-arrows tss-arrows--down">' +
                  '<path d="M84 22 C 98 40, 98 66, 84 84 M76 76 L84 84 L92 76" fill="none"/>' +
                '</g>' +
              '</svg>' +
            '</div>' +
            '<h3>Beckon it back up</h3>' +
            '<p>Hold your palm facing the phone and curl your fingers down, like you are calling someone over. Let them spring back. Curl and release, and the page climbs back up to earlier.</p>' +
          '</div>' +

          '<div class="tss-step" data-step="2">' +
            '<div class="tss-demo tss-demo--pinch">' +
              '<svg viewBox="0 0 120 120" aria-hidden="true">' +
                '<g class="tss-pinch-a"><rect x="34" y="46" width="34" height="9" rx="4.5" transform="rotate(18 51 50)"/></g>' +
                '<g class="tss-pinch-b"><rect x="52" y="46" width="34" height="9" rx="4.5" transform="rotate(-18 69 50)"/></g>' +
                '<circle class="tss-halo" cx="61" cy="60" r="14"/>' +
              '</svg>' +
            '</div>' +
            '<h3>Pinch the air to tap</h3>' +
            '<p>Pinch your thumb and index finger together and a soft cursor appears where you point. Release the pinch over any button, chip or link to press it.</p>' +
          '</div>' +

          '<div class="tss-step" data-step="3">' +
            '<div class="tss-demo tss-demo--lock">' +
              '<svg viewBox="0 0 120 120" aria-hidden="true">' +
                '<rect x="38" y="52" width="44" height="34" rx="10"/>' +
                '<path d="M48 52 v-8 a12 12 0 0 1 24 0 v8" fill="none"/>' +
                '<circle cx="60" cy="68" r="5"/>' +
              '</svg>' +
            '</div>' +
            '<h3>Your camera stays yours</h3>' +
            '<p>The hand is read on your phone, frame by frame. Nothing is saved, nothing is sent anywhere. Close it any time with the ✕ or by leaving the page.</p>' +
          '</div>' +

        '</div>' +
        '<div class="tss-tut__dots" id="tss-dots">' +
          "<i class=\"on\"></i><i></i><i></i><i></i>" +
        "</div>" +
        '<div class="tss-tut__row">' +
          '<button class="tss-tut__ghost" id="tss-skip">Maybe later</button>' +
          '<button class="tss-tut__go" id="tss-go">START HANDS-FREE →</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(tutRoot);
    var step = 0, STEPS = 4;
    var go = tutRoot.querySelector("#tss-go");
    function paint() {
      tutRoot.querySelectorAll(".tss-step").forEach(function (s) { s.classList.toggle("is-on", Number(s.dataset.step) === step); });
      tutRoot.querySelectorAll("#tss-dots i").forEach(function (d, i) { d.classList.toggle("on", i === step); });
      go.textContent = step === STEPS - 1 ? "START HANDS-FREE →" : "NEXT →";
    }
    function close(start) {
      tutRoot.remove(); tutRoot = null;
      var c = cfg(); c.tut = 1; save(c);
      if (start && onDone) onDone();
    }
    go.addEventListener("click", function () { if (step < STEPS - 1) { step++; paint(); } else close(true); });
    tutRoot.querySelector("#tss-skip").addEventListener("click", function () { close(step === STEPS - 1); });
    tutRoot.querySelector("#tss-tutx").addEventListener("click", function () { close(false); });
  }

  /* ---------- the session: camera, engine, gestures ---------- */
  function stop() {
    if (!session) return;
    var s = session; session = null;
    try { s.raf && cancelAnimationFrame(s.raf); } catch (e) {}
    try { s.stream && s.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    try { s.landmarker && s.landmarker.close(); } catch (e) {}
    if (s.root && s.root.parentNode) s.root.remove();
    document.documentElement.classList.remove("tss-lock");
    refreshLaunch();
  }

  async function start(opts) {
    opts = opts || {};
    if (session) return;
    if (!support()) { alert("Hands-free scrolling needs a camera and a secure (https) page. This browser cannot open the camera."); return; }
    var c = cfg();
    if (!c.tut && !opts.skipTutorial) { showTutorial(function () { start({ skipTutorial: true }); }); return; }

    var root = buildOverlay();
    document.documentElement.classList.add("tss-lock");
    var video = root.querySelector("#tss-video");
    var canvas = root.querySelector("#tss-canvas");
    var ctx = canvas.getContext("2d");
    var cursor = root.querySelector("#tss-cursor");
    session = { root: root, video: video, canvas: canvas, ctx: ctx, cursor: cursor, facing: opts.facing || "user", cal: 0, last: {} };
    session.reticle = root.querySelector("#tss-reticle");
    session.ring = root.querySelector("#tss-ring");
    session.lastPt = null;

    pill(root, "Warming the camera");
    var stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: session.facing, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    } catch (err) {
      stop();
      alert(err && err.name === "NotAllowedError"
        ? "Camera permission was denied. Allow it for this site in your browser settings, then flip the toggle again."
        : "No usable camera was found on this device.");
      return;
    }
    session.stream = stream;
    video.srcObject = stream;
    try { await video.play(); } catch (e) {}

    pill(root, "Fetching the hand engine, one time only");
    try { session.landmarker = await engine(); } catch (e) {
      stop();
      alert("The hand engine could not be fetched. Check the internet once, it gets cached after the first load.");
      return;
    }

    pill(root, "Checking your hands");
    vibrate(20);
    session.lastT = 0;
    session.prev = null;
    session.beck = 0;           /* beckon state: 0 idle, 1 palm armed, 2 fingers curled */
    session.beckT = 0;
    session.beckCy = 0;
    session.openE = null;       /* smoothed openness */
    session.miss = 0;
    session.trail = [];
    session.pinched = false;
    session.coolScroll = 0, session.coolCycle = 0, session.coolTap = 0;
    session.hintT = 0;
    session.scanned = false;

    root.querySelector("#tss-stop").addEventListener("click", function () { stop(); });
    root.querySelector("#tss-flip").addEventListener("click", function () {
      var f = session.facing === "user" ? "environment" : "user";
      stop(); start({ facing: f, skipTutorial: true });
    });
    root.querySelector("#tss-again").addEventListener("click", function () { showTutorial(null); });
    document.addEventListener("visibilitychange", onHidden);

    var loop = function (t) {
      if (!session) return;
      session.raf = requestAnimationFrame(loop);
      if (t - session.lastT < 50) return;         /* ~20 fps is plenty and saves battery */
      var dt = Math.min((t - session.lastT) / 1000, 0.2) || 0.06;
      session.lastT = t;
      var lm = session.landmarker, v = session.video;
      if (!lm || v.readyState < 2) return;
      var res;
      try { res = lm.detectForVideo(v, t); } catch (e) { return; }
      draw(session, res, t);
      think(session, res, t, dt);
    };
    session.raf = requestAnimationFrame(loop);
    refreshLaunch();
  }

  function onHidden() { if (document.hidden) stop(); }

  /* skeleton on canvas, mirrored for the front camera just like the preview */
  var BONES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
  function mapPt(s, p) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var x = s.facing === "user" ? (1 - p.x) : p.x;
    return { x: x * vw, y: p.y * vh };
  }
  function draw(s, res, t) {
    var vw = window.innerWidth, vh = window.innerHeight;
    if (s.canvas.width !== vw || s.canvas.height !== vh) { s.canvas.width = vw; s.canvas.height = vh; }
    s.ctx.clearRect(0, 0, vw, vh);
    /* the motion trail: fading echoes behind a fast hand */
    var yel2 = getComputedStyle(document.documentElement).getPropertyValue("--yellow").trim() || "#ffc800";
    while (s.trail.length && t - s.trail[0].t > 340) s.trail.shift();
    s.trail.forEach(function (p) {
      var age = (t - p.t) / 340;
      s.ctx.globalAlpha = (1 - age) * 0.5;
      s.ctx.fillStyle = yel2;
      s.ctx.beginPath();
      s.ctx.arc(p.x, p.y, 7 + age * 22, 0, Math.PI * 2);
      s.ctx.fill();
    });
    s.ctx.globalAlpha = 1;
    var pts = res && res.landmarks && res.landmarks[0];
    if (!pts) return;
    var ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#14110c";
    var yel = getComputedStyle(document.documentElement).getPropertyValue("--yellow").trim() || "#ffc800";
    s.ctx.lineWidth = 4; s.ctx.strokeStyle = ink; s.ctx.fillStyle = yel;
    BONES.forEach(function (b) {
      var a = mapPt(s, pts[b[0]]), c = mapPt(s, pts[b[1]]);
      s.ctx.beginPath(); s.ctx.moveTo(a.x, a.y); s.ctx.lineTo(c.x, c.y); s.ctx.stroke();
    });
    pts.forEach(function (p) {
      var q = mapPt(s, p);
      s.ctx.beginPath(); s.ctx.arc(q.x, q.y, 6, 0, Math.PI * 2); s.ctx.fill();
      s.ctx.lineWidth = 2.5; s.ctx.stroke(); s.ctx.lineWidth = 4;
    });
  }

  /* the brain: calibration, range guard, then the three gestures */
  function think(s, res, t, dt) {
    var hand = res && res.landmarks && res.landmarks[0];
    var score = (res && res.handednesses && res.handednesses[0] && res.handednesses[0][0] && res.handednesses[0][0].score) || 0;
    if (!hand || score < 0.5) {
      /* dropout tolerance: hold the current gesture state through a few lost frames */
      s.miss++;
      if (s.miss > 12) { s.beck = 0; s.openE = null; s.trail.length = 0; }
      if (s.scanned && s.miss > 8) pill(s.root, "Show your hand to the camera");
      return;
    }
    s.miss = 0;
    var wrist = hand[0], mcp = hand[9];
    var scale = Math.max(dist(wrist, mcp), 0.0001);
    var cx = (hand[0].x + hand[9].x) / 2, cy = (hand[0].y + hand[9].y) / 2;
    s.lastPt = mapPt(s, mcp);

    /* calibration: a steady hand for about two seconds locks the scan.
       the reticle rides the palm and the ring fills as the scan locks in. */
    if (!s.scanned) {
      s.cal += dt;
      s.reticle.style.display = "block";
      s.reticle.style.left = s.lastPt.x + "px";
      s.reticle.style.top = s.lastPt.y + "px";
      s.ring.style.strokeDashoffset = Math.max(289 * (1 - Math.min(s.cal / 1.6, 1)), 0);
      if (s.cal > 1.6) {
        s.scanned = true;
        s.reticle.classList.add("tss-reticle--ok");
        setTimeout(function () { if (session === s) s.reticle.style.display = "none"; }, 700);
        pill(s.root, "✋ Hand scanned, you are good to go", "ok");
        vibrate([18, 60, 18]);
        try { if (window.TSB && TSB.achv) TSB.achv.award("scroller-1"); } catch (e) {}
        setTimeout(function () { if (session === s) pill(s.root, "Hands-free is live"); }, 2200);
      }
      return;
    }
    /* keep a short echo behind a fast hand */
    if (s.prev && Math.abs((cy - s.prev.y) / Math.max(dt, 0.02)) > 0.9) {
      s.trail.push({ x: s.lastPt.x, y: s.lastPt.y, t: t });
      if (s.trail.length > 10) s.trail.shift();
    }

    /* range guard: the sweet zone, past it we say so instead of misfiring */
    if (scale < RANGE_MIN || scale > RANGE_MAX) {
      if (t - s.hintT > 2600) {
        s.hintT = t;
        pill(s.root, scale < RANGE_MIN ? "Bring your hand a little closer" : "Move your hand back a bit", "warn");
      }
    }

    /* openness: average fingertip distance from wrist, scaled by the hand,
       smoothed so a trembling hand never flickers the states */
    var tips = [8, 12, 16, 20], acc = 0;
    tips.forEach(function (i) { acc += dist(hand[i], wrist); });
    var rawOpen = acc / tips.length / scale;
    s.openE = s.openE === null ? rawOpen : s.openE * 0.65 + rawOpen * 0.35;
    var openness = s.openE;

    var px = cx, py = cy;
    var prev = s.prev;
    var vy = prev ? (py - prev.y) / Math.max(dt, 0.02) : 0;   /* screen heights per second, down is positive */
    s.prev = { x: px, y: py };

    var inZone = px > 0.06 && px < 0.94 && py > 0.10 && py < 0.96;

    /* 1) open-palm flick up = scroll down */
    if (inZone && openness >= OPEN_R && vy < -FLICK_V && t - s.coolScroll > COOLDOWN_FLICK && !s.pinched) {
      s.coolScroll = t; s.prev = null;
      scrollPage(0.65);
      pill(s.root, "⬇ scrolled down");
      flash(s, "↓");
      vibrate(12);
      return;
    }

    /* 2) the beckon, the oppo way: the palm stays facing the phone and anchored,
       the four fingers curl down like you are calling someone over, then reopen.
       curl + reopen = the page scrolls up. The anchored palm is what separates
       a beckon from a flick: the flick moves the whole hand, this does not. */
    if (s.beck === 0) {
      if (openness >= OPEN_R && inZone && !s.pinched) { s.beck = 1; s.beckT = t; s.beckCy = cy; }
    } else if (s.beck === 1) {
      if (openness <= BECK_CURL && Math.abs(cy - s.beckCy) < BECK_DRIFT && t - s.beckT < BECK_MS) {
        s.beck = 2; s.beckT = t;
      } else if (t - s.beckT > BECK_MAX_MS) { s.beck = 0; }
    } else if (s.beck === 2) {
      if (openness >= OPEN_R && t - s.beckT < BECK_BACK_MS) {
        s.beck = 0; s.prev = null;
        if (t - s.coolCycle > COOLDOWN_CYCLE && inZone && !s.pinched) {
          s.coolCycle = t;
          scrollPage(-0.65);
          pill(s.root, "⬆ scrolled up");
          flash(s, "↑");
          vibrate(12);
        }
      } else if (t - s.beckT > BECK_MAX_MS) { s.beck = 0; }
    }

    /* 3) pinch = soft cursor, release = tap */
    var pd = dist(hand[4], hand[8]) / scale;
    if (!s.pinched && pd < PINCH_ON) {
      s.pinched = true;
      cursor.classList.add("tss-cursor--on");
    } else if (s.pinched && pd > PINCH_OFF) {
      s.pinched = false;
      cursor.classList.remove("tss-cursor--on");
      if (t - s.coolTap > COOLDOWN_TAP) {
        s.coolTap = t;
        var r = cursor.getBoundingClientRect();
        tapAt(r.left + r.width / 2, r.top + r.height / 2, cursor);
        flash(s, "◉");
      }
    }
    if (s.pinched) {
      var q = mapPt(s, hand[8]);
      cursor.style.left = q.x + "px";
      cursor.style.top = q.y + "px";
    }
  }

  function scrollPage(frac) {
    try { window.scrollBy({ top: Math.round(window.innerHeight * frac), behavior: "smooth" }); } catch (e) { window.scrollBy(0, window.innerHeight * frac); }
  }

  function tapAt(x, y, cursor) {
    var ghost = cursor; cursor.classList.add("tss-cursor--tap");
    setTimeout(function () { ghost.classList.remove("tss-cursor--tap"); }, 380);
    var target = document.elementFromPoint(x, y);
    if (!target) return;
    var hit = target.closest("a, button, [role=button], input, select, textarea, label, summary, .setopt, .aq-chip, .aq-mdcard, .aq-modechip, video");
    if (hit) {
      /* inputs get focus instead of a click so the keyboard behaves */
      if (/^(input|select|textarea)$/i.test(hit.tagName)) { try { hit.focus(); } catch (e) {} }
      else { try { hit.click(); } catch (e) {} }
      vibrate(16);
    }
  }

  /* ---------- the launcher chip: on every page while enabled ---------- */
  function refreshLaunch() {
    var old = document.getElementById("tss-launch");
    var want = enabled() && !session && document.body;
    if (!want) { if (old) old.remove(); return; }
    if (old) return;
    var b = el("button", "tss-launch");
    b.id = "tss-launch";
    b.setAttribute("aria-label", "Start hands-free scrolling");
    b.innerHTML = "✋";
    b.addEventListener("click", function () { start({}); });
    document.body.appendChild(b);
  }

  /* ---------- settings wiring ---------- */
  function paintSettings() {
    var btn = document.getElementById("scrollerToggle");
    if (!btn) return;
    var on = enabled();
    btn.innerHTML = on ? "✋ Hands-free is ON - tap to turn off" : "✋ Turn on hands-free scrolling";
    btn.classList.toggle("setbtn--red", on);
  }
  function bindSettings() {
    var btn = document.getElementById("scrollerToggle");
    var tut = document.getElementById("scrollerTutorial");
    if (btn && !btn.dataset.tss) {
      btn.dataset.tss = "1";
      btn.addEventListener("click", function () {
        if (!support()) {
          alert("Hands-free scrolling needs a camera and a secure (https) page. This browser cannot open the camera.");
          return;
        }
        var c = cfg();
        if (c.on) { c.on = 0; save(c); stop(); paintSettings(); return; }
        c.on = 1; save(c); paintSettings();
        showTutorial(function () { start({ skipTutorial: true }); });
      });
      paintSettings();
    }
    if (tut && !tut.dataset.tss) {
      tut.dataset.tss = "1";
      tut.addEventListener("click", function () { showTutorial(null); });
    }
  }

  /* ---------- boot ---------- */
  function boot() {
    if (!document.body) { document.addEventListener("DOMContentLoaded", boot); return; }
    bindSettings();
    refreshLaunch();
  }
  boot();

  window.TSB_SCROLLER = {
    start: start,
    stop: stop,
    tutorial: function () { showTutorial(null); },
    isEnabled: enabled,
    bindSettings: bindSettings,
    refresh: refreshLaunch
  };
})();
