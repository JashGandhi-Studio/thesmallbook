/* ============================================================
   THESMALLBOOK — 📷 FULLSCREEN LIVE BOOK SCANNER (scanner.js)
   - Full-screen camera takeover (no upload, no card)
   - Auto-capture: waits for a sharp + steady frame (1-2s)
   - Manual shutter as backup
   - Matches against 340 books × cover variants (color profiles)
   - Found → tap to open in library (smooth scroll + flash)
   - Not found → type-the-title fallback right in the scanner
   ============================================================ */
(function () {
  var modal = document.getElementById("scanModal");
  var scanBtn = document.getElementById("scanBtn");
  var closeBtn = document.getElementById("scanClose");
  var video = document.getElementById("scanVideo");
  var canvas = document.getElementById("scanCanvas");
  var overlay = document.getElementById("scanOverlay");
  var hint = document.getElementById("scanHint");
  var empty = document.getElementById("scanEmpty");
  var analyzing = document.getElementById("scanAnalyzing");
  var foundBox = document.getElementById("scanFound");
  var foundTitle = document.getElementById("scanFoundTitle");
  var foundGo = document.getElementById("scanFoundGo");
  var noBox = document.getElementById("scanNo");
  var noTxt = document.getElementById("scanNoTxt");
  var typeInput = document.getElementById("scanTypeInput");
  var typeHint = document.getElementById("scanTypeHint");
  var searchLibBtn = document.getElementById("scanSearchLib");
  var requestLink = document.getElementById("scanRequest");
  var flipBtn = document.getElementById("scanFlip");
  var findBtn = document.getElementById("scanFind");
  var bar = document.getElementById("scanBar");

  var stream = null;
  var raf = null;
  var steady = 0;        // consecutive steady frames
  var lastFrame = null;  // downscaled frame for stability check
  var busy = false;
  var analyzeTimer = null;   // pending cover-analysis timeout (cancelled on close)
  var noFrameTicks = 0;  // frames with no video data yet
  var camLive = false;   // true once the camera is actually delivering frames
  var facing = "environment"; // back camera by default (flip toggles)

  /* ---------------- open / close ---------------- */
  function openModal() {
    modal.hidden = false;
    modal.style.display = "block";   // bulletproof: inline beats any CSS
    modal.classList.add("scanmodal--open");
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    hideAll();
    startCamera();
  }
  function closeModal() {
    try { stopCamera(); } catch (e) {}
    if (analyzeTimer) { clearTimeout(analyzeTimer); analyzeTimer = null; }
    busy = false;
    modal.classList.remove("scanmodal--open");
    modal.hidden = true;
    modal.style.display = "none";
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    lastFrame = null; steady = 0; noFrameTicks = 0;
  }
  function hideAll() {
    if (analyzing) analyzing.hidden = true;
    if (foundBox) foundBox.hidden = true;
    if (noBox) noBox.hidden = true;
    if (canvas) { canvas.hidden = true; canvas.style.display = "none"; }
    if (video) { video.style.display = "block"; video.hidden = false; }
    if (hint) hint.style.display = "";
    if (empty) empty.style.display = "none";
    if (bar) bar.style.display = "flex";
    if (findBtn) findBtn.disabled = false;
  }

  if (scanBtn) scanBtn.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (modal) modal.addEventListener("click", function (e) {
    // tap the black backdrop / video = close (so the app never gets stuck)
    if (e.target === modal || e.target === video || e.target.id === "scanStage") closeModal();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal && !modal.hidden) closeModal(); });

  /* ---------------- camera + live loop ---------------- */
  function startCamera(showAllow) {
    stopCamera();
    camLive = false;
    if (showAllow !== false && hint) {
      hint.style.display = "";
      hint.innerHTML = "<b>ALLOW CAMERA ACCESS</b><span>Tap Allow in the browser popup — then keep the cover steady</span>";
    }
    var gum = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    else if (navigator.webkitGetUserMedia) gum = navigator.webkitGetUserMedia.bind(navigator);
    if (!gum) {
      if (empty) { empty.style.display = "flex"; empty.textContent = "📷 Camera not available on this device"; }
      return;
    }
    gum({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(function (s) {
        stream = s;
        if (video) {
          video.srcObject = s;
          video.style.display = "block";
          video.hidden = false;
          if (empty) empty.style.display = "none";
          // some Android/iOS browsers need an explicit play() after srcObject
          var p = video.play ? video.play() : null;
          if (p && p.catch) p.catch(function () {});
        }
        loop();
      })
      .catch(function () {
        if (empty) { empty.style.display = "flex"; empty.textContent = "📷 Camera blocked — allow camera access and tap SCAN again"; }
        if (hint) hint.style.display = "none";
        if (video) video.style.display = "none";
      });
  }
  function stopCamera() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    if (video) { video.srcObject = null; video.style.display = "none"; }
    if (overlay) overlay.style.display = "";
    lastFrame = null; steady = 0; noFrameTicks = 0;
  }

  /* ---------------- auto-capture: sharpness + stability ---------------- */
  function downscale(v) {
    var w = 60, h = 90;
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var ctx = c.getContext("2d");
    ctx.drawImage(v, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h).data;
  }

  function sharpnessOf(data) {
    // energy of horizontal gradient (proxy for focus)
    var e = 0;
    for (var y = 0; y < 90; y++) {
      for (var x = 1; x < 60; x++) {
        var i = (y * 60 + x) * 4;
        var j = (y * 60 + x - 1) * 4;
        e += Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2]);
      }
    }
    return e;
  }

  function diffOf(a, b) {
    var d = 0;
    for (var i = 0; i < a.length; i += 4) {
      d += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    }
    return d;
  }

  function loop() {
    if (!video) return;
    if (!video.videoWidth) {
      // camera granted but no frames yet — keep the user informed
      noFrameTicks++;
      if (noFrameTicks === 15 && hint) {
        hint.innerHTML = "<b>STARTING CAMERA…</b><span>Keep the book cover in the frame</span>";
      } else if (noFrameTicks === 130 && hint) {
        hint.innerHTML = "<b>CAMERA NOT STARTING</b><span>Tap ✕ and try SCAN again — or type the book name in search</span>";
      }
      raf = requestAnimationFrame(loop);
      return;
    }
    if (!camLive) {
      camLive = true;
      noFrameTicks = 0;
      if (hint) {
        hint.innerHTML = "<b>SCANNING…</b><span>Keep the book cover steady · don't move the camera much</span>";
      }
    }
    if (!busy) {
      var data = downscale(video);
      var sharp = sharpnessOf(data);
      var stable = lastFrame ? diffOf(data, lastFrame) < 1400 : false;
      lastFrame = data;
      if (sharp > 15000 && stable) { // sharp (real covers score 45k-200k; blur is <15k) + steady frame
        steady++;
        if (steady >= 2) { // ~2 stable sharp frames → capture
          steady = 0;
          capture();
        }
      } else {
        steady = Math.max(0, steady - 1);
      }
    }
    raf = requestAnimationFrame(loop);
  }

  /* ---------------- capture + analyze ---------------- */
  function capture() {
    if (busy) return;
    if (!video || !video.videoWidth) {
      if (empty) {
        empty.style.display = "flex";
        empty.textContent = "📷 Camera is still starting — wait a second and tap FIND BOOK SUMMARY again";
      }
      return;
    }
    busy = true;
    if (findBtn) findBtn.disabled = true;
    if (bar) bar.style.display = "none";
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    video.style.display = "none";
    canvas.hidden = false;
    canvas.style.display = "block";
    if (hint) hint.style.display = "none";
    if (analyzing) analyzing.hidden = false;

    analyzeTimer = setTimeout(function () {
      analyzeTimer = null;
      ensureLib(function () {
        var result = runMatch();
        busy = false;
        if (analyzing) analyzing.hidden = true;
        if (result) showFound(result);
        else showNotFound();
      });
    }, 700);
  }

  /* scanner-data.js loads deferred (it's ~900KB) — wait for it before
     matching; fall back to type-the-title if it never arrives */
  function ensureLib(cb, tries) {
    tries = tries || 0;
    if (window.TSB_SCAN && window.TSB_SCAN.length) return cb();
    if (tries === 0 && hint) {
      hint.style.display = "";
      hint.innerHTML = "<b>LOADING BOOK LIBRARY…</b><span>One second — scanning starts automatically</span>";
    }
    if (tries >= 20) { // ~5s timeout → type fallback still works
      if (hint) hint.style.display = "none";
      return cb();
    }
    setTimeout(function () { ensureLib(cb, tries + 1); }, 250);
  }

  /* bottom bar: FLIP CAMERA + FIND BOOK SUMMARY */
  if (findBtn) findBtn.addEventListener("click", capture);
  if (flipBtn) flipBtn.addEventListener("click", function () {
    if (busy) return;
    facing = (facing === "environment") ? "user" : "environment";
    if (hint) {
      hint.style.display = "";
      hint.innerHTML = "<b>FLIPPING CAMERA…</b><span>Hold on a second</span>";
    }
    startCamera(false);
  });
  ["scanAgainBtn", "scanAgainBtn2"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("click", function () { hideAll(); lastFrame = null; steady = 0; video.style.display = "block"; });
  });

  /* ---------------- matching: color grid + edge fingerprint ---------------- */
  function buildProfile(sctx) {
    var w = 120, h = 180;
    var data = sctx.getImageData(0, 0, w, h).data;

    // 3x3 color grid
    var grid = [];
    for (var gy = 0; gy < 3; gy++) {
      for (var gx = 0; gx < 3; gx++) {
        var r = 0, g = 0, b = 0, n = 0;
        for (var y = Math.floor(gy * h / 3); y < Math.floor((gy + 1) * h / 3); y++) {
          for (var x = Math.floor(gx * w / 3); x < Math.floor((gx + 1) * w / 3); x++) {
            var i = (y * w + x) * 4;
            r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
          }
        }
        grid.push([Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
      }
    }

    // 16x24 edge map (layout / text fingerprint)
    var gx0 = sctx.createImageData(w, h);
    var gd = gx0.data;
    for (var i2 = 0; i2 < data.length; i2++) gd[i2] = data[i2];
    sctx.putImageData(gx0, 0, 0);
    var gray = sctx.getImageData(0, 0, w, h).data;
    var lum = new Float32Array(w * h);
    for (var y2 = 0; y2 < h; y2++) {
      for (var x2 = 0; x2 < w; x2++) {
        var idx = (y2 * w + x2) * 4;
        lum[y2 * w + x2] = 0.299 * gray[idx] + 0.587 * gray[idx + 1] + 0.114 * gray[idx + 2];
      }
    }
    var EW = 16, EH = 24;
    var ew = Math.floor(w / EW), eh = Math.floor(h / EH);
    var bits = [];
    for (var ey = 0; ey < EH; ey++) {
      for (var ex = 0; ex < EW; ex++) {
        var sum = 0, cnt = 0;
        for (var yy = ey * eh; yy < (ey + 1) * eh; yy++) {
          for (var xx = ex * ew; xx < (ex + 1) * ew; xx++) {
            var i3 = yy * w + xx;
            var gxval = xx + 1 < w ? Math.abs(lum[i3] - lum[yy * w + xx + 1]) : 0;
            var gyval = yy + 1 < h ? Math.abs(lum[i3] - lum[(yy + 1) * w + xx]) : 0;
            sum += gxval + gyval; cnt++;
          }
        }
        bits.push(sum / cnt > 22 ? 1 : 0);
      }
    }
    // pack bits → base64
    var bytes = [];
    for (var k = 0; k < bits.length; k += 8) {
      var byte = 0;
      for (var j = 0; j < 8; j++) {
        if (k + j < bits.length && bits[k + j]) byte |= 1 << (7 - j);
      }
      bytes.push(byte);
    }
    var bin = "";
    for (var b2 = 0; b2 < bytes.length; b2++) bin += String.fromCharCode(bytes[b2]);
    return { g: grid, e: btoa(bin) };
  }

  /* full-frame profile + crop-invariant variants (real camera shots are
     never perfectly zoomed — try 100% / 85% / 70% center crops) */
  function profileFromCanvas() {
    var ctx = canvas.getContext("2d");
    var small = document.createElement("canvas");
    small.width = 120; small.height = 180;
    var sctx = small.getContext("2d");
    sctx.imageSmoothingEnabled = true;
    if (sctx.imageSmoothingQuality) sctx.imageSmoothingQuality = "high";
    sctx.drawImage(canvas, 0, 0, 120, 180);
    return buildProfile(sctx);
  }
  function profileFromCrop(frac) {
    var ctx = canvas.getContext("2d");
    var cw = canvas.width, ch = canvas.height;
    var cw2 = Math.round(cw * frac), ch2 = Math.round(ch * frac);
    var x0 = Math.round((cw - cw2) / 2), y0 = Math.round((ch - ch2) / 2);
    var small = document.createElement("canvas");
    small.width = 120; small.height = 180;
    var sctx = small.getContext("2d");
    sctx.imageSmoothingEnabled = true;
    if (sctx.imageSmoothingQuality) sctx.imageSmoothingQuality = "high";
    sctx.drawImage(canvas, x0, y0, cw2, ch2, 0, 0, 120, 180);
    return buildProfile(sctx);
  }

  function colorDist(c1, c2) {
    var dr = c1[0] - c2[0], dg = c1[1] - c2[1], db = c1[2] - c2[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }
  function edgeDist(e1, e2) {
    // Hamming distance on decoded bytes
    var a1, a2;
    try { a1 = atob(e1); a2 = atob(e2); } catch (e) { return 1; }
    var diff = 0;
    for (var i = 0; i < a1.length; i++) {
      var x = a1.charCodeAt(i) ^ a2.charCodeAt(i);
      // popcount
      while (x) { diff += x & 1; x >>= 1; }
    }
    return diff / 384; // 0..1
  }

  function runMatch() {
    // scale-invariant: full frame + 85% + 70% center crops → best score per book
    // (the DB stores the same 3 scales × 4 lighting variants per cover)
    var profs = [profileFromCanvas(), profileFromCrop(0.85), profileFromCrop(0.7)];
    var lib = window.TSB_SCAN || [];
    var best = null, bestScore = 1e9;
    for (var i = 0; i < lib.length; i++) {
      var entry = lib[i];
      var score = 1e9;
      for (var p = 0; p < profs.length; p++) {
        var cScore = 0;
        for (var k = 0; k < 9; k++) cScore += colorDist(profs[p].g[k], entry.g[k]);
        cScore /= 9;
        var eScore = edgeDist(profs[p].e, entry.e) * 100; // 0..100
        var s = cScore * 0.55 + eScore * 0.45;
        if (s < score) score = s;
      }
      if (score < bestScore) { bestScore = score; best = entry; }
    }
    // threshold: combined score under 55 = confident
    if (best && bestScore < 55) return best;
    return null;
  }
  /* ---------------- results ---------------- */
  function showFound(entry) {
    if (foundTitle) foundTitle.textContent = entry.t;
    if (foundBox) foundBox.hidden = false;
    if (foundGo) {
      foundGo.onclick = function () {
        openBook(entry.id);
      };
    }
  }
  function showNotFound() {
    if (noBox) noBox.hidden = false;
    if (typeInput) { typeInput.value = ""; typeInput.focus(); }
    if (typeHint) typeHint.textContent = "";
    updateRequestLink("");
  }

  /* redirect straight to the book's summary page */
  function openBook(id) {
    closeModal();
    try { window.__tsbOpenBookId = id; } catch (e) {}
    window.location.href = "book.html?id=" + encodeURIComponent(id);
  }

  /* "we don't have it" → search the library instead */
  if (searchLibBtn) searchLibBtn.addEventListener("click", function () {
    var q = typeInput ? typeInput.value.trim() : "";
    closeModal();
    var input = document.getElementById("searchInput");
    if (input) {
      input.value = q;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    setTimeout(function () {
      try {
        var target = document.getElementById("library");
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (e) {}
    }, 120);
  });

  /* request a missing book → WhatsApp message to the creator */
  function updateRequestLink(title) {
    if (!requestLink) return;
    var text = "Hi Jash! Please add this book to TheSmallBook: " + (title && title.trim() ? title.trim() : "a book I just scanned");
    requestLink.href = "https://wa.me/919702510680?text=" + encodeURIComponent(text);
  }

  /* type-to-find fallback */
  if (typeInput) typeInput.addEventListener("input", function () {
    var q = typeInput.value.trim().toLowerCase();
    var lib = window.BOOKS || [];
    if (!q) { if (typeHint) typeHint.textContent = ""; updateRequestLink(""); return; }
    var hits = lib.filter(function (b) {
      return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    }).slice(0, 5);
    if (typeHint) {
      typeHint.innerHTML = hits.length
        ? hits.map(function (b) {
            return '<button class="scanmodal__typehit" data-id="' + b.id + '"><b>' + b.title + '</b><small>' + b.author + '</small></button>';
          }).join("")
        : '<span class="scanmodal__typenone">No book found — check the spelling, or request it below 👇</span>';
    }
    updateRequestLink(typeInput.value.trim());
  });
  if (typeHint) typeHint.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-id]");
    if (btn) openBook(btn.dataset.id);
  });

  window.TSB_SCANNER = { open: openModal, close: closeModal };
})();
