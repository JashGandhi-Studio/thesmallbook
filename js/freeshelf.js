/* v331 FREE SHELF: every book page points to the whole book, free and legal.
   - Open Library (Internet Archive) lends millions of books free with an account
   - public-domain books link to Project Gutenberg and Standard Ebooks
   - if LibriVox has it, the full audiobook plays right here
   - and readers can offer their own copy to a friend: books are meant to travel */
(function () {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var IC = {
    lib: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M8 7h7"/></svg>',
    ear: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="14" width="4" height="7" rx="2"/><rect x="17" y="14" width="4" height="7" rx="2"/></svg>',
    pd: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 16V8h3.5a2.5 2.5 0 0 1 0 5H9"/></svg>',
    hand: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7"/><path d="M12 3v12M8 7l4-4 4 4"/></svg>',
    go: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>'
  };
  function bookId() { var m = /[?&]id=([^&#]+)/.exec(location.search); return m ? decodeURIComponent(m[1]) : ""; }
  function find(id) { var B = window.BOOKS || []; for (var i = 0; i < B.length; i++) if (B[i].id === id) return B[i]; return null; }
  function original(b) { try { if (((window.TSB_CONFIG && TSB_CONFIG.ORIGINALS) || []).indexOf(b.id) >= 0) return true; } catch (e) {} return /^unknown$/i.test(b.author || ""); }
  function paint() {
    var host = document.getElementById("freeShelf"); if (!host || host.getAttribute("data-done")) return;
    var b = find(bookId()); if (!b) return;
    host.setAttribute("data-done", "1");
    if (original(b)) return;             /* our own books are already whole, right here */
    var q = encodeURIComponent(b.title + " " + (b.author || ""));
    var year = parseInt(b.year, 10), pd = year && year < 1930;
    var ab = null; try { ab = window.TSB_AUDIO && TSB_AUDIO.audiobookFor ? TSB_AUDIO.audiobookFor(b.id) : null; } catch (e) {}
    var rows = [];
    if (ab) rows.push('<button type="button" class="fsx-r" data-fsx-ab>' + IC.ear + "<span><b>Hear the full audiobook</b><i>Free, read by LibriVox volunteers</i></span>" + IC.go + "</button>");
    if (pd) rows.push('<a class="fsx-r" href="https://www.gutenberg.org/ebooks/search/?query=' + q + '" target="_blank" rel="noopener">' + IC.pd + "<span><b>Free ebook, public domain</b><i>Project Gutenberg</i></span>" + IC.go + "</a>");
    if (pd) rows.push('<a class="fsx-r" href="https://standardebooks.org/ebooks?query=' + encodeURIComponent(b.title) + '" target="_blank" rel="noopener">' + IC.pd + "<span><b>A beautiful free edition</b><i>Standard Ebooks</i></span>" + IC.go + "</a>");
    rows.push('<a class="fsx-r" href="https://openlibrary.org/search?q=' + q + '&mode=everything" target="_blank" rel="noopener">' + IC.lib + "<span><b>Borrow it free</b><i>Open Library, with a free account</i></span>" + IC.go + "</a>");
    rows.push('<button type="button" class="fsx-r fsx-r--pass" data-fsx-pass>' + IC.hand + "<span><b>Have a copy? Pass it on</b><i>Offer it to a friend on WhatsApp</i></span>" + IC.go + "</button>");
    host.innerHTML = '<div class="fsx-k">THE WHOLE BOOK</div><h2 class="fsx-h">Want all of it? <i>Read it free.</i></h2><div class="fsx-l">' + rows.join("") + "</div>";
    host.hidden = false;
    host.addEventListener("click", function (e) {
      if (e.target.closest("[data-fsx-ab]")) { try { TSB_AUDIO.playAudiobook(b.id); } catch (eA) { location.href = "podcasts.html"; } return; }
      if (e.target.closest("[data-fsx-pass]")) {
        var url = "https://thesmallbook.in/book.html?id=" + encodeURIComponent(b.id);
        var txt = "I have a copy of " + b.title + " by " + b.author + ". Want to borrow it? Here are the big ideas first: " + url;
        location.href = "https://wa.me/?text=" + encodeURIComponent(txt);
      }
    });
  }
  function tryPaint(n) { paint(); var h = document.getElementById("freeShelf"); if (h && !h.getAttribute("data-done") && n < 40) setTimeout(function () { tryPaint(n + 1); }, 250); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { tryPaint(0); }); else tryPaint(0);
})();
