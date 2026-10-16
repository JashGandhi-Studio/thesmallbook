(function() {
  'use strict';

  var KEY = 'tsb_personal_profile';
  var categories = [
    'Self-Improvement',
    'Power & Strategy',
    'Money & Wealth',
    'Startups & Business',
    'Psychology & Mind',
    'Productivity & Work',
    'Philosophy & Life',
    'Science & Tech',
    'Biography & History'
  ];

  var categoryAliases = {
    'Money & Finance': 'Money & Wealth',
    'Business & Startups': 'Startups & Business',
    'Psychology & People': 'Psychology & Mind',
    'History': 'Biography & History',
    'Creativity': 'Productivity & Work'
  };

  function normalizeCategory(cat) {
    if (!cat) return 'Self-Improvement';
    return categoryAliases[cat] || cat;
  }

  function readProfile() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || p.version !== 1 || !Array.isArray(p.interests)) return null;
      var validInterests = p.interests
        .map(function(c) { return normalizeCategory(c); })
        .filter(function(c) { return categories.indexOf(c) !== -1; });
      validInterests = Array.from(new Set(validInterests)).slice(0, 3);
      if (!validInterests.length) return null;
      return {
        version: 1,
        interests: validInterests,
        minutes: [5, 10, 20].indexOf(+p.minutes) !== -1 ? +p.minutes : 10,
        format: p.format === 'listen' ? 'listen' : 'read',
        seed: typeof p.seed === 'string' ? p.seed.slice(0, 100) : 'discovery'
      };
    } catch(e) {
      return null;
    }
  }

  function saveProfile(data) {
    try {
      var obj = {
        version: 1,
        interests: (data.interests || []).slice(0, 3),
        minutes: data.minutes || 10,
        format: data.format || 'read',
        seed: data.seed || 'discovery'
      };
      localStorage.setItem(KEY, JSON.stringify(obj));
      window.dispatchEvent(new CustomEvent('tsb:personalized', { detail: obj }));
    } catch(e) {}
  }

  function getDaySeed() {
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function hashString(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function getDailyPicks() {
    var books = window.BOOKS || [];
    if (!books.length) return [];

    var prof = readProfile();
    var userCats = prof ? prof.interests : ['Self-Improvement', 'Psychology & Mind', 'Money & Wealth'];
    var isListen = prof && prof.format === 'listen';
    var AB = window.TSB_AUDIOBOOKS || {};
    var daySeed = getDaySeed();
    var baseHash = hashString(daySeed + '_' + (prof ? prof.interests.join(',') : 'default') + (isListen ? '_listen' : ''));

    // Filter candidate books by category
    var matches = books.filter(function(b) {
      var c = normalizeCategory(b.category || b.cat);
      return userCats.indexOf(c) !== -1;
    });
    if (matches.length < 3) {
      matches = books.slice();
    }

    // When the reader's preferred mode is listening, ensure the picks have real human audiobooks
    if (isListen) {
      var abMatches = matches.filter(function(b) { return !!AB[b.id]; });
      if (abMatches.length >= 3) {
        matches = abMatches;
      } else {
        var allAbs = books.filter(function(b) { return !!AB[b.id]; });
        if (allAbs.length >= 3) matches = allAbs;
      }
    }

    var picks = [];
    var usedIds = new Set();
    var attempts = 0;
    while (picks.length < 3 && attempts < matches.length * 2) {
      var idx = (baseHash + attempts * 17) % matches.length;
      var candidate = matches[idx];
      if (candidate && !usedIds.has(candidate.id)) {
        usedIds.add(candidate.id);
        picks.push(candidate);
      }
      attempts++;
    }

    // Fallbacks if still short
    var fallbackIds = isListen
      ? ['meditations', 'as-a-man-thinketh', 'science-of-getting-rich', 'richest-man-babylon', 'art-of-war', 'siddhartha']
      : ['atomic-habits', 'psychology-of-money', 'deep-work', 'nudge', 'antifragile'];
    for (var i = 0; i < fallbackIds.length && picks.length < 3; i++) {
      var fb = books.find(function(b) { return b.id === fallbackIds[i]; });
      if (fb && !usedIds.has(fb.id)) {
        usedIds.add(fb.id);
        picks.push(fb);
      }
    }

    return picks;
  }

  var QUOTES = [
    'A little wiser, every single day.',
    'Your next small step starts here.',
    'Great ideas deserve ten focused minutes.',
    'Read deeply. Think clearly. Act simply.',
    'Small lessons compound into big shifts.'
  ];

  function getDailyQuote() {
    var daySeed = getDaySeed();
    var idx = hashString(daySeed) % QUOTES.length;
    return QUOTES[idx];
  }

  function formatDate() {
    var now = new Date();
    var options = { weekday: 'long', month: 'long', day: 'numeric' };
    return now.toLocaleDateString('en-US', options);
  }

  function renderHomeTrio() {
    var dateEl = document.getElementById('todayDate');
    var quoteEl = document.getElementById('todayQuote');
    var coversEl = document.getElementById('dailyTrioCovers');

    if (dateEl) dateEl.textContent = formatDate();
    if (quoteEl) quoteEl.textContent = getDailyQuote();

    if (!coversEl) return;
    var prof = readProfile();
    var isListen = prof && prof.format === 'listen';
    var picks = getDailyPicks();
    if (!picks.length) return;

    coversEl.innerHTML = picks.map(function(b, i) {
      var time = (b.time || Math.max(7, Math.round((b.lessons ? b.lessons.length : 6) * 1.6))) + ' min';
      var cat = (b.category || b.cat || 'WISDOM').toUpperCase();
      var isSaved = (window.TSB && TSB.bookmarks && TSB.bookmarks.has(b.id));

      var actionBtn = isListen
        ? '<a class="trio-card__readbtn trio-card__readbtn--audio" href="book.html?id=' + encodeURIComponent(b.id) + '&listen=1">🎧 Listen to Audiobook</a>'
        : '<a class="trio-card__readbtn" href="book.html?id=' + encodeURIComponent(b.id) + '">Read summary →</a>';

      return '<div class="trio-card">' +
        '<div class="trio-card__cover">' +
          '<img src="' + b.cover + '" alt="' + b.title + ' cover" loading="lazy">' +
        '</div>' +
        '<div class="trio-card__body">' +
          '<span class="trio-card__cat">' + cat + '</span>' +
          '<h3 class="trio-card__title">' + b.title + '</h3>' +
          '<span class="trio-card__author">by ' + b.author + '</span>' +
          '<div class="trio-card__meta">' +
            '<span class="trio-card__time">' + (isListen ? '🎙️ ' : '⏱ ') + time + '</span>' +
            '<div class="trio-card__acts">' +
              actionBtn +
              '<button type="button" class="trio-card__save ' + (isSaved ? 'on' : '') + '" data-save-id="' + b.id + '" title="Save to shelf" aria-label="Save book">' +
                (isSaved ? '❤️' : '🤍') +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    // Wire one-tap shelf save button
    coversEl.querySelectorAll('.trio-card__save').forEach(function(btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        var bid = btn.getAttribute('data-save-id');
        if (window.TSB && TSB.bookmarks) {
          var on = TSB.bookmarks.toggle(bid);
          btn.classList.toggle('on', on);
          btn.textContent = on ? '❤️' : '🤍';
        }
      };
    });
  }

  // Personalization Setup Dialog
  function ensureSetupDialog() {
    var dlg = document.getElementById('personalSetup');
    if (dlg) return dlg;

    dlg = document.createElement('dialog');
    dlg.id = 'personalSetup';
    dlg.className = 'ed-dialog personal-dialog';
    dlg.setAttribute('aria-label', 'Personalize your shelf');
    dlg.innerHTML =
      '<div class="personal-dialog__box">' +
        '<div class="personal-dialog__head">' +
          '<div>' +
            '<span class="ed-eyebrow">MAKE THE SHELF YOURS</span>' +
            '<h2>What are you curious about?</h2>' +
          '</div>' +
          '<button type="button" class="personal-dialog__close" id="setupClose" aria-label="Close">✕</button>' +
        '</div>' +
        '<p class="personal-dialog__sub">Pick up to 3 topics. We will shape 3 fresh books and one insight for you every morning.</p>' +
        '<div class="personal-topics" id="setupTopics">' +
          categories.map(function(c) {
            return '<button type="button" class="personal-topic-btn" data-interest="' + c + '">' + c + '</button>';
          }).join('') +
        '</div>' +
        '<div class="personal-section">' +
          '<b>Daily reading time:</b>' +
          '<div class="personal-times" id="setupTimes">' +
            '<button type="button" class="personal-time-btn" data-minutes="5">5 min</button>' +
            '<button type="button" class="personal-time-btn on" data-minutes="10">10 min</button>' +
            '<button type="button" class="personal-time-btn" data-minutes="20">20 min</button>' +
          '</div>' +
        '</div>' +
        '<div class="personal-section">' +
          '<b>Preferred format:</b>' +
          '<div class="personal-formats" id="setupFormats">' +
            '<button type="button" class="personal-fmt-btn on" data-format="read">📖 Read</button>' +
            '<button type="button" class="personal-fmt-btn" data-format="listen">🎧 Listen</button>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="personal-save-btn" id="setupNext">Save & Explore My Shelf →</button>' +
      '</div>';
    document.body.appendChild(dlg);

    // Event listeners
    var closeBtn = dlg.querySelector('#setupClose');
    if (closeBtn) closeBtn.onclick = function() { dlg.close(); };

    var selectedInterests = [];
    var selectedMinutes = 10;
    var selectedFormat = 'read';

    // Hydrate existing
    var cur = readProfile();
    if (cur) {
      selectedInterests = cur.interests.slice();
      selectedMinutes = cur.minutes;
      selectedFormat = cur.format;
    }

    function syncUI() {
      dlg.querySelectorAll('.personal-topic-btn').forEach(function(b) {
        var cat = b.getAttribute('data-interest');
        b.classList.toggle('on', selectedInterests.indexOf(cat) !== -1);
      });
      dlg.querySelectorAll('.personal-time-btn').forEach(function(b) {
        b.classList.toggle('on', +b.getAttribute('data-minutes') === selectedMinutes);
      });
      dlg.querySelectorAll('.personal-fmt-btn').forEach(function(b) {
        b.classList.toggle('on', b.getAttribute('data-format') === selectedFormat);
      });
    }

    dlg.querySelectorAll('.personal-topic-btn').forEach(function(b) {
      b.onclick = function() {
        var cat = b.getAttribute('data-interest');
        var idx = selectedInterests.indexOf(cat);
        if (idx !== -1) {
          selectedInterests.splice(idx, 1);
        } else {
          if (selectedInterests.length < 3) {
            selectedInterests.push(cat);
          }
        }
        syncUI();
      };
    });

    dlg.querySelectorAll('.personal-time-btn').forEach(function(b) {
      b.onclick = function() {
        selectedMinutes = +b.getAttribute('data-minutes');
        syncUI();
      };
    });

    dlg.querySelectorAll('.personal-fmt-btn').forEach(function(b) {
      b.onclick = function() {
        selectedFormat = b.getAttribute('data-format');
        syncUI();
      };
    });

    var saveBtn = dlg.querySelector('#setupNext');
    if (saveBtn) {
      saveBtn.onclick = function() {
        if (!selectedInterests.length) {
          selectedInterests = ['Self-Improvement'];
        }
        saveProfile({
          interests: selectedInterests,
          minutes: selectedMinutes,
          format: selectedFormat
        });
        dlg.close();
        renderHomeTrio();
      };
    }

    syncUI();
    return dlg;
  }

  function openSetup() {
    var dlg = ensureSetupDialog();
    if (typeof dlg.showModal === 'function') {
      dlg.showModal();
    } else {
      dlg.setAttribute('open', 'true');
    }
  }

  // Hook into trigger buttons
  function init() {
    renderHomeTrio();
    var newHereBtn = document.getElementById('newHereBtn');
    if (newHereBtn) {
      newHereBtn.addEventListener('click', openSetup);
    }
    document.querySelectorAll('[data-personalize]').forEach(function(btn) {
      btn.addEventListener('click', openSetup);
    });

    window.addEventListener('tsb:personalized', function() {
      renderHomeTrio();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.TSB_PERSONAL = {
    profile: readProfile,
    picks: getDailyPicks,
    headline: getDailyQuote,
    dateString: formatDate,
    openSetup: openSetup,
    save: saveProfile
  };
})();
