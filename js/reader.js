(function() {
  'use strict';

  function getQueryParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  var bookId = getQueryParam('id') || 'atomic-habits';
  var books = window.BOOKS || [];
  var book = books.find(function(b) { return b.id === bookId; }) || null;

  /* v385 · an unknown link says so. It used to fall back to the first book in
     the shelf, so a broken link opened Atomic Habits and looked like a duplicate. */
  if (!book) {
    document.body.innerHTML =
      '<div style="padding:56px 22px;max-width:520px;margin:0 auto;text-align:left;font-family:Newsreader,Georgia,serif">' +
      '<div style="font:800 11px/1 \'Space Grotesk\',system-ui;letter-spacing:1.4px;color:#8a7a55;margin-bottom:10px">NOT FOUND</div>' +
      '<h2 style="font-size:26px;line-height:1.2;margin:0 0 10px">That link does not point to a book</h2>' +
      '<p style="font-size:16px;line-height:1.6;margin:0 0 22px">The address you opened has a book id that is not on the shelf. Nothing is broken on your side.</p>' +
      '<a href="index.html#library" style="display:inline-block;background:#FFC800;color:#16130f;border-radius:14px;padding:12px 20px;text-decoration:none;font:800 14px \'Space Grotesk\',system-ui">Browse the library</a>' +
      '</div>';
    document.title = 'Book not found | TheSmallBook';
    return;
  }

  // Set Back link
  var backBtn = document.getElementById('rmBack');
  if (backBtn) {
    var bookHref = 'book.html?id=' + encodeURIComponent(book.id);
    backBtn.href = bookHref;
    backBtn.setAttribute('data-tsb-back', '');
    backBtn.addEventListener('click', function (e) {
      /* v376: back returns to the window the reader actually came from. Only a
         cold open, with nothing behind it, lands on the book overview. */
      e.preventDefault();
      if (window.TSB_BACK) window.TSB_BACK.go(bookHref);
      else location.href = bookHref;
    });
  }

  // Set Title & Author
  var titleEl = document.getElementById('rmTitle');
  var authorEl = document.getElementById('rmAuthor');
  if (titleEl) titleEl.textContent = book.title;
  if (authorEl) authorEl.textContent = /^unknown$/i.test(book.author || '') ? 'A TheSmallBook Original' : 'by ' + book.author;
  document.title = book.title + ' | TheSmallBook Reader';

  /* v385 · THE PAGE THAT WROTE ITS OWN BOOK
     Lesson text is not in data.js, it arrives later from data/lessons/<id>.js.
     The reader used to build its pages once, at load, and if the text had not
     landed yet it kept the empty shell forever: a book with chapter titles and
     no words. The page now builds, then rebuilds the moment the text arrives,
     and never loses the reader's place. */
  var pages = [];

  /* v385 · data.js stores the keys as bigIdea, oneLiner and actionPlan. The page
     builder asked for bigidea, oneliner and plan, which are undefined, so the big
     idea card and the action plan came out empty on every book. Fixed here. */
  function lessonsHaveText() {
    if (!Array.isArray(book.lessons)) return false;
    for (var i = 0; i < book.lessons.length; i++) {
      var t = book.lessons[i] && book.lessons[i].summary;
      if (t && String(t).replace(/\s+/g, " ").length > 40) return true;
    }
    return false;
  }
  var ideaOf = function () { return book.bigIdea || book.bigidea || ""; };
  var lineOf = function () { return book.oneLiner || book.oneliner || ""; };
  var planOf = function () { return book.actionPlan || book.plan || []; };

  function buildPages() {
    pages = [];
    var hasText = lessonsHaveText();

    // Page 0: The Big Idea
    pages.push({
      title: "The Big Idea",
      meta: (book.category || book.cat || "Overview") + " \u00b7 The big idea",
      content: (book.tagline ? "<p><strong>" + book.tagline + "</strong></p>" : "") +
               (lineOf() ? "<p>" + lineOf() + "</p>" : "") +
               (ideaOf() ? '<div class="rm-callout"><b>THE CORE INSIGHT</b>' + ideaOf() + "</div>" : "")
    });

    if (hasText) {
      // Pages 1 to N: The Lessons
      book.lessons.forEach(function (lesson, idx) {
        var html = "<p>" + (lesson.summary || "") + "</p>";
        if (lesson.example) html += '<div class="rm-callout"><b>REAL-WORLD EXAMPLE</b>' + lesson.example + "</div>";
        if (lesson.action) html += '<div class="rm-callout"><b>PRACTICAL ACTION</b>' + lesson.action + "</div>";
        pages.push({
          title: lesson.title,
          meta: lesson.chapter ? lesson.chapter.toUpperCase() : ("LESSON " + (idx + 1)),
          content: html
        });
      });
    } else if (Array.isArray(book.lessons) && book.lessons.length) {
      /* The chapter text has not landed yet, or it never will. Either way the
         reader gets the book's real spine, never eight blank pages. */
      var list = "<p>This book, chapter by chapter:</p><ul style=\"padding-left:20px;margin-bottom:20px\">";
      book.lessons.forEach(function (l) {
        list += '<li style="margin-bottom:10px"><strong>' + (l.title || "") + "</strong>" +
                (l.chapter ? '<br><span style="font-size:13px;opacity:.72">' + l.chapter + "</span>" : "") + "</li>";
      });
      list += "</ul>";
      if (ideaOf()) list += '<div class="rm-callout"><b>THE CORE INSIGHT</b>' + ideaOf() + "</div>";
      list += '<p id="rmNote" style="font-size:13.5px;margin-top:18px">The full text of these chapters is still on its way. ' +
              '<button type="button" data-rm-retry style="font:inherit;font-weight:700;background:none;border:0;padding:0;color:inherit;text-decoration:underline;cursor:pointer">Load it again</button></p>';
      pages.push({ title: "What this book covers", meta: "CONTENTS", content: list, retry: true });
    }

    // Final page: quotes and the action plan
    var endHtml = "";
    var plan = planOf();
    if (plan.length) {
      endHtml += '<h3>5-Step Action Plan</h3><ol style="padding-left:20px;margin-bottom:24px;">';
      plan.forEach(function (step) { endHtml += '<li style="margin-bottom:10px;">' + step + "</li>"; });
      endHtml += "</ol>";
    }
    if (Array.isArray(book.quotes) && book.quotes.length) {
      endHtml += "<h3>KEY QUOTES</h3>";
      book.quotes.forEach(function (q) {
        endHtml += '<blockquote style="border-left:3px solid var(--yellow);padding-left:14px;margin:12px 0;font-style:italic;">\u201c' + q + '\u201d</blockquote>';
      });
    }
    if (endHtml) {
      pages.push({ title: "Action Plan & Takeaways", meta: "WRAP-UP & RETENTION", content: endHtml });
    }

    /* v343 \u00b7 A PAID ORIGINAL STOPS WHERE IT IS SOLD */
    var LOCK = window.TSB_LOCK || null;
    if (LOCK && LOCK.locked(book.id)) {
      var free = 1 + (LOCK.freeLessons || 1);
      pages = pages.slice(0, free);
      pages.push({
        title: "Keep reading this Original",
        meta: "ONE-TIME UNLOCK",
        paywall: true,
        content: '<p><strong>You have read the opening of this TheSmallBook Original.</strong> The rest of it, every lesson, the action plan and the quotes, is yours for a one-time '
          + LOCK.bookPrice + ' rupees on this book.</p>'
          + '<div class="rm-callout"><b>\u2726 THIS BOOK, ONCE</b>'
          + '<p style="margin:6px 0 12px">Pay ' + LOCK.bookPrice + ' rupees one time and this book stays open on your account forever. No subscription, nothing to cancel.</p>'
          + '<a class="btn btn--yellow" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;font-weight:800" href="gold.html?book=' + encodeURIComponent(book.id) + '#single">Unlock this book \u00b7 \u20b9' + LOCK.bookPrice + '</a></div>'
          + '<div class="rm-callout"><b>\u2726 OR GOLD, ALSO ONCE</b>'
          + '<p style="margin:6px 0 12px">99 rupees opens Gold for a season, 999 makes it permanent. Both are one-time payments, never a plan you have to cancel.</p>'
          + '<a class="btn" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;font-weight:800" href="gold.html">See Gold</a></div>'
          + '<p style="font-size:12.5px;color:var(--mute)">Sharing, highlighting and saving phrases stays open to everyone, paid book or not.</p>'
      });
    }
  }
  buildPages();

  /* v382: a reader who opens a book must land on the book. The first page is a
     three line "big idea" card, and landing there made the whole book look
     empty. We open on chapter one, and the big idea stays one tap back. */
  var curPage = pages.length > 1 ? 1 : 0;
  var urlParams = new URLSearchParams(window.location.search);
  var urlPage = parseInt(urlParams.get('page'), 10);
  if (!isNaN(urlPage) && urlPage >= 0 && urlPage < pages.length) {
    curPage = urlPage;
  } else {
    var savedPos = parseInt(localStorage.getItem('tsb_reader_pos_' + book.id), 10);
    if (!isNaN(savedPos) && savedPos >= 0 && savedPos < pages.length) {
      curPage = savedPos;
    }
  }

  var articleEl = document.getElementById('rmArticle');
  var posEl = document.getElementById('rmPos');
  var prevBtn = document.getElementById('rmPrev');
  var nextBtn = document.getElementById('rmNext');
  var readBtn = document.getElementById('rmRead');
  var contentsSelect = document.getElementById('rmContentsSelect');
  var modeSelect = document.getElementById('rmModeSelect');

  // Populate contents dropdown
  if (contentsSelect) {
    contentsSelect.innerHTML = '';
    pages.forEach(function(p, i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = (i + 1) + '. ' + p.title;
      contentsSelect.appendChild(opt);
    });
    contentsSelect.addEventListener('change', function() {
      goToPage(parseInt(this.value, 10));
    });
  }

  function getMode() {
    return localStorage.getItem('tsb_rm_mode') || 'pages';
  }

  /* v387: the listen button used to queue only the page on screen, so a nine page
     book stopped talking after page two. The whole page list is exposed here and
     the queue is built from it. */
  try {
    window.TSB_READER = {
      get pages() { return pages; },
      get cur() { return curPage; },
      get total() { return pages.length; },
      get bookId() { return book ? book.id : null; },
      text: function (i) {
        var pg = pages[i]; if (!pg) return '';
        var d = document.createElement('div'); d.innerHTML = pg.content || '';
        return ((pg.title ? pg.title + '. ' : '') + (d.textContent || '')).replace(/\s+/g, ' ').trim();
      }
    };
  } catch (e) {}

  function renderView() {
    var mode = getMode();
    if (mode === 'scroll') {
      renderScrollMode();
    } else {
      renderPage(curPage);
    }
  }

  function renderPage(idx) {
    if (idx < 0 || idx >= pages.length) return;
    curPage = idx;
    localStorage.setItem('tsb_reader_pos_' + book.id, curPage);
    try { localStorage.setItem('tsb_reader_pos_updated_' + book.id, JSON.stringify(Date.now())); if (window.TSB_AUTH && TSB_AUTH.track) TSB_AUTH.track(); } catch (e) {}

    var p = pages[curPage];
    articleEl.innerHTML =
      '<div class="rm-meta">' + p.meta + '</div>' +
      '<h2>' + p.title + '</h2>' +
      p.content;

    if (posEl) posEl.textContent = 'Page ' + (curPage + 1) + ' of ' + pages.length;
    if (prevBtn) {
      prevBtn.style.display = 'inline-block';
      prevBtn.disabled = curPage === 0;
    }
    if (nextBtn) {
      nextBtn.style.display = 'inline-block';
      nextBtn.disabled = curPage === pages.length - 1;
    }
    if (contentsSelect) contentsSelect.value = curPage;

    var rb = articleEl.querySelector('[data-rm-retry]');
    if (rb) rb.addEventListener('click', function () { location.reload(); });

    updateReadButton();
    try { window.scrollTo(0, 0); } catch(e) {}
  }

  function renderScrollMode() {
    var html = '';
    pages.forEach(function(p, idx) {
      html += '<section id="rmSection' + idx + '" style="margin-bottom:48px;">' +
        '<div class="rm-meta">' + p.meta + '</div>' +
        '<h2>' + p.title + '</h2>' +
        p.content +
        (idx < pages.length - 1 ? '<div class="rm-scroll-divider"></div>' : '') +
        '</section>';
    });
    articleEl.innerHTML = html;

    if (posEl) posEl.textContent = 'Continuous Scroll (' + pages.length + ' sections)';
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';

    updateReadButton();
  }

  function goToPage(idx) {
    var mode = getMode();
    if (mode === 'scroll') {
      var target = document.getElementById('rmSection' + idx);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        curPage = idx;
        localStorage.setItem('tsb_reader_pos_' + book.id, curPage);
    try { localStorage.setItem('tsb_reader_pos_updated_' + book.id, JSON.stringify(Date.now())); if (window.TSB_AUTH && TSB_AUTH.track) TSB_AUTH.track(); } catch (e) {}
        if (contentsSelect) contentsSelect.value = curPage;
      }
    } else {
      if (idx >= 0 && idx < pages.length) {
        renderPage(idx);
      }
    }
  }

  if (prevBtn) prevBtn.addEventListener('click', function() { goToPage(curPage - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function() { goToPage(curPage + 1); });

  // Keyboard navigation
  window.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      goToPage(curPage + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      goToPage(curPage - 1);
    }
  });

  // Touch Swipe Gesture for Page-by-Page
  var touchStartX = 0;
  var touchEndX = 0;
  window.addEventListener('touchstart', function(e) {
    if (e.touches && e.touches[0]) {
      touchStartX = e.touches[0].screenX;
    }
  }, { passive: true });

  window.addEventListener('touchend', function(e) {
    if (e.changedTouches && e.changedTouches[0]) {
      touchEndX = e.changedTouches[0].screenX;
      var diffX = touchStartX - touchEndX;
      if (Math.abs(diffX) > 45 && getMode() === 'pages') {
        if (diffX > 0) {
          // Swipe left -> next
          goToPage(curPage + 1);
        } else {
          // Swipe right -> prev
          goToPage(curPage - 1);
        }
      }
    }
  }, { passive: true });

  // Read toggle and Milestone Awards
  function isRead() {
    try {
      var readList = JSON.parse(localStorage.getItem('tsb_read_books') || '[]');
      return readList.indexOf(book.id) !== -1;
    } catch(e) {
      return false;
    }
  }

  function updateReadButton() {
    if (!readBtn) return;
    var read = isRead();
    if (read) {
      readBtn.textContent = '✓ Finished';
      readBtn.style.background = 'var(--chip, #111)';
      readBtn.style.color = '#fff';
    } else {
      readBtn.textContent = 'Mark Finished';
      readBtn.style.background = 'var(--yellow, #ffc800)';
      readBtn.style.color = '#111111';
    }
  }

  if (readBtn) {
    readBtn.addEventListener('click', function() {
      try {
        var readList = JSON.parse(localStorage.getItem('tsb_read_books') || '[]');
        var idx = readList.indexOf(book.id);
        var newlyFinished = false;
        if (idx === -1) {
          readList.push(book.id);
          newlyFinished = true;
        } else {
          readList.splice(idx, 1);
        }
        localStorage.setItem('tsb_read_books', JSON.stringify(readList));
        updateReadButton();

        // Award milestones if newly finished
        if (newlyFinished && window.TSB && window.TSB.achv) {
          window.TSB.achv.award('book-complete');
          var total = readList.length;
          if (total >= 3) window.TSB.achv.award('book-complete-3');
          if (total >= 10) window.TSB.achv.award('book-complete-10');
        }
      } catch(e) {}
    });
  }

  // Cross-tab synchronization
  window.addEventListener('storage', function(e) {
    if (e.key === 'tsb_read_books' || e.key === 'tsb_bookmarks') {
      updateReadButton();
    }
  });

  // Reading Controls Popover & Swatches
  var toolsBtn = document.getElementById('rmTools');
  var popover = document.getElementById('rmToolsPopover');
  /* v360: choosing a theme, size, mode or contents must never turn the page.
     The panel swallows its own taps so no page-turn handler ever sees them. */
  if (popover) {
    ['click', 'pointerdown', 'touchend'].forEach(function (evt) {
      popover.addEventListener(evt, function (e) { e.stopPropagation(); }, false);
    });
  }
  var sheetEl = document.getElementById('rmLangSheetOverlay');
  if (sheetEl) sheetEl.addEventListener('click', function (e) { e.stopPropagation(); });
  var closePopoverBtn = document.getElementById('rmToolsClose');
  var fontSlider = document.getElementById('rmFontSizeSlider');
  var swatchPaper = document.getElementById('swatchPaper');
  var swatchSepia = document.getElementById('swatchSepia');
  var swatchNight = document.getElementById('swatchNight');

  function openPopover() {
    if (!popover) return;
    popover.style.display = 'block';
  }

  function closePopover() {
    if (!popover) return;
    popover.style.display = 'none';
  }

  if (toolsBtn && popover) {
    toolsBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (popover.style.display === 'block') {
        closePopover();
      } else {
        openPopover();
      }
    });
  }

  if (closePopoverBtn) {
    closePopoverBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      closePopover();
    });
  }

  /* v356: the panel used to close on any click outside it, which on a phone
     meant it vanished the moment you touched a swatch or the page behind it.
     It now stays open until the reader closes it or presses Escape. */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && popover && popover.style.display === 'block') closePopover();
  });

  // Swatch clicks
  function updateSwatches(theme) {
    [swatchPaper, swatchSepia, swatchNight].forEach(function(s) {
      if (s) s.classList.remove('active');
    });
    if (theme === 'sepia' && swatchSepia) swatchSepia.classList.add('active');
    else if (theme === 'night' && swatchNight) swatchNight.classList.add('active');
    else if (swatchPaper) swatchPaper.classList.add('active');
  }

  if (swatchPaper) {
    swatchPaper.addEventListener('click', function() {
      localStorage.setItem('tsb_rm_theme', 'paper');
      applyPrefs();
    });
  }
  if (swatchSepia) {
    swatchSepia.addEventListener('click', function() {
      localStorage.setItem('tsb_rm_theme', 'sepia');
      applyPrefs();
    });
  }
  if (swatchNight) {
    swatchNight.addEventListener('click', function() {
      localStorage.setItem('tsb_rm_theme', 'night');
      applyPrefs();
    });
  }

  // Font Slider
  if (fontSlider) {
    fontSlider.addEventListener('input', function() {
      var val = this.value + 'px';
      localStorage.setItem('tsb_rm_size', val);
      document.documentElement.style.setProperty('--rm-size', val);
    });
  }

  // Preferences
  function applyPrefs() {
    var size = localStorage.getItem('tsb_rm_size') || '20px';
    var font = localStorage.getItem('tsb_rm_font') || "Newsreader, Georgia, serif";
    var spacing = localStorage.getItem('tsb_rm_spacing') || '1.8';
    var theme = localStorage.getItem('tsb_rm_theme') || 'auto';
    var mode = getMode();

    document.documentElement.style.setProperty('--rm-size', size);
    document.documentElement.style.setProperty('--rm-font', font);
    document.documentElement.style.setProperty('--rm-spacing', spacing);

    var numericSize = parseInt(size, 10);
    if (!isNaN(numericSize) && fontSlider) {
      fontSlider.value = numericSize;
    }

    var effectiveTheme = theme;
    if (theme === 'auto') {
      var isSysDark = false;
      try { isSysDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); } catch (eMedia) {}
      var rawTh = '';
      try { rawTh = localStorage.getItem('tsb_theme') || ''; } catch (eTh) {}
      var isAppDark = rawTh === '"dark"' || rawTh === 'dark';
      var isAppLight = rawTh === '"light"' || rawTh === 'light';
      var wantDark = isAppDark || (!isAppLight && isSysDark);
      effectiveTheme = wantDark ? 'night' : 'paper';
    }

    /* v382: the app-wide night palette lives on html.dark. Left on while the
       reader is set to paper or sepia, it kept painting the article cream on
       white and the callout label invisible. The reader owns this page, so the
       class now follows the reader's own theme. */
    try { document.documentElement.classList.toggle('dark', effectiveTheme === 'night'); } catch (eDark) {}
    document.body.classList.remove('rm-theme-sepia', 'rm-theme-night');
    if (effectiveTheme === 'sepia') document.body.classList.add('rm-theme-sepia');
    if (effectiveTheme === 'night') document.body.classList.add('rm-theme-night');
    /* v356: the reader theme is a decision about THIS page, so it is written on
       <html> too and beats the app-wide dark palette. Picking "paper" in the
       middle of the night now actually gives you paper. */
    try {
      document.documentElement.setAttribute('data-rm', effectiveTheme);
      var TC = effectiveTheme === 'night' ? '#16130e' : effectiveTheme === 'sepia' ? '#f4ecd8' : '#fffdf5';
      var mt = document.querySelector('meta[name="theme-color"]');
      if (!mt) { mt = document.createElement('meta'); mt.name = 'theme-color'; document.head.appendChild(mt); }
      mt.content = TC;
      document.documentElement.style.background = TC;
      /* v357: the theme is a token set, not a class. These are the four the
         rest of the app reads, so a component that never learned about the
         reader still paints itself correctly. */
      var BASE = effectiveTheme === 'night'
        ? { '--paper': '#16130e', '--ink': '#f2ead8', '--card': '#1f1b16', '--line': '#342d24', '--muted': '#a29884' }
        : effectiveTheme === 'sepia'
        ? { '--paper': '#f4ecd8', '--ink': '#2c251e', '--card': '#fbf3e1', '--line': '#d9c9a8', '--muted': '#6d5f4e' }
        : { '--paper': '#fffdf5', '--ink': '#16130f', '--card': '#ffffff', '--line': '#e6ddca', '--muted': '#6e6658' };
      /* v382: the film components read their own --f-* palette, and at night that
         palette stayed dark under a paper reader, which is how cream text ended
         up on white paper. The two palettes are one decision, so they move
         together. */
      var TOK = {
        '--paper': BASE['--paper'], '--ink': BASE['--ink'], '--card': BASE['--card'],
        '--line': BASE['--line'], '--muted': BASE['--muted'],
        '--f-paper': BASE['--paper'], '--f-ink': BASE['--ink'], '--f-card': BASE['--card'],
        '--f-line': BASE['--line'], '--f-mu': BASE['--muted']
      };
      Object.keys(TOK).forEach(function (k) { document.documentElement.style.setProperty(k, TOK[k]); });
    } catch (eRm) {}

    updateSwatches(effectiveTheme);

    if (modeSelect) modeSelect.value = mode;
  }

  if (modeSelect) modeSelect.addEventListener('change', function() {
    localStorage.setItem('tsb_rm_mode', this.value);
    renderView();
  });

  try {
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
        if ((localStorage.getItem('tsb_rm_theme') || 'auto') === 'auto') {
          applyPrefs();
        }
      });
    }
  } catch (e) {}

  // Language translation sheet drawer & handlers
  var langBtn = document.getElementById('rmLanguage');
  var langSheetOverlay = document.getElementById('rmLangSheetOverlay');
  var transError = document.getElementById('rmTransError');
  var transDismiss = document.getElementById('rmTransDismiss');

  if (transDismiss && transError) {
    transDismiss.addEventListener('click', function() {
      transError.classList.remove('active');
    });
  }

  var LANG_LABELS = {
    'en': 'English',
    'hi': 'हिन्दी',
    'hi-Latn': 'Hinglish',
    'gu': 'ગુજરાતી',
    'mr': 'मराठी',
    'ta': 'தமிழ்',
    'bn': 'বাংলা'
  };

  function updateLangBtnText(code) {
    if (!langBtn) return;
    /* v387: the pill carries a globe glyph, so the word goes in its own span.
       Writing textContent here used to delete the icon on every switch. */
    var out = LANG_LABELS[code] || (code && code !== 'en' ? String(code).toUpperCase() : 'Translate');
    var label = document.getElementById('rmLangLabel') || langBtn.querySelector('span');
    if (label) label.textContent = out; else langBtn.textContent = out;
  }

  function openLangSheet() {
    if (!langSheetOverlay) return;
    var currentLang = 'en';
    try { currentLang = JSON.parse(localStorage.getItem('tsb_lang')) || 'en'; } catch (e) {}
    var cards = langSheetOverlay.querySelectorAll('.rm-lang-card');
    cards.forEach(function(card) {
      var cLang = card.getAttribute('data-lang');
      card.classList.toggle('active', cLang === currentLang);
    });
    langSheetOverlay.style.display = 'flex';
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        langSheetOverlay.classList.add('active');
      });
    });
  }

  function closeLangSheet() {
    if (!langSheetOverlay) return;
    langSheetOverlay.classList.remove('active');
    setTimeout(function() {
      if (langSheetOverlay) langSheetOverlay.style.display = 'none';
    }, 280);
  }

  if (langBtn) {
    langBtn.addEventListener('click', function () {
      /* v376: one translate sheet everywhere, owned by lang.js, styled by the
         app's own stylesheet. The reader no longer carries a second copy. */
      if (window.TSB_LANG && typeof window.TSB_LANG.open === 'function') { window.TSB_LANG.open(); return; }
      if (typeof openLangSheet === 'function') openLangSheet();
    });
  }
  if (langSheetOverlay) {
    langSheetOverlay.addEventListener('click', function (e) {
      if (e.target === langSheetOverlay) closeLangSheet();
    });
    Array.prototype.forEach.call(langSheetOverlay.querySelectorAll('.rm-lang-card'), function (card) {
      card.addEventListener('click', function () {
        var chosen = card.getAttribute('data-lang');
        if (chosen === 'more') {
          closeLangSheet();
          if (window.TSB_LANG && window.TSB_LANG.open) window.TSB_LANG.open();
          return;
        }
        try { localStorage.setItem('tsb_lang', JSON.stringify(chosen)); } catch (e) {}
        updateLangBtnText(chosen);
        closeLangSheet();
        if (window.TSB_LANG) {
          if (typeof window.TSB_LANG.select === 'function') window.TSB_LANG.select(chosen);
          else if (typeof window.TSB_LANG.activate === 'function') window.TSB_LANG.activate(chosen);
        }
      });
    });
  }

  // Sync initial language label
  try {
    var initLang = JSON.parse(localStorage.getItem('tsb_lang')) || 'en';
    updateLangBtnText(initLang);
  } catch (e) {}

  applyPrefs();
  renderView();

  /* ---------------------------------------------------------------------------
     v385 · the words arrive after the shell, so the page waits for them
     buildPages() above works from what data.js carries: a title and a chapter
     name for each lesson. The lesson text lives in data/lessons/<id>.js and is
     fetched separately. This is the bit that was missing: when the text landed,
     nothing rebuilt, and a book stayed wordless until the reader reloaded.
     --------------------------------------------------------------------------- */
  function repaintContents() {
    if (!contentsSelect) return;
    contentsSelect.innerHTML = '';
    pages.forEach(function (p, i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = (i + 1) + '. ' + p.title;
      contentsSelect.appendChild(opt);
    });
  }

  function upgradeWithLessons() {
    if (!window.TSB_LESSONS) return;
    if (window.TSB_LESSONS.ready(book.id)) return;
    var at = curPage;
    var landed = false;
    window.TSB_LESSONS.ensure(book.id, function () {
      if (landed) return;
      landed = true;
      buildPages();
      repaintContents();
      /* a Listen session started on the empty shell only knew two pages; it
         stops here rather than playing a shorter book than the one on screen */
      try { if (window.TSB_AUDIO && window.TSB_AUDIO.stop) window.TSB_AUDIO.stop(); } catch (e) {}
      var target = Math.min(at, Math.max(0, pages.length - 1));
      if (getMode() === "scroll") { renderView(); try { window.scrollTo(0, 0); } catch (e) {} }
      else renderPage(target);
    });
    /* if the file never lands, the reader is told, in one line, and can ask again */
    setTimeout(function () {
      if (landed || window.TSB_LESSONS.ready(book.id)) return;
      if (document.getElementById("rmRetry")) return;
      var p2 = document.createElement("p");
      p2.id = "rmRetry";
      p2.style.cssText = "margin:22px 0 0;font-size:13.5px;opacity:.9";
      p2.innerHTML = "This chapter is still loading. <button type=\"button\" style=\"font:inherit;font-weight:700;background:none;border:0;padding:0;color:inherit;text-decoration:underline;cursor:pointer\">Try again</button>";
      p2.querySelector("button").addEventListener("click", function () { location.reload(); });
      if (articleEl) articleEl.appendChild(p2);
    }, 6000);
  }

  upgradeWithLessons();
})();
