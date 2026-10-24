/* ============================================================
   THESMALLBOOK - BOOK DETAIL PAGE
   Lessons, mark-as-read, HQ text-to-speech, share-card image
   generator, quote images, checkable plans, related books.
   ============================================================ */

(function () {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const book = BOOKS.find((b) => b.id === id) || BOOKS[0];
  const idx = BOOKS.indexOf(book);

  /* ---------- dynamic SEO: the reader page wears the book's real face ----------
     A direct hit on book.html?id=x gets a full title, description and a
     canonical pointing at the static summary page, so Google sees one clean
     URL per book and never a templated "Book, TheSmallBook". */
  document.title = `${book.title} Summary \u2014 Key Lessons, Notes & Action Steps (Free) | TheSmallBook`;
  try {
    const setM = (sel, attr, val) => {
      let el = document.head.querySelector(sel);
      if (!el) { el = document.createElement("meta"); const [a, k] = sel.replace(/[\[\]"]/g, "").split("="); el.setAttribute(a, k); document.head.appendChild(el); }
      el.setAttribute(attr, val);
    };
    const desc = `${book.title} by ${book.author || "the original author"}: free summary, no paywall \u2014 ${book.lessons.length} key lessons with real examples, quotes and an action plan. Read online free.`;
    const url = `https://thesmallbook.in/books/${book.id}.html`;
    setM('meta[name="description"]', "content", desc);
    setM('meta[property="og:title"]', "content", document.title);
    setM('meta[property="og:description"]', "content", desc);
    setM('meta[property="og:url"]', "content", url);
    setM('meta[property="og:image"]', "content", `https://thesmallbook.in/${String(book.cover || "").replace(/^\//, "")}`);
    let can = document.head.querySelector('link[rel="canonical"]');
    if (!can) { can = document.createElement("link"); can.rel = "canonical"; document.head.appendChild(can); }
    can.href = url;
  } catch (e) {}
  TSB.achv.award("first-open");
  TSB.lastRead.set(book.id);

  /* ---------- HERO ---------- */
  document.getElementById("cover").src = book.cover;
  document.getElementById("cover").alt = `${book.title} cover`;

  document.getElementById("cat").textContent = book.category;
  document.getElementById("title").textContent = book.title;
  document.getElementById("author").textContent = `by ${book.author} · ${book.year}`;
  /* ✦ TheSmallBook Original - the in-house shelf */
  try {
    var origs = (window.TSB_CONFIG && TSB_CONFIG.ORIGINALS) || [];
    var origIdx = origs.indexOf(book.id);
    if (origIdx >= 0) {
      var isSpecial = origIdx >= 5;
      var ob = document.createElement("div");
      ob.className = "origband";
      ob.innerHTML = '<span class="origband__row">✦ THE SMALLBOOK ORIGINAL' + (isSpecial ? ' · GOLD EDITION' : '') + ' ✦</span>' +
        '<small>' + (isSpecial ? 'Special in-house edition. 5 in-house originals are free; remaining unlock with Gold.' : 'Written in-house. You will not find this book anywhere else.') + '</small>';
      document.getElementById("author").after(ob);
    }
  } catch (e) {}
  document.getElementById("oneliner").textContent = book.oneLiner;

  function drawBadges() {
    const read = TSB.progress.forBook(book.id).length;
    document.getElementById("badges").innerHTML = `
      <span class="badge badge--yellow">⏱ ${book.readTime} read</span>
      <span class="badge badge--green">${read}/${book.lessons.length} lessons read</span>
      <span class="badge badge--pink">${book.quotes.length} key quotes</span>`;
  }
  drawBadges();

  /* ---------- 📖 BUY THE FULL BOOK (Amazon affiliate) in utility bar ---------- */
  (function () {
    const amazonLink = document.getElementById("nbAmazonLink");
    if (amazonLink) {
      amazonLink.href = TSB.amazonLink(book.title, book.author, book.id);
    }
  })();

  /* ---------- ACTION BAR: ONLY POPULATE IF NOT ALREADY IN DOM ---------- */
  const bar = document.getElementById("actionbar");
  if (bar && !document.getElementById("expandBtn")) {
    bar.innerHTML = `
      <button class="abtn abtn--expand" id="expandBtn" title="Open every lesson">
        <i class="abtn__ico">⤵</i><span class="abtn__lbl">EXPAND ALL</span>
      </button>
      <button class="abtn abtn--font" id="fontBtn" title="Adjust text size">
        <i class="abtn__ico">🔠</i><span class="abtn__lbl">TEXT SIZE</span>
      </button>
      <button class="abtn abtn--link" id="shareLinkBtn" title="Copy link" translate="no">
        <i class="abtn__ico">🔗</i><span class="abtn__lbl">COPY LINK</span>
      </button>`;
  }

  /* Sync and wire primary favBtn on top row */
  const favBtn = document.getElementById("favBtn");
  if (favBtn) {
    const isSaved = TSB.bookmarks.has(book.id);
    favBtn.classList.toggle("on", isSaved);
    const ico = favBtn.querySelector(".nav-svg--heart") || favBtn.querySelector("svg");
    if (ico) {
      ico.setAttribute("fill", isSaved ? "#e53935" : "none");
      ico.setAttribute("stroke", isSaved ? "#e53935" : "currentColor");
    }
  }

  if (favBtn) {
    favBtn.addEventListener("click", () => {
      const on = TSB.bookmarks.toggle(book.id);
      favBtn.classList.toggle("on", on);
      const ico = favBtn.querySelector(".nav-svg--heart") || favBtn.querySelector("svg");
      if (ico) {
        ico.setAttribute("fill", on ? "#e53935" : "none");
        ico.setAttribute("stroke", on ? "#e53935" : "currentColor");
      }
      toast(on ? "Saved to your shelf" : "Removed from your shelf");
      if (window.TSB_AUTH && window.TSB_AUTH.enabled) window.TSB_AUTH.track();
    });
  }

  /* Wire primary book action bar */
  const rdrLink = document.getElementById("nbOpenReader");
  if (rdrLink) {
    rdrLink.href = "reader.html?id=" + encodeURIComponent(book.id);
  }

  const heroListen = document.getElementById("nbHeroListen");
  if (heroListen) {
    heroListen.addEventListener("click", () => {
      const heroPodcast = document.getElementById("heroPodcastBtn");
      if (heroPodcast) heroPodcast.click();
      else playPodcastLive();
    });
  }

  const saveTop = document.getElementById("nbSaveTop");
  if (saveTop) {
    const isSaved = TSB.bookmarks.has(book.id);
    saveTop.textContent = isSaved ? "❤️ Saved" : "🤍 Save";
    saveTop.addEventListener("click", () => {
      const fb = document.getElementById("favBtn");
      if (fb) fb.click();
    });
  }

  const shareTop = document.getElementById("nbShareTop");
  if (shareTop) {
    shareTop.addEventListener("click", () => {
      const sb = document.getElementById("shareBtn");
      if (sb) sb.click();
    });
  }

  const transBtn = document.getElementById("nbBookTranslate");
  if (transBtn) {
    transBtn.addEventListener("click", () => {
      const lb = document.querySelector("[data-lang-btn]");
      if (lb) lb.click();
      else if (window.TSB && window.TSB.openLangModal) window.TSB.openLangModal();
    });
  }

  const amazonLink = document.getElementById("nbAmazonLink");
  if (amazonLink) {
    amazonLink.href = book.affiliate || ("https://www.amazon.in/s?k=" + encodeURIComponent(book.title + " " + book.author));
  }

  const noteLink = document.getElementById("nbNoteLink");
  if (noteLink) {
    noteLink.href = "notes.html?book=" + encodeURIComponent(book.title);
  }

  /* 🎧 PODCAST MODE - full-book listening via TTS_ENGINE
     Uses the LIVE translated text from the DOM (like the 🔊 LISTEN button),
     so it reads in whatever language the page is currently showing. */
  function playPodcastLive() {
    const lang = currentSpeechLang();
    const lessons = book.lessons || [];
    const total = lessons.length;
    const tTitle = liveText("#title", book.title);
    const tAuthor = liveText("#author", "by " + book.author).replace(/^by\s+/i, "");
    const tOne = liveText("#oneliner", book.oneLiner);
    const tBig = liveText("#bigidea", book.bigIdea);
    const bookMeta = { book: tTitle, lesson: tTitle, idx: 0, cover: book.cover, author: tAuthor };

    /* intro templates get translated too (one batched request) */
    const intros = ["You are listening to " + tTitle + (tAuthor ? " by " + tAuthor : "") + "."];
    lessons.forEach((_, i) => intros.push("Lesson " + (i + 1) + " of " + total + "."));

    const finalize = (trIntros) => {
      const parts = [];
      parts.push({ text: tOne, intro: trIntros[0], lang: lang, pause: 700, meta: bookMeta });
      if (tBig) parts.push({ text: tBig, lang: lang, pause: 1100, meta: bookMeta });
      lessons.forEach((l, i) => {
        const live = liveLesson(i); /* translated DOM content */
        const m = { book: tTitle, lesson: live.title, idx: i, cover: book.cover, author: tAuthor };
        parts.push({ text: live.title, intro: trIntros[i + 1], lang: lang, pause: 700, meta: m });
        parts.push({ text: live.summary, lang: lang, pause: 750, meta: m });
        if (live.example) parts.push({ text: live.example, lang: lang, pause: 750, meta: m });
        if (live.action) parts.push({ text: live.action, lang: lang, pause: 900, meta: m });
      });
      window.TTS_ENGINE.playParts(parts);
    };

    if (lang !== "en" && window.TTS_ENGINE.translate) {
      window.TTS_ENGINE.translate(intros, lang).then(finalize).catch(() => finalize(intros));
    } else finalize(intros);
  }

  /* 🎧 AUDIOBOOK MODE - human LibriVox audiobooks & category shelves */
  (function () {
    const actionBtn = document.getElementById("podcastBtn");
    const heroBtn = document.getElementById("heroPodcastBtn");
    const pbs = [actionBtn, heroBtn].filter(Boolean);
    if (!pbs.length) return;

    const CATEGORY_AUDIOBOOKS = {
      wealth: [
        { id: "richest-man-babylon", title: "The Richest Man in Babylon", author: "George S. Clason", chapters: 18 },
        { id: "science-of-getting-rich", title: "The Science of Getting Rich", author: "Wallace D. Wattles", chapters: 17 },
        { id: "as-a-man-thinketh", title: "As a Man Thinketh", author: "James Allen", chapters: 7 }
      ],
      stoic: [
        { id: "meditations", title: "Meditations", author: "Marcus Aurelius", chapters: 12 },
        { id: "art-of-war", title: "The Art of War", author: "Sun Tzu", chapters: 13 },
        { id: "tao-te-ching", title: "Tao Te Ching", author: "Lao Tzu", chapters: 81 }
      ],
      life: [
        { id: "siddhartha", title: "Siddhartha", author: "Hermann Hesse", chapters: 12 },
        { id: "bhagavad-gita", title: "Bhagavad Gita", author: "Sir Edwin Arnold", chapters: 18 },
        { id: "the-prophet", title: "The Prophet", author: "Kahlil Gibran", chapters: 28 }
      ],
      classics: [
        { id: "franklin-autobiography", title: "Autobiography of Benjamin Franklin", author: "Benjamin Franklin", chapters: 15 },
        { id: "walden", title: "Walden", author: "Henry David Thoreau", chapters: 18 },
        { id: "the-prince", title: "The Prince", author: "Niccolò Machiavelli", chapters: 26 }
      ]
    };

    function getCategoryAudiobooks(b) {
      const cat = (b.category || "").toLowerCase();
      if (/money|wealth|finance|business|career|work|invest/i.test(cat)) return { name: "Mind & Wealth", list: CATEGORY_AUDIOBOOKS.wealth };
      if (/stoic|mind|philosophy|think|mental/i.test(cat)) return { name: "Philosophy & Stoicism", list: CATEGORY_AUDIOBOOKS.stoic };
      if (/classic|history|bio|leadership/i.test(cat)) return { name: "World Classics", list: CATEGORY_AUDIOBOOKS.classics };
      return { name: "Life & Wisdom", list: CATEGORY_AUDIOBOOKS.life };
    }

    function showCategoryAudiobooksModal(catInfo) {
      const existing = document.getElementById("tsbCategoryAudioModal");
      if (existing) existing.remove();
      const modal = document.createElement("div");
      modal.id = "tsbCategoryAudioModal";
      modal.className = "tsb-auth-gate-blur";
      modal.innerHTML = '<div class="tsb-auth-gate-card" style="max-width:440px; text-align:left; padding:24px 22px;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">' +
          '<span style="font-family:var(--font-head); font-size:11px; letter-spacing:1px; background:var(--yellow); color:var(--ink); padding:4px 10px; border-radius:999px; border:2px solid var(--ink); font-weight:900;">' +
            '🎧 ' + catInfo.name.toUpperCase() + ' AUDIOBOOKS' +
          '</span>' +
          '<button id="tsbCatAudioClose" type="button" style="background:transparent; border:none; font-size:18px; font-weight:800; cursor:pointer; color:var(--ink); padding:2px 6px;">✕</button>' +
        '</div>' +
        '<h3 style="font-family:var(--font-head); font-size:1.15rem; line-height:1.25; margin:0 0 6px; color:var(--ink);">' +
          'Listen to 3 Classics in this Category' +
        '</h3>' +
        '<p style="font-size:0.85rem; line-height:1.5; color:var(--sub,#555); margin:0 0 16px;">' +
          'Full-length human-narrated audiobooks from LibriVox matching this book’s theme:' +
        '</p>' +
        '<div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">' +
          catInfo.list.map(function (item) {
            return '<div style="display:flex; align-items:center; justify-content:space-between; background:var(--paper,#fff); border:2.5px solid var(--ink); border-radius:12px; padding:10px 12px; box-shadow:3px 3px 0 var(--ink);">' +
              '<div style="flex:1; min-width:0; padding-right:10px;">' +
                '<b style="font-family:var(--font-head); font-size:0.85rem; display:block; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + item.title + '</b>' +
                '<span style="font-size:0.75rem; color:var(--sub,#666);">' + item.author + ' · ' + item.chapters + ' chapters</span>' +
              '</div>' +
              '<button data-catplay="' + item.id + '" type="button" style="background:var(--yellow); color:var(--ink); border:2px solid var(--ink); border-radius:8px; font-family:var(--font-head); font-size:0.75rem; padding:8px 12px; cursor:pointer; font-weight:900; white-space:nowrap; box-shadow:2px 2px 0 var(--ink);">' +
                '▶ PLAY' +
              '</button>' +
            '</div>';
          }).join("") +
        '</div>' +
        '<a href="podcasts.html" style="display:block; text-align:center; font-family:var(--font-head); font-size:0.8rem; color:var(--ink); text-decoration:underline;">' +
          'Browse all audiobooks in the Audio Room →' +
        '</a>' +
      '</div>';
      document.body.appendChild(modal);
      document.getElementById("tsbCatAudioClose").addEventListener("click", function () { modal.remove(); });
      modal.addEventListener("click", function (e) {
        if (e.target === modal) modal.remove();
        var playBtn = e.target.closest("[data-catplay]");
        if (playBtn) {
          var abId = playBtn.getAttribute("data-catplay");
          modal.remove();
          if (window.TSB_AUDIO && TSB_AUDIO.playAudiobook) {
            TSB_AUDIO.playAudiobook(abId);
          } else {
            location.href = "podcasts.html?ab=" + encodeURIComponent(abId);
          }
        }
      });
    }

    function setHeroPlaying(on) {
      if (!heroBtn) return;
      heroBtn.classList.toggle("podcastbtn--playing", on);
      const lbl = heroBtn.querySelector(".podcastbtn__label");
      if (lbl) lbl.textContent = on ? "Stop Audiobook" : "Listen: Full Audiobook";
      const live = heroBtn.querySelector(".podcastbtn__live");
      if (live) live.textContent = on ? "LIVE" : "AUDIOBOOK";
    }
    function setActionPlaying(on) {
      if (actionBtn) actionBtn.textContent = on ? "⏹ STOP AUDIOBOOK" : "🎧 AUDIOBOOK MODE";
    }
    function syncAll(on) { setHeroPlaying(on); setActionPlaying(on); }

    pbs.forEach((pb) => {
      pb.addEventListener("click", () => {
        if (window.TSB_AUDIO && window.TSB_AUDIO.pause) {
          try { window.TSB_AUDIO.pause(); } catch (eA) {}
        }
        if (window.TSB_AUDIO && window.TSB_AUDIO.close) {
          try { window.TSB_AUDIO.close(); } catch (eC) {}
        }
        document.body.classList.remove("tsb-audio-live");
        stopSpeech(); // stop any single-lesson speech first
        playPodcastLive();
      });
    });

    if (heroBtn) {
      const lbl = heroBtn.querySelector(".podcastbtn__label");
      if (lbl) lbl.textContent = "LISTEN";
      const live = heroBtn.querySelector(".podcastbtn__live");
      if (live) live.textContent = "NARRATOR";
    }

    // keep the buttons in sync when the player is closed or podcast ends
    if (window.TTS_ENGINE) {
      window.TTS_ENGINE.onProgress(() => {
        syncAll(!!window.TTS_ENGINE.playing);
      });
    }

    // Auto-stream via TTS narrator if arrived via listen parameter
    try {
      if (new URLSearchParams(window.location.search).get("listen") === "1") {
        setTimeout(function () {
          playPodcastLive();
        }, 500);
      }
    } catch (eListen) {}
  })();

  function toast(msg) {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast"; t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2800);
  }

  /* ============================================================
     SHARE CARD GENERATOR v2 - STORY FORMAT (1080×1920)
     • Uses the LIVE on-screen text - so cards come out in
       whatever language the reader is using (Hindi, Hinglish...)
     • WhatsApp-status / Instagram-story ready with full branding
     ============================================================ */
  const PALETTES = [
    /* solids */
    { bg: "#ffc800", fg: "#111111" },
    { bg: "#ff90e8", fg: "#111111" },
    { bg: "#00c48c", fg: "#111111" },
    { bg: "#4d7cff", fg: "#ffffff" },
    { bg: "#ff8a3d", fg: "#111111" },
    { bg: "#b28dff", fg: "#111111" },
    { bg: "#ff4d4d", fg: "#ffffff" },
    { bg: "#3ec9e6", fg: "#111111" },
    { bg: "#111111", fg: "#ffc800" },
    { bg: "#fffdf5", fg: "#111111" },
    /* gradient mixes */
    { bg: "#ffc800", bg2: "#ff8a3d", fg: "#111111" },   // sunset gold
    { bg: "#ff90e8", bg2: "#b28dff", fg: "#111111" },   // candy floss
    { bg: "#00c48c", bg2: "#3ec9e6", fg: "#111111" },   // mint ocean
    { bg: "#4d7cff", bg2: "#b28dff", fg: "#ffffff" },   // twilight
    { bg: "#ff4d4d", bg2: "#ff8a3d", fg: "#ffffff" },   // lava
    { bg: "#ff90e8", bg2: "#ffc800", fg: "#111111" },   // bubblegum sun
    { bg: "#3ec9e6", bg2: "#4d7cff", fg: "#ffffff" },   // deep sea
    { bg: "#111111", bg2: "#4a3800", fg: "#ffc800" },   // midnight gold
    { bg: "#1a0533", bg2: "#4d1a66", fg: "#ff90e8" },   // neon night
    { bg: "#00c48c", bg2: "#ffc800", fg: "#111111" }    // tropic punch
  ];

  /* paint a palette onto a canvas region (solid or diagonal gradient mix) */
  function paintPalette(ctx, pal, W, H) {
    if (pal.bg2) {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, pal.bg);
      g.addColorStop(1, pal.bg2);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = pal.bg;
    }
    ctx.fillRect(0, 0, W, H);
  }

  /* --- live (translated) text helpers --- */
  function liveText(sel, fallback) {
    const el = typeof sel === "string" ? document.querySelector(sel) : sel;
    let t = "";
    if (el) {
      t = el.innerText !== undefined ? el.innerText : el.textContent;
      t = (t || "").replace(/\s+/g, " ").trim();
    }
    return t || fallback || "";
  }
  function liveCallout(lessonIdx, cls) {
    const el = document.querySelector(`#lesson-${lessonIdx} .${cls}`);
    if (!el) return "";
    const clone = el.cloneNode(true);
    const tag = clone.querySelector("strong.tag");
    if (tag) tag.remove();
    const t = clone.innerText !== undefined ? clone.innerText : clone.textContent;
    return (t || "").replace(/\s+/g, " ").trim();
  }
  function liveLesson(i) {
    return {
      title: liveText(`#lesson-${i} .lesson__title`, book.lessons[i].title),
      chapter: liveText(`#lesson-${i} .lesson__chapter`, book.lessons[i].chapter),
      summary: liveText(`#lesson-${i} .lesson__body p`, book.lessons[i].summary),
      example: liveCallout(i, "callout--example") || book.lessons[i].example,
      action: liveCallout(i, "callout--action") || book.lessons[i].action
    };
  }
  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      img.onload = () => finish(img);
      img.onerror = () => finish(null);
      // safety: never hang the card on a slow/stuck image
      setTimeout(() => finish(null), 2500);
      img.src = src;
    });
  }

  /* wrapText v2 - handles long words + scripts without spaces (中文, 日本語) */
  function wrapText(ctx, text, maxWidth) {
    const lines = [];
    let line = "";
    const pushWord = (w) => {
      if (ctx.measureText((line + " " + w).trim()).width <= maxWidth) {
        line = (line + " " + w).trim();
        return;
      }
      if (line) { lines.push(line); line = ""; }
      if (ctx.measureText(w).width <= maxWidth) { line = w; return; }
      // word longer than the line (CJK / URLs): split by character
      let chunk = "";
      for (const ch of w) {
        if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
          lines.push(chunk); chunk = "";
        }
        chunk += ch;
      }
      line = chunk;
    };
    text.split(/\s+/).forEach(pushWord);
    if (line.trim()) lines.push(line.trim());
    return lines;
  }

  function drawDots(ctx, W, H) {
    ctx.fillStyle = "rgba(17,17,17,.08)";
    for (let x = 22; x < W; x += 46)
      for (let y = 22; y < H; y += 46) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
  }

  /* draw a cover image INSIDE a box, preserving its aspect ratio and
     centering it - no stretching, no misalignment on any card */
  function drawCoverCentered(ctx, img, x, y, w, h) {
    if (!img || !img.width || !img.height) {
      ctx.fillStyle = "#fffdf5";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#111"; ctx.font = Math.round(h * 0.3) + "px Arial"; ctx.textAlign = "center";
      ctx.fillText("📕", x + w / 2, y + h * 0.65);
      ctx.textAlign = "left";
      return;
    }
    const iw = img.width, ih = img.height;
    const scale = Math.min(w / iw, h / ih);
    const dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function drawBrandBar(ctx, W, H) {
    // black branding strip - clean, no URL (let them ask for the link 😉)
    const barH = 200;
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, H - barH, W, barH);
    ctx.fillStyle = "#ffc800";
    ctx.fillRect(0, H - barH, W, 8);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffc800";
    ctx.font = "900 60px 'Archivo Black', Arial";
    ctx.fillText("📕 THESMALLBOOK.IN", W / 2, H - barH + 92);
    /* LIVE totals - always current, never a hardcoded number */
    const nBooks = (window.BOOKS || []).length;
    const nLessons = (window.BOOKS || []).reduce((a, b) => a + (b.lessons ? b.lessons.length : 0), 0);
    const tag = nBooks + "+ BOOKS · " + nLessons + "+ LESSONS · FREE TO READ";
    ctx.fillStyle = "#f2ede2";
    let fs = 28;
    ctx.font = "bold " + fs + "px 'Space Grotesk', Arial";
    while (ctx.measureText(tag).width > W - 60 && fs > 18) { fs -= 2; ctx.font = "bold " + fs + "px 'Space Grotesk', Arial"; }
    ctx.fillText(tag, W / 2, H - barH + 140);
    ctx.textAlign = "left";
  }

  /* v223 watermark: free exports carry the site chip - Gold removes it.
     Every shared card becomes a signpost back to thesmallbook.in. */
  function drawWatermark(ctx, W, H, y) {
    var label = "📕 thesmallbook.in";
    ctx.font = "700 26px 'Space Grotesk', Arial";
    var w = ctx.measureText(label).width + 56, h = 56;
    var x = W - w - 36; y = y || 96;
    ctx.fillStyle = "rgba(17,17,17,.92)"; ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 4; ctx.strokeStyle = "#ffc800"; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#ffc800"; ctx.textAlign = "center";
    ctx.fillText(label, x + w / 2, y + 37);
    ctx.textAlign = "left";
  }
  function isGoldNow() { return !!(window.TSB_GOLD && window.TSB_GOLD.isGold()); }

  async function renderBookCard() {
    // CAROUSEL FORMAT: 1080×1350 (4:5) - Instagram carousel max vertical, ZERO crop
    const W = 1080, H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const pal = PALETTES[idx % 8];

    // live (translated) content
    const tTitle = liveText("#title", book.title);
    const tAuthor = liveText("#author", "by " + book.author);
    const tOneliner = liveText("#oneliner", book.oneLiner);
    const tCategory = liveText("#cat", book.category);

    // background
    ctx.fillStyle = "#f2ede2";
    ctx.fillRect(0, 0, W, H);
    drawDots(ctx, W, H);

    // top ticker strip
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, W, 76);
    ctx.fillStyle = "#ffc800";
    ctx.font = "900 28px 'Archivo Black', Arial";
    ctx.textAlign = "center";
    ctx.fillText("✦ MUST-READ BREAKDOWN ✦", W / 2, 50);

    // category pill
    ctx.font = "bold 24px 'Space Grotesk', Arial";
    const catW = ctx.measureText(tCategory.toUpperCase()).width + 52;
    ctx.fillStyle = "#111";
    ctx.fillRect((W - catW) / 2, 96, catW, 50);
    ctx.fillStyle = "#f2ede2";
    ctx.fillText(tCategory.toUpperCase(), W / 2, 129);

    // cover - tilted, centered, safe-sized
    const img = await loadImage(book.cover);
    const covW = 240, covH = 344;
    ctx.save();
    ctx.translate(W / 2, 408);
    ctx.rotate(0.03);
    ctx.fillStyle = "#111";
    ctx.fillRect(-covW / 2 + 12, -covH / 2 + 12, covW, covH);
    drawCoverCentered(ctx, img, -covW / 2, -covH / 2, covW, covH);
    ctx.lineWidth = 8; ctx.strokeStyle = "#111";
    ctx.strokeRect(-covW / 2, -covH / 2, covW, covH);
    ctx.restore();

    // title (auto-shrink, max 2 lines)
    ctx.fillStyle = pal.fg;
    ctx.textAlign = "center";
    let titleSize = tTitle.length > 28 ? 56 : 68;
    ctx.font = `900 ${titleSize}px 'Archivo Black', Arial`;
    let titleLines = wrapText(ctx, tTitle.toUpperCase(), W - 300);
    if (titleLines.length > 2) {
      titleSize = 46;
      ctx.font = `900 ${titleSize}px 'Archivo Black', Arial`;
      titleLines = wrapText(ctx, tTitle.toUpperCase(), W - 260).slice(0, 2);
    }
    let y = 678;
    titleLines.forEach((ln) => { ctx.fillText(ln, W / 2, y); y += titleSize + 10; });

    // author
    ctx.font = "bold 30px 'Space Grotesk', Arial";
    ctx.fillText(tAuthor.toUpperCase(), W / 2, y + 6);
    y += 58;

    // divider
    ctx.fillRect(W / 2 - 80, y - 16, 160, 5);
    y += 30;

    // one-liner - up to 3 lines, inside safe zone
    ctx.font = "600 34px 'Space Grotesk', Arial";
    const olLines = wrapText(ctx, "\u201C" + tOneliner + "\u201D", W - 320);
    const olMax = titleLines.length > 1 ? 2 : 3;
    olLines.slice(0, olMax).forEach((ln, i) => {
      const isLast = i === olMax - 1 && olLines.length > olMax;
      ctx.fillText(isLast ? ln + "..." : ln, W / 2, y);
      y += 46;
    });

    // stats pills (readTime, lessons, FREE)
    y = 1010;
    const pills = [`⏱ ${book.readTime}`, `${book.lessons.length} LESSONS`, "FREE"];
    ctx.font = "bold 27px 'Space Grotesk', Arial";
    const padX = 28, gap = 18;
    const widths = pills.map((p) => ctx.measureText(p).width + padX * 2);
    const totalW = widths.reduce((a, b) => a + b, 0) + gap * (pills.length - 1);
    let px = (W - totalW) / 2;
    pills.forEach((p, i) => {
      ctx.fillStyle = i === 2 ? "#ffc800" : "#fffdf5";
      ctx.fillRect(px, y, widths[i], 58);
      ctx.strokeStyle = "#111"; ctx.lineWidth = 5;
      ctx.strokeRect(px, y, widths[i], 58);
      ctx.fillStyle = "#111";
      ctx.fillText(p, px + widths[i] / 2, y + 40);
      px += widths[i] + gap;
    });

    // call to action
    ctx.fillStyle = "#111";
    ctx.font = "bold 28px 'Space Grotesk', Arial";
    ctx.fillText("📖 READ THE FULL BREAKDOWN - FREE", W / 2, 1116);

    drawBrandBar(ctx, W, H);
    if (!isGoldNow()) drawWatermark(ctx, W, H);
    return canvas;
  }

  async function renderLessonCard(lessonIdx) {
    // CAROUSEL FORMAT: 1080×1350 (4:5) - live translated lesson content
    const l = liveLesson(lessonIdx);
    const W = 1080, H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const pal = PALETTES[lessonIdx % 8];
    const tTitle = liveText("#title", book.title);

    ctx.fillStyle = "#f2ede2";
    ctx.fillRect(0, 0, W, H);
    drawDots(ctx, W, H);

    // header tag
    ctx.textAlign = "left";
    ctx.fillStyle = "#111";
    ctx.fillRect(60, 60, 420, 62);
    ctx.fillStyle = "#ffc800";
    ctx.font = "900 30px 'Archivo Black', Arial";
    ctx.fillText("🧠 LESSON " + String(lessonIdx + 1).padStart(2, "0"), 80, 103);

    // small tilted book cover top-right
    const covImg = await loadImage(book.cover);
    ctx.save();
    ctx.translate(W - 130, 118);
    ctx.rotate(0.05);
    const cvW = 104, cvH = 148;
    ctx.fillStyle = "#111";
    ctx.fillRect(-cvW / 2 + 7, -cvH / 2 + 7, cvW, cvH);
    drawCoverCentered(ctx, covImg, -cvW / 2, -cvH / 2, cvW, cvH);
    ctx.lineWidth = 6; ctx.strokeStyle = "#111";
    ctx.strokeRect(-cvW / 2, -cvH / 2, cvW, cvH);
    ctx.restore();
    ctx.textAlign = "left";

    // main card
    const pad = 60, top = 160, chH = 940;
    ctx.fillStyle = "#111";
    ctx.fillRect(pad + 14, top + 14, W - pad * 2, chH);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(pad, top, W - pad * 2, chH);
    ctx.lineWidth = 9; ctx.strokeStyle = "#111";
    ctx.strokeRect(pad, top, W - pad * 2, chH);

    const inner = W - pad * 2 - 120;
    let y = top + 86;

    // lesson title
    ctx.fillStyle = pal.fg;
    let tSize = l.title.length > 60 ? 42 : 50;
    ctx.font = `900 ${tSize}px 'Archivo Black', Arial`;
    wrapText(ctx, l.title.toUpperCase(), inner).slice(0, 3).forEach((ln) => {
      ctx.fillText(ln, pad + 60, y); y += tSize + 10;
    });
    y += 8;

    // divider
    ctx.fillRect(pad + 60, y, inner, 5);
    y += 48;

    // summary - fits ~7 lines in safe zone
    ctx.font = "600 32px 'Space Grotesk', Arial";
    const actionZone = 230;
    const sumLines = wrapText(ctx, l.summary, inner);
    const maxLines = Math.floor((top + chH - actionZone - y) / 46);
    sumLines.slice(0, maxLines).forEach((ln, i) => {
      const isLast = i === maxLines - 1 && sumLines.length > maxLines;
      ctx.fillText(isLast ? ln + "..." : ln, pad + 60, y);
      y += 46;
    });

    // DO THIS box (live translated action)
    const boxY = top + chH - 180;
    ctx.fillStyle = "#111";
    ctx.fillRect(pad + 40, boxY - 8, inner + 24, 150);
    ctx.fillStyle = "#fffdf5";
    ctx.fillRect(pad + 32, boxY - 14, inner + 24, 150);
    ctx.lineWidth = 5; ctx.strokeStyle = "#111";
    ctx.strokeRect(pad + 32, boxY - 14, inner + 24, 150);
    ctx.fillStyle = "#111";
    ctx.font = "900 24px 'Archivo Black', Arial";
    const doLabel = liveText(`#lesson-${lessonIdx} .callout--action strong.tag`, "DO THIS").replace(/[⚡]/g, "").trim().toUpperCase() || "DO THIS";
    ctx.fillText("⚡ " + doLabel, pad + 60, boxY + 20);
    ctx.font = "600 26px 'Space Grotesk', Arial";
    wrapText(ctx, l.action, inner - 20).slice(0, 3).forEach((ln, i) => {
      ctx.fillText(ln, pad + 60, boxY + 56 + i * 34);
    });

    drawBrandBar(ctx, W, H);
    if (!isGoldNow()) drawWatermark(ctx, W, H, H - 226);
    return canvas;
  }

  async function shareCanvas(canvas, filename, text) {
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    if (!blob) { toast("❌ Could not create image"); return; }
    const file = new File([blob], filename, { type: "image/png" });
    TSB.achv.award("sharer");
    // native share with the image itself (mobile share sheets)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "TheSmallBook", text });
        return;
      } catch (e) { /* user cancelled or unsupported - fall through */ }
    }
    // fallback: download the card
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    /* (share toast removed - silent download, no black popup) */
  }

  /* 🔗 share the page LINK (WhatsApp-friendly - brings traffic, not just brand) */
  document.getElementById("shareLinkBtn").addEventListener("click", async () => {
    const url = location.origin + location.pathname + "?id=" + book.id;
    const text = `📕 ${book.title} - ${book.oneLiner}\n\nFree breakdown (${book.lessons.length} lessons, ${book.readTime}):`;
    if (navigator.share) {
      try { await navigator.share({ title: `${book.title} - TheSmallBook`, text, url }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    try {
      await navigator.clipboard.writeText(text + "\n" + url);
      toast("🔗 Link copied - paste it anywhere!");
    } catch (e) {
      // last-resort fallback
      const ta = document.createElement("textarea");
      ta.value = text + "\n" + url;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast("🔗 Link copied - paste it anywhere!"); }
      catch (err) { toast("Copy failed - long-press the URL bar instead"); }
      ta.remove();
    }
    if (window.TSB) TSB.achv.award("sharer");
  });

  document.getElementById("shareBtn").addEventListener("click", async () => {
    toast("🎨 Creating your share card...");
    const canvas = await renderBookCard();
    shareCanvas(canvas, `thesmallbook-${book.id}.png`,
      `📕 ${book.title} - every lesson summarized on TheSmallBook`);
  });

  /* ---------- FONT SIZE ---------- */
  let fontLevel = TSB.get("tsb_fontsize", 0);
  applyFont();
  document.getElementById("fontBtn").addEventListener("click", () => {
    fontLevel = (fontLevel + 1) % 3;
    TSB.set("tsb_fontsize", fontLevel);
    applyFont();
    toast(["🔠 Normal text", "🔠 Large text", "🔠 Extra large text"][fontLevel]);
  });
  function applyFont() {
    document.body.classList.remove("fontsize-1", "fontsize-2");
    if (fontLevel > 0) document.body.classList.add("fontsize-" + fontLevel);
  }

  /* ---------- BIG IDEA ---------- */
  document.getElementById("bigidea").textContent = book.bigIdea;

  /* ============================================================
     HIGH-QUALITY TEXT-TO-SPEECH v2 - LANGUAGE AWARE
     • Speaks the LIVE on-screen text (translated if translated)
     • Picks the best voice FOR THAT LANGUAGE (Hindi voice for
       Hindi, Gujarati for Gujarati, etc.)
     • Hinglish/Gujlish are Roman script - but they're Hindi/
       Gujarati WORDS, so we speak the original script via the
       matching Indian voice for natural pronunciation.
     ============================================================ */
  let VOICES = [];
  function refreshVoices() { VOICES = speechSynthesis ? speechSynthesis.getVoices() : []; }
  if ("speechSynthesis" in window) {
    refreshVoices();
    speechSynthesis.onvoiceschanged = refreshVoices;
  }

  /* Android/Chrome often return an EMPTY voice list at first - poll until ready */
  function voicesReady(timeoutMs = 2500) {
    return new Promise((resolve) => {
      refreshVoices();
      if (VOICES.length) return resolve(VOICES);
      const start = Date.now();
      const t = setInterval(() => {
        refreshVoices();
        if (VOICES.length || Date.now() - start > timeoutMs) {
          clearInterval(t);
          resolve(VOICES);
        }
      }, 150);
    });
  }

  /* Android reports "hi_IN", desktop "hi-IN" - normalize both */
  function normLang(l) { return String(l || "").toLowerCase().replace(/_/g, "-"); }
  function baseLang(l) { return normLang(l).split("-")[0]; }

  /* full regional tags help the OS engine pick the right voice even
     when the voices list is empty (Android Google TTS) */
  const SPEECH_REGION = {
    hi: "hi-IN", gu: "gu-IN", mr: "mr-IN", ta: "ta-IN", te: "te-IN",
    kn: "kn-IN", ml: "ml-IN", bn: "bn-IN", pa: "pa-IN", ur: "ur-IN", or: "or-IN",
    en: "en-IN", es: "es-ES", fr: "fr-FR", de: "de-DE", pt: "pt-BR",
    ar: "ar-SA", ja: "ja-JP", ko: "ko-KR", ru: "ru-RU", it: "it-IT", "zh-cn": "zh-CN"
  };
  function regionTag(lang) {
    const n = normLang(lang);
    return SPEECH_REGION[n] || SPEECH_REGION[baseLang(n)] || lang;
  }

  /* current reading language: what's actually on screen */
  function currentSpeechLang() {
    let saved = (window.TSB_LANG && TSB_LANG.get()) || "en";
    /* the Google Translate widget may have switched the page language
       without our picker - detect it from <html lang> and googtrans cookie */
    if (saved === "en") {
      try {
        const de = document.documentElement.lang;
        if (de && de !== "en" && /^[a-z]{2}(-[a-z]{2})?$/i.test(de)) {
          saved = de.toLowerCase();
        } else {
          const m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
          if (m) {
            const t = m[1].split("/").pop();
            if (t && t !== "auto" && /^[a-z-]{2,12}$/i.test(t)) saved = t.toLowerCase();
          }
        }
      } catch (e) {}
    }
    if (saved === "en") return "en";
    if (saved.toLowerCase() === "hi-latn") return "hi";   // Hinglish
    if (saved.toLowerCase() === "gu-latn") return "gu";   // Gujlish
    return saved;
  }

  function bestVoice(langCode) {
    const want = normLang(regionTag(langCode));      // e.g. "hi-in"
    const wantBase = baseLang(langCode);             // e.g. "hi"
    // exact region match first (hi-IN / hi_IN), then any dialect of the language
    let pool = VOICES.filter((v) => normLang(v.lang) === want);
    if (!pool.length) pool = VOICES.filter((v) => baseLang(v.lang) === wantBase);
    // IMPORTANT: no cross-language fallback - an English voice reading Hindi
    // text is what made TTS feel "English-only". Return null instead: the
    // utterance keeps voice unset + lang="hi-IN", and the OS engine
    // (Google TTS on Android) speaks it natively even with an empty list.
    if (!pool.length) return null;
    const ranks = [
      (v) => /natural|neural|premium|enhanced|wavenet/i.test(v.name) ? 0 : 99,
      (v) => /^Google/i.test(v.name) ? 1 : 99,
      (v) => /^Microsoft/i.test(v.name) ? 2 : 99,
      (v) => !v.localService ? 3 : 99,
      () => 4
    ];
    const score = (v) => Math.min(...ranks.map((r) => r(v)));
    return pool.sort((a, b) => score(a) - score(b))[0];
  }

  /* TTS v5 - NATURAL READING
     Chunks are sentence-aware (never cut mid-sentence) and each carries a
     natural pause: ~480ms after a sentence, ~220ms at comma-breaths,
     ~700ms between sections (title → summary → example → action). */
  function naturalChunks(parts) {
    const SENT = /[^.!?।॥。！？]+[.!?।॥。！？]+["']?|\s*[^.!?।॥。！？]+$/g;
    const out = [];
    (parts || []).forEach((part) => {
      const text = String(part.text || "").trim();
      if (!text) return;
      const sentences = text.match(SENT) || [text];
      let cur = "";
      sentences.forEach((s) => {
        const clean = s.trim();
        if (!clean) return;
        if ((cur + " " + clean).length > 150 && cur) {
          out.push({ text: cur.trim(), pause: 480 });
          cur = clean;
        } else cur = (cur + " " + clean).trim();
      });
      if (cur) out.push({ text: cur.trim(), pause: part.pause != null ? part.pause : 480 });
    });
    /* split very long chunks at commas → tiny 220ms breathing pauses */
    const final = [];
    out.forEach((c) => {
      if (c.text.length <= 170) { final.push(c); return; }
      const pieces = c.text.match(/[^,;:\u2014-]+[,;:\u2014-]?/g) || [c.text];
      let acc = "";
      pieces.forEach((p) => {
        if ((acc + p).trim().length > 150 && acc.trim()) {
          final.push({ text: acc.trim(), pause: 220 });  // mid-sentence breath
          acc = p;
        } else acc += p;
      });
      if (acc.trim()) final.push({ text: acc.trim(), pause: c.pause });
    });
    return final.filter((c) => c.text.trim());
  }

  let speakingBtn = null;
  let speechQueue = [];
  let keepAlive = null;

  function stopSpeech() {
    speechQueue = [];
    currentUtterance = null;
    if (keepAlive) { clearInterval(keepAlive); keepAlive = null; }
    speechSynthesis.cancel();
    if (speakingBtn) {
      speakingBtn.classList.remove("speaking");
      speakingBtn.textContent = "🔊 LISTEN";
      speakingBtn = null;
    }
  }

  /* TTS v3 - fixes abrupt stops:
     1. utterance kept in a live reference (Chrome GC used to kill speech mid-sentence)
     2. spurious "interrupted/canceled" errors no longer kill the queue
     3. real errors SKIP to the next chunk instead of stopping everything
     4. pause/resume keep-alive only on desktop Chrome (it BREAKS Android TTS)
     5. tiny gap between chunks avoids Chrome's speak-after-end race
     6. watchdog restarts the queue if the engine silently dies */
  let currentUtterance = null; // MUST stay referenced or Chrome garbage-collects mid-speech

  async function speakChunks(chunks, btn) {
    const lang = currentSpeechLang();
    await voicesReady();                 // Android: voice list loads late - wait for it
    const voice = bestVoice(lang);
    const tag = regionTag(lang);         // "hi" → "hi-IN" etc.
    if (lang !== "en" && !voice && VOICES.length) {
      // voices exist but none for this language - engine will still try via lang tag
      toast("🔊 " + tag + " voice not installed - asking device engine directly");
    }
    speechQueue = [...chunks];
    const isAndroid = /android/i.test(navigator.userAgent);
    const isDesktopChrome = /chrome/i.test(navigator.userAgent) && !isAndroid && !/edge|edg\//i.test(navigator.userAgent);
    let chunkStarted = 0;
    let busy = false;              // ← RE-ENTRANCY GUARD: never start 2 utterances
    let seed = 7;

    function next() {
      if (busy) return;                            // ← THE FIX: no double-speak
      if (speakingBtn !== btn) return;             // user pressed stop / another button
      if (!speechQueue.length) { stopSpeech(); return; }
      try { if (speechSynthesis.paused) speechSynthesis.resume(); } catch (e) {}
      const chunk = speechQueue.shift();
      const u = new SpeechSynthesisUtterance(chunk.text);
      currentUtterance = u;
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : tag;
      const len = chunk.text.length;
      u.rate = len < 60 ? 0.92 : len < 130 ? 0.95 : 0.97;
      seed = (seed * 9301 + 49297) % 233280;
      u.pitch = 1 + ((seed % 9) - 4) / 100;
      u.volume = 1.0;
      busy = true;
      const finish = (skipPause) => {
        busy = false;
        currentUtterance = null;
        chunkStarted = Date.now();
        const wait = skipPause ? 150 : Math.min(chunk.pause != null ? chunk.pause : 480, 900);
        setTimeout(next, wait);
      };
      u.onstart = () => { chunkStarted = Date.now(); };
      u.onend = () => finish(false);
      u.onerror = (e) => {
        const err = e && e.error;
        if ((err === "interrupted" || err === "canceled") && speakingBtn !== btn) {
          // spurious interrupt mid-queue (not a user stop) - recover, don't die
          busy = false;
          setTimeout(next, 200);
          return;
        }
        finish(true);                              // skip bad chunk, keep reading
      };
      speechSynthesis.speak(u);
    }

    /* fix #4: Chrome desktop 15s cutoff needs pause/resume; Android dies from it */
    if (keepAlive) clearInterval(keepAlive);
    keepAlive = setInterval(() => {
      if (speakingBtn !== btn) return;
      if (isDesktopChrome && speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        speechSynthesis.resume();
      }
      /* fix #6: watchdog - restart ONLY if nothing is in flight for 4s+ */
      if (!busy && !currentUtterance && !speechSynthesis.speaking && !speechSynthesis.pending &&
          speechQueue.length && Date.now() - chunkStarted > 4000) {
        next();
      }
    }, 5000);
    next();
  }

  /* ---------- LESSONS ---------- */
  const lessonsWrap = document.getElementById("lessons");
  const readSet = new Set(TSB.progress.forBook(book.id));
  const origList = (window.TSB_CONFIG && TSB_CONFIG.ORIGINALS) || [];
  const origOrder = origList.indexOf(book.id);
  const isGatedOriginal = origOrder >= 5;
  let isGoldReader = false;
  try {
    isGoldReader = Boolean((window.TSB_GOLD && TSB_GOLD.isGold && TSB_GOLD.isGold()) || (window.TSB_PAYWALL && TSB_PAYWALL.isFounder && TSB_PAYWALL.isFounder()));
  } catch (e) {}

  book.lessons.forEach((l, i) => {
    const isLockedLesson = isGatedOriginal && !isGoldReader && i > 0;
    const d = document.createElement("div");
    d.className = "lesson" + (i === 0 ? " open" : "") + (isLockedLesson ? " lesson--gold-locked" : "");
    d.id = "lesson-" + i;

    const bodyContent = isLockedLesson ? `
      <div class="lesson__body">
        <p>${l.summary.slice(0, 160)}...</p>
        <div class="callout callout--example" style="filter:blur(3.5px);user-select:none;opacity:0.45;pointer-events:none;"><strong class="tag">📖 Example from the book</strong><br>${l.example}</div>
        <div class="callout callout--action" style="filter:blur(3.5px);user-select:none;opacity:0.45;pointer-events:none;"><strong class="tag">⚡ Do this</strong><br>${l.action}</div>
        <div class="orig-gold-gate" style="background:#fefbf4;border:2px solid var(--ink);border-radius:12px;padding:18px 16px;text-align:center;box-shadow:3px 3px 0 var(--ink);margin:16px 0 8px;">
          <div style="font-family:var(--font-head);font-size:11px;font-weight:900;letter-spacing:1.5px;color:#8a6d00;margin-bottom:4px;">✦ EXCLUSIVE TO GOLD MEMBERS ✦</div>
          <div style="font-weight:800;font-size:15px;color:var(--ink);margin-bottom:6px;">Unlock All 35+ In-House Originals</div>
          <p style="font-size:12.5px;color:#555;line-height:1.45;max-width:440px;margin:0 auto 14px;">The first 5 in-house originals are completely free for everyone. Unlock all lessons across our full library of 35+ proprietary masterclasses for ₹99/month.</p>
          <a href="gold.html" class="btn btn--yellow" style="font-family:var(--font-head);font-weight:900;font-size:12px;letter-spacing:1px;padding:9px 20px;border:2px solid var(--ink);border-radius:9px;text-decoration:none;display:inline-flex;align-items:center;gap:6px;box-shadow:2.5px 2.5px 0 var(--ink);">👑 UPGRADE TO GOLD (₹99/MO) →</a>
        </div>
      </div>
    ` : `
      <div class="lesson__body">
        <p>${l.summary}</p>
        <div class="callout callout--example"><strong class="tag">📖 Example from the book</strong><br>${l.example}</div>
        <div class="callout callout--action"><strong class="tag">⚡ Do this</strong><br>${l.action}</div>
        <div class="tipjar" translate="no">
          <div class="tipjar__row">
            <span class="tipjar__icon" aria-hidden="true">☕</span>
            <span class="tipjar__q">Liked it? Drop a chai. Keeps the next lesson free.</span>
          </div>
          <div class="tipjar__btns">
            <a href="upi://pay?pa=9702510680%40fam&pn=TheSmallBook&am=9&cu=INR" data-tip="9">₹9</a>
            <a href="upi://pay?pa=9702510680%40fam&pn=TheSmallBook&am=49&cu=INR" data-tip="49">₹49</a>
            <a href="upi://pay?pa=9702510680%40fam&pn=TheSmallBook&am=99&cu=INR" data-tip="99">₹99</a>
          </div>
          <button class="tipjar__x" aria-label="Hide tip prompt">✕</button>
        </div>
          <div class="lesson__tools">
            <button class="minibtn ${readSet.has(i) ? "active" : ""}" data-read="${i}"><svg class="mini-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>${readSet.has(i) ? "READ" : "MARK READ"}</span></button>
            <button class="minibtn" data-listen="${i}"><svg class="mini-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> <span>LISTEN</span></button>
            <button class="minibtn" data-sharelesson="${i}"><svg class="mini-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> <span>CARD</span></button>
          </div>
      </div>
    `;

    d.innerHTML = `
      <div class="lesson__head">
        <div class="lesson__num">${readSet.has(i) ? "✓" : String(i + 1).padStart(2, "0")}</div>
        <div class="lesson__titlebox">
          <div class="lesson__title">${l.title}</div>
          <div class="lesson__chapter">${l.chapter}</div>
        </div>
        ${isLockedLesson ? '<span style="font-family:var(--font-head);font-size:10px;font-weight:900;letter-spacing:1px;background:#fef3c7;color:#92400e;border:1px solid #d97706;padding:2px 7px;border-radius:6px;margin-right:8px;">👑 GOLD</span>' : ''}
        <div class="lesson__toggle">+</div>
      </div>
      ${bodyContent}`;
    d.querySelector(".lesson__head").addEventListener("click", () => d.classList.toggle("open"));
    const tipX = d.querySelector(".tipjar__x");
    if (tipX) tipX.addEventListener("click", () => { const tj = d.querySelector(".tipjar"); if (tj) tj.remove(); });
    /* 💸 tip buttons → universal UPI engine (fallback sheet on desktop) */
    if (window.TSB_UPI) {
      d.querySelectorAll(".tipjar__btns a").forEach((a) => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          window.TSB_UPI.pay(a.dataset.tip, "Chai for TheSmallBook");
        });
      });
    }
    lessonsWrap.appendChild(d);
  });

  /* 🌊 v300: the deep dive, right under the lessons that feed it */
  if (window.TSB_DEEPDIVES) {
    const ddEsc = (x) => String(x == null ? "" : x).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const dives = TSB_DEEPDIVES.filter((dd) => dd.bookId === book.id);
    if (dives.length) {
      const wrap = document.createElement("section");
      wrap.className = "dd-card";
      wrap.innerHTML = dives.map((dd) => `
        <a class="dd-card__row" href="deepdive.html?id=${dd.id}">
          <span class="dd-card__wave">🌊</span>
          <span class="dd-card__mid">
            <b>THE DEEP DIVE · ${ddEsc(dd.chapterLabel.toUpperCase())}</b>
            <i>${ddEsc(dd.title)}</i>
            <span class="dd-card__m">${dd.minutes} min · the one chapter worth reading in full · ${dd.sample ? '<b class="dd-card__free">FREE SAMPLE</b>' : '<b class="dd-card__gold">👑 GOLD</b>'}</span>
          </span>
          <span class="dd-card__go">READ → </span>
        </a>`).join("");
      lessonsWrap.parentNode.insertBefore(wrap, lessonsWrap.nextSibling);
    }
  }

  /* mark as read */
  lessonsWrap.querySelectorAll("[data-read]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = +btn.dataset.read;
      TSB.progress.markRead(book.id, i);
      try { TSB.interest.ping(book.category); } catch (e) {}
      if (window.TSB_AUTH && window.TSB_AUTH.enabled) window.TSB_AUTH.track();
      btn.classList.add("active");
      btn.innerHTML = '<svg class="mini-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>READ</span>';
      document.querySelector(`#lesson-${i} .lesson__num`).textContent = "✓";
      drawBadges();
      if (TSB.progress.forBook(book.id).length >= book.lessons.length) {
        TSB.achv.award("book-complete");
        try {
          const cc = (window.TSB.completedCount) ? window.TSB.completedCount() : 0;
          if (cc >= 3) TSB.achv.award("book-complete-3");
          if (cc >= 10) TSB.achv.award("book-complete-10");
        } catch (e) {}
        showCompleteCelebration();
        if (window.TSB_AUTH && window.TSB_AUTH.enabled) window.TSB_AUTH.onBookComplete(book.id);
      }
    });
  });

  /* ---------- 🏆 BOOK COMPLETE CELEBRATION ---------- */
  function showCompleteCelebration() {
    if (document.getElementById("completeModal")) return;
    const ov = document.createElement("div");
    ov.className = "modal open";
    ov.id = "completeModal";
    ov.innerHTML = `
      <div class="modal__box celebmodal">
        <div class="celebmodal__emoji">🏆</div>
        <h3>BOOK COMPLETE!</h3>
        <p class="celebmodal__sub">You just absorbed <strong>${book.lessons.length} lessons</strong> from
        <strong>${book.title}</strong> - most people never finish the book. You finished the wisdom.</p>
        <a class="buybtn celebmodal__buy" href="${TSB.amazonLink(book.title, book.author, book.id)}" target="_blank" rel="noopener sponsored" translate="no">
          📖 OWN THE FULL BOOK <span class="buybtn__amz">it goes 10x deeper →</span>
        </a>
        <div class="celebmodal__row">
          <button class="btn" id="celebShare">🎴 SHARE THE WIN</button>
          <button class="btn btn--ink" id="celebClose">KEEP READING</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    // mini confetti
    try {
      for (let i = 0; i < 24; i++) {
        const c = document.createElement("span");
        c.className = "confetti";
        c.textContent = ["🎉","✨","📕","🏆"][i % 4];
        c.style.left = Math.random() * 100 + "vw";
        c.style.animationDelay = (Math.random() * 0.7) + "s";
        c.style.fontSize = (14 + Math.random() * 18) + "px";
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 3200);
      }
    } catch (e) {}
    ov.querySelector("#celebClose").addEventListener("click", () => ov.remove());
    ov.addEventListener("click", (e) => { if (e.target === ov) ov.remove(); });
    const shareBtn = ov.querySelector("#celebShare");
    if (shareBtn) shareBtn.addEventListener("click", () => {
      ov.remove();
      const sb = document.getElementById("shareBtn");
      if (sb) sb.click();
    });
  }

  /* ---------- 📊 READING PROGRESS BAR ---------- */
  (function () {
    const bar = document.createElement("div");
    bar.className = "readbar";
    bar.innerHTML = `<span class="readbar__fill"></span>`;
    document.body.appendChild(bar);
    const fill = bar.querySelector(".readbar__fill");
    let ticking = false;
    function update() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
      fill.style.width = pct + "%";
      bar.classList.toggle("show", window.scrollY > 120);
    }
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; update(); });
    }, { passive: true });
    update();
  })();

  /* ---------- 📑 STICKY LESSON JUMP-NAV ---------- */
  (function () {
    if (!book.lessons.length) return;
    const fab = document.createElement("button");
    fab.className = "lessonnav__fab";
    fab.setAttribute("aria-label", "Jump to lesson");
    fab.setAttribute("translate", "no");
    fab.innerHTML = `📑 <span class="lessonnav__count">1/${book.lessons.length}</span>`;
    const panel = document.createElement("div");
    panel.className = "lessonnav__panel";
    panel.innerHTML = book.lessons.map((l, i) =>
      `<a class="lessonnav__item" href="#lesson-${i}" data-jump="${i}">
        <span class="lessonnav__num">${String(i + 1).padStart(2, "0")}</span>
        <span class="lessonnav__title">${l.title}</span>
        <span class="lessonnav__check" data-navcheck="${i}">${TSB.progress.forBook(book.id).includes(i) ? "✓" : ""}</span>
      </a>`).join("") +
      `<a class="lessonnav__item lessonnav__item--plan" href="#plan-section" data-jump="plan">
        <span class="lessonnav__num">⚡</span><span class="lessonnav__title">Action Plan</span><span></span>
      </a>`;
    document.body.appendChild(fab);
    document.body.appendChild(panel);

    fab.addEventListener("click", () => {
      panel.classList.toggle("open");
      fab.classList.toggle("open");
    });
    panel.addEventListener("click", (e) => {
      const item = e.target.closest("[data-jump]");
      if (!item) return;
      e.preventDefault();
      panel.classList.remove("open");
      fab.classList.remove("open");
      const target = item.dataset.jump === "plan"
        ? document.getElementById("plan")
        : document.getElementById("lesson-" + item.dataset.jump);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        if (item.dataset.jump !== "plan") {
          const card = document.getElementById("lesson-" + item.dataset.jump);
          if (card && !card.classList.contains("open")) {
            const head = card.querySelector(".lesson__head");
            if (head) head.click();
          }
        }
      }
    });
    // close when clicking outside
    document.addEventListener("click", (e) => {
      if (!panel.contains(e.target) && !fab.contains(e.target)) {
        panel.classList.remove("open");
        fab.classList.remove("open");
      }
    });
    // show fab only after scrolling past the hero; track current lesson
    const counter = fab.querySelector(".lessonnav__count");
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const past = window.scrollY > 420;
        fab.classList.toggle("show", past);
        if (!past) return;
        let cur = 0;
        for (let i = 0; i < book.lessons.length; i++) {
          const el = document.getElementById("lesson-" + i);
          if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) cur = i;
        }
        counter.textContent = (cur + 1) + "/" + book.lessons.length;
      });
    }, { passive: true });

    // deep-link support: book.html?id=x#lesson-N opens + scrolls to that lesson
    if (location.hash && location.hash.startsWith("#lesson-")) {
      const n = parseInt(location.hash.slice(8), 10);
      /* elements are 0-based (lesson-0, lesson-1…); try exact, then n-1 for
         older 1-based links so the SAME chapter always opens */
      let card = document.getElementById("lesson-" + n);
      if (!card && n > 0) card = document.getElementById("lesson-" + (n - 1));
      if (card) setTimeout(() => {
        /* only the target chapter opens - collapse the default-open first lesson */
        document.querySelectorAll(".lesson").forEach((l) => l.classList.remove("open"));
        card.classList.add("open");
        card.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  })();

  /* v300: listen = the real player. One tap queues the whole book from
     this lesson: queue, speed, sleep timer, lockscreen controls, and it
     picks up where you left off next time. */
  lessonsWrap.querySelectorAll("[data-listen]").forEach((btn) => {
    btn.setAttribute("translate", "no");
    btn.addEventListener("click", () => {
      const A = window.TSB_AUDIO;
      if (!A) { toast("🎧 The player is loading, try again in a second"); return; }
      const i = +btn.dataset.listen;
      A.playBook(book.id, i + 1); /* +1: item 0 is the intro line */
    });
  });
  window.addEventListener("beforeunload", () => { if ("speechSynthesis" in window) speechSynthesis.cancel(); });


  /* share lesson as card */
  lessonsWrap.querySelectorAll("[data-sharelesson]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const i = +btn.dataset.sharelesson;
      toast("🎨 Creating your share card...");
      const canvas = await renderLessonCard(i);
      shareCanvas(canvas, `thesmallbook-${book.id}-lesson-${i + 1}.png`,
        `🧠 "${book.lessons[i].title}" - from ${book.title}, on TheSmallBook`);
    });
  });

  /* expand / collapse all */
  let expanded = false;
  const eb = document.getElementById("expandBtn");
  if (eb) {
    eb.addEventListener("click", () => {
      expanded = !expanded;
      document.querySelectorAll(".lesson").forEach((l) => l.classList.toggle("open", expanded));
      eb.innerHTML = expanded
        ? '<svg class="btn-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg> <span class="abtn__lbl">COLLAPSE ALL</span>'
        : '<svg class="btn-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg> <span class="abtn__lbl">EXPAND ALL</span>';
    });
  }

  /* 🎯 onboarding personalisation - deep readers start fully open */
  try {
    if (TSB.get("tsb_read_style", "") === "deep") {
      expanded = true;
      document.querySelectorAll(".lesson").forEach((l) => l.classList.add("open"));
      if (eb) {
        eb.innerHTML = '<svg class="btn-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg> <span class="abtn__lbl">COLLAPSE ALL</span>';
      }
    }
  } catch (e) {}

  /* deep link */
  if (location.hash.startsWith("#lesson-")) {
    const n = +location.hash.slice(8);
    const target = document.getElementById("lesson-" + n);
    if (target) {
      target.classList.add("open");
      setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
  }

  /* ---------- QUOTES + IMAGE GENERATOR ---------- */
  const quotesWrap = document.getElementById("quotes");
  const quoteSpins = {};
  book.quotes.forEach((q, qidx) => {
    const d = document.createElement("div");
    d.className = "quote";
    d.textContent = q;
    const btn = document.createElement("button");
    btn.className = "quote__share";
    btn.title = "Share as image card";
    btn.textContent = "🎴";
    btn.setAttribute("translate", "no");
    btn.addEventListener("click", async () => {
      toast("🎨 Creating your quote card...");
      // LIVE text - translated if the page is translated
      const liveQ = liveText(d, q).replace(/🎴/g, "").trim();
      // fresh palette each tap: same quote cycles through all 20 looks
      const spin = (quoteSpins[qidx] = (quoteSpins[qidx] || 0) + 1);
      const palIdx = (qidx + spin * 7) % PALETTES.length;
      const canvas = await renderQuoteCard(liveQ, palIdx);
      shareCanvas(canvas, `thesmallbook-${book.id}-quote-${qidx + 1}.png`,
        `💬 From ${liveText("#title", book.title)} - on TheSmallBook`);
    });
    d.appendChild(btn);
    quotesWrap.appendChild(d);
  });


  async function renderQuoteCard(quote, qidx) {
    // CAROUSEL FORMAT: 1080×1350 (4:5) - full-bleed quote, zero crop
    const W = 1080, H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const pal = PALETTES[qidx % PALETTES.length];
    const tTitle = liveText("#title", book.title);

    paintPalette(ctx, pal, W, H);
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = pal.fg;
    for (let x = 22; x < W; x += 46)
      for (let y = 22; y < H; y += 46) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
    ctx.restore();

    // top strip
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, W, 76);
    ctx.fillStyle = "#ffc800";
    ctx.font = "900 28px 'Archivo Black', Arial";
    ctx.textAlign = "center";
    ctx.fillText("✦ WORDS THAT HIT ✦", W / 2, 50);
    ctx.textAlign = "left";

    // giant quote mark
    ctx.fillStyle = pal.fg;
    ctx.font = "900 220px Georgia";
    ctx.fillText("\u201C", 80, 340);

    // quote text - auto-size, fits safe zone
    let qSize = quote.length < 90 ? 66 : quote.length < 180 ? 54 : 44;
    ctx.font = `bold ${qSize}px 'Space Grotesk', Arial`;
    let lines = wrapText(ctx, quote, W - 220);
    while (lines.length * (qSize + 14) > 640 && qSize > 32) {
      qSize -= 5;
      ctx.font = `bold ${qSize}px 'Space Grotesk', Arial`;
      lines = wrapText(ctx, quote, W - 220);
    }
    const blockH = lines.length * (qSize + 14);
    let y = 380 + Math.max(0, (640 - blockH) / 2);
    lines.forEach((ln) => { ctx.fillText(ln, 110, y); y += qSize + 14; });

    // attribution box
    y = Math.min(y + 50, 1080);
    ctx.fillStyle = "#111";
    ctx.fillRect(110, y - 8, W - 220, 96);
    ctx.fillStyle = "#fffdf5";
    ctx.fillRect(98, y - 18, W - 220, 96);
    ctx.lineWidth = 5; ctx.strokeStyle = "#111";
    ctx.strokeRect(98, y - 18, W - 220, 96);
    ctx.fillStyle = "#111";
    ctx.font = "900 27px 'Archivo Black', Arial";
    const attr = wrapText(ctx, tTitle.toUpperCase(), W - 300)[0] || "";
    ctx.fillText(attr, 126, y + 18);
    ctx.font = "bold 24px 'Space Grotesk', Arial";
    ctx.fillText("- " + book.author.toUpperCase(), 126, y + 54);

    drawBrandBar(ctx, W, H);
    return canvas;
  }

  /* ---------- CHECKABLE ACTION PLAN ---------- */
  const planWrap = document.getElementById("plan");
  const doneSteps = new Set(TSB.plans.forBook(book.id));
  book.actionPlan.forEach((step, i) => {
    const li = document.createElement("li");
    li.textContent = step;
    li.className = "checkable" + (doneSteps.has(i) ? " done" : "");
    li.addEventListener("click", () => {
      const on = TSB.plans.toggle(book.id, i, book.actionPlan.length);
      li.classList.toggle("done", on);
    });
    planWrap.appendChild(li);
  });

  /* buy nudge under the action plan */
  (function () {
    const wrap = document.getElementById("plan");
    if (!wrap || !wrap.parentElement) return;
    const box = document.createElement("a");
    box.className = "buynudge";
    box.href = TSB.amazonLink(book.title, book.author, book.id);
    box.target = "_blank";
    box.rel = "noopener sponsored";
    box.innerHTML = `<strong>Loved the lessons?</strong> The full book goes 10x deeper - <span>own it on Amazon 📖</span>`;
    wrap.parentElement.appendChild(box);
  })();

  /* ---------- 🧠 HONESTY BOX: "when this breaks" caveat + graveyard proof ----------
     (failures.js loads AFTER book.js on the page, so retry until it's available) */
  (function () {
    function renderTruthBox() {
      if (!book.caveat && !book.graveLink) return;
      if (book.graveLink && !(window.FAILURES || []).length) {
        setTimeout(renderTruthBox, 150);
        return;
      }
      const wrap = document.getElementById("plan");
      if (!wrap || !wrap.parentElement) return;
      const box = document.createElement("div");
      box.className = "truthbox";
      let html = "";
      if (book.caveat) {
        html += `<div class="callout callout--caveat"><strong class="tag">⚠️ When this doesn't work</strong><br>${book.caveat}</div>`;
      }
      if (book.graveLink) {
        let g = null;
        try { g = (window.FAILURES || []).find((f) => f.id === book.graveLink); } catch (e) {}
        if (g) {
          html += `<a class="gravecross" href="graveyard/${g.id}.html">
            <span class="gravecross__head">
              <span class="gravecross__em">${g.emoji || "💀"}</span>
              <span class="gravecross__titles">
                <b>${g.name}</b>
                <small>${g.title || "This lesson, in real life, gone wrong."}</small>
              </span>
            </span>
            <span class="gravecross__mid">
              <span class="gravecross__cat">☠️ ${g.category}</span>
              <span class="gravecross__loss">💸 ${g.loss}</span>
            </span>
            <span class="gravecross__go">READ THE CASE STUDY →</span>
          </a>`;
        }
      }
      if (!html) return;
      box.innerHTML = html;
      wrap.parentElement.appendChild(box);
    }
    setTimeout(renderTruthBox, 0);
  })();

  /* ---------- RELATED BOOKS ---------- */
  (function () {
    const wrap = document.getElementById("related");
    if (!wrap) return;
    const rel = BOOKS.filter((b) => b.id !== book.id && b.category === book.category).slice(0, 3);
    while (rel.length < 3) {
      const r = BOOKS[Math.floor(Math.random() * BOOKS.length)];
      if (r.id !== book.id && !rel.includes(r)) rel.push(r);
    }
    wrap.innerHTML = rel.map((r) => `
      <a href="book.html?id=${r.id}">
        <img src="${r.cover}" alt="${r.title}">
        <div><div class="t">${r.title}</div><div class="a">${r.author}</div></div>
      </a>`).join("");
  })();

  /* ---------- PREV / NEXT + SHORTCUTS ---------- */
  const prev = BOOKS[(idx - 1 + BOOKS.length) % BOOKS.length];
  const next = BOOKS[(idx + 1) % BOOKS.length];
  document.getElementById("prevBook").href = `book.html?id=${prev.id}`;
  document.getElementById("prevBook").innerHTML = `← ${prev.title}`;
  document.getElementById("nextBook").href = `book.html?id=${next.id}`;
  document.getElementById("nextBook").innerHTML = `${next.title} →`;

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === "ArrowLeft") location.href = `book.html?id=${prev.id}`;
    if (e.key === "ArrowRight") location.href = `book.html?id=${next.id}`;
    if (e.key.toLowerCase() === "d") TSB.theme.toggle();
    if (e.key === "Escape") { stopSpeech(); document.querySelectorAll(".modal.open").forEach((m) => m.classList.remove("open")); }
  });

  /* ---------- SCROLL REVEAL ---------- */
  const targets = document.querySelectorAll(".lesson, .quote, .section-head, .plan__box, .bigidea__box, .related a");
  targets.forEach((t) => t.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.1 });
  targets.forEach((t) => io.observe(t));
})();
