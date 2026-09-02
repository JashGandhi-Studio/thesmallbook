/* Splits js/data.js into a light index + per-book shards + a search corpus.
   Run: node tools/split-data.js */
const fs = require("fs"), path = require("path");
global.window = {};
require("../js/data.js");
const BOOKS = global.window.BOOKS || global.BOOKS;
if (!Array.isArray(BOOKS) || !BOOKS.length) throw new Error("BOOKS not found in js/data.js");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "data");
const bookDir = path.join(outDir, "books");
fs.rmSync(bookDir, { recursive: true, force: true });
fs.mkdirSync(bookDir, { recursive: true });

/* 1. INDEX — everything the shelf/search/feed renders, nothing more.
      lessons = [{title, chapter}] so lesson-title search works offline. */
const index = BOOKS.map(b => ({
  id: b.id, title: b.title, author: b.author, year: b.year,
  category: b.category, cover: b.cover, readTime: b.readTime,
  tagline: b.tagline,
  lessons: (b.lessons || []).map(l => ({ title: l.title, chapter: l.chapter }))
}));

/* 2. SEARCH CORPUS — full lesson bodies, lazily fetched only when a user
      types >=4 chars (deep search). Keeps first paint tiny. */
const corpus = {};
for (const b of BOOKS) {
  corpus[b.id] = (b.lessons || []).map(l =>
    ((l.summary || "") + " " + (l.example || "") + " " + (l.action || "")).toLowerCase());
}

/* 3. LESSON-OF-THE-DAY pool — one representative lesson body per book so the
      homepage LOD renders without pulling 3.4 MB. */
const lod = BOOKS.map(b => ({
  id: b.id, title: b.title, author: b.author, cover: b.cover,
  lessons: (b.lessons || []).map(l => ({
    title: l.title, chapter: l.chapter, summary: l.summary, action: l.action
  }))
}));

const w = (f, o) => { fs.writeFileSync(path.join(outDir, f), JSON.stringify(o)); return (fs.statSync(path.join(outDir, f)).size / 1024).toFixed(0); };
const kbIndex  = w("books-index.json", index);
const kbCorpus = w("search-corpus.json", corpus);
const kbLod    = w("lessons.json", lod);

for (const b of BOOKS) fs.writeFileSync(path.join(bookDir, b.id + ".json"), JSON.stringify(b));

const orig = (fs.statSync(path.join(root, "js", "data.js")).size / 1024 / 1024).toFixed(2);
console.log(`books ${BOOKS.length} · lessons ${BOOKS.reduce((n,b)=>n+(b.lessons||[]).length,0)}`);
console.log(`data.js ${orig} MB  →  index ${kbIndex} KB (first paint)`);
console.log(`lazy: corpus ${kbCorpus} KB · lessons ${kbLod} KB · ${BOOKS.length} shards`);
