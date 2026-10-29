#!/usr/bin/env python3
"""TheSmallBook editions, step 2: draw an original cover for every book from
editions.json (colours only) and write it over assets/covers/<same filename>.
Same filenames = every page, share card, og preview and the offline cache pick
the new covers up with zero code changes.
Usage: python3 tools/editions/render.py [--only a.jpg,b.jpg] [--out DIR]"""
import asyncio, json, os, sys, io
from PIL import Image
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))

PAGE = r"""<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600;6..72,700&family=Space+Grotesk:wght@500;600;700&family=Noto+Serif+Devanagari:wght@600;700&display=block" rel="stylesheet">
<style>
html,body{margin:0;background:#fff}
#c{position:relative;overflow:hidden;width:400px;height:600px}
#c.sq{height:400px}
.layer{position:absolute;inset:0}
.micro{position:absolute;left:30px;top:28px;font:600 10px/1 'Space Grotesk';letter-spacing:.24em;text-transform:uppercase;opacity:.72}
.no{position:absolute;right:30px;top:28px;font:600 10px/1 'Space Grotesk';letter-spacing:.14em;opacity:.6}
.title{position:absolute;left:30px;right:30px;font-family:'Newsreader';font-weight:600;letter-spacing:-.018em;line-height:1.0;text-wrap:balance;font-optical-sizing:auto}
.title.dev{font-family:'Noto Serif Devanagari';font-weight:700;line-height:1.25;letter-spacing:0}
.sub{font:600 12px/1.2 'Space Grotesk';letter-spacing:.12em;text-transform:uppercase;opacity:.75;margin-top:10px}
.author{position:absolute;left:30px;right:30px;font:600 12.5px/1.25 'Space Grotesk';letter-spacing:.14em;text-transform:uppercase;opacity:.82}
.rule{position:absolute;left:30px;height:3px;width:44px;border-radius:2px}
</style></head><body><div id="c"></div>
<script>
const W=400;
function hexA(h,a){const n=parseInt(h.slice(1),16);return `rgba(${n>>16},${(n>>8)&255},${n&255},${a})`}
function lum(h){const n=parseInt(h.slice(1),16);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(n>>16)+.7152*f((n>>8)&255)+.0722*f(n&255)}
function con(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
const M={
 dots:c=>{let d='';for(let y=0;y<6;y++)for(let x=0;x<6;x++)d+=`<circle cx="${12+x*15.2}" cy="${12+y*15.2}" r="${1.1+(x+y)*.5}" fill="${c}"/>`;return d},
 lines:c=>{let d='';for(let i=0;i<10;i++)d+=`<rect x="6" y="${8+i*9}" width="${88-(i%3)*22}" height="3" rx="1.5" fill="${c}"/>`;return d},
 circle:c=>`<circle cx="50" cy="50" r="36" fill="none" stroke="${c}" stroke-width="7"/><circle cx="50" cy="50" r="14" fill="${c}"/>`,
 stack:c=>`<rect x="10" y="22" width="80" height="14" rx="3" fill="${c}"/><rect x="18" y="42" width="64" height="14" rx="3" fill="${c}"/><rect x="26" y="62" width="48" height="14" rx="3" fill="${c}"/>`,
 split:c=>`<path d="M0 0h50v100H0z" fill="${c}" opacity=".55"/><circle cx="50" cy="50" r="26" fill="none" stroke="${c}" stroke-width="5"/>`,
 sun:c=>{let d=`<circle cx="50" cy="50" r="19" fill="${c}"/>`;for(let i=0;i<16;i++)d+=`<rect x="48.6" y="8" width="2.8" height="14" rx="1.4" fill="${c}" transform="rotate(${i*22.5} 50 50)"/>`;return d},
 arc:c=>`<path d="M8 86a42 42 0 0 1 84 0" fill="none" stroke="${c}" stroke-width="7"/><path d="M22 86a28 28 0 0 1 56 0" fill="none" stroke="${c}" stroke-width="7"/><path d="M36 86a14 14 0 0 1 28 0" fill="none" stroke="${c}" stroke-width="7"/>`,
 leaf:c=>`<path d="M50 6c26 16 30 46 0 72C20 52 24 22 50 6z" fill="${c}"/><path d="M50 16v78" stroke="${c}" stroke-width="2.4"/>`,
 stairs:c=>`<path d="M8 92h18V74h18V56h18V38h18V20h12" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"/><circle cx="88" cy="12" r="6" fill="${c}"/>`,
 spiral:c=>{let p='M50 50';for(let i=0;i<220;i++){const a=i*.12,r=1+i*.19;p+=`L${(50+r*Math.cos(a)).toFixed(1)} ${(50+r*Math.sin(a)).toFixed(1)}`}return `<path d="${p}" fill="none" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>`},
 chart:c=>`<rect x="10" y="62" width="14" height="30" rx="2" fill="${c}"/><rect x="31" y="50" width="14" height="42" rx="2" fill="${c}"/><rect x="52" y="36" width="14" height="56" rx="2" fill="${c}"/><rect x="73" y="16" width="14" height="76" rx="2" fill="${c}"/><path d="M8 54L36 40l20 6L90 8" fill="none" stroke="${c}" stroke-width="3" opacity=".6"/>`,
 coins:c=>{let d='';for(let i=0;i<5;i++)d+=`<ellipse cx="${36+(i%2)*4}" cy="${84-i*11}" rx="24" ry="7" fill="${c}" opacity="${.55+i*.09}"/>`;return d+`<circle cx="74" cy="34" r="16" fill="none" stroke="${c}" stroke-width="5"/>`},
 crown:c=>`<path d="M12 74L18 30l18 22 14-30 14 30 18-22 6 44z" fill="${c}"/><rect x="12" y="80" width="76" height="8" rx="2" fill="${c}"/>`,
 peak:c=>`<path d="M4 92L38 30l16 26 12-18 30 54z" fill="${c}"/><path d="M38 30V8l16 6-16 6" fill="${c}"/>`,
 bulb:c=>`<path d="M50 10a28 28 0 0 0-16 51c3 3 5 7 5 11h22c0-4 2-8 5-11A28 28 0 0 0 50 10z" fill="${c}"/><rect x="39" y="77" width="22" height="5" rx="2.5" fill="${c}"/><rect x="42" y="85" width="16" height="5" rx="2.5" fill="${c}"/>`,
 wave:c=>{let d='';for(let k=0;k<6;k++){let p=`M0 ${20+k*13}`;for(let x=0;x<=100;x+=5)p+=`L${x} ${(20+k*13+Math.sin((x/100)*Math.PI*2+k*.7)*6).toFixed(1)}`;d+=`<path d="${p}" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/>`}return d},
 grid:c=>{let d='';for(let y=0;y<4;y++)for(let x=0;x<4;x++){const f=(x===2&&y===1);d+=`<rect x="${8+x*22}" y="${8+y*22}" width="18" height="18" rx="3" fill="${f?c:'none'}" stroke="${c}" stroke-width="2.6"/>`}return d},
 clock:c=>`<circle cx="50" cy="50" r="40" fill="none" stroke="${c}" stroke-width="6"/><path d="M50 50V22M50 50l18 12" stroke="${c}" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="50" r="5" fill="${c}"/>`,
 columns:c=>`<path d="M10 28L50 8l40 20z" fill="${c}"/><rect x="16" y="34" width="10" height="46" fill="${c}"/><rect x="34" y="34" width="10" height="46" fill="${c}"/><rect x="56" y="34" width="10" height="46" fill="${c}"/><rect x="74" y="34" width="10" height="46" fill="${c}"/><rect x="8" y="84" width="84" height="8" fill="${c}"/>`,
 compass:c=>`<circle cx="50" cy="50" r="40" fill="none" stroke="${c}" stroke-width="3.4"/><path d="M50 12l9 38-9 38-9-38z" fill="${c}"/><circle cx="50" cy="50" r="4" fill="${c}"/>`,
 keyhole:c=>`<circle cx="50" cy="40" r="20" fill="${c}"/><path d="M40 52h20l6 38H34z" fill="${c}"/><rect x="6" y="6" width="88" height="88" rx="10" fill="none" stroke="${c}" stroke-width="3"/>`,
 eye:c=>`<path d="M4 50C24 18 76 18 96 50 76 82 24 82 4 50z" fill="none" stroke="${c}" stroke-width="5"/><circle cx="50" cy="50" r="15" fill="${c}"/>`,
};
const POOL={'Self-Improvement':['dots','stairs','sun','arc','peak'],'Mindset':['arc','sun','stairs'],'Productivity':['lines','clock','grid','stack'],
 'Money & Finance':['chart','coins','circle','grid'],'Finance':['chart','coins'],'Economics':['chart','grid'],'Psychology & People':['spiral','split','eye','arc'],
 'Psychology':['spiral','eye'],'Business & Startups':['stack','grid','chart','peak','bulb'],'Business':['stack','chart'],'Power & Strategy':['crown','keyhole','split','columns'],
 'Creativity':['bulb','wave','sun','dots'],'History':['columns','compass','peak'],'Biography':['compass','peak'],'Culture':['columns','wave'],
 'Leadership':['peak','compass','crown'],'Philosophy':['circle','eye','columns'],'Classics':['leaf','wave','sun','compass']};
function svg(m,c,box){return `<svg class="layer" style="left:${box[0]}px;top:${box[1]}px;width:${box[2]}px;height:${box[3]}px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">${M[m](c)}</svg>`}
function fit(el,maxH,start,min){let s=start;el.style.fontSize=s+'px';
  while(s>min&&(el.offsetHeight>maxH||[...el.querySelectorAll('span')].some(w=>w.offsetWidth>el.clientWidth+1))){s-=1;el.style.fontSize=s+'px'}return s}
function words(t){return t.split(/\s+/).map(w=>`<span style="display:inline-block">${w}</span>`).join(' ')}
window.draw=function(e,idx){
  const c=document.getElementById('c');c.className=e.sq?'sq':'';const H=e.sq?400:600;
  const bg=e.bg,fg=e.fg;let ac=e.ac;
  const motifC=con(ac,bg)>1.35?hexA(ac,.92):hexA(fg,.16);
  const pool=POOL[e.c]||POOL.Classics;const m=pool[e.h%pool.length];
  const hh=Math.floor(e.h/16);let L=hh%3;if(e.c==='Classics'||e.c==='Philosophy'||e.c==='History')L=hh%2?3:0;
  if(/^unknown$/i.test(e.a||''))e.a='';
  if(e.sq)L=0;
  const t=e.dev||e.t, dev=!!e.dev;
  let h=`<div class="layer" style="background:${bg}"></div>`;
  // light: soft top-left glow and a gentle bottom shade, like ink on card stock
  h+=`<div class="layer" style="background:radial-gradient(120% 80% at 18% 8%,rgba(255,255,255,.18),transparent 60%),linear-gradient(180deg,transparent 55%,rgba(0,0,0,.10))"></div>`;
  let titleTop=null,titleBottom=null,maxH=H*.34,start=dev?50:56,authorBottom=30,titleColor=e.tc||fg;
  if(L===0){h+=svg(m,motifC,e.sq?[130,52,140,110]:[56,64,W-112,H*.46]);titleBottom=H*.155;maxH=H*.30;}
  if(L===1){titleTop=70;maxH=H*.36;start=dev?54:64;h+=svg(m,motifC,[70,H*.47,W-140,H*.38]);authorBottom=30;}
  if(L===2){h+=svg(m,motifC,[80,58,W-160,H*.36]);const bandTop=H*.52;
    h+=`<div class="layer" style="top:${bandTop}px;height:${H*.30}px;background:${con(ac,bg)>1.35?ac:hexA(fg,.08)}"></div>`;
    if(con(ac,bg)>1.35)titleColor=con(ac,'#16130F')>=con(ac,'#F6EFE2')?'#16130F':'#F6EFE2';
    titleTop=bandTop+22;maxH=H*.30-44;start=dev?44:50;}
  if(L===3){h+=`<div class="layer" style="inset:20px;border:1.5px solid ${hexA(fg,.38)};border-radius:6px"></div><div class="layer" style="inset:26px;border:1px solid ${hexA(fg,.18)};border-radius:4px"></div>`;
    h+=svg(m,motifC,[140,92,W-280,H*.2]);titleTop=H*.42;maxH=H*.28;start=dev?50:54;authorBottom=52;}
  // hinge: the fold line a real paperback has near its spine
  h+=`<div class="layer" style="width:16px;background:linear-gradient(90deg,rgba(0,0,0,.16),rgba(0,0,0,.02) 55%,rgba(255,255,255,.14) 70%,rgba(0,0,0,.06) 85%,transparent)"></div>`;
  const micro=L===3?'':`<div class="micro">TheSmallBook</div><div class="no">N° ${String(idx).padStart(3,'0')}</div>`;
  const center=L===3?'text-align:center;':'';
  const sub=dev?`<div class="sub" style="${center}">${e.t}</div>`:'';
  const pos=titleTop!=null?`top:${titleTop}px`:`bottom:${titleBottom+ (e.a?26:0)}px`;
  h+=micro+`<div id="t" class="title${dev?' dev':''}" style="${pos};color:${titleColor};${center}">${words(t)}</div>`;
  if(e.a)h+=`<div class="author" style="bottom:${authorBottom}px;color:${fg};${center}">${e.a}</div>`;
  if(L===3)h+=`<div class="micro" style="left:0;right:0;top:${H-46}px;text-align:center;opacity:.55">TheSmallBook · N° ${String(idx).padStart(3,'0')}</div>`;
  if(L===0)h+=`<div class="rule" style="bottom:${titleBottom+(e.a?26:0)-16}px;background:${con(ac,bg)>1.35?ac:hexA(fg,.5)}"></div>`;
  c.innerHTML=h;const T=document.getElementById('t');fit(T,maxH,start,20);
  if(sub){T.insertAdjacentHTML('beforeend',sub)}
  return true};
</script></body></html>"""

