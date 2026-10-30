#!/usr/bin/env python3
"""v336 app shell: a tiny inline block at the top of every app page.
It hides the page's own markup until the new design has painted, and shows a
skeleton of the right screen meanwhile, so no old screen ever shows.
Re-run safely: it replaces whatever sits between the markers."""
import re, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
START, END = "<!--tsb-shell-->", "<!--/tsb-shell-->"
CSS = r"""
html.tsb-boot body{opacity:0!important;pointer-events:none}
html.tsb-boot{background:#FBF8F1}html.tsb-boot.dark{background:#16130F}
html.tsb-rev body{transition:opacity .28s cubic-bezier(.16,1,.3,1)}
#tsbSkel{position:fixed;inset:0;z-index:2147482000;background:#FBF8F1;overflow:hidden;pointer-events:none;transition:opacity .3s cubic-bezier(.16,1,.3,1);contain:strict}
html.dark #tsbSkel{background:#16130F}
#tsbSkel.out{opacity:0}
#tsbSkel i{position:absolute;display:block;border-radius:14px;background:#EFE8DA;overflow:hidden}
html.dark #tsbSkel i{background:#241F19}
#tsbSkel i:after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:tsbSk 1.3s cubic-bezier(.4,0,.2,1) infinite}
html.dark #tsbSkel i:after{background:linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent)}
#tsbSkel i.r{border-radius:999px}#tsbSkel i.d{background:#16130F}html.dark #tsbSkel i.d{background:#221E19}#tsbSkel i.d:after{background:linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent)}#tsbSkel i.c{background:#FFFDF8;box-shadow:inset 0 0 0 1px #ECE5D6;border-radius:20px}html.dark #tsbSkel i.c{background:#1C1915;box-shadow:inset 0 0 0 1px #2E2822}#tsbSkel i.y{background:#F6E7B0;border-radius:16px}#tsbSkel i.bk{background:linear-gradient(90deg,#CFC4AE,#E9E0CC 12%,#DED3BC);border-radius:4px 12px 12px 4px;box-shadow:0 30px 40px -20px rgba(0,0,0,.6)}html.dark #tsbSkel i.y{background:#3A321C}
#tsbSkel i.y{background:#FFE9A3}html.dark #tsbSkel i.y{background:#3A3016}
@keyframes tsbSk{to{transform:translateX(100%)}}
@media (prefers-reduced-motion:reduce){#tsbSkel i:after{animation:none}}
"""
JS = r"""
(function(){try{
var d=document.documentElement,p=(location.pathname.split("/").pop()||"index.html").toLowerCase();
if(/[?&]noshell=1/.test(location.search))return;
d.classList.add("tsb-boot");
var W=Math.min(innerWidth||390,560),L=Math.max(0,((innerWidth||390)-W)/2),H=innerHeight||844;
function b(x,y,w,h,c){return '<i class="'+(c||"")+'" style="left:'+(L+x)+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px"></i>'}
function lines(x,y,n,w,gap){var s="";for(var k=0;k<n;k++)s+=b(x,y+k*(gap||22),k==n-1?w*0.6:w,12,"r");return s}
function bar(){var w=W-40,ic=0;try{ic=localStorage.getItem("tsb_bar_labels")==="icons"}catch(eB){}return ic?b(20,H-68,w,50,""):b(20,H-80,w,62,"")}
var s="",w=W-40,lib=p==="index.html"&&/library/.test(location.hash);
if(p==="book.html"){var cw=Math.min(150,W*0.38);s=b(16,14,72,34,"r")+b(W-140,14,34,34,"r")+b(W-98,14,34,34,"r")+b(W-56,14,34,34,"r")+b((W-cw)/2,74,cw,cw*1.5,"")+b(W*0.2,cw*1.5+102,W*0.6,30,"r")+b(W*0.3,cw*1.5+146,W*0.4,12,"r")+b(20,cw*1.5+180,w,38,"r")+b(20,cw*1.5+238,w/2-6,56,"y")+b(W/2+6,cw*1.5+238,w/2-6,56,"")+lines(20,cw*1.5+318,4,w)}
else if(p==="random.html"){var bw=Math.min(240,W*0.62);s='<div style="position:absolute;left:0;right:0;top:90px;bottom:0;background:linear-gradient(180deg,#2A2119 0%,#1C1612 52%,#8A6A45 53%,#6B4F33 100%)"></div>'+b(12,12,150,22,"")+b(12,48,80,36,"r")+b(98,48,78,36,"r")+b(182,48,84,36,"r")+b(272,48,70,36,"y")+b((W-bw)/2,(H-bw*1.45)/2+20,bw,bw*1.45,"bk")}else if(p==="graveyard.html"){if(/^#grave=/.test(location.hash)){s='<div style="position:absolute;inset:0;background:rgba(22,19,15,.42)"></div><div style="position:absolute;left:0;right:0;top:10px;bottom:0;border-radius:26px 26px 0 0;background:#FBF8F1"></div>'+b(W/2-48,74,96,118,"d")+b(W/2-80,212,160,12,"r")+b(W/2-110,236,220,32,"")+b(W/2-130,282,260,14,"r")+b(22,318,W-44,56,"c")+b(22,384,W-44,56,"c")+lines(22,480,6,W-44,26)}else{s=b(14,14,40,40,"r")+b(W/2-46,26,92,14,"r")+b(20,72,180,10,"r")+b(20,92,230,40,"")+b(20,146,210,14,"r")+b(20,182,50,28,"")+b(92,182,70,28,"")+b(184,182,40,28,"")+b(20,240,w,340,"d")+b(20,592,w/2-5,118,"c")+b(W/2+5,592,w/2-5,118,"c")+bar()}}else if(p==="reader.html"){s=b(16,10,42,42,"r")+b(70,24,W*0.42,14,"r")+b(W-128,11,69,40,"r")+b(W-50,11,40,40,"r")+b(26,90,150,10,"r")+b(26,116,W*0.62,32,"")+lines(26,180,9,W-52,34)}
else if(p==="podcasts.html"){s=b(20,22,W*0.5,34,"")+b(20,70,W*0.7,12,"r")+b(20,104,w,210,"d")+b(20,340,120,14,"r")+b(20,368,140,140,"")+b(172,368,140,140,"")+b(324,368,140,140,"")+bar()}
else if(p==="you.html"){s=b(24,22,64,64,"r")+b(102,32,150,26,"")+b(102,66,120,12,"r")+b(20,106,w,252,"d")+b(20,372,w/3-6,80,"")+b(20+w/3+3,372,w/3-6,80,"")+b(20+2*w/3+6,372,w/3-6,80,"")+b(20,468,w,100,"y")+bar()}
else if(p==="index.html"&&!lib){var ov=0;try{ov=parseFloat(JSON.parse(localStorage.getItem("tsb_onboard_v")||"0"))||0}catch(eO){}if(ov<331){var cw=Math.min(118,W*0.3);s=b(W-60,24,40,10,"r")+b(20,26,90,4,"r")+b(W/2-cw*1.35,60,cw,cw*1.45,"")+b(W/2-cw*0.5,52,cw,cw*1.45,"")+b(W/2+cw*0.35,60,cw,cw*1.45,"")+b(20,cw*1.45+96,w*0.62,40,"")+b(20,cw*1.45+142,w*0.55,40,"")+b(20,cw*1.45+200,w*0.8,12,"r")+b(20,cw*1.45+220,w*0.5,12,"r")+b(20,cw*1.45+262,w,52,"c")+b(20,H-84,w,52,"y")}else{s=b(20,48,110,10,"r")+b(20,66,150,28,"")+b(W-52,60,32,32,"r")+b(W-100,64,40,24,"r")+b(20,122,w,46,"r")+b(20,186,w,284,"c")+b(36,204,96,144,"")+b(148,212,w-150,22,"")+b(148,242,w-196,22,"")+b(148,280,96,10,"r")+b(148,310,92,34,"r")+b(36,372,w-32,10,"r")+b(36,392,w-90,10,"r")+b(20,488,w,192,"d")+b(20,712,170,16,"r")+b(20,744,116,174,"")+b(148,744,116,174,"")+b(276,744,116,174,"")+bar()}}
else if(lib){s=b(20,22,W*0.45,34,"")+b(20,72,w,48,"r")+b(20,136,80,30,"r")+b(108,136,90,30,"r")+b(206,136,80,30,"r")+b(20,186,150,14,"r");for(var k=0;k<2;k++)s+=b(20+k*0,214+k*230,104,156,"")+b(136,214+k*230,104,156,"")+b(252,214+k*230,104,156,"");s+=bar()}
else if(p==="stories.html"||p==="story.html"||p==="write.html"){s=b(20,22,W*0.5,34,"")+b(20,72,w,44,"r");for(var k=0;k<3;k++)s+=b(20,136+k*200,w,184,"");s+=bar()}
else if(p==="settings.html"){s=b(16,14,42,42,"r")+b(70,24,90,10,"r")+b(70,40,W*0.5,28,"")+b(20,94,w,150,"")+b(20,272,80,10,"r")+b(20,292,w,250,"")}
else{s=b(16,14,42,42,"r")+b(20,80,W*0.6,34,"")+b(20,128,W*0.4,12,"r")+b(20,170,w,180,"")+lines(20,374,5,w,24)+b(20,510,w,140,"")}
var sk=document.createElement("div");sk.id="tsbSkel";sk.setAttribute("aria-hidden","true");sk.innerHTML=s;d.appendChild(sk);
var done=false;function ready(){if(done)return;done=true;d.classList.add("tsb-rev");d.classList.remove("tsb-boot");setTimeout(function(){d.classList.remove("tsb-rev")},420);sk.classList.add("out");setTimeout(function(){if(sk.parentNode)sk.parentNode.removeChild(sk)},360)}
window.TSB_SHELL={ready:ready,page:p};
addEventListener("load",function(){setTimeout(ready,1200)});
setTimeout(ready,20000);
}catch(e){try{document.documentElement.classList.remove("tsb-boot")}catch(x){}}})();
"""
def block():
    css = re.sub(r"\n\s*", "", CSS.strip())
    js = "\n".join(l for l in JS.strip().splitlines())
    return START + '<link rel="preload" href="assets/fonts/newsreader.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="assets/fonts/spacegrotesk.woff2" as="font" type="font/woff2" crossorigin>' + "<style id=\"tsb-shell-css\">" + css + "</style><script id=\"tsb-shell\">" + js + "</script>" + END
