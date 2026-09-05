const {JSDOM, VirtualConsole} = require('jsdom');
const PAGES = ['/','index.html','chat.html','profile.html','settings.html','signin.html',
               'stories.html','graveyard.html','gold.html','about.html','404.html',
               'book.html?id=atomic-habits','story.html','scan.html'];
(async () => {
  for (const p of PAGES) {
    const errs = [], warns = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => { if (!/Could not load link|stylesheet/i.test(e.message)) errs.push(e.message); });
    vc.on('error', (...a) => errs.push(String(a[0]).slice(0,120)));
    vc.on('warn',  (...a) => warns.push(String(a[0]).slice(0,80)));
    let dom;
    try {
      dom = await JSDOM.fromURL('http://127.0.0.1:8000/'+p, {
        runScripts:'dangerously', resources:'usable', pretendToBeVisual:true,
        virtualConsole: vc,
        beforeParse(w){ w.fetch=(u,o)=>globalThis.fetch(new URL(u,w.location.href).href,o); }
      });
    } catch(e) { console.log(`\n### ${p}\n   LOAD FAILED: ${e.message}`); continue; }
    const w = dom.window, d = w.document;
    await new Promise(r=>{w.addEventListener('load',r);setTimeout(r,9000);});
    await new Promise(r=>setTimeout(r,2500));
    const bar = d.querySelector('.tsb-bar');
    console.log(`\n### ${p}`);
    console.log(`   errors:${errs.length}  bar:${!!bar}  title:${(d.title||'').slice(0,40)}`);
    if (errs.length) errs.slice(0,4).forEach(e=>console.log('   !! '+e));
    // duplicate id detection
    const ids={}, dupes=[];
    d.querySelectorAll('[id]').forEach(el=>{const i=el.id; ids[i]=(ids[i]||0)+1; if(ids[i]===2)dupes.push(i);});
    if (dupes.length) console.log('   DUP IDS: '+dupes.slice(0,6).join(', '));
    // stray legacy UI
    const legacy = ['.aq-fab','.tsb-loginbtn','.tsb-auth-chip','.tsb-navchip'].filter(s=>d.querySelector(s));
    if (legacy.length) console.log('   LEGACY UI: '+legacy.join(', '));
    w.close();
  }
  process.exit(0);
})();
