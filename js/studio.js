/* ============================================================
   THESMALLBOOK — 🎨 STORY CARD STUDIO (studio.js) · v228
   Tap your uploaded photo preview → edit how the image sits
   (drag to reframe, zoom, ratio), how the quote sits (position,
   align, size, theme), apply mini filters — then export a
   post-ready card (Instagram / WhatsApp-status ratios) or set
   the composed card as your story cover.

   v228: FREE ratio (original), ADD TEXT rename, byline removed,
   5 famous fonts (IMPACT meme etc), 12 aesthetic backgrounds
   for quote cards without a cover, and FIXED live preview
   (DOM img src sync + free-ratio + null-image backgrounds).
   Export is pure canvas (no libs), cross-browser: filters are
   emulated with composite ops so Safari exports match too.
   Free readers export with the thesmallbook.in watermark chip;
   TSB Gold removes it and unlocks the Pro filter pack.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_STUDIO) return;

  var RATIOS = [
    { id: "free", w: 0, h: 0, label: "FREE · original" },
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
  var FONTS = [
    { id: "arch", label: "BOLD", css: "'Archivo Black', system-ui, sans-serif" },
    { id: "impact", label: "MEME", css: "Impact, 'Archivo Black', system-ui, sans-serif" },
    { id: "space", label: "GROTESK", css: "'Space Grotesk', system-ui, sans-serif", caps: false },
    { id: "serif", label: "SERIF", css: "'Playfair Display', Georgia, serif", caps: false },
    { id: "mono", label: "TYPE", css: "'Space Mono', ui-monospace, monospace", caps: false },
    { id: "hand", label: "HAND", css: "'Caveat', cursive", caps: false }
  ];
  var BGS = [
    { id: "none", label: "NONE", css: "transparent", dark: false },
    { id: "paper", label: "📄 Paper", css: "#fffdf5", dark: false },
    { id: "aged", label: "📜 Kraft", css: "#e8d9b8", dark: false },
    { id: "black", label: "⬛ Ink", css: "#111111", dark: true },
    { id: "cream", label: "☁️ Cream", css: "#fdf6e3", dark: false },
    { id: "midnight", label: "🌌 Midnight", css: "linear-gradient(135deg,#0f172a 0%,#1e293b 55%,#334155 100%)", dark: true },
    { id: "sunset", label: "🌅 Sunset", css: "linear-gradient(135deg,#ff8a3d 0%,#ffc800 55%,#ff6b9d 100%)", dark: false },
    { id: "ocean", label: "🌊 Ocean", css: "linear-gradient(135deg,#0ea5e9 0%,#06b6d4 50%,#0f172a 100%)", dark: true },
    { id: "forest", label: "🌲 Forest", css: "linear-gradient(135deg,#14532d 0%,#15803d 55%,#22c55e 100%)", dark: true },
    { id: "blush", label: "🌸 Blush", css: "linear-gradient(135deg,#ffd1dc 0%,#ffc8a8 100%)", dark: false },
    { id: "lilac", label: "💜 Lilac", css: "linear-gradient(135deg,#e9d5ff 0%,#c4b5fd 50%,#a78bfa 100%)", dark: false },
    { id: "goldbg", label: "✨ Gold", css: "linear-gradient(135deg,#fff7cc 0%,#ffc800 55%,#ffb700 100%)", dark: false },
    { id: "chalk", label: "🖍️ Chalk", css: "#2b2b2b", dark: true }
  ];

  var S = null, img = null, cfg = null, root = null;

  function $(id) { return root.querySelector("#" + id); }
  function ratio() {
    for (var i = 0; i < RATIOS.length; i++) if (RATIOS[i].id === S.ratio) {
      var r = RATIOS[i];
      if (r.id === "free") {
        // free = original image ratio, or 4:5 fallback if no image
        if (img && img.naturalWidth && img.naturalHeight) {
          // keep natural ratio at 1080 width
          var w = 1080, h = Math.round(1080 * img.naturalHeight / img.naturalWidth);
          // clamp tall images so canvas not absurd
          if (h > 1600) { h = 1600; w = Math.round(h * img.naturalWidth / img.naturalHeight); }
          if (h < 700) { h = 700; w = Math.round(h * img.naturalWidth / img.naturalHeight); }
          return { id: "free", w: w, h: h, label: "FREE · original" };
        }
        return { id: "free", w: 1080, h: 1350, label: "FREE · original" };
      }
      return r;
    }
    return RATIOS[1];
  }
  function filter() { for (var i = 0; i < FILTERS.length; i++) if (FILTERS[i].id === S.filter) return FILTERS[i]; return FILTERS[0]; }
  function sizePx() { for (var i = 0; i < SIZES.length; i++) if (SIZES[i].id === S.size) return SIZES[i]; return SIZES[1]; }
  function fontObj() { for (var i=0;i<FONTS.length;i++) if (FONTS[i].id===S.font) return FONTS[i]; return FONTS[0]; }
  function bgObj() { for (var i=0;i<BGS.length;i++) if (BGS[i].id===S.bg) return BGS[i]; return BGS[0]; }

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
    // if aesthetic bg is active and no image, skip scrim (bg is already readable)
    if (!img && bgObj().id !== "none") return;
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

  function drawBackground(ctx, W, H) {
    if (img) return; // image will be drawn
    var bg = bgObj();
    if (bg.id === "none") { ctx.fillStyle = "#111"; ctx.fillRect(0,0,W,H); return; }
    if (bg.css.indexOf("gradient") === 0) {
      // simple two-stop parse: use fill with solid fallback + gradient draw
      // For canvas, create gradient manually
      var grad;
      if (bg.id === "midnight") { grad = ctx.createLinearGradient(0,0,W,H); grad.addColorStop(0,"#0f172a"); grad.addColorStop(0.55,"#1e293b"); grad.addColorStop(1,"#334155"); }
      else if (bg.id === "sunset") { grad = ctx.createLinearGradient(0,0,W,H); grad.addColorStop(0,"#ff8a3d"); grad.addColorStop(0.55,"#ffc800"); grad.addColorStop(1,"#ff6b9d"); }
      else if (bg.id === "ocean") { grad = ctx.createLinearGradient(0,0,W,H); grad.addColorStop(0,"#0ea5e9"); grad.addColorStop(0.5,"#06b6d4"); grad.addColorStop(1,"#0f172a"); }
      else if (bg.id === "forest") { grad = ctx.createLinearGradient(0,0,W,H); grad.addColorStop(0,"#14532d"); grad.addColorStop(0.55,"#15803d"); grad.addColorStop(1,"#22c55e"); }
      else if (bg.id === "blush") { grad = ctx.createLinearGradient(0,0,W,0); grad.addColorStop(0,"#ffd1dc"); grad.addColorStop(1,"#ffc8a8"); }
      else if (bg.id === "lilac") { grad = ctx.createLinearGradient(0,0,W,H); grad.addColorStop(0,"#e9d5ff"); grad.addColorStop(0.5,"#c4b5fd"); grad.addColorStop(1,"#a78bfa"); }
      else if (bg.id === "goldbg") { grad = ctx.createLinearGradient(0,0,W,H); grad.addColorStop(0,"#fff7cc"); grad.addColorStop(0.55,"#ffc800"); grad.addColorStop(1,"#ffb700"); }
      else { ctx.fillStyle = bg.css; ctx.fillRect(0,0,W,H); return; }
      ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
    } else {
      ctx.fillStyle = bg.css; ctx.fillRect(0,0,W,H);
    }
    // subtle paper texture overlay for paper/kraft/cream
    if (bg.id === "paper" || bg.id === "aged" || bg.id === "cream" || bg.id === "goldbg") {
      ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = "#111";
      for (var i=0;i<W*H/3800;i++){ var x=Math.random()*W, y=Math.random()*H, r=Math.random()*1.2; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
    }
  }

  function drawQuote(ctx, W, H, st) {
    var q = (st.quote || "").trim(); if (!q) return;
    var px = sizePx().px;
    var pad = 60, maxW = W - pad * 2;
    ctx.textBaseline = "alphabetic";
    var fo = fontObj();
    var ucase = fo.caps !== false;
    var text = ucase ? q.toUpperCase() : q;
    ctx.font = "900 " + px + "px " + fo.css;
    var lines = wrap(ctx, text, st.theme === "ink" ? maxW : maxW - 40);
    var lineH = Math.round(px * 1.34);
    var blockH = lines.length * lineH;
    var y;
    if (st.pos === "top") y = 90 + px;
    else if (st.pos === "mid") y = Math.round((H - blockH) / 2) + px;
    else y = H - 120 - blockH + px;

    function lineX(lw) {
      if (st.align === "left") return pad;
      if (st.align === "right") return W - pad - lw;
      return (W - lw) / 2;
    }

    // meme Impact gets stroke
    var isMeme = fo.id === "impact";

    for (var i = 0; i < lines.length; i++) {
      var lw = ctx.measureText(lines[i]).width;
      if (st.theme === "ink") {
        ctx.textAlign = "left";
        if (isMeme) {
          ctx.strokeStyle = "#111"; ctx.lineWidth = Math.max(6, Math.round(px*.12)); ctx.lineJoin = "round";
          ctx.strokeText(lines[i], lineX(lw) + 6, y + 6);
          ctx.strokeText(lines[i], lineX(lw), y);
        } else {
          ctx.fillStyle = "#111";
          ctx.fillText(lines[i], lineX(lw) + 6, y + 6);
        }
        ctx.fillStyle = "#fff";
        ctx.fillText(lines[i], lineX(lw), y);
        if (isMeme) {
          ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 2; ctx.strokeText(lines[i], lineX(lw), y);
        }
      } else {
        var chipPad = 20, chipH = Math.round(px * 1.42);
        var cw = lw + chipPad * 2, cx = lineX(cw);
        var cy = y - px - 6;
        ctx.fillStyle = "#111"; ctx.fillRect(cx + 8, cy + 8, cw, chipH);
        ctx.fillStyle = st.theme === "yellow" ? "#ffc800" : "#fffdf5";
        ctx.fillRect(cx, cy, cw, chipH);
        ctx.lineWidth = 6; ctx.strokeStyle = "#111"; ctx.strokeRect(cx, cy, cw, chipH);
        ctx.fillStyle = "#111"; ctx.textAlign = "left";
        if (isMeme) {
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeText(lines[i], cx + chipPad, y + 4);
        }
        ctx.fillText(lines[i], cx + chipPad, y + 4);
      }
      y += lineH;
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
    if (img) {
      ctx.fillStyle = "#111"; ctx.fillRect(0, 0, r.w, r.h);
      var g = geom(img.naturalWidth, img.naturalHeight, r.w, r.h, S);
      ctx.drawImage(img, g.dx, g.dy, g.dw, g.dh);
      applyFilterCanvas(ctx, r.w, r.h, S.filter);
    } else {
      drawBackground(ctx, r.w, r.h);
    }
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
      try { await navigator.share({ files: [file], title: "TheSmallBook", text: "Made with 📕 TheSmallBook" }); return; } catch (e) { return; }
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
    if (!root) return;
    var box = $("stuPrev");
    if (!box) return;
    // handle free ratio after image load
    var r = ratio();
    var wrapEl = box.parentNode;
    var wrapW = wrapEl ? (wrapEl.clientWidth - 28) : 320;
    if (!wrapW || wrapW < 160) wrapW = 320;
    var maxH = Math.min(window.innerHeight * .46, 560);
    var k = Math.min(wrapW / r.w, maxH / r.h);
    var bw = Math.floor(r.w * k), bh = Math.floor(r.h * k);
    box.style.width = bw + "px"; box.style.height = bh + "px";
    // aesthetic background for preview when no image
    if (!img || !img.naturalWidth) {
      box.style.background = bgObj().css;
      if (bgObj().id === "chalk") box.style.background = "#2b2b2b";
    } else {
      box.style.background = "#222";
    }
    var im = $("stuImg");
    var scrim = $("stuScrim");
    if (img && img.naturalWidth && im) {
      im.hidden = false;
      // FIX: ensure DOM img actually shows — was missing src sync
      if (im.src !== img.src) im.src = img.src;
      var g = geom(img.naturalWidth, img.naturalHeight, bw, bh, S);
      im.style.width = g.dw + "px"; im.style.height = g.dh + "px";
      im.style.left = g.dx + "px"; im.style.top = g.dy + "px";
      im.style.filter = filter().css;
      im.style.display = "block";
    } else if (im) {
      im.hidden = true;
      im.style.display = "none";
      im.removeAttribute("src");
    }
    if (scrim) {
      var a = S.scrim;
      if (!img && bgObj().id !== "none" && bgObj().id !== "black" && bgObj().id !== "chalk") {
        scrim.style.background = "none";
      } else {
        scrim.style.background = a <= 0 ? "none"
          : S.pos === "bottom" ? "linear-gradient(to top, rgba(0,0,0," + a + "), rgba(0,0,0,0) 70%)"
          : S.pos === "top" ? "linear-gradient(to bottom, rgba(0,0,0," + a + "), rgba(0,0,0,0) 70%)"
          : "linear-gradient(to top, rgba(0,0,0," + a + "), rgba(0,0,0,0) 50%), linear-gradient(to bottom, rgba(0,0,0," + a + "), rgba(0,0,0,0) 50%)";
      }
    }
    var q = $("stuQuote");
    if (q) {
      q.className = "stu-quote stu-quote--" + S.pos + " stu-quote--" + S.align + " stu-quote--" + S.theme + " stu-quote--font-" + S.font;
      var px = Math.max(13, Math.round(sizePx().px * (bw / r.w)));
      var fo = fontObj();
      var isMemePrev = fo.id === "impact";
      q.style.fontFamily = fo.css;
      var extra = isMemePrev ? 'text-shadow:3px 3px 0 #111, -1px -1px 0 #111; letter-spacing:.5px;' : '';
      q.innerHTML = '<div class="q" style="font-size:' + px + 'px; font-family:' + fo.css + ';' + extra + '"><span>' + esc((S.quote || "").trim() ? (fo.caps!==false ? esc(S.quote) .toUpperCase() : esc(S.quote)) : "YOUR TEXT HERE") + "</span></div>";
      // hint for empty quote
      if (!(S.quote || "").trim()) q.style.opacity = ".55"; else q.style.opacity = "1";
    }
  }

  function esc(s) { return String(s).replace(/[&<>\"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- drag to reframe ---------- */
  function bindDrag() {
    var box = $("stuPrev"), dragging = false, lx = 0, ly = 0;
    if (!box) return;
    box.addEventListener("pointerdown", function (e) {
      if (!img || !img.naturalWidth) return;
      dragging = true; lx = e.clientX; ly = e.clientY;
      try { box.setPointerCapture(e.pointerId); } catch (err) {}
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
    box.addEventListener("dblclick", function () { if(!img) return; S.zoom = 1; S.fx = .5; S.fy = .5; var z=$("stuZoom"); if(z) z.value = 100; layoutPreview(); });
  }

  /* ---------- controls ---------- */
  function chips(containerId, list, current, onPick, renderLabel) {
    var el = $(containerId); if (!el) return; el.innerHTML = "";
    list.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "stu-chip" + (it.id === current ? " on" : "");
      var lab = renderLabel ? renderLabel(it) : esc(it.label);
      b.innerHTML = lab + (it.pro ? '<span class="pro">PRO</span>' : "");
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
    chips("stuFont", FONTS, S.font, function (id) { S.font = id; });
    chips("stuBg", BGS, S.bg, function (id) { S.bg = id; });
    chips("stuPos", POS, S.pos, function (id) { S.pos = id; });
    chips("stuAlign", ALIGNS, S.align, function (id) { S.align = id; });
    chips("stuSize", SIZES, S.size, function (id) { S.size = id; });
    chips("stuTheme", THEMES, S.theme, function (id) { S.theme = id; });
    var z = $("stuZoom"); if (z) z.addEventListener("input", function () { S.zoom = this.value / 100; layoutPreview(); });
    var sc = $("stuScrimR"); if (sc) sc.addEventListener("input", function () { S.scrim = this.value / 100; layoutPreview(); });
    var ta = $("stuQuoteTa"); if (ta) ta.addEventListener("input", function () { S.quote = this.value; layoutPreview(); });
  }

  /* ---------- open / close ---------- */
  function open(o) {
    cfg = o || {};
    S = {
      ratio: (cfg.ratio || "4:5"), zoom: 1, fx: .5, fy: .5, filter: "orig",
      quote: cfg.quote || "", font: cfg.font || "arch", bg: cfg.bg || "paper",
      pos: "bottom", align: "center", size: "m", theme: "ink", scrim: .55,
      gold: !!(cfg.gold || (window.TSB_GOLD && TSB_GOLD.isGold()))
    };
    // if caller passed src as null, we still open with aesthetic bg
    close();
    root = document.createElement("div");
    root.className = "stu-wrap";
    root.innerHTML =
      '<div class="stu-sheet">' +
        '<div class="stu-top"><b>🎨 CARD STUDIO<small>PRO-GRADE · FREE ratio · 6 fonts · 12 bgs · drag to reframe</small></b><button class="stu-x" id="stuX">✕</button></div>' +
        '<div class="stu-prevwrap"><div class="stu-prev" id="stuPrev">' +
          '<img id="stuImg" alt="" hidden>' +
          '<div class="stu-scrim" id="stuScrim"></div>' +
          '<div class="stu-quote" id="stuQuote"></div>' +
          '<div class="stu-draghint" id="stuHint">DRAG TO REFRAME · DOUBLE-TAP RESETS</div>' +
        "</div></div>" +
        '<div class="stu-sec"><div class="stu-lbl">RATIO <small>where will you post it? FREE = original</small></div><div class="stu-chips" id="stuRatio"></div></div>' +
        '<div class="stu-sec"><div class="stu-lbl">PHOTO <small>zoom slider · drag the preview to reframe · no photo? pick a bg below</small></div>' +
          '<input class="stu-range" id="stuZoom" type="range" min="100" max="300" value="100"><div style="height:8px"></div><button type="button" id="stuPick" style="width:100%;border:2.5px solid #111;background:#fff;font:700 12px Space Grotesk,sans-serif;padding:10px;border-radius:999px;box-shadow:2.5px 2.5px 0 #111;cursor:pointer">📷 CHOOSE / CHANGE PHOTO</button>' +
          '<input id="stuFile" type="file" accept="image/*" hidden></div>' +
        '<div class="stu-sec"><div class="stu-lbl">BACKGROUNDS <small>12 aesthetic options — works without a photo</small></div><div class="stu-chips" id="stuBg"></div></div>' +
        '<div class="stu-sec"><div class="stu-lbl">MINI FILTERS <small>PRO pack 💛 with Gold</small></div><div class="stu-chips" id="stuFilter"></div></div>' +
        '<div class="stu-sec"><div class="stu-lbl">ADD TEXT <small>type anything — quote, meme, announcement</small></div>' +
          '<textarea class="stu-ta" id="stuQuoteTa" rows="2" maxlength="220" placeholder="Type your text…"></textarea>' +
          '<div style="height:10px"></div>' +
          '<div class="stu-lbl">FONT <small>meme & famous faces</small></div><div class="stu-chips" id="stuFont"></div>' +
          '<div style="height:10px"></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><div class="stu-lbl">SHADE <small>readability</small></div><input class="stu-range" id="stuScrimR" type="range" min="0" max="85" value="55"></div><div><div class="stu-lbl">SIZE</div><div class="stu-chips" id="stuSize"></div></div></div>' +
          '<div style="height:10px"></div>' +
          '<div class="stu-lbl">TEXT LAYOUT</div>' +
          '<div class="stu-chips" id="stuPos"></div><div style="height:8px"></div>' +
          '<div class="stu-chips" id="stuAlign"></div><div style="height:8px"></div>' +
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
    // inline photo picker inside studio
    var fileIn = $("stuFile");
    var pickBtn = $("stuPick");
    if (pickBtn && fileIn) {
      pickBtn.addEventListener("click", function(){ fileIn.click(); });
      fileIn.addEventListener("change", function(){
        var f = fileIn.files && fileIn.files[0]; if(!f) return;
        var url = URL.createObjectURL(f);
        // reuse load path
        _load(url, false);
        if (cfg.onPick) try{ cfg.onPick(f); }catch(e){}
        toast("📷 Photo loaded — drag to reframe");
      });
    }

    var _corsFailed = false;
    function _finalizeLoad() {
      // auto-select FREE if tall image, else keep chosen
      if (img && img.naturalHeight > img.naturalWidth * 1.35) S.ratio = "free";
      buildControls(); bindDrag(); layoutPreview();
      if(_corsFailed) toast("⚠️ Preview only — re-upload the photo on this page for a clean export (original link blocked).");
    }
    function _load(src, useCors){
      if (!src) {
        img = null;
        buildControls(); bindDrag(); layoutPreview();
        return;
      }
      img = new Image();
      if(useCors) img.crossOrigin = "anonymous";
      img.onload = function () {
        // sync DOM preview img immediately - FIX for blank preview
        var domImg = document.getElementById("stuImg");
        if (domImg) { domImg.src = img.src; domImg.hidden = false; domImg.style.display = "block"; }
        _finalizeLoad();
      };
      img.onerror = function(){
        if(useCors && /^https?:/.test(src)){
          _corsFailed = true;
          _load(src, false);
          return;
        }
        toast("❌ Couldn't load that image — try another");
        img = null;
        buildControls(); bindDrag(); layoutPreview();
      };
      img.src = src;
    }
    // Prefer fetch→blob for remote URLs to avoid canvas taint when Supabase CORS allows it
    if(cfg.src && /^https?:\/\//.test(cfg.src) && !/^blob:/.test(cfg.src) && !/^data:/.test(cfg.src)){
      fetch(cfg.src, {mode:"cors", credentials:"omit"}).then(function(r){ if(!r.ok) throw new Error("bad"); return r.blob(); }).then(function(b){
        var u = URL.createObjectURL(b);
        _load(u, false);
      }).catch(function(){ _load(cfg.src, true); });
    } else {
      _load(cfg.src || "", !!(cfg.src && /^https?:/.test(cfg.src)));
    }
    if (!cfg.src) {
      // no image — still show UI with backgrounds
      // _load already handled null case via else branch when cfg.src falsy, but ensure controls
      if (!img) { buildControls(); bindDrag(); layoutPreview(); }
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
