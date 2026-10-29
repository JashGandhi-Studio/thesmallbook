/* ============================================================
   THESMALLBOOK - NEO-BRUTALIST SHARE BOTTOM SHEET (v323)
   Matches the official product film design:
   - Bottom sheet drawer with grabber handle
   - Header: SHARE THIS BOOK / Anyone can open it. No app or sign-up needed.
   - Preview Card: Book Cover, Title, Author · ReadTime · Lessons, Link Pill
   - Primary CTA: 🔗 COPY LINK (flashes ✓ COPIED TO CLIPBOARD!)
   - 4 Direct Share Apps: WhatsApp, Instagram, Messages, More
   ============================================================ */

(function () {
  'use strict';

  var currentBook = null;
  var overlay = null;

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isGold() {
    try {
      if (window.TSB_GOLD && typeof window.TSB_GOLD.isGold === 'function') {
        return window.TSB_GOLD.isGold();
      }
      /* v331: Gold is decided by the server only, never by storage */
    } catch (e) {}
    return false;
  }

  function getSharerName() {
    var name = '';
    try {
      name = localStorage.getItem('tsb_reader_name') || localStorage.getItem('tsb_profile_name') || '';
    } catch (e) {}
    if (name === 'Guest Reader') name = '';
    return (name || '').trim();
  }

  function getShareUrl(b) {
    if (!b) return '';
    var origin = window.location.origin || 'https://thesmallbook.in';
    var gold = isGold();
    var name = getSharerName();
    var query = '?id=' + encodeURIComponent(b.id) + '&shared=1';
    if (gold && name) {
      query += '&from=' + encodeURIComponent(name) + '&gold=1';
    }
    return origin + '/random.html' + query;
  }

  function getShareText(b) {
    var url = getShareUrl(b);
    var lessonCount = (b.lessons && b.lessons.length) ? b.lessons.length : 6;
    var time = b.readTime || '8 min';
    var tag = b.oneLiner || b.tagline || 'Essential ideas distilled';
    var gold = isGold();
    var name = getSharerName();
    var intro = (gold && name)
      ? name + ' recommended this book for you:\n'
      : 'A fellow reader recommended this book for you:\n';
    return '📕 ' + intro + b.title + ' - ' + tag + '\n\nExperience the 3D book and free breakdown (' + lessonCount + ' lessons, ' + time + '):\n' + url;
  }

  function createSheet() {
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'share-sheet-overlay';
    overlay.id = 'tsbShareOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Share this book');

    overlay.innerHTML =
      '<div class="share-sheet" id="tsbShareSheet">' +
        '<div class="share-sheet__handle" aria-hidden="true"></div>' +
        '<div class="share-sheet__header">' +
          '<h3 class="share-sheet__title">SHARE THIS BOOK</h3>' +
          '<p class="share-sheet__sub">Anyone can open it in 3D. No app or sign-up needed.</p>' +
        '</div>' +
        '<div class="share-attrib-bar" id="tsbShareAttrib"></div>' +
        '<div class="share-card">' +
          '<img class="share-card__cover" id="tsbShareCover" src="" alt="Book Cover" loading="lazy">' +
          '<div class="share-card__info">' +
            '<h4 class="share-card__title" id="tsbShareBookTitle">Title</h4>' +
            '<div class="share-card__meta" id="tsbShareMeta">Author · 8 min · 6 lessons</div>' +
            '<div class="share-card__linkpill" id="tsbSharePill">thesmallbook.in/random.html?id=...</div>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="share-copy-btn" id="tsbShareCopyBtn">' +
          '<span class="share-copy-btn__icon">🔗</span>' +
          '<span class="share-copy-btn__text">COPY LINK</span>' +
        '</button>' +
        '<div class="share-apps-row">' +
          '<button type="button" class="share-app-btn" id="tsbShareWhatsApp" aria-label="Share via WhatsApp">' +
            '<div class="share-app-icon share-app-icon--wa">' +
              '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">' +
                '<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 7.44C8.95 7.44 8.68 7.5 8.46 7.74C8.24 7.98 7.62 8.56 7.62 9.72C7.62 10.88 8.47 12 8.59 12.16C8.71 12.32 10.23 14.79 12.62 15.73C14.61 16.51 15.02 16.36 15.45 16.32C15.89 16.28 16.86 15.74 17.06 15.18C17.26 14.63 17.26 14.15 17.2 14.05C17.14 13.96 16.98 13.9 16.74 13.78C16.5 13.66 15.34 13.09 15.12 13.01C14.9 12.93 14.74 12.89 14.58 13.13C14.42 13.37 13.96 13.9 13.82 14.06C13.68 14.22 13.54 14.24 13.3 14.12C13.06 14.0 12.28 13.75 11.36 12.93C10.65 12.3 10.16 11.51 10.02 11.27C9.88 11.03 10.01 10.9 10.13 10.78C10.23 10.67 10.37 10.49 10.49 10.35C10.61 10.21 10.65 10.11 10.73 9.95C10.81 9.79 10.77 9.65 10.71 9.53C10.65 9.41 10.19 8.27 10 7.81C9.81 7.36 9.62 7.42 9.47 7.43C9.33 7.44 9.17 7.44 9.11 7.44Z"/>' +
              '</svg>' +
            '</div>' +
            '<span class="share-app-label">WhatsApp</span>' +
          '</button>' +
          '<button type="button" class="share-app-btn" id="tsbShareInstagram" aria-label="Share via Instagram">' +
            '<div class="share-app-icon share-app-icon--ig">' +
              '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>' +
                '<path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>' +
                '<line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>' +
              '</svg>' +
            '</div>' +
            '<span class="share-app-label">Instagram</span>' +
          '</button>' +
          '<button type="button" class="share-app-btn" id="tsbShareMessages" aria-label="Share via Messages">' +
            '<div class="share-app-icon share-app-icon--sms">' +
              '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">' +
                '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>' +
              '</svg>' +
            '</div>' +
            '<span class="share-app-label">Messages</span>' +
          '</button>' +
          '<button type="button" class="share-app-btn" id="tsbShareMore" aria-label="More share options">' +
            '<div class="share-app-icon share-app-icon--more">' +
              '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">' +
                '<circle cx="12" cy="12" r="2.2"></circle>' +
                '<circle cx="19" cy="12" r="2.2"></circle>' +
                '<circle cx="5" cy="12" r="2.2"></circle>' +
              '</svg>' +
            '</div>' +
            '<span class="share-app-label">More</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeSheet();
    });

    var copyBtn = overlay.querySelector('#tsbShareCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', handleCopy);
    }

    var waBtn = overlay.querySelector('#tsbShareWhatsApp');
    if (waBtn) {
      waBtn.addEventListener('click', handleWhatsApp);
    }

    var igBtn = overlay.querySelector('#tsbShareInstagram');
    if (igBtn) {
      igBtn.addEventListener('click', handleInstagram);
    }

    var smsBtn = overlay.querySelector('#tsbShareMessages');
    if (smsBtn) {
      smsBtn.addEventListener('click', handleMessages);
    }

    var moreBtn = overlay.querySelector('#tsbShareMore');
    if (moreBtn) {
      moreBtn.addEventListener('click', handleMore);
    }

    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        closeSheet();
      }
    });

    return overlay;
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (err) {
        document.body.removeChild(ta);
        reject(err);
      }
    });
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 3000);
  }

  function handleCopy() {
    if (!currentBook) return;
    var url = getShareUrl(currentBook);
    var btn = overlay.querySelector('#tsbShareCopyBtn');
    var btnText = btn ? btn.querySelector('.share-copy-btn__text') : null;

    copyTextToClipboard(url).then(function () {
      if (btn && btnText) {
        btn.classList.add('copied');
        btnText.textContent = '✓ COPIED TO CLIPBOARD!';
        setTimeout(function () {
          btn.classList.remove('copied');
          btnText.textContent = 'COPY LINK';
        }, 2200);
      }
      showToast('🔗 Link copied to clipboard!');
      if (window.TSB && window.TSB.achv) window.TSB.achv.award('sharer');
    }).catch(function () {
      showToast('Copy failed - long press to copy URL');
    });
  }

  function handleWhatsApp() {
    if (!currentBook) return;
    var text = getShareText(currentBook);
    var waUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
    try {
      var win = window.open(waUrl, '_blank');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        window.location.href = waUrl;
      }
    } catch (err) {
      window.location.href = waUrl;
    }
    if (window.TSB && window.TSB.achv) window.TSB.achv.award('sharer');
  }

  function handleInstagram() {
    if (!currentBook) return;
    var text = getShareText(currentBook);
    copyTextToClipboard(text).then(function () {
      showToast('✓ Link copied! Opening Instagram to share...');
      setTimeout(function () {
        window.open('https://instagram.com', '_blank');
      }, 500);
      if (window.TSB && window.TSB.achv) window.TSB.achv.award('sharer');
    }).catch(function () {
      window.open('https://instagram.com', '_blank');
    });
  }

  function handleMessages() {
    if (!currentBook) return;
    var text = getShareText(currentBook);
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    var smsUrl = (isIOS ? 'sms:&body=' : 'sms:?body=') + encodeURIComponent(text);
    window.location.href = smsUrl;
    if (window.TSB && window.TSB.achv) window.TSB.achv.award('sharer');
  }

  function handleMore() {
    if (!currentBook) return;
    var url = getShareUrl(currentBook);
    var title = currentBook.title + ' - TheSmallBook';
    var text = '📕 ' + currentBook.title + ' - ' + (currentBook.oneLiner || currentBook.tagline || '');

    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url }).then(function () {
        closeSheet();
        if (window.TSB && window.TSB.achv) window.TSB.achv.award('sharer');
      }).catch(function (e) {
        if (e && e.name === 'AbortError') return;
        handleCopy();
      });
    } else {
      handleCopy();
    }
  }

  function openSheet(book) {
    if (!book) return;
    currentBook = book;
    createSheet();

    var coverEl = overlay.querySelector('#tsbShareCover');
    var titleEl = overlay.querySelector('#tsbShareBookTitle');
    var metaEl = overlay.querySelector('#tsbShareMeta');
    var pillEl = overlay.querySelector('#tsbSharePill');
    var attribEl = overlay.querySelector('#tsbShareAttrib');

    if (coverEl) {
      coverEl.src = 'assets/covers/' + encodeURIComponent(book.id) + '.jpg';
      coverEl.alt = book.title;
    }
    if (titleEl) titleEl.textContent = book.title;

    var lessonCount = (book.lessons && book.lessons.length) ? book.lessons.length : 6;
    var time = book.readTime || '8 min';
    if (metaEl) {
      metaEl.textContent = book.author + ' · ' + time + ' · ' + lessonCount + ' lessons';
    }

    var gold = isGold();
    var name = getSharerName();
    var shareUrl = getShareUrl(book);

    if (attribEl) {
      if (gold) {
        var displayName = name || 'Gold Member';
        attribEl.className = 'share-attrib-bar is-gold';
        attribEl.innerHTML =
          '<div class="share-attrib-info">' +
            '<span class="share-attrib-badge">👑</span>' +
            '<div>' +
              '<div class="share-attrib-title" style="color:#b45309;">GOLD SHARE PRIVILEGE ACTIVE</div>' +
              '<div class="share-attrib-text">Recipients see: <strong>"' + escapeHtml(displayName) + ' shared this book with you"</strong></div>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="share-attrib-action" id="tsbEditSharerName">✎ EDIT NAME</button>';

        var editBtn = attribEl.querySelector('#tsbEditSharerName');
        if (editBtn) {
          editBtn.addEventListener('click', function () {
            var current = getSharerName() || '';
            var promptVal = window.prompt('Enter your name as it should appear on your shared 3D book links:', current);
            if (promptVal !== null) {
              var trimmed = promptVal.trim();
              if (trimmed) {
                try {
                  localStorage.setItem('tsb_reader_name', trimmed);
                  localStorage.setItem('tsb_profile_name', trimmed);
                } catch (e) {}
                openSheet(currentBook);
              }
            }
          });
        }
      } else {
        attribEl.className = 'share-attrib-bar';
        attribEl.innerHTML =
          '<div class="share-attrib-info">' +
            '<span class="share-attrib-badge">⚡</span>' +
            '<div>' +
              '<div class="share-attrib-title">FREE SHARE LINK</div>' +
              '<div class="share-attrib-text">Recipients see: <strong>"A reader shared this book with you"</strong></div>' +
            '</div>' +
          '</div>' +
          '<a href="gold.html" class="share-attrib-action">STAMP MY NAME →</a>';
      }
    }

    if (pillEl) {
      var displayUrl = shareUrl.replace(/^https?:\/\//, '');
      pillEl.textContent = displayUrl;
      pillEl.title = shareUrl;
    }

    overlay.style.display = 'flex';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('active');
      });
    });
  }

  function closeSheet() {
    if (!overlay) return;
    overlay.classList.remove('active');
    setTimeout(function () {
      if (overlay) overlay.style.display = 'none';
    }, 280);
  }

  window.TSB_SHARE = {
    open: openSheet,
    close: closeSheet,
    getUrl: getShareUrl
  };
})();
