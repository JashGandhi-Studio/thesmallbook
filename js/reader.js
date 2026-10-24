(function() {
  'use strict';

  function getQueryParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  var bookId = getQueryParam('id') || 'atomic-habits';
  var books = window.BOOKS || [];
  var book = books.find(function(b) { return b.id === bookId; }) || books[0];

  if (!book) {
    document.body.innerHTML = '<div style="padding:40px;text-align:center;"><h2>Book not found</h2><a href="index.html">← Back to shelf</a></div>';
    return;
  }

  // First-open milestone
  try {
    if (window.TSB && window.TSB.achv) {
      window.TSB.achv.award('first-open');
    }
  } catch(e) {}

  // Set Back link
  var backBtn = document.getElementById('rmBack');
  if (backBtn) {
    backBtn.href = 'book.html?id=' + encodeURIComponent(book.id);
  }

  // Set Title & Author
  var titleEl = document.getElementById('rmTitle');
  var authorEl = document.getElementById('rmAuthor');
  if (titleEl) titleEl.textContent = book.title;
  if (authorEl) authorEl.textContent = 'by ' + book.author;
  document.title = book.title + ' | TheSmallBook Reader';

  // Build Pages/Sections
  var pages = [];

  // Page 0: The Big Idea
  pages.push({
    title: 'The Big Idea',
    meta: (book.cat || 'OVERVIEW') + ' · OVERVIEW',
    content: '<p><strong>' + (book.tagline || '') + '</strong></p>' +
             '<p>' + (book.oneliner || '') + '</p>' +
             (book.bigidea ? '<div class="rm-callout"><b>💡 The Core Insight</b>' + book.bigidea + '</div>' : '')
  });

  // Pages 1 to N: The Lessons
  if (Array.isArray(book.lessons)) {
    book.lessons.forEach(function(lesson, idx) {
      var html = '<p>' + (lesson.summary || '') + '</p>';
      if (lesson.example) {
        html += '<div class="rm-callout"><b>📖 Real-World Example</b>' + lesson.example + '</div>';
      }
      if (lesson.action) {
        html += '<div class="rm-callout"><b>⚡ Practical Action</b>' + lesson.action + '</div>';
      }
      pages.push({
        title: lesson.title,
        meta: (lesson.chapter ? lesson.chapter.toUpperCase() : ('LESSON ' + (idx + 1))),
        content: html
      });
    });
  }

  // Final Page: Action Plan & Quotes
  var endHtml = '';
  if (Array.isArray(book.plan) && book.plan.length > 0) {
    endHtml += '<h3>⚡ 5-Step Action Plan</h3><ol style="padding-left:20px;margin-bottom:24px;">';
    book.plan.forEach(function(step) {
      endHtml += '<li style="margin-bottom:10px;">' + step + '</li>';
    });
    endHtml += '</ol>';
  }
  if (Array.isArray(book.quotes) && book.quotes.length > 0) {
    endHtml += '<h3>💬 Key Quotes</h3>';
    book.quotes.forEach(function(q) {
      endHtml += '<blockquote style="border-left:3px solid var(--yellow);padding-left:14px;margin:12px 0;font-style:italic;">“' + q + '”</blockquote>';
    });
  }
  if (endHtml) {
    pages.push({
      title: 'Action Plan & Takeaways',
      meta: 'WRAP-UP & RETENTION',
      content: endHtml
    });
  }

  var curPage = 0;
  var savedPos = parseInt(localStorage.getItem('tsb_reader_pos_' + book.id), 10);
  if (!isNaN(savedPos) && savedPos >= 0 && savedPos < pages.length) {
    curPage = savedPos;
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

  // Reading Settings Dialog
  var dialog = document.getElementById('rmDialog');
  var toolsBtn = document.getElementById('rmTools');
  var closeDialogBtn = document.getElementById('rmCloseDialog');
  var sizeSelect = document.getElementById('rmSizeSelect');
  var fontSelect = document.getElementById('rmFontSelect');
  var spacingSelect = document.getElementById('rmSpacingSelect');
  var themeSelect = document.getElementById('rmThemeSelect');

  if (toolsBtn && dialog) {
    toolsBtn.addEventListener('click', function() {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', 'true');
      }
    });
  }

  if (closeDialogBtn && dialog) {
    closeDialogBtn.addEventListener('click', function() {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    });
  }

  // Preferences
  function applyPrefs() {
    var size = localStorage.getItem('tsb_rm_size') || '20px';
    var font = localStorage.getItem('tsb_rm_font') || "'Newsreader', Georgia, serif";
    var spacing = localStorage.getItem('tsb_rm_spacing') || '1.8';
    var theme = localStorage.getItem('tsb_rm_theme') || 'paper';
    var mode = getMode();

    document.documentElement.style.setProperty('--rm-size', size);
    document.documentElement.style.setProperty('--rm-font', font);
    document.documentElement.style.setProperty('--rm-spacing', spacing);

    document.body.classList.remove('rm-theme-sepia', 'rm-theme-night');
    if (theme === 'sepia') document.body.classList.add('rm-theme-sepia');
    if (theme === 'night') document.body.classList.add('rm-theme-night');

    if (sizeSelect) sizeSelect.value = size;
    if (fontSelect) fontSelect.value = font;
    if (spacingSelect) spacingSelect.value = spacing;
    if (themeSelect) themeSelect.value = theme;
    if (modeSelect) modeSelect.value = mode;
  }

  if (modeSelect) modeSelect.addEventListener('change', function() {
    localStorage.setItem('tsb_rm_mode', this.value);
    renderView();
  });
  if (sizeSelect) sizeSelect.addEventListener('change', function() {
    localStorage.setItem('tsb_rm_size', this.value);
    applyPrefs();
  });
  if (fontSelect) fontSelect.addEventListener('change', function() {
    localStorage.setItem('tsb_rm_font', this.value);
    applyPrefs();
  });
  if (spacingSelect) spacingSelect.addEventListener('change', function() {
    localStorage.setItem('tsb_rm_spacing', this.value);
    applyPrefs();
  });
  if (themeSelect) themeSelect.addEventListener('change', function() {
    localStorage.setItem('tsb_rm_theme', this.value);
    applyPrefs();
  });

  // Language translation handler & graceful failure
  var langBtn = document.getElementById('rmLanguage');
  var transError = document.getElementById('rmTransError');
  var transDismiss = document.getElementById('rmTransDismiss');

  if (transDismiss && transError) {
    transDismiss.addEventListener('click', function() {
      transError.classList.remove('active');
    });
  }

  if (langBtn) {
    langBtn.addEventListener('click', function() {
      if (window.TSB && window.TSB.openLangModal) {
        try {
          window.TSB.openLangModal();
        } catch(err) {
          if (transError) transError.classList.add('active');
        }
      } else {
        var modal = document.getElementById('langModal');
        if (modal) {
          modal.classList.add('open');
        } else {
          // If translation unavailable or offline
          if (transError) transError.classList.add('active');
        }
      }
    });
  }

  applyPrefs();
  renderView();
})();
