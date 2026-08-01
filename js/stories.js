/* ============================================================
   THESMALLBOOK — COMMUNITY STORIES (stories.html)
   Uses TSB_STORE (js/store.js): Supabase cloud when configured,
   localStorage fallback otherwise. Seed stories always shown.
   ============================================================ */

/* seed stories are loaded from js/stories-seed.js */
const SEED_STORIES = window.SEED_STORIES || [];
/* approved reader stories (pasted by the site owner) from js/stories-community.js */
const COMMUNITY_STORIES = window.COMMUNITY_STORIES || [];

/* ---------- toast ---------- */
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3200);
}

function escapeHTML(str) {
  return String(str || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- render shelf ---------- */
const grid = document.getElementById("storyGrid");

function bookTitle(id) {
  const b = BOOKS.find((x) => x.id === id);
  return b ? b.title : "Life itself";
}

async function renderShelf() {
  grid.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
  const user = await TSB_STORE.load();
  const seen = new Set(user.map((s) => s.id));
  const globals = [...COMMUNITY_STORIES, ...SEED_STORIES].filter((s) => !seen.has(s.id));
  const stories = [...user, ...globals]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  grid.innerHTML = "";

  /* ✍️ GHOST CARD — the fame slot waiting for the reader's name */
  const ghost = document.createElement("a");
  ghost.className = "card ghostcard";
  ghost.href = "#write";
  ghost.innerHTML = `
    <div class="ghostcard__frame">
      <div class="ghostcard__emoji">✍️</div>
      <div class="ghostcard__title">YOUR STORY HERE</div>
      <div class="ghostcard__byline">by <span class="ghostcard__you">YOUR NAME</span></div>
      <div class="ghostcard__cta">CLAIM THIS SPOT →</div>
    </div>`;
  ghost.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("write").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => { const t = document.getElementById("sTitle"); if (t) t.focus(); }, 600);
  });
  grid.appendChild(ghost);

  if (!stories.length) {
    grid.appendChild(Object.assign(document.createElement("div"), {
      className: "empty", innerHTML: `<span>✍️</span>No stories yet.<br>Be the first to publish one!` }));
    return;
  }

  /* 🏆 FEATURED STORY OF THE WEEK — deterministic weekly rotation */
  const week = Math.floor(Date.now() / (7 * 864e5));
  const featured = stories[week % stories.length];
  // 🏆 if the featured story is YOURS, unlock Featured Author
  if (window.TSB && user.some((s) => s.id === featured.id)) TSB.achv.award("featured-author");

  stories.forEach((s) => {
    const isFeatured = s === featured;
    const a = document.createElement("a");
    a.className = "card" + (isFeatured ? " storycard--featured" : "");
    a.href = `story.html?id=${encodeURIComponent(s.id)}`;
    const words = s.text ? s.text.split(/\s+/).length : 0;
    const mins = s.pdf && !s.text ? "PDF" : Math.max(1, Math.round(words / 200)) + " min";
    const coverHTML = s.cover
      ? `<img class="storycard__cover" src="${s.cover}" alt="${escapeHTML(s.title)} cover">`
      : `<div class="storycard__cover" style="display:grid;place-items:center;font-size:3.4rem;background:var(--yellow);">${s.emoji || "📖"}</div>`;
    a.innerHTML = `
      <div class="card__top">
        <span class="card__cat">COMMUNITY</span>
        <span class="card__time">⏱ ${mins}</span>
        ${coverHTML}
        <span class="storycard__badge">${isFeatured ? "🏆 STORY OF THE WEEK" : "READER STORY"}</span>
      </div>
      <div class="card__body">
        <div class="card__title">${escapeHTML(s.title)}</div>
        <div class="card__author">by ${escapeHTML(s.author)}</div>
        <div class="card__tag">Inspired by <strong>${escapeHTML(bookTitle(s.bookId))}</strong></div>
        <div class="card__footer">
          <span class="card__lessons">${s.pdf ? "📄 PDF" : "✍️ TEXT"}</span>
          <span class="card__go">READ IT →</span>
        </div>
      </div>`;
    if (isFeatured && grid.children.length > 1) grid.insertBefore(a, grid.children[1]);
    else grid.appendChild(a);
  });
}

