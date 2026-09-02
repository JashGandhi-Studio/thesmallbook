/* Upgrades the pre-paint theme snippet in every HTML page so that
   mode "auto" resolves against the OS before first paint (no flash).
   Idempotent: safe to re-run. */
const fs = require("fs"), path = require("path"), root = path.join(__dirname, "..");

const OLD = /<script>\s*(?:\/\/[^\n]*\n\s*)?try\s*\{\s*if\s*\(\s*localStorage\.getItem\("tsb_theme"\)\s*===\s*'"dark"'\s*\)\s*document\.documentElement\.classList\.add\("dark"\)\s*;?\s*\}\s*catch\s*\(e\)\s*\{\s*\}\s*<\/script>/;

const NEW = `<script>/* pre-paint theme: no flash, supports light|dark|auto */
try{var m=localStorage.getItem("tsb_theme");m=m?JSON.parse(m):"light";
var d=m==="dark"||(m==="auto"&&matchMedia("(prefers-color-scheme:dark)").matches);
if(d)document.documentElement.classList.add("dark");
if(m==="auto")document.documentElement.classList.add("theme-auto");
document.documentElement.setAttribute("data-theme",m);}catch(e){}</script>`;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === "node_modules") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

let patched = 0, already = 0, missing = 0;
for (const f of walk(root)) {
  const src = fs.readFileSync(f, "utf8");
  if (src.includes("pre-paint theme: no flash")) { already++; continue; }
  if (!OLD.test(src)) { missing++; continue; }
  fs.writeFileSync(f, src.replace(OLD, NEW));
  patched++;
}
console.log(`patched ${patched} · already ${already} · no-snippet ${missing}`);
