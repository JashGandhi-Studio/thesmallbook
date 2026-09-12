/* ============================================================
   THESMALLBOOK — 🎨 STORY CARD STUDIO (studio.js) · v223
   Tap your uploaded photo preview → edit how the image sits
   (drag to reframe, zoom, ratio), how the quote sits (position,
   align, size, theme), apply mini filters — then export a
   post-ready card (Instagram / WhatsApp-status ratios) or set
   the composed card as your story cover.

   Export is pure canvas (no libs), cross-browser: filters are
   emulated with composite ops so Safari exports match too.
   Free readers export with the thesmallbook.in watermark chip;
   TSB Gold removes it and unlocks the Pro filter pack.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_STUDIO) return;

  var RATIOS = [
    { id: "4:5", w: 1080, h: 1350, label: "4:5 POST" },
    { id: "1:1", w: 1080, h: 1080, label: "1:1" },
    { id: "9:16", w: 1080, h: 1920, label: "9:16 STORY" },
    { id: "16:9", w: 1080, h: 608, label: "16:9 WIDE" }
  ];
  var FILTERS = [
    { id: "orig", label: "Original", css: "none" },
    { id: "mono", label: "Mono", css: "grayscale(1) contrast(1.06)" },
    { id: "warm", label: "Warm", css: "sepia(.28) saturate(1.28) contrast(1.02)" },
    { id: "cool", label: "Cool", css: "saturate(1.12) hue-rotate(-8deg) brightness(1.04)" },
    { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.4) brightness(.9)" },
    { id: "fade", label: "Fade", css: "contrast(.85) saturate(.75) brightness(1.1)" },
    { id: "pop", label: "Pop", css: "saturate(1.55) contrast(1.12)" },
    { id: "gold", label: "Gold", css: "sepia(.4) saturate(1.5) contrast(1.05) brightness(1.02)", pro: true },
    { id: "film", label: "Film", css: "contrast(1.18) saturate(.85) sepia(.15)", pro: true }
  ];
  var THEMES = [ { id: "ink", label: "INK" }, { id: "paper", label: "PAPER" }, { id: "yellow", label: "LOUD" } ];
  var POS = [ { id: "top", label: "TOP" }, { id: "mid", label: "MIDDLE" }, { id: "bottom", label: "BOTTOM" } ];
  var ALIGNS = [ { id: "left", label: "LEFT" }, { id: "center", label: "CENTER" }, { id: "right", label: "RIGHT" } ];
  var SIZES = [ { id: "s", px: 46, label: "S" }, { id: "m", px: 60, label: "M" }, { id: "l", px: 76, label: "L" } ];

  var S = null, img = null, cfg = null, root = null;

  function $(id) { return root.querySelector("#" + id); }
  function ratio() { for (var i = 0; i < RATIOS.length; i++) if (RATIOS[i].id === S.ratio) return RATIOS[i]; return RATIOS[0]; }
  function filter() { for (var i = 0; i < FILTERS.length; i++) if (FILTERS[i].id === S.filter) return FILTERS[i]; return FILTERS[0]; }
  function sizePx() { for (var i = 0; i < SIZES.length; i++) if (SIZES[i].id === S.size) return SIZES[i]; return SIZES[1]; }

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "stu-toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------- shared geometry: preview AND canvas use this ---------- */
  function geom(iw, ih, W, H, st) {
    var base = Math.max(W / iw, H / ih);
    var s = base * st.zoom;
    var dw = iw * s, dh = ih * s;
    var minX = W - dw, minY = H - dh;
    var dx = W / 2 - st.fx * dw; if (dx > 0) dx = 0; if (dx < minX) dx = minX;
    var dy = H / 2 - st.fy * dh; if (dy > 0) dy = 0; if (dy < minY) dy = minY;
    return { dw: dw, dh: dh, dx: dx, dy: dy };
  }

  /* ---------- canvas filter emulation (composite ops, all browsers) ---------- */
  function applyFilterCanvas(ctx, W, H, key) {
    if (key === "orig") return;
    ctx.save();
    if (key === "mono" || key === "noir") {
      ctx.globalCompositeOperation = "saturation";
      ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, W, H);
      if (key === "noir") {
        ctx.globalCompositeOperation = "overlay";
        ctx.fillStyle = "rgba(0,0,0,.32)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(0,0,0,.08)"; ctx.fillRect(0, 0, W, H);
      }
    } else if (key === "warm") {
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = "rgba(255,140,0,.20)"; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "soft-light";
      ctx.fillStyle = "rgba(255,80,0,.25)"; ctx.fillRect(0, 0, W, H);
    } else if (key === "cool") {
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = "rgba(40,90,255,.18)"; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "soft-light";
      ctx.fillStyle = "rgba(120,180,255,.2)"; ctx.fillRect(0, 0, W, H);
    } else if (key === "fade") {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(255,255,255,.16)"; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "saturation";
      ctx.fillStyle = "#9a9a9a"; ctx.fillRect(0, 0, W, H);
    } else if (key === "pop") {
      ctx.globalCompositeOperation = "saturation";
      ctx.fillStyle = "#ff0080"; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = "rgba(255,255,255,.10)"; ctx.fillRect(0, 0, W, H);
    } else if (key === "gold") {
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = "rgba(255,200,0,.22)"; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "saturation";
      ctx.fillStyle = "#ff4d00"; ctx.fillRect(0, 0, W, H);
    } else if (key === "film") {
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = "rgba(20,40,70,.18)"; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "saturation";
      ctx.fillStyle = "#8f8f8f"; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  function wrap(ctx, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], line = "";
    for (var i = 0; i < words.length; i++) {
      var t = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = words[i]; }
      else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawScrim(ctx, W, H, st) {
    var a = st.scrim; if (a <= 0) return;
    var g;
    if (st.pos === "bottom") { g = ctx.createLinearGradient(0, H, 0, H * .3); }
    else if (st.pos === "top") { g = ctx.createLinearGradient(0, 0, 0, H * .7); }
    else {
      g = ctx.createLinearGradient(0, H * .5, 0, 0);
      var g2 = ctx.createLinearGradient(0, H * .5, 0, H);
      g.addColorStop(0, "rgba(0,0,0," + a + ")"); g.addColorStop(1, "rgba(0,0,0,0)");
      g2.addColorStop(0, "rgba(0,0,0," + a + ")"); g2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g2; ctx.fillRect(0, H * .5, W, H * .5);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * .5);
      return;
    }
    g.addColorStop(0, "rgba(0,0,0," + a + ")");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function drawQuote(ctx, W, H, st) {
    var q = (st.quote || "").trim(); if (!q) return;
    var px = sizePx().px;
    var pad = 60, maxW = W - pad * 2;
    ctx.textBaseline = "alphabetic";
    ctx.font = "900 " + px + "px 'Archivo Black', Arial";
    var lines = wrap(ctx, q.toUpperCase(), st.theme === "ink" ? maxW : maxW - 40);
    var lineH = Math.round(px * 1.34);
    var blockH = lines.length * lineH;
    var by = (st.byline || "").trim();
    var byH = by ? 52 : 0;
    var y;
    if (st.pos === "top") y = 90 + px;
    else if (st.pos === "mid") y = Math.round((H - blockH - byH) / 2) + px;
    else y = H - 120 - byH - blockH + px;

    function lineX(lw) {
      if (st.align === "left") return pad;
      if (st.align === "right") return W - pad - lw;
      return (W - lw) / 2;
    }

    for (var i = 0; i < lines.length; i++) {
      var lw = ctx.measureText(lines[i]).width;
      if (st.theme === "ink") {
        ctx.textAlign = "left";
        ctx.fillStyle = "#111";
        ctx.fillText(lines[i], lineX(lw) + 6, y + 6);
        ctx.fillStyle = "#fff";
        ctx.fillText(lines[i], lineX(lw), y);
      } else {
        var chipPad = 20, chipH = Math.round(px * 1.42);
        var cw = lw + chipPad * 2, cx = lineX(cw);
        var cy = y - px - 6;
        ctx.fillStyle = "#111"; ctx.fillRect(cx + 8, cy + 8, cw, chipH);           /* hard shadow */
        ctx.fillStyle = st.theme === "yellow" ? "#ffc800" : "#fffdf5";
        ctx.fillRect(cx, cy, cw, chipH);
        ctx.lineWidth = 6; ctx.strokeStyle = "#111"; ctx.strokeRect(cx, cy, cw, chipH);
        ctx.fillStyle = "#111"; ctx.textAlign = "left";
        ctx.fillText(lines[i], cx + chipPad, y + 4);
      }
      y += lineH;
    }
    if (by) {
      ctx.font = "700 32px 'Space Grotesk', Arial";
      ctx.textAlign = st.align === "right" ? "right" : st.align === "center" ? "center" : "left";
      var bx = st.align === "right" ? W - pad : st.align === "center" ? W / 2 : pad;
      ctx.fillStyle = "#111"; ctx.fillText("— " + by, bx + 4, y + 34 + 4);
      ctx.fillStyle = st.theme === "ink" ? "#ffc800" : "#fff";
      ctx.fillText("— " + by, bx, y + 34);
      ctx.textAlign = "left";
    }
  }

  function drawMark(ctx, W, H) {
    var label = "📕 thesmallbook.in";
    ctx.font = "700 26px 'Space Grotesk', Arial";
    var w = ctx.measureText(label).width + 56, h = 56;
    var x = W - w - 28, y = H - h - 28;
    ctx.fillStyle = "rgba(17,17,17,.92)"; ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 4; ctx.strokeStyle = "#ffc800"; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#ffc800"; ctx.textAlign = "center";
    ctx.fillText(label, x + w / 2, y + 37);
    ctx.textAlign = "left";
  }

  /* ---------- the export ---------- */
  async function render() {
    var r = ratio();
    var canvas = document.createElement("canvas");
    canvas.width = r.w; canvas.height = r.h;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#111"; ctx.fillRect(0, 0, r.w, r.h);
    var g = geom(img.naturalWidth, img.naturalHeight, r.w, r.h, S);
    ctx.drawImage(img, g.dx, g.dy, g.dw, g.dh);
    applyFilterCanvas(ctx, r.w, r.h, S.filter);
    drawScrim(ctx, r.w, r.h, S);
    drawQuote(ctx, r.w, r.h, S);
    if (!S.gold) drawMark(ctx, r.w, r.h);
    return canvas;
  }

  function canvasToFile(canvas, name) {
    return new Promise(function (res, rej) {
      try {
        canvas.toBlob(function (b) {
          if (!b) return rej(new Error("no blob"));
          res(new File([b], name, { type: "image/png" }));
        }, "image/png");
      } catch (e) { rej(e); }
    });
  }

  async function shareOrDownload(canvas) {
    var file;
    try { file = await canvasToFile(canvas, "thesmallbook-card.png"); }
    catch (e) { toast("❌ Export blocked by the browser — re-pick the photo on this page and try again."); return; }
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "TheSmallBook", text: "Made with 📕 TheSmallBook" }); return; } catch (e) { /* cancelled */ return; }
    }
    var a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = "thesmallbook-card.png";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    toast("✅ Card saved — post it anywhere");
  }

  /* ---------- preview (DOM mirror of the canvas math) ---------- */
  function layoutPreview() {
    if (!root || !img || !img.naturalWidth) return;
    var box = $("stuPrev");
    var wrapW = box.parentNode.clientWidth - 28;
    var maxH = Math.min(window.innerHeight * .46, 560);
    var r = ratio();
    var k = Math.min(wrapW / r.w, maxH / r.h);
    var bw = Math.floor(r.w * k), bh = Math.floor(r.h * k);
    box.style.width = bw + "px"; box.style.height = bh + "px";
    var g = geom(img.naturalWidth, img.naturalHeight, bw, bh, S);
    var im = $("stuImg");
    im.style.width = g.dw + "px"; im.style.height = g.dh + "px";
    im.style.left = g.dx + "px"; im.style.top = g.dy + "px";
    im.style.filter = filter().css;
    var scrim = $("stuScrim"), a = S.scrim;
    scrim.style.background = a <= 0 ? "none"
      : S.pos === "bottom" ? "linear-gradient(to top, rgba(0,0,0," + a + "), rgba(0,0,0,0) 70%)"
      : S.pos === "top" ? "linear-gradient(to bottom, rgba(0,0,0," + a + "), rgba(0,0,0,0) 70%)"
      : "linear-gradient(to top, rgba(0,0,0," + a + "), rgba(0,0,0,0) 50%), linear-gradient(to bottom, rgba(0,0,0," + a + "), rgba(0,0,0,0) 50%)";
    var q = $("stuQuote");
    q.className = "stu-quote stu-quote--" + S.pos + " stu-quote--" + S.align + " stu-quote--" + S.theme;
    var px = Math.max(13, Math.round(sizePx().px * (bw / r.w)));
    q.innerHTML = '<div class="q" style="font-size:' + px + 'px"><span>' + esc(S.quote || "") + "</span></div>" +
      (S.byline ? '<div class="b" style="font-size:' + Math.max(10, Math.round(px * .5)) + 'px">— ' + esc(S.byline) + "</div>" : "");
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- drag to reframe ---------- */
  function bindDrag() {
    var box = $("stuPrev"), dragging = false, lx = 0, ly = 0;
    box.addEventListener("pointerdown", function (e) {
      dragging = true; lx = e.clientX; ly = e.clientY;
      box.setPointerCapture(e.pointerId);
      var hint = $("stuHint"); if (hint) hint.remove();
    });
    box.addEventListener("pointermove", function (e) {
      if (!dragging || !img || !img.naturalWidth) return;
      var bw = box.clientWidth, bh = box.clientHeight;
      var g = geom(img.naturalWidth, img.naturalHeight, bw, bh, S);
      var dx = g.dx + (e.clientX - lx), dy = g.dy + (e.clientY - ly);
      var minX = bw - g.dw, minY = bh - g.dh;
      if (dx > 0) dx = 0; if (dx < minX) dx = minX;
      if (dy > 0) dy = 0; if (dy < minY) dy = minY;
      S.fx = (bw / 2 - dx) / g.dw; S.fy = (bh / 2 - dy) / g.dh;
      S.fx = Math.min(1, Math.max(0, S.fx)); S.fy = Math.min(1, Math.max(0, S.fy));
      lx = e.clientX; ly = e.clientY;
      layoutPreview();
    });
    ["pointerup", "pointercancel"].forEach(function (ev) {
      box.addEventListener(ev, function () { dragging = false; });
    });
    box.addEventListener("dblclick", function () { S.zoom = 1; S.fx = .5; S.fy = .5; $("stuZoom").value = 100; layoutPreview(); });
  }

  /* ---------- controls ---------- */
  function chips(containerId, list, current, onPick, renderLabel) {
    var el = $(containerId); el.innerHTML = "";
    list.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "stu-chip" + (it.id === current ? " on" : "");
      b.innerHTML = (renderLabel ? renderLabel(it) : esc(it.label)) + (it.pro ? '<span class="pro">PRO</span>' : "");
      b.addEventListener("click", function () {
        if (it.pro && !S.gold) { toast("💛 " + it.label + " is a Pro filter — comes with TSB Gold"); return; }
        onPick(it.id);
        chips(containerId, list, it.id, onPick, renderLabel);
        layoutPreview();
      });
      el.appendChild(b);
    });
  }

  function buildControls() {
    chips("stuRatio", RATIOS, S.ratio, function (id) { S.ratio = id; layoutPreview(); });
    chips("stuFilter", FILTERS, S.filter, function (id) { S.filter = id; });
    chips("stuPos", POS, S.pos, function (id) { S.pos = id; });
    chips("stuAlign", ALIGNS, S.align, function (id) { S.align = id; });
    chips("stuSize", SIZES, S.size, function (id) { S.size = id; });
    chips("stuTheme", THEMES, S.theme, function (id) { S.theme = id; });
    $("stuZoom").addEventListener("input", function () { S.zoom = this.value / 100; layoutPreview(); });
    $("stuScrimR").addEventListener("input", function () { S.scrim = this.value / 100; layoutPreview(); });
    $("stuQuoteTa").addEventListener("input", function () { S.quote = this.value; layoutPreview(); });
    $("stuBy").addEventListener("input", function () { S.byline = this.value; layoutPreview(); });
  }

  /* ---------- open / close ---------- */
  function open(o) {
    cfg = o || {};
    S = {
      ratio: "4:5", zoom: 1, fx: .5, fy: .5, filter: "orig",
      quote: cfg.quote || "", byline: cfg.byline || "",
      pos: "bottom", align: "center", size: "m", theme: "ink", scrim: .55,
      gold: !!(cfg.gold || (window.TSB_GOLD && TSB_GOLD.isGold()))
    };
    close();
    root = document.createElement("div");
    root.className = "stu-wrap";
    root.innerHTML =
      '<div class="stu-sheet">' +
        '<div class="stu-top"><b>🎨 CARD STUDIO<small>PRO-GRADE • 4 ratios • 6 filters • drag to reframe</small></b><button class="stu-x" id="stuX">✕</button></div>' +
        '<div class="stu-prevwrap"><div class="stu-prev" id="stuPrev">' +
          '<img id="stuImg" alt="">' +
          '<div class="stu-scrim" id="stuScrim"></div>' +
          '<div class="stu-quote" id="stuQuote"></div>' +
          '<div class="stu-draghint" id="stuHint">DRAG TO REFRAME · DOUBLE-TAP RESETS</div>' +
        "</div></div>" +
        '<div class="stu-sec"><div class="stu-lbl">RATIO <small>where will you post it?</small></div><div class="stu-chips" id="stuRatio"></div></div>' +
        '<div class="stu-sec"><div class="stu-lbl">PHOTO <small>zoom slider · drag the preview to reframe</small></div>' +
          '<input class="stu-range" id="stuZoom" type="range" min="100" max="300" value="100"></div>' +
        '<div class="stu-sec"><div class="stu-lbl">MINI FILTERS <small>PRO pack 💛 with Gold</small></div><div class="stu-chips" id="stuFilter"></div></div>' +
        '<div class="stu-sec"><div class="stu-lbl">QUOTE</div>' +
          '<textarea class="stu-ta" id="stuQuoteTa" rows="2" maxlength="220" placeholder="Type the quote…"></textarea>' +
          '<div style="height:8px"></div>' +
          '<div class="stu-row2">' +
            '<div><div class="stu-lbl">SAYS <small>optional</small></div><input class="stu-ta" id="stuBy" maxlength="60" placeholder="— who said it"></div>' +
            '<div><div class="stu-lbl">SHADE <small>readability</small></div><input class="stu-range" id="stuScrimR" type="range" min="0" max="85" value="55"></div>' +
          "</div>" +
          '<div style="height:10px"></div>' +
          '<div class="stu-lbl">QUOTE LAYOUT</div>' +
          '<div class="stu-chips" id="stuPos"></div><div style="height:8px"></div>' +
          '<div class="stu-chips" id="stuAlign"></div><div style="height:8px"></div>' +
          '<div class="stu-chips" id="stuSize"></div><div style="height:8px"></div>' +
          '<div class="stu-chips" id="stuTheme"></div>' +
        "</div>" +
        (S.gold ? '<div class="stu-gold">💛 GOLD — watermark off, Pro filters on. Thank you for keeping the library running.</div>'
                : '<div class="stu-gold">Free exports carry the 📕 watermark · <a href="gold.html">TSB Gold removes it + unlocks Pro filters →</a></div>') +
        '<div class="stu-foot"><button class="stu-dl" id="stuDl">⬇ DOWNLOAD / SHARE</button><button class="stu-apply" id="stuApply">✔ USE AS COVER</button></div>' +
      "</div>";
    document.body.appendChild(root);

    $("stuX").addEventListener("click", close);
    root.addEventListener("click", function (e) { if (e.target === root) close(); });
    $("stuDl").addEventListener("click", async function () {
      this.textContent = "… rendering";
      try { await shareOrDownload(await render()); } finally { this.textContent = "⬇ DOWNLOAD / SHARE"; }
    });
    $("stuApply").addEventListener("click", async function () {
      this.textContent = "… rendering";
      try {
        var file = await canvasToFile(await render(), "studio-card.png");
        if (cfg.onApply) await cfg.onApply(file);
        toast("✅ Studio card set as your cover");
        close();
      } catch (e) {
        toast("❌ Couldn't compose — re-pick the photo on this page, then try again.");
      } finally { this.textContent = "✔ USE AS COVER"; }
    });

    $("stuQuoteTa").value = S.quote;
    $("stuBy").value = S.byline;

    var _corsFailed = false;
    function _load(src, useCors){
      img = new Image();
      if(useCors) img.crossOrigin = "anonymous";
      img.onload = function () {
        if (img.naturalHeight > img.naturalWidth * 1.2) S.ratio = "9:16";
        buildControls(); bindDrag(); layoutPreview();
        if(_corsFailed) toast("⚠️ Preview only — re-upload the photo on this page for a clean export (original link blocked).");
      };
      img.onerror = function(){
        if(useCors && /^https?:/.test(src)){
          _corsFailed = true;
          _load(src, false);
          return;
        }
        toast("❌ Couldn't load that image");
        close();
      };
      img.src = src;
    }
    // Prefer fetch→blob for remote URLs to avoid canvas taint when Supabase CORS allows it
    if(/^https?:\/\//.test(cfg.src) && !/^blob:/.test(cfg.src) && !/^data:/.test(cfg.src)){
      fetch(cfg.src, {mode:"cors", credentials:"omit"}).then(function(r){ if(!r.ok) throw new Error("bad"); return r.blob(); }).then(function(b){
        var u = URL.createObjectURL(b);
        _load(u, false);
      }).catch(function(){ _load(cfg.src, true); });
    } else {
      _load(cfg.src, true);
    }
    window.addEventListener("resize", layoutPreview);
  }

  function close() {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    window.removeEventListener("resize", layoutPreview);
  }

  window.TSB_STUDIO = { open: open, close: close };
})();