/* ---------- ✨ STORY PROMPTS (kill the blank page) ---------- */
(function () {
  const form = document.getElementById("storyForm");
  if (!form) return;
  const PROMPTS = [
    { e: "📢", t: "Which book called you out?", title: "THE BOOK THAT CALLED ME OUT" },
    { e: "🌙", t: "Your 3 AM turning point", title: "MY 3 AM TURNING POINT" },
    { e: "💸", t: "The lesson you ignored — and paid for", title: "THE LESSON I IGNORED (AND PAID FOR)" },
    { e: "🔁", t: "The habit that finally stuck", title: "THE HABIT THAT FINALLY STUCK" },
    { e: "🗣️", t: "A conversation one book fixed", title: "THE CONVERSATION ONE BOOK FIXED" },
    { e: "🚪", t: "The day you quit the wrong thing", title: "THE DAY I QUIT THE WRONG THING" }
  ];
  const bar = document.createElement("div");
  bar.className = "promptbar";
  bar.innerHTML = `<div class="promptbar__label" translate="no">✨ STUCK? START FROM A PROMPT:</div>
    <div class="promptbar__chips">` +
    PROMPTS.map((p, i) => `<button type="button" class="promptchip" data-prompt="${i}">${p.e} ${p.t}</button>`).join("") +
    `</div>`;
  form.parentNode.insertBefore(bar, form);
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-prompt]");
    if (!btn) return;
    const p = PROMPTS[+btn.dataset.prompt];
    const t = document.getElementById("sTitle");
    if (t) { t.value = p.title; t.focus(); }
    bar.querySelectorAll(".promptchip").forEach((c) => c.classList.toggle("active", c === btn));
  });
})();

/* ---------- populate book select ---------- */
const sel = document.getElementById("sBook");
sel.innerHTML =
  `<option value="">— Life in general —</option>` +
  BOOKS.map((b) => `<option value="${b.id}">${b.title}</option>`).join("");

/* ---------- cover upload (resized to keep payload small) ---------- */
let coverData = "";
const coverInput = document.getElementById("sCover");
const coverDrop = document.getElementById("coverDrop");
const coverPreview = document.getElementById("coverPreview");

coverInput.addEventListener("change", () => {
  const f = coverInput.files[0];
  if (!f) return;
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 400 / img.width, 560 / img.height);
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    coverData = canvas.toDataURL("image/jpeg", 0.82);
    coverPreview.src = coverData;
    coverPreview.style.display = "block";
    coverDrop.classList.add("has-file");
    coverDrop.childNodes[0].textContent = "✅ COVER READY — CLICK TO CHANGE ";
  };
  img.src = URL.createObjectURL(f);
});

/* ---------- pdf upload ---------- */
let pdfData = "";
const pdfInput = document.getElementById("sPdf");
const pdfDrop = document.getElementById("pdfDrop");

pdfInput.addEventListener("change", () => {
  const f = pdfInput.files[0];
  if (!f) return;
  if (f.size > 4 * 1024 * 1024) {
    toast("⚠️ PDF too big — max 4 MB");
    pdfInput.value = "";
    return;
  }
  const r = new FileReader();
  r.onload = () => {
    pdfData = r.result;
    pdfDrop.classList.add("has-file");
    pdfDrop.childNodes[0].textContent = `✅ ${f.name} READY `;
  };
  r.readAsDataURL(f);
});