def apply(path):
    s = open(path, encoding="utf-8").read()
    blk = block()
    if START in s:
        s2 = re.sub(re.escape(START) + r".*?" + re.escape(END), lambda m: blk, s, flags=re.S)
    else:
        m = re.search(r'\s*<link rel="stylesheet"', s)
        if not m: return False
        s2 = s[:m.start()] + "\n  " + blk + s[m.start():]
    if s2 != s: open(path, "w", encoding="utf-8").write(s2)
    return True
PSTART, PEND = "<!--tsb-pre-->", "<!--/tsb-pre-->"
def prelook(path):
    """v336: Chrome's lookahead loader stops at a CSP meta tag, so every
    script after it queued one by one (about 35 round trips on 4G). The same
    files listed as preload hints ABOVE the CSP meta download in parallel.
    The CSP still governs what runs; these are only our own files."""
    s = open(path, encoding="utf-8").read()
    body = re.sub(re.escape(PSTART) + r".*?" + re.escape(PEND), "", s, flags=re.S)
    seen, links = set(), []
    for h in re.findall(r'<link rel="stylesheet" href="([^"]+)"', body):
        if not h.startswith("http") and h not in seen: seen.add(h); links.append('<link rel="preload" href="%s" as="style">' % h)
    for h in re.findall(r'<script[^>]*\ssrc="([^"]+)"', body):
        if not h.startswith("http") and h not in seen: seen.add(h); links.append('<link rel="preload" href="%s" as="script">' % h)
    if not links: return False
    blk = PSTART + "".join(links) + PEND
    if PSTART in s:
        s2 = re.sub(re.escape(PSTART) + r".*?" + re.escape(PEND), lambda m: blk, s, flags=re.S)
    else:
        m = re.search(r'<meta http-equiv="Content-Security-Policy"', s) or re.search(r'<meta charset[^>]*>\s*', s)
        if not m: return False
        at = m.start() if "Content-Security" in m.group(0) else m.end()
        s2 = s[:at] + blk + "\n  " + s[at:]
    if s2 != s: open(path, "w", encoding="utf-8").write(s2)
    return True
if __name__ == "__main__":
    pages = sorted(p for p in glob.glob(os.path.join(ROOT, "*.html")) if "js/film.js" in open(p, encoding="utf-8").read())
    n = sum(1 for p in pages if apply(p))
    print("shell in", n, "of", len(pages), "pages")
    print("prelook in", sum(1 for p in pages if prelook(p)), "pages")
