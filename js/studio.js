/* ============================================================
   THESMALLBOOK, 🎨 STORY CARD STUDIO (studio.js) · v228
   Tap your uploaded photo preview → edit how the image sits
   (drag to reframe, zoom, ratio), how the quote sits (position,
   align, size, theme), apply mini filters, then export a
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
  var THEMES = [ { id: "ink", label: "INK", swatch: "#111111" }, { id: "paper", label: "PAPER", swatch: "#fffdf5" }, { id: "yellow", label: "LOUD", swatch: "#ffc800" } ];
  var POS = [ { id: "top", label: "TOP" }, { id: "mid", label: "MIDDLE" }, { id: "bottom", label: "BOTTOM" } ];
  var ALIGNS = [ { id: "left", label: "LEFT" }, { id: "center", label: "CENTER" }, { id: "right", label: "RIGHT" } ];
  var SIZES = [ { id: "s", px: 46, label: "S" }, { id: "m", px: 60, label: "M" }, { id: "l", px: 76, label: "L" } ];
  // v244: every font shows its REAL NAME in its OWN face, people judge at a glance. + Bebas Neue & Lobster (famous).
  var FONTS = [
    { id: "arch", label: "Archivo", css: "'Archivo Black', system-ui, sans-serif", caps: true },
    { id: "impact", label: "Impact", css: "Impact, 'Archivo Black', system-ui, sans-serif", caps: true },
    { id: "anton", label: "Anton", css: "'Anton', Impact, 'Archivo Black', sans-serif", caps: true, w: 400 },
    { id: "bebas", label: "Bebas", css: "'Bebas Neue', Impact, 'Archivo Black', sans-serif", caps: true, w: 400 },
    { id: "space", label: "Grotesk", css: "'Space Grotesk', system-ui, sans-serif", caps: false },
    { id: "mont", label: "Montserrat", css: "'Montserrat', system-ui, sans-serif", caps: false, w: 900 },
    { id: "serif", label: "Playfair", css: "'Playfair Display', Georgia, serif", caps: false },
    { id: "mono", label: "Space Mono", css: "'Space Mono', ui-monospace, monospace", caps: false },
    { id: "hand", label: "Caveat", css: "'Caveat', cursive", caps: false, w: 700 },
    { id: "lobster", label: "Lobster", css: "'Lobster', 'Caveat', cursive", caps: false, w: 400 }
  ];
  var BGS = [
    { id: "none", label: "NONE", css: "transparent", dark: false },
    { id: "img-paper", label: "Paper", css: "url('assets/quote-bgs/bg01-paper.jpg')", dark: false, img: "assets/quote-bgs/bg01-paper.jpg", thumb: "assets/quote-bgs/bg01-paper-thumb.jpg" },
    { id: "img-dark", label: "Dark", css: "url('assets/quote-bgs/bg02-dark.jpg')", dark: true, img: "assets/quote-bgs/bg02-dark.jpg", thumb: "assets/quote-bgs/bg02-dark-thumb.jpg" },
    { id: "img-sunset", label: "Sunset", css: "url('assets/quote-bgs/bg03-sunset.jpg')", dark: false, img: "assets/quote-bgs/bg03-sunset.jpg", thumb: "assets/quote-bgs/bg03-sunset-thumb.jpg" },
    { id: "img-ocean", label: "Ocean", css: "url('assets/quote-bgs/bg04-ocean.jpg')", dark: true, img: "assets/quote-bgs/bg04-ocean.jpg", thumb: "assets/quote-bgs/bg04-ocean-thumb.jpg" },
    { id: "img-forest", label: "Forest", css: "url('assets/quote-bgs/bg05-forest.jpg')", dark: true, img: "assets/quote-bgs/bg05-forest.jpg", thumb: "assets/quote-bgs/bg05-forest-thumb.jpg" },
    { id: "img-blush", label: "Blush", css: "url('assets/quote-bgs/bg06-blush.jpg')", dark: false, img: "assets/quote-bgs/bg06-blush.jpg", thumb: "assets/quote-bgs/bg06-blush-thumb.jpg" },
    { id: "img-lilac", label: "Lilac", css: "url('assets/quote-bgs/bg07-lilac.jpg')", dark: false, img: "assets/quote-bgs/bg07-lilac.jpg", thumb: "assets/quote-bgs/bg07-lilac-thumb.jpg" },
    { id: "img-gold", label: "Gold", css: "url('assets/quote-bgs/bg08-gold.jpg')", dark: false, img: "assets/quote-bgs/bg08-gold.jpg", thumb: "assets/quote-bgs/bg08-gold-thumb.jpg" },
    { id: "img-cream", label: "Cream", css: "url('assets/quote-bgs/bg09-cream.jpg')", dark: false, img: "assets/quote-bgs/bg09-cream.jpg", thumb: "assets/quote-bgs/bg09-cream-thumb.jpg" },
    { id: "img-terra", label: "Terra", css: "url('assets/quote-bgs/bg10-terracotta.jpg')", dark: true, img: "assets/quote-bgs/bg10-terracotta.jpg", thumb: "assets/quote-bgs/bg10-terracotta-thumb.jpg" },
    { id: "img-midnight", label: "Night", css: "url('assets/quote-bgs/bg11-midnight.jpg')", dark: true, img: "assets/quote-bgs/bg11-midnight.jpg", thumb: "assets/quote-bgs/bg11-midnight-thumb.jpg" },
    { id: "img-marble", label: "Marble", css: "url('assets/quote-bgs/bg12-marble.jpg')", dark: false, img: "assets/quote-bgs/bg12-marble.jpg", thumb: "assets/quote-bgs/bg12-marble-thumb.jpg" },
    { id: "img-pastel", label: "Pastel", css: "url('assets/quote-bgs/bg13-pastel-dream.jpg')", dark: false, img: "assets/quote-bgs/bg13-pastel-dream.jpg", thumb: "assets/quote-bgs/bg13-pastel-dream-thumb.jpg" },
    { id: "img-plant", label: "Plant", css: "url('assets/quote-bgs/bg14-minimal-plant.jpg')", dark: false, img: "assets/quote-bgs/bg14-minimal-plant.jpg", thumb: "assets/quote-bgs/bg14-minimal-plant-thumb.jpg" },
    { id: "img-sunset2", label: "Sunset 2", css: "url('assets/quote-bgs/bg15-sunset-ocean.jpg')", dark: false, img: "assets/quote-bgs/bg15-sunset-ocean.jpg", thumb: "assets/quote-bgs/bg15-sunset-ocean-thumb.jpg" },
    { id: "img-forest2", label: "Fog", css: "url('assets/quote-bgs/bg16-forest-mist.jpg')", dark: false, img: "assets/quote-bgs/bg16-forest-mist.jpg", thumb: "assets/quote-bgs/bg16-forest-mist-thumb.jpg" },
    { id: "img-dunes", label: "Dunes", css: "url('assets/quote-bgs/bg17-beige-dunes.jpg')", dark: false, img: "assets/quote-bgs/bg17-beige-dunes.jpg", thumb: "assets/quote-bgs/bg17-beige-dunes-thumb.jpg" },
    { id: "img-white", label: "Light", css: "url('assets/quote-bgs/bg18-white-shadow.jpg')", dark: false, img: "assets/quote-bgs/bg18-white-shadow.jpg", thumb: "assets/quote-bgs/bg18-white-shadow-thumb.jpg" },
    { id: "img-lav2", label: "Lavender", css: "url('assets/quote-bgs/bg19-lavender-sky.jpg')", dark: false, img: "assets/quote-bgs/bg19-lavender-sky.jpg", thumb: "assets/quote-bgs/bg19-lavender-sky-thumb.jpg" },
    { id: "img-peach", label: "Peach", css: "url('assets/quote-bgs/bg20-peach-watercolor.jpg')", dark: false, img: "assets/quote-bgs/bg20-peach-watercolor.jpg", thumb: "assets/quote-bgs/bg20-peach-watercolor-thumb.jpg" },
    { id: "img-night", label: "Night 2", css: "url('assets/quote-bgs/bg21-night-forest.jpg')", dark: true, img: "assets/quote-bgs/bg21-night-forest.jpg", thumb: "assets/quote-bgs/bg21-night-forest-thumb.jpg" },
    { id: "img-linen", label: "Linen", css: "url('assets/quote-bgs/bg22-cream-linen.jpg')", dark: false, img: "assets/quote-bgs/bg22-cream-linen.jpg", thumb: "assets/quote-bgs/bg22-cream-linen-thumb.jpg" },
    { id: "img-teal", label: "Teal", css: "url('assets/quote-bgs/bg23-teal-horizon.jpg')", dark: false, img: "assets/quote-bgs/bg23-teal-horizon.jpg", thumb: "assets/quote-bgs/bg23-teal-horizon-thumb.jpg" },
    { id: "img-blossom", label: "Blossom", css: "url('assets/quote-bgs/bg24-blossom-sky.jpg')", dark: false, img: "assets/quote-bgs/bg24-blossom-sky.jpg", thumb: "assets/quote-bgs/bg24-blossom-sky-thumb.jpg" }
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

  // cache for bg images (avoid reload each render)
  var bgImgCache = {};
  function loadBgImage(src){
    return new Promise(function(res, rej){
      if (bgImgCache[src] && bgImgCache[src].complete) return res(bgImgCache[src]);
      var im = new Image();
      im.onload = function(){ bgImgCache[src]=im; res(im); };
      im.onerror = rej;
      im.src = src;
    });
  }
  function drawBackground(ctx, W, H) {
    if (img) return; // user photo will be drawn
    var bg = bgObj();
    if (bg.img) {
      // image background, draw cover (center-crop)
      var im = bgImgCache[bg.img];
      if (im && im.complete && im.naturalWidth) {
        // cover math
        var iw = im.naturalWidth, ih = im.naturalHeight;
        var scale = Math.max(W/iw, H/ih);
        var dw = iw*scale, dh = ih*scale;
        var dx = (W-dw)/2, dy = (H-dh)/2;
        ctx.drawImage(im, dx, dy, dw, dh);
        // subtle darken for readability if dark bg
        if (bg.dark) { ctx.fillStyle="rgba(0,0,0,0.18)"; ctx.fillRect(0,0,W,H); }
        return;
      } else {
        // fallback while loading, show css colour then async will re-render
        ctx.fillStyle = bg.dark ? "#1a1a1a" : "#fffdf5"; ctx.fillRect(0,0,W,H);
        // trigger load for next render
        loadBgImage(bg.img).then(function(){ /* next render will have it */ });
        return;
      }
    }
    if (bg.id === "none") { ctx.fillStyle = "#111"; ctx.fillRect(0,0,W,H); return; }
    if (bg.css.indexOf("gradient") === 0) {
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
    if (bg.id === "paper" || bg.id === "aged" || bg.id === "cream" || bg.id === "goldbg") {
      ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = "#111";
      for (var i=0;i<W*H/3800;i++){ var x=Math.random()*W, y=Math.random()*H, r=Math.random()*1.2; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
    }
  }

  function drawQuote(ctx, W, H, st) {
    var q = (st.quote || "").trim();
    var by = String(st.byline || "").trim();
    if (!q && !by) return;
    var px = sizePx().px;
    var pad = 60, maxW = W - pad * 2;
    ctx.textBaseline = "alphabetic";
    var fo = fontObj();
    var ucase = fo.caps !== false;
    var text = ucase ? q.toUpperCase() : q;
    ctx.font = (fo.w || 900) + " " + px + "px " + fo.css;
    var lines = q ? wrap(ctx, text, st.theme === "ink" ? maxW : maxW - 40) : [];
    var lineH = Math.round(px * 1.34);
    var byH = by ? Math.round(px * 1.02) : 0;
    var blockH = lines.length * lineH + byH;
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
    // v244: byline, the "author" line, drawn on the export exactly like the preview
    if (by) {
      var byTxt = "" + by;
      var byPx = Math.max(22, Math.round(px * 0.38));
      ctx.font = "700 " + byPx + "px 'Space Grotesk', system-ui, sans-serif";
      var bw2 = ctx.measureText(byTxt).width;
      var bx = (st.align === "left") ? pad : (st.align === "right") ? W - pad - bw2 : (W - bw2) / 2;
      var byy = y - (lines.length ? lineH : 0) + byPx + Math.round(px * 0.18);
      if (st.theme === "ink") {
        ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillText(byTxt, bx + 3, byy + 3);
        ctx.fillStyle = "#ffc800"; ctx.fillText(byTxt, bx, byy);
      } else {
        ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillText(byTxt, bx + 2, byy + 2);
        ctx.fillStyle = st.theme === "yellow" ? "#111" : "#fffdf5";
        ctx.fillText(byTxt, bx, byy);
      }
    }
  }

  /* ------------------------------------------------------------------
     v250 · THE CREDIT CHIP
     Only DOWNLOADS carry it, and it is designed to be liked: a small,
     dark, soft-shadowed sticker with the brand dot, set in the card's own
     type scale. Nothing is drawn on a card that stays inside the app, and
     Gold never sees it at all.
     ------------------------------------------------------------------ */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function drawMark(ctx, W, H, st) {
    var k = Math.max(0.62, Math.min(2.4, W / 1080));      /* draw at any export size */
    var label = "thesmallbook.in";
    var fs = Math.round(22 * k);
    var padX = Math.round(15 * k), padY = Math.round(10 * k);
    var dot = Math.round(10 * k), gap = Math.round(10 * k);
    ctx.save();
    ctx.font = "700 " + fs + "px 'Space Grotesk', Arial, sans-serif";
    var tw = 0; try { tw = ctx.measureText(label).width; } catch (e) { tw = fs * 8; }
    var w = tw + padX * 2 + dot + gap;
    var h = fs + padY * 2;
    var r = h / 2;
    /* tuck it in the corner opposite the words so the quote is never covered */
    var x = (st && st.pos === "bottom") ? (W - w - Math.round(24 * k)) : Math.round(24 * k);
    var y = H - h - Math.round(22 * k);

    ctx.shadowColor = "rgba(0,0,0,.34)";
    ctx.shadowBlur = 14 * k; ctx.shadowOffsetY = 3 * k;
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = "rgba(18,15,11,.60)";
    ctx.fill();
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    ctx.lineWidth = Math.max(1, 1.3 * k);
    ctx.strokeStyle = "rgba(255,248,230,.42)";
    roundRect(ctx, x, y, w, h, r); ctx.stroke();

    ctx.beginPath();
    ctx.arc(x + padX + dot / 2, y + h / 2, dot / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffc800"; ctx.fill();

    ctx.fillStyle = "rgba(255,252,244,.97)";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(label, x + padX + dot + gap, y + h / 2 + Math.max(1, k));
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.restore();
  }

  function ensureFonts() {
    // v244: webfonts (Bebas, Lobster, Playfair…) must be READY before canvas draws them
    try { if (document.fonts && document.fonts.ready) return document.fonts.ready; } catch (e) {}
    return Promise.resolve();
  }
  async function render(noText, want) {
    await ensureFonts();
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
      var bg = bgObj();
      if (bg.img) {
        try { var bIm = await loadBgImage(bg.img); var iw=bIm.naturalWidth, ih=bIm.naturalHeight;
          var sc=Math.max(r.w/iw, r.h/ih); var dw=iw*sc, dh=ih*sc; var dx=(r.w-dw)/2, dy= dh > r.h ? 0 : (r.h-dh)/2; // preserve empty-top sky for aesthetic cards
          ctx.drawImage(bIm, dx, dy, dw, dh);
          if (bg.dark){ ctx.fillStyle="rgba(0,0,0,0.18)"; ctx.fillRect(0,0,r.w,r.h); }
        } catch(e){ drawBackground(ctx, r.w, r.h); }
      } else {
        drawBackground(ctx, r.w, r.h);
      }
    }
    drawScrim(ctx, r.w, r.h, S);
    if (!noText) drawQuote(ctx, r.w, r.h, S);
    /* want.mark === false  -> in-app use (cover / publish): NEVER marked
       want.mark !== false  -> a download, so the free plan signs its work */
    var wantMark = !S.gold && !(want && want.mark === false);
    if (!noText && wantMark) drawMark(ctx, r.w, r.h, S);
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

  async function shareOrDownload(canvas, name) {
    name = name || "thesmallbook-card.png";
    var file;
    try { file = await canvasToFile(canvas, name); }
    catch (e) { toast("❌ Export blocked by the browser, re-pick the photo on this page and try again."); return; }
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "TheSmallBook", text: "Made with 📕 TheSmallBook" }); return; } catch (e) { return; }
    }
    var a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    toast("✅ Card saved, post it anywhere");
  }

  /* ---------- preview (DOM mirror of the canvas math) ---------- */
  /* v250: tell the host page what the card looks like RIGHT NOW, so the page
     preview (and the published quote) uses the same font, ratio and theme the
     writer picked here, instead of snapping back to the old defaults. */
  var styleTimer = 0;
  function styleBag() {
    return { font: S.font, quote: S.quote, byline: S.byline, ratio: S.ratio, bg: S.bg,
             theme: S.theme, pos: S.pos, align: S.align, size: S.size,
             filter: S.filter, scrim: S.scrim, gold: !!S.gold };
  }
  function touchStyle() {
    if (!cfg || typeof cfg.onStyle !== "function") return;
    clearTimeout(styleTimer);
    styleTimer = setTimeout(function () { try { cfg.onStyle(styleBag()); } catch (e) {} }, 120);
  }

  function layoutPreview() {
    if (!root) return;
    var box = $("stuPrev");
    if (!box) return;
    var r = ratio();
    var wrapEl = box.parentNode;
    // v242: accurate wrap width accounting for padding (16*2) + shadow (8) + border (4*2) = ~48
    var wrapW = 320;
    try{
      if(wrapEl){
        var rect = wrapEl.getBoundingClientRect();
        var pad = 32; // 16*2 padding
        var shadow = 16; // shadow + border reserve
        wrapW = Math.floor(rect.width - pad - shadow);
        if(!wrapW || wrapW < 160) wrapW = Math.floor(window.innerWidth - 32 - shadow);
        // clamp to viewport: mobile is narrow, never exceed 92vw
        var vwCap = Math.floor(window.innerWidth * 0.92);
        if(wrapW > vwCap) wrapW = vwCap;
      }
    }catch(e){ wrapW = 320; }
    if (!wrapW || wrapW < 160) wrapW = 320;
    // v246: MAXIMUM true preview, 62% of the viewport on mobile, 72% on desktop; you see the FILE you'll get
    var isMobile = window.innerWidth < 560;
    var maxH = Math.min(window.innerHeight * (isMobile ? 0.62 : 0.72), isMobile ? 640 : 880);
    var k = Math.min(wrapW / r.w, maxH / r.h);
    // never upscale beyond natural for sharpness, but allow slight
    if(k>1) k = Math.min(k, 1.25);
    var bw = Math.floor(r.w * k), bh = Math.floor(r.h * k);
    // ensure box never exceeds wrap (minus shadow)
    if(bw > wrapW) { var sc = wrapW / bw; bw = wrapW; bh = Math.floor(bh * sc); }
    box.style.width = bw + "px"; box.style.height = bh + "px";
    // aesthetic background for preview when no image, supports image BGs
    if (!img || !img.naturalWidth) {
      var bg = bgObj();
      if (bg.img) {
        box.style.backgroundImage = "url('" + bg.img + "')";
        box.style.backgroundSize = "cover";
        box.style.backgroundPosition = "center top"; // keep large empty sky visible for quote
        box.style.backgroundColor = bg.dark ? "#111" : "#fffdf5";
      } else {
        box.style.backgroundImage = "";
        box.style.background = bg.css;
        if (bg.id === "chalk") box.style.background = "#2b2b2b";
      }
    } else {
      box.style.backgroundImage = "";
      box.style.background = "#222";
    }
    var im = $("stuImg");
    var scrim = $("stuScrim");
    if (img && img.naturalWidth && im) {
      im.hidden = false;
      // FIX: ensure DOM img actually shows, was missing src sync
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
    touchStyle();
    var q = $("stuQuote");
    if (q) {
      q.className = "stu-quote stu-quote--" + S.pos + " stu-quote--" + S.align + " stu-quote--" + S.theme + " stu-quote--font-" + S.font;
      var px = Math.max(13, Math.round(sizePx().px * (bw / r.w)));
      var fo = fontObj();
      var isMemePrev = fo.id === "impact";
      q.style.fontFamily = fo.css;
      var extra = isMemePrev ? 'text-shadow:3px 3px 0 #111, -1px -1px 0 #111; letter-spacing:.5px;' : '';
      q.innerHTML = '<div class="q" style="font-size:' + px + 'px; font-family:' + fo.css + '; font-weight:' + (fo.w || 900) + ';' + extra + '"><span>' + esc((S.quote || "").trim() ? (fo.caps!==false ? esc(S.quote) .toUpperCase() : esc(S.quote)) : "YOUR TEXT HERE") + "</span></div>" +
        ((S.byline || "").trim() ? '<div class="b" style="font-size:' + Math.max(10, Math.round(px * 0.4)) + 'px;margin-top:8px">' + esc(S.byline.trim()) + '</div>' : '');
      // hint for empty quote
      if (!(S.quote || "").trim()) q.style.opacity = ".55"; else q.style.opacity = "1";
    }
    // v244: say exactly what file you'll get, size + ratio, professional and honest
    var dims = $("stuDims");
    if (dims) dims.textContent = "EXPORTS AT " + r.w + " × " + r.h + " PX · " + r.label;
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
    var isBg = containerId === "stuBg";
    if (isBg) el.classList.add("stu-bggrid"); else el.classList.remove("stu-bggrid");
    list.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button";
      if (isBg && it.thumb) {
        b.className = "stu-bgthumb" + (it.id === current ? " on" : "");
        b.style.backgroundImage = "url('" + it.thumb + "')";
        b.title = it.label;
        b.innerHTML = '<span class="stu-bgthumb__lab">' + esc(it.label) + '</span>';
      } else if (isBg && it.img) {
        b.className = "stu-bgthumb" + (it.id === current ? " on" : "");
        b.style.backgroundImage = "url('" + it.img + "')";
        b.style.backgroundSize = "cover";
        b.title = it.label;
        b.innerHTML = '<span class="stu-bgthumb__lab">' + esc(it.label) + '</span>';
      } else if (isBg) {
        // v244: colour & gradient backgrounds are REAL swatch tiles now, same clean grid as the photo thumbs
        b.className = "stu-bgthumb" + (it.id === current ? " on" : "");
        if (it.id === "none") b.style.background = "repeating-linear-gradient(45deg,#ffffff 0 7px,#dbe2ea 7px 14px)";
        else { b.style.background = it.css; b.style.backgroundSize = "cover"; }
        b.title = it.label;
        b.innerHTML = '<span class="stu-bgthumb__lab">' + esc(it.label) + '</span>';
      } else {
        b.className = "stu-chip" + (it.id === current ? " on" : "");
        var lab = renderLabel ? renderLabel(it) : esc(it.label);
        b.innerHTML = lab + (it.pro ? '<span class="pro">PRO</span>' : "");
      }
      b.addEventListener("click", function () {
        if (it.pro && !S.gold) { toast("💛 " + it.label + " is a Pro filter, comes with TSB Gold"); return; }
        onPick(it.id);
        chips(containerId, list, it.id, onPick, renderLabel);
        layoutPreview();
        // preload bg image for instant canvas
        if (isBg && it.img) loadBgImage(it.img).catch(function(){});
      });
      el.appendChild(b);
    });
  }

  function buildControls() {
    chips("stuRatio", RATIOS, S.ratio, function (id) { S.ratio = id; layoutPreview(); });
    chips("stuFilter", FILTERS, S.filter, function (id) { S.filter = id; });
    // v244: each font's NAME rendered in its OWN face, judge the look before you tap
    chips("stuFont", FONTS, S.font, function (id) { S.font = id; }, function (it) {
      return '<span style="font-family:' + it.css + ';font-size:17px;line-height:1;text-transform:none;letter-spacing:0;font-weight:' + (it.w || 900) + '">' + esc(it.label) + '</span>';
    });
    chips("stuBg", BGS, S.bg, function (id) { S.bg = id; });
    chips("stuPos", POS, S.pos, function (id) { S.pos = id; });
    chips("stuAlign", ALIGNS, S.align, function (id) { S.align = id; });
    chips("stuSize", SIZES, S.size, function (id) { S.size = id; });
    // v244: theme buttons carry a real colour swatch, INK/PAPER/LOUD at a glance
    chips("stuTheme", THEMES, S.theme, function (id) { S.theme = id; }, function (it) {
      var on = it.id === S.theme;
      var dot = '<span style="display:inline-block;width:11px;height:11px;border:2px solid ' + (on ? "#111" : "#9a938a") + ';border-radius:4px;background:' + it.swatch + ';vertical-align:-1px;margin-right:5px"></span>';
      return dot + esc(it.label);
    });
    var z = $("stuZoom"); if (z) z.addEventListener("input", function () { S.zoom = this.value / 100; layoutPreview(); });
    var sc = $("stuScrimR"); if (sc) sc.addEventListener("input", function () { S.scrim = this.value / 100; layoutPreview(); });
    var ta = $("stuQuoteTa"); if (ta) ta.addEventListener("input", function () { S.quote = this.value; layoutPreview(); });
  }

  /* ---------- open / close ---------- */
  function open(o) {
    cfg = o || {};
    S = {
      ratio: (cfg.ratio || "4:5"), zoom: 1, fx: .5, fy: .5, filter: "orig",
      quote: cfg.quote || "", byline: cfg.byline || "", font: cfg.font || "arch", bg: cfg.bg || "img-pastel",
      pos: "bottom", align: "center", size: "m", theme: "ink", scrim: .55,
      gold: !!(cfg.gold || (window.TSB_GOLD && TSB_GOLD.isGold()))
    };
    // if caller passed src as null, we still open with aesthetic bg
    close();
    root = document.createElement("div");
    root.className = "stu-wrap";
    root.innerHTML =
      '<div class="stu-sheet">' +
        '<div class="stu-top"><b>🎨 CARD STUDIO<small>Instagram-ready · 10 famous fonts · 24 photo backgrounds · what you see is the file</small></b><button class="stu-x" id="stuX">✕</button></div>' +
        '<div class="stu-prevwrap"><div class="stu-prev" id="stuPrev">' +
          '<img id="stuImg" alt="" hidden>' +
          '<div class="stu-scrim" id="stuScrim"></div>' +
          '<div class="stu-quote" id="stuQuote"></div>' +
          '<div class="stu-draghint" id="stuHint">DRAG TO REFRAME · DOUBLE-TAP RESETS</div>' +
          '<div class="stu-mark" id="stuMark"' + (S.gold ? ' hidden' : '') + '><i></i>thesmallbook.in</div>' +
        "</div></div>" +
        '<div id="stuDims" style="flex:none;text-align:center;font:800 10px \'Space Grotesk\',sans-serif;letter-spacing:1.2px;color:#b3ab97;text-transform:uppercase;padding:9px 0 3px;background:#0e0c0a"></div>' +
        '<div class="stu-sec"><div class="stu-lbl">RATIO <small>where will you post it? FREE = original</small></div><div class="stu-chips" id="stuRatio"></div></div>' +
        '<div class="stu-sec"><div class="stu-lbl">PHOTO <small>zoom slider · drag the preview to reframe · no photo? pick a bg below</small></div>' +
          '<input class="stu-range" id="stuZoom" type="range" min="100" max="300" value="100"><div style="height:8px"></div><button type="button" id="stuPick" style="width:100%;border:2.5px solid #111;background:#fff;font:700 12px Space Grotesk,sans-serif;padding:10px;border-radius:999px;box-shadow:2.5px 2.5px 0 #111;cursor:pointer">📷 CHOOSE / CHANGE PHOTO</button>' +
          '<input id="stuFile" type="file" accept="image/*" hidden></div>' +
        '<div class="stu-sec"><div class="stu-lbl">BACKGROUNDS <small>24 aesthetic photos, the proven set, nothing extra · works without any cover photo · FREE exports carry a tiny watermark</small></div><div class="stu-chips" id="stuBg"></div></div>' +
        '<div class="stu-sec"><div class="stu-lbl">MINI FILTERS <small>PRO pack 💛 with Gold</small></div><div class="stu-chips" id="stuFilter"></div></div>' +
        '<div class="stu-sec"><div class="stu-lbl">ADD TEXT <small>type anything, the text looks great ON the image itself · drag, resize, align like Instagram</small></div>' +
          '<textarea class="stu-ta" id="stuQuoteTa" rows="2" maxlength="220" placeholder="Type your text…"></textarea>' +
          '<div style="height:10px"></div>' +
          '<div class="stu-lbl">FONT <small>10 famous faces · each name shown in its own style</small></div><div class="stu-chips" id="stuFont"></div>' +
          '<div style="height:10px"></div>' +
          '<button type="button" id="stuInspire" style="width:100%;border:2.5px solid #111;background:#ffc800;font:800 11px Space Grotesk,sans-serif;letter-spacing:.6px;padding:11px;border-radius:999px;box-shadow:3px 3px 0 #111;cursor:pointer">✨ Inspire Desk, quotes & aesthetic images</button><div style="font:600 10px Space Grotesk,sans-serif;color:#64748b;text-align:center;margin-top:6px;letter-spacing:.3px">Live library for quotes, tap to fill, not a verifier</div>' +
          '<div style="height:10px"></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><div class="stu-lbl">SHADE <small>readability</small></div><input class="stu-range" id="stuScrimR" type="range" min="0" max="85" value="55"></div><div><div class="stu-lbl">SIZE</div><div class="stu-chips" id="stuSize"></div></div></div>' +
          '<div style="height:10px"></div>' +
          '<div class="stu-lbl">TEXT LAYOUT</div>' +
          '<div class="stu-chips" id="stuPos"></div><div style="height:8px"></div>' +
          '<div class="stu-chips" id="stuAlign"></div><div style="height:8px"></div>' +
          '<div class="stu-chips" id="stuTheme"></div>' +
        "</div>" +
        (S.gold ? '<div class="stu-gold">💛 GOLD, Pro filters, no credit chip on downloads, ever.</div>'
                : '<div class="stu-gold">Posting in the app = <b>clean, no mark</b>. Downloading the file adds one small <span style="background:#111;color:#ffc800;padding:2px 6px;border-radius:999px;font-size:10px;">thesmallbook.in</span> chip · <a href="gold.html">Gold removes it →</a></div>') +
        '<div class="stu-foot">' +
          '<button class="stu-apply stu-foot__main" id="stuApply">✔ USE AS COVER</button>' +
          '<button class="stu-dl" id="stuDl">⬇ DOWNLOAD CARD</button>' +
          '<button class="stu-dl" id="stuDlPhoto" style="background:#fff">⬇ PHOTO ONLY</button>' +
        '</div>' +
      "</div>";
    document.body.appendChild(root);

    $("stuX").addEventListener("click", close);
    root.addEventListener("click", function (e) { if (e.target === root) close(); });
    $("stuDl").addEventListener("click", async function () {
      this.textContent = "… rendering";
      try { await shareOrDownload(await renderSafe(), "thesmallbook-card.png"); }
      catch (e) { toast("❌ This photo\u2019s source is blocking exports \u2014 save it and add it from your gallery, or pick another."); }
      finally { this.textContent = "⬇ DOWNLOAD CARD"; }
    });
    // v244: export the picture ALONE, clean image, no text, no watermark (your "image & text separately" choice)
    $("stuDlPhoto").addEventListener("click", async function () {
      this.textContent = "… rendering";
      try { await shareOrDownload(await renderSafe(true), "thesmallbook-photo.png"); }
      catch (e) { toast("❌ This photo\u2019s source is blocking exports \u2014 save it and add it from your gallery, or pick another."); }
      finally { this.textContent = "⬇ PHOTO ONLY"; }
    });
    $("stuApply").addEventListener("click", async function () {
      this.textContent = "… rendering";
      try {
        /* in-app cover: no credit chip, the free mark only rides downloads */
        var file = await canvasToFile(await renderSafe({ mark: false }), "studio-card.png");
        try { window.TSB_STUDIO = window.TSB_STUDIO || {}; window.TSB_STUDIO._last = { quote: S.quote || "", byline: S.byline || "" }; } catch (eLast) {}
        if (cfg.onApply) await cfg.onApply(file, styleBag());
        toast("✅ Studio card set as your cover");
        close();
      } catch (e) {
        toast("❌ Couldn\u2019t compose. This photo\u2019s source is blocking exports \u2014 save it and add it from your gallery, or pick another.");
      } finally { this.textContent = "✔ USE AS COVER"; }
    });

    /* the chip in the preview = the chip in the DOWNLOAD (never in-app) */
    var mEl = $("stuMark");
    if (mEl) mEl.hidden = !!S.gold;
    $("stuQuoteTa").value = S.quote;
    var vBtn = $("stuInspire");
    if (vBtn) vBtn.addEventListener("click", function(){
      var q = ($("stuQuoteTa").value||"").trim() || S.quote || "";
      var api = window.TSB_OSINT||window.TSB_INSPIRE;
      if(api && api.openInspire){
        api.openInspire("quotes", q, { tabs:["quotes","images"],
          onUseQuote: function(o){
            var txt=o.text||"", auth=o.author||"";
            S.quote = txt;
            if (auth && !(S.byline||"").trim()) S.byline = auth;   /* v287: the author is a byline, not part of the sentence */
            var ta=$("stuQuoteTa"); if(ta) ta.value=S.quote;
            layoutPreview();
            toast("✨ Quote loaded, tweak it to make it yours");
          },
          onUseImage: function(url){
            // Smooth: load picked aesthetic image directly into the card preview (no extra window)
            try{
              var isPic = /picsum|wikimedia|upload\.wikimedia/i.test(url);
              // v285: desk images load CORS-first. Without it the canvas taints and
              // every export dies with "Couldn't compose". Desk sources send CORS
              // headers; the _corsFailed fallback still covers the odd one out.
              if(typeof _load === "function"){
                _load(url, true);
                toast("✨ Aesthetic image loaded, drag to reframe, pick ratio");
              } else {
                window.open(url,"_blank");
              }
            }catch(e){ window.open(url,"_blank"); }
            return Promise.resolve();
          },
          onUseResearch: function(snippet){
            S.quote = (S.quote ? S.quote + " " : "") + snippet.slice(0,120);
            var ta2=$("stuQuoteTa"); if(ta2) ta2.value=S.quote;
            layoutPreview();
            toast("✨ Research added to text");
          }
        });
      } else {
        toast("✨ Inspire Desk loading…");
        window.open("https://api.quotable.io/quotes?limit=8","_blank");
      }
    });
    // compat: keep old id if cached sheet is open
    var vOld = $("stuVerify");
    if (vOld) vOld.addEventListener("click", function(){
      var qq = ($("stuQuoteTa").value||"").trim() || S.quote || "";
      var api2 = window.TSB_OSINT||window.TSB_INSPIRE;
      if(api2 && api2.openInspire) api2.openInspire("quotes", qq, { tabs:["quotes","images"], onUseQuote: function(o){ S.quote=o.text; var tt=$("stuQuoteTa"); if(tt) tt.value=S.quote; layoutPreview(); }});
    });
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
        toast("📷 Photo loaded, drag to reframe");
      });
    }

    var _corsFailed = false;
    function _finalizeLoad() {
      // v245: auto-FREE for tall AND wide photos, the whole picture is the card, never a cropped 20% slice
      if (img && img.naturalHeight > img.naturalWidth * 1.35) S.ratio = "free";
      else if (img && img.naturalWidth > img.naturalHeight * 1.15) S.ratio = "free";
      buildControls(); bindDrag(); layoutPreview();
      if(_corsFailed) toast("⚠️ Preview only, re-upload the photo on this page for a clean export (original link blocked).");
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
        toast("❌ Couldn't load that image, try another");
        img = null;
        buildControls(); bindDrag(); layoutPreview();
      };
      img.src = src;
    }
    /* v286: if an export ever still hits a tainted canvas, re-fetch the photo as a
       same-origin blob and render again — the user never sees "Couldn't compose". */
    async function _detaint() {
      try {
        if (!img || !img.src || !/^https?:\/\//.test(img.src)) return false;
        var b = await fetch(img.src, { mode: "cors", credentials: "omit" }).then(function (r) { if (!r.ok) throw new Error("bad"); return r.blob(); });
        var u = URL.createObjectURL(b);
        var ok = await new Promise(function (res) {
          var done = false;
          _load(u, false);
          var t = setInterval(function () { if (img && img.src === u && img.complete && img.naturalWidth) { done = true; clearInterval(t); res(true); } }, 60);
          setTimeout(function () { if (!done) { clearInterval(t); res(!!(img && img.complete && img.naturalWidth)); } }, 2500);
        });
        return ok;
      } catch (e) { return false; }
    }
    async function renderSafe(photoOnly, opts) {
      try { return await render(photoOnly, opts); }
      catch (e1) { if (await _detaint()) return await render(photoOnly, opts); throw e1; }
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
      // no image, still show UI with backgrounds
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

  /* ---------- v244: headless compose, the publish flow bakes the quote INTO the image without opening the sheet ---------- */
  async function compose(o) {
    o = o || {};
    await ensureFonts();
    var keepImg = img, keepS = S, keepCfg = cfg;
    try {
      var src = o.src || "";
      var local = null;
      if (src) {
        var u = src;
        if (/^https?:\/\//.test(src) && !/^blob:/.test(src)) {
          try {
            var bb = await fetch(src, { mode: "cors", credentials: "omit" }).then(function (r) { if (!r.ok) throw new Error("bad"); return r.blob(); });
            u = URL.createObjectURL(bb);
          } catch (e) { u = src; }
        }
        local = await new Promise(function (res) {
          var im = new Image();
          im.onload = function () { res(im); };
          im.onerror = function () { res(null); };
          im.src = u;
        });
      }
      img = local;
      S = {
        ratio: o.ratio || "4:5", zoom: 1, fx: .5, fy: .5,
        filter: o.filter || "orig", quote: o.quote || "", byline: o.byline || "",
        font: o.font || "arch", bg: o.bg || "img-pastel",
        pos: o.pos || "bottom", align: o.align || "center", size: o.size || "m",
        theme: o.theme || "ink", scrim: .55,
        gold: !!(o.gold || (window.TSB_GOLD && TSB_GOLD.isGold()))
      };
      var canvas = await render(false, { mark: (o.mark === true) });
      return await canvasToFile(canvas, "thesmallbook-card.png");
    } finally {
      img = keepImg; S = keepS; cfg = keepCfg;
    }
  }

  window.TSB_STUDIO = { open: open, close: close, compose: compose };
})();