/* ---------- submit ---------- */
document.getElementById("storyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("sTitle").value.trim();
  const author = document.getElementById("sAuthor").value.trim();
  const text = document.getElementById("sText").value.trim();

  if (!title || !author) { toast("⚠️ Title and name are required"); return; }
  if (!text && !pdfData) { toast("⚠️ Type your story or upload a PDF"); return; }
  if (!coverData) { toast("⚠️ Upload a cover image"); return; }

  const story = {
    id: "s-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    title, author, text,
    bookId: sel.value,
    cover: coverData,
    pdf: pdfData || "",
    date: new Date().toISOString().slice(0, 10)
  };

  toast("⏳ Publishing...");
  const result = await TSB_STORE.save(story);

  if (!result.ok) { toast("❌ Couldn't save — storage full"); return; }

  e.target.reset();
  coverData = ""; pdfData = "";
  coverPreview.style.display = "none";
  coverDrop.classList.remove("has-file");
  coverDrop.childNodes[0].textContent = "🎨 CLICK TO UPLOAD COVER IMAGE ";
  pdfDrop.classList.remove("has-file");
  pdfDrop.childNodes[0].textContent = "📄 CLICK TO UPLOAD PDF (MAX 4 MB) ";

  if (window.TSB) TSB.achv.award("story-published");
  await renderShelf();
  if (result.cloud) toast("🎉 Published globally! Everyone can read it now");
  else if (result.error === "pdf-dropped") toast("⚠️ Saved (locally) without PDF — storage limit");
  else {
    toast("🎉 Published! Saved on this device");
    // offer the no-backend global submission path
    offerGlobalSubmit(story);
  }
  document.getElementById("shelf").scrollIntoView({ behavior: "smooth" });
});

/* ============================================================
   GLOBAL SUBMISSION WITHOUT A BACKEND
   Downloads the story as a small .json file and shows the reader
   how to send it to the site owner, who pastes it into
   js/stories-community.js — making it visible to everyone.
   ============================================================ */
function offerGlobalSubmit(story) {
  let modal = document.getElementById("submitModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "submitModal";
    modal.className = "modal";
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal__box">
      <button class="modal__close">✕</button>
      <div class="modal__title">🌍 Want everyone to read it?</div>
      <p style="font-weight:600; margin-bottom:14px;">
        Your story is saved <strong>on this device</strong>. To get it on the
        <strong>Global Shelf</strong> (visible to every visitor), send it to us —
        it gets added in the next weekly update:
      </p>
      <ol style="font-weight:600; font-size:.92rem; display:flex; flex-direction:column; gap:10px; margin:0 0 18px 20px;">
        <li><strong>Download</strong> your story file below (a tiny .json)</li>
        <li><strong>Send it</strong> to us by email — attach the file</li>
        <li>It appears on the shelf for <strong>everyone</strong> within a week ✨</li>
      </ol>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn btn--yellow" id="dlStoryBtn">⬇ DOWNLOAD STORY FILE</button>
        <a class="btn btn--blue" id="mailStoryBtn" href="#">📧 OPEN EMAIL</a>
      </div>
      <p style="font-size:.7rem; font-weight:600; margin-top:12px; opacity:.7;">
        Stories are reviewed before going global — keep it original and kind.
      </p>
    </div>`;
  modal.classList.add("open");
  modal.querySelector(".modal__close").addEventListener("click", () => modal.classList.remove("open"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); });

  modal.querySelector("#dlStoryBtn").addEventListener("click", () => {
    // strip heavy pdf from the submission file if huge; covers stay (they're small)
    const sub = Object.assign({}, story);
    if (sub.pdf && sub.pdf.length > 2.5 * 1024 * 1024) sub.pdf = "";
    const blob = new Blob([JSON.stringify(sub, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `story-${story.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("⬇ Story file downloaded — now email it to us!");
  });

  const mail = modal.querySelector("#mailStoryBtn");
  const subject = encodeURIComponent(`[TheSmallBook Story] ${story.title} — by ${story.author}`);
  const body = encodeURIComponent(
    `Hi Jash!\n\nI just wrote a story on TheSmallBook and I'd love it on the Global Shelf.\n\n` +
    `Title: ${story.title}\nAuthor: ${story.author}\n\n` +
    `I've attached the story file (downloaded from the site).\n\nThanks!`);
  mail.href = `mailto:${window.TSB_CONFIG && TSB_CONFIG.SUBMIT_EMAIL ? TSB_CONFIG.SUBMIT_EMAIL : "your-email@example.com"}?subject=${subject}&body=${body}`;
}

renderShelf();
