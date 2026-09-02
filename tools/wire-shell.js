/* Adds css/tokens.css + css/shell.css before style.css, and
   js/theme.js + js/shell.js before </body>, on every app page.
   - SEO pages (books/, graveyard/) get tokens + theme only; shell.js
     self-guards and won't render chrome for anonymous visitors.
   - Idempotent. */
const fs = require("fs"), path = require("path"), root = path.join(__dirname, "..");

const SKIP = new Set(["scan.html"]);   // self-contained dark camera UI

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === "node_modules" || e.name === "docs") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

let css = 0, js = 0, skipped = 0;
for (const f of walk(root)) {
  const rel = path.relative(root, f);
  if (SKIP.has(rel)) { skipped++; continue; }

  let src = fs.readFileSync(f, "utf8");
  const before = src;
  const up = rel.includes(path.sep) ? "../" : "";

  // 1. stylesheets — must come BEFORE style.css so the legacy bridge wins
  if (!src.includes("css/tokens.css")) {
    const styleLink = new RegExp(`<link rel="stylesheet" href="${up.replace(/\./g,"\\.")}css/style\\.css">`);
    if (styleLink.test(src)) {
      src = src.replace(styleLink,
        `<link rel="stylesheet" href="${up}css/tokens.css">\n` +
        `  <link rel="stylesheet" href="${up}css/shell.css">\n` +
        `  <link rel="stylesheet" href="${up}css/style.css">`);
      css++;
    }
  }

  // 2. scripts — theme first (paint), shell last (chrome)
  if (!src.includes("js/shell.js") && src.includes("</body>")) {
    src = src.replace(/<\/body>/,
      `  <script src="${up}js/theme.js"></script>\n` +
      `  <script defer src="${up}js/shell.js"></script>\n</body>`);
    js++;
  }

  if (src !== before) fs.writeFileSync(f, src);
}
console.log(`css wired ${css} · js wired ${js} · skipped ${skipped}`);
