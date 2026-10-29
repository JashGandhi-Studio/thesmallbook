/* ============================================================
   THESMALLBOOK, STORY READER (story.html)
   Loads a story via TSB_STORE (cloud/local) or from seeds.
   ============================================================ */

(function () {
  function escapeHTML(str) {
    return String(str || "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function bookTitle(bookId) {
    const b = BOOKS.find((x) => x.id === bookId);
    return b ? b.title : "life itself";
  }

  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  async function loadStory() {
    // global stories first (seeds + owner-approved community), no network needed
    const globals = [...(window.COMMUNITY_STORIES || []), ...(window.SEED_STORIES || [])];
    const g = globals.find((s) => s.id === id);
    if (g) return g;
    return await TSB_STORE.find(id);
  }

  function render(s) {
    const meta = document.getElementById("meta");
    const content = document.getElementById("content");

    if (!s) {
      meta.innerHTML = "";
      content.innerHTML = `<div class="empty"><span>🪦</span>Story not found.<br><a href="stories.html">Back to the community shelf →</a></div>`;
      return;
    }

    document.title = `${s.title}, TheSmallBook`;

    /* v331: only safe addresses reach src, and every value is escaped */
    const safeUrl = (u, img) => { u = String(u || ""); return (img ? /^(https:|data:image\/(png|jpe?g|webp|gif);|blob:|assets\/)/i : /^(https:|data:application\/pdf;|blob:)/i).test(u) ? escapeHTML(u) : ""; };
    const cov = safeUrl(s.cover, true), pdf = safeUrl(s.pdf, false);
    const coverHTML = cov
      ? `<img class="reader__cover" src="${cov}" alt="cover">`
      : `<div class="reader__cover" style="display:grid;place-items:center;font-size:2.6rem;background:var(--yellow);height:120px;">${escapeHTML(s.emoji || "📖")}</div>`;

    meta.innerHTML = `
      ${coverHTML}
      <div>
        <div class="reader__title">${escapeHTML(s.title)}</div>
        <div class="reader__by">by ${escapeHTML(s.author)} · ${escapeHTML(s.date || "")} · inspired by ${escapeHTML(bookTitle(s.bookId))}</div>
      </div>`;

    let html = "";
    if (s.text) html += `<div class="reader__text">${escapeHTML(s.text)}</div>`;
    if (pdf) html += `<div style="margin-top:24px;"><embed src="${pdf}" type="application/pdf"></div>`;
    content.innerHTML = html;
  }

  document.getElementById("content").innerHTML = `<div class="empty"><span>⏳</span>Loading...</div>`;
  loadStory().then(render);
})();