async def main():
    only = None; out = os.path.join(ROOT, 'assets', 'covers')
    a = sys.argv[1:]
    if '--only' in a: only = set(a[a.index('--only') + 1].split(','))
    if '--out' in a: out = a[a.index('--out') + 1]; os.makedirs(out, exist_ok=True)
    ed = {}
    for line in open(os.path.join(HERE, 'editions.jsonl')):
        if line.strip(): o = json.loads(line); ed[o.pop('file')] = o
    names = sorted(ed)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 400, 'height': 600}, device_scale_factor=1)
        await pg.set_content(PAGE); await pg.evaluate('document.fonts.ready')
        await pg.wait_for_timeout(1200)
        n = 0
        for i, f in enumerate(names, 1):
            if only and f not in only: continue
            if ed[f].get('keep'): continue   # TheSmallBook Originals keep their own house covers
            await pg.evaluate('([e,i])=>draw(e,i)', [ed[f], i])
            await pg.evaluate('document.fonts.ready')
            png = await pg.locator('#c').screenshot(type='png')
            im = Image.open(io.BytesIO(png)).convert('RGB')
            dst = os.path.join(out, f); ext = f.rsplit('.', 1)[-1].lower()
            if ext == 'jpg' or ext == 'jpeg': im.save(dst, 'JPEG', quality=88, optimize=True, progressive=True)
            elif ext == 'webp': im.save(dst, 'WEBP', quality=88, method=6)
            else: im.save(dst, 'PNG', optimize=True)
            n += 1
        await b.close()
    print(n, 'covers ->', out)

asyncio.run(main())
