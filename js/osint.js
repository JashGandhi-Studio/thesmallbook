/* ============================================================
   THESMALLBOOK — ✨ INSPIRE DESK (osint.js) · v244
   LIVE, INTELLIGENT, SIMPLE — not preloaded.

   OSINT tech, productive: a live library you tap to create.
   - Quotes: LIVE from DummyJSON (1454) + ZenQuotes, filtered
     intelligently by what you actually typed, ranked by
     relevance — not a static list. Offline fallback is only
     when network fails.
   - Images: LIVE Wikimedia Commons search + live Picsum
     aesthetic seeds — every result is a real photo you can
     "Use as cover" instantly. Not preloaded.
   - Research (v244 — supercharged, multi-source, topic-aware):
     · reads YOUR story — findings for what you actually typed
     · LIVE Wikipedia (summary + related) — facts to build on
     · LIVE Wikiquote — voices & lines you can insert
     · LIVE Dictionary (single words) — meaning + example
     · NO default topic: empty search = a rotating live Explore
       board (psychology, philosophy, stoicism…) — not just "habits"
     · Open Library: READABLE full books only (Archive.org reader
       in one tap) and never duplicated with TheSmallBook library
   UX: debounced live-search as you type, smart chips,
   clean professional sheet, one-tap insert anywhere.
   Embedded: Write, Studio, Scan, Stories, Library.
   Keep window.TSB_OSINT for compat → window.TSB_INSPIRE.
   ============================================================ */
(function(){
  "use strict";
  if(window.TSB_OSINT && window.TSB_OSINT.__inspireV235) return;

  function esc(s){ return String(s||"").replace(/[&<>\"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function toast(msg){
    var t=document.createElement("div"); t.className="stu-toast"; t.textContent=msg;
    t.style.bottom="84px"; document.body.appendChild(t); setTimeout(function(){t.remove();},2800);
  }
  function debounce(fn, ms){
    var id=null; return function(){ var a=arguments, ctx=this; clearTimeout(id); id=setTimeout(function(){ fn.apply(ctx,a); }, ms); };
  }
  // tokens >=3 chars, lowercased, stopwords removed lightly
  var STOP = {the:1,and:1,for:1,you:1,your:1,are:1,was:1,were:1,have:1,has:1,want:1,talk:1,about:1,with:1,that:1,this:1,from:1,into:1,when:1,what:1,how:1,why:1,just:1,like:1,feel:1,feeling:1,very:1,really:1,thing:1,things:1,some:1,more:1};
  function tokens(q){
    return String(q||"").toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(function(w){ return w.length>=3 && !STOP[w]; }).slice(0,8);
  }
  function relevance(text, toks){
    if(!toks.length) return 0;
    var t = String(text||"").toLowerCase();
    var sc=0;
    toks.forEach(function(w){
      if(t.indexOf(w)>=0) sc+=2;
      else if(t.indexOf(w.slice(0,4))>=0) sc+=1; // partial
    });
    // exact phrase bonus
    var phrase = toks.join(" ");
    if(phrase.length>6 && t.indexOf(phrase)>=0) sc+=3;
    return sc;
  }

  // ---- curated offline fallback only ----
  var CURATED = [
    {c:"The wound is the place where the Light enters you.", a:"Rumi", tags:["wisdom","healing"]},
    {c:"We accept the love we think we deserve.", a:"Stephen Chbosky", tags:["love","life"]},
    {c:"Until you make the unconscious conscious, it will direct your life and you will call it fate.", a:"Carl Jung", tags:["wisdom","psychology"]},
    {c:"Discipline is choosing between what you want now and what you want most.", a:"Abraham Lincoln", tags:["discipline","motivation"]},
    {c:"Happiness is not something ready-made. It comes from your own actions.", a:"Dalai Lama", tags:["happiness","life"]},
    {c:"You do not rise to the level of your goals. You fall to the level of your systems.", a:"James Clear", tags:["habits","success"]},
    {c:"If you want to go fast, go alone. If you want to go far, go together.", a:"African Proverb", tags:["friendship","wisdom"]},
    {c:"The cost of procrastination is the life you could have lived.", a:"Unknown", tags:["motivation","life"]},
    {c:"Books are a uniquely portable magic.", a:"Stephen King", tags:["books","wisdom"]},
    {c:"Your future needs you. Your past doesn't.", a:"Unknown", tags:["motivation","life"]},
    {c:"Kindness is language which the deaf can hear and the blind can see.", a:"Mark Twain", tags:["kindness","wisdom"]},
    {c:"We suffer more in imagination than in reality.", a:"Seneca", tags:["philosophy","healing"]},
    {c:"Every moment is a fresh beginning.", a:"T.S. Eliot", tags:["life","motivation"]},
    {c:"Love all, trust a few, do wrong to none.", a:"William Shakespeare", tags:["love","wisdom"]},
    {c:"The best way out is always through.", a:"Robert Frost", tags:["healing","motivation"]},
    {c:"In the middle of difficulty lies opportunity.", a:"Albert Einstein", tags:["wisdom","success"]},
    {c:"The only way to do great work is to love what you do.", a:"Steve Jobs", tags:["success","motivation"]},
    {c:"Life is what happens when you're busy making other plans.", a:"John Lennon", tags:["life","wisdom"]},
    {c:"Small habits don't add up. They compound.", a:"James Clear", tags:["habits","success"]},
    {c:"Be the change that you wish to see in the world.", a:"Mahatma Gandhi", tags:["wisdom","life"]},
    {c:"Loneliness is not lack of company, it is lack of purpose.", a:"Guillermo Maldonado", tags:["loneliness","healing","wisdom"]},
    {c:"Healing is not linear. It's okay to not be okay.", a:"Unknown", tags:["healing","wisdom"]},
    {c:"Startup is a marathon of rejections before one yes.", a:"Unknown", tags:["startup","success","motivation"]}
  ];

  function jfetch(url, ms){
    ms=ms||7000;
    var ctrl = typeof AbortController!=="undefined" ? new AbortController():null;
    var p = fetch(url, ctrl?{signal:ctrl.signal}:{}).then(function(r){
      if(!r.ok) throw new Error("bad "+r.status);
      return r.json();
    });
    if(ctrl) setTimeout(function(){ try{ ctrl.abort(); }catch(e){} }, ms);
    return p;
  }

  // LIVE quotes: truly live — no stale cache. Each search fetches fresh 100 from DummyJSON + curates only as last resort.
  function fetchDummyQuotesLive(){
    // fetch 100 live quotes fresh every time — so healing/lonely always shows new content, not 5-6 preloaded
    var skip = Math.floor(Math.random()*14)*100 % 1350; // 0,100,200... to vary
    var url = "https://dummyjson.com/quotes?limit=100&skip="+skip;
    return jfetch(url, 6500).then(function(j){
      var arr=(j.quotes||[]).map(function(x){ return {c:x.quote, a:x.author, tags:[]}; });
      return arr;
    }).catch(function(){ return []; });
  }
  function fetchQuotesLiveSmart(query, tag){
    var q = String(query||"").trim();
    var toks = tokens(q || tag);
    // 1) try quotable live if query
    var tryQuotable = function(){
      if(!q && !tag) return Promise.resolve([]);
      var url;
      if(q) url="https://api.quotable.io/search/quotes?query="+encodeURIComponent(q)+"&limit=8";
      else url="https://api.quotable.io/quotes?tags="+encodeURIComponent(tag)+"&limit=8";
      return jfetch(url, 5000).then(function(j){
        var arr=j.results||j||[];
        if(!Array.isArray(arr)) arr=[];
        return arr.slice(0,8).map(function(x){ return {c:x.content||x.quote||x.c||"", a:x.author||x.a||"Unknown", tags:x.tags||[]}; }).filter(function(x){ return x.c && x.c.length>8; });
      }).catch(function(){ return []; });
    };
    return tryQuotable().then(function(list){
      if(list.length) return list.slice(0,12);
      // fallback live DummyJSON + intelligent ranking — up to 12, always fresh
      return fetchDummyQuotesLive().then(function(live){
        if(!live.length) return [];
        if(!toks.length){
          // no query: diverse live slice 12
          return live.slice(0,12);
        }
        // rank by relevance to what they typed — show only relevant, but up to 12
        var ranked = live.map(function(x){ return {x:x, sc: relevance(x.c+" "+x.a, toks)}; });
        ranked.sort(function(a,b){ return b.sc - a.sc; });
        var top = ranked.filter(function(r){ return r.sc>0; }).slice(0,12).map(function(r){ return r.x; });
        if(top.length>=6) return top;
        // if not enough relevant, pad with curated filtered intelligently to reach 12
        var curated = CURATED.filter(function(c){
          var txt=(c.c+" "+c.a+" "+c.tags.join(" ")).toLowerCase();
          return toks.some(function(t){ return txt.indexOf(t)>=0; });
        });
        // also if still short, add top irrelevant to fill to 12 so you always see new content
        var filler = [];
        if(top.length + curated.length < 12){
          filler = ranked.filter(function(r){ return r.sc===0; }).slice(0, 12 - top.length - curated.length).map(function(r){ return r.x; });
        }
        return top.concat(curated).concat(filler).slice(0,12);
      });
    });
  }

  function fetchWikimediaImages(query){
    var q = String(query||"aesthetic").trim() || "aesthetic";
    // bias to photos: add filetype filter via search? Wikimedia search is broad, we keep as is but live.
    var url = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch="+encodeURIComponent(q)+"&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url&iiurlwidth=640&format=json&origin=*";
    return jfetch(url, 7000).then(function(j){
      var pages = j.query && j.query.pages ? j.query.pages : {};
      var out=[];
      Object.keys(pages).forEach(function(k){
        var p=pages[k]; var info=p.imageinfo && p.imageinfo[0];
        if(info){
          var thumb=info.thumburl||info.url;
          var full=info.url;
          var title=(p.title||"").replace(/^File:/,"").replace(/\.[a-z0-9]+$/i,"").replace(/_/g," ");
          // filter out non-aesthetic diagrams: skip if title contains chart/graph/diagram/map if we have photos
          if(thumb && full) out.push({thumb:thumb, full:full, title:title});
        }
      });
      return out.slice(0,8);
    }).catch(function(){ return []; });
  }
  function picsumAesthetic(q, n){
    n=n||6;
    var base = String(q||"aesthetic").trim().replace(/\s+/g,"-").toLowerCase() || "aesthetic";
    // v242: unique seeds per card — random + timestamp to avoid duplicates when called twice quickly
    var rnd = Math.floor(Math.random()*1e6);
    return Array.from({length:n}, function(_,i){
      var seed = encodeURIComponent(base+"-"+i+"-"+rnd+"-"+Math.floor(Math.random()*900));
      var url = "https://picsum.photos/seed/"+seed+"/640/640";
      return {thumb:url, full:url, title: esc(base)+" · aesthetic #"+(i+1)};
    });
  }

  function fetchWikiSummary(q){
    var title=String(q||"").trim();
    if(!title) return Promise.resolve(null);
    var url="https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(title.replace(/\s+/g,"_"));
    return jfetch(url, 6000).then(function(j){
      if(j && j.title && j.extract) return {title:j.title, extract:j.extract, thumb:j.thumbnail&&j.thumbnail.source, url:j.content_urls&&j.content_urls.desktop&&j.content_urls.desktop.page};
      return null;
    }).catch(function(){ return null; });
  }
  function wikiSearch(q){
    if(!String(q||"").trim()) return Promise.resolve([]);
    var url="https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch="+encodeURIComponent(q)+"&srlimit=5&format=json&origin=*";
    return jfetch(url, 6000).then(function(j){
      var hits=(j.query&&j.query.search)||[];
      return hits.map(function(h){ return {title:h.title, snippet:h.snippet.replace(/<\/?[^>]+>/g,"")}; });
    }).catch(function(){return [];});
  }
  // v244: LIVE Wikiquote — voices & lines related to your topic, insertable facts
  function wikiQuoteSearch(q){
    if(!String(q||"").trim()) return Promise.resolve([]);
    var url="https://en.wikiquote.org/w/api.php?action=query&list=search&srsearch="+encodeURIComponent(q)+"&srlimit=4&format=json&origin=*";
    return jfetch(url, 6000).then(function(j){
      return ((j.query&&j.query.search)||[]).map(function(h){
        return { title:h.title, snippet:String(h.snippet||"").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim() };
      }).filter(function(h){ return h.snippet && h.snippet.length>24; });
    }).catch(function(){return [];});
  }
  // v244: LIVE dictionary — word power (only when the search is a single word)
  function dictLookup(w){
    if(!String(w||"").trim()) return Promise.resolve(null);
    var url="https://api.dictionaryapi.dev/api/v2/entries/en/"+encodeURIComponent(String(w).trim().toLowerCase());
    return jfetch(url, 6000).then(function(j){
      var e=j&&j[0]; if(!e) return null;
      var m=e.meanings&&e.meanings[0]; var d=m&&m.definitions&&m.definitions[0];
      if(!d||!d.definition) return null;
      return { word:e.word, ph:(e.phonetic||(e.phonetics&&e.phonetics[0]&&e.phonetics[0].text))||"", pos:(m&&m.partOfSpeech)||"", def:d.definition, ex:d.example||"" };
    }).catch(function(){ return null; });
  }
  function normTitle(t){ return String(t||"").toLowerCase().replace(/[^a-z0-9]/g,""); }
  // v244: readable books ONLY — every result opens in the Archive.org reader.
  // Never contradicts TheSmallBook's own library: titles we already publish are filtered out.
  function openLibSearch(q){
    if(!String(q||"").trim()) return Promise.resolve([]);
    var url="https://openlibrary.org/search.json?q="+encodeURIComponent(q)+"&limit=8&has_fulltext=true&fields=title,author_name,first_publish_year,cover_i,ia";
    return jfetch(url, 7000).then(function(j){
      return (j.docs||[])
      .filter(function(d){ return d.ia && d.ia.length; })
      .map(function(d){ return { title:d.title, author:(d.author_name&&d.author_name[0])||"", year:d.first_publish_year, cover:d.cover_i, ia:(d.ia&&d.ia[0])||"" }; })
      .filter(function(d){ return d.ia; });
    }).catch(function(){return [];});
  }
  // v244: in-app reader — actually READ the book right here (Archive.org embed)
  function openReader(ia, title){
    var ov=document.createElement("div");
    ov.style.cssText="position:fixed;inset:0;z-index:99999;background:#0e0c0a;display:flex;flex-direction:column";
    ov.innerHTML='<div style="flex:none;display:flex;align-items:center;gap:10px;padding:10px 12px;background:#111;border-bottom:2.5px solid #ffc800">'+
      '<b style="font:800 12px Space Grotesk,sans-serif;color:#ffc800;flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📖 '+esc(title||"Read free")+'</b>'+
      '<a href="https://archive.org/details/'+esc(ia)+'" target="_blank" rel="noopener" style="flex:none;color:#ffc800;font:700 11px Space Grotesk,sans-serif;text-decoration:none">Archive.org ↗</a>'+
      '<button type="button" id="iaRdX" style="flex:none;border:2px solid #ffc800;background:#111;color:#ffc800;border-radius:999px;padding:6px 12px;font:800 11px Space Grotesk,sans-serif;cursor:pointer">✕ Close</button></div>'+
      '<iframe src="https://archive.org/embed/'+esc(ia)+'" style="flex:1 1 auto;width:100%;border:0;background:#000" allow="fullscreen;autoplay" allowfullscreen referrerpolicy="no-referrer"></iframe>';
    document.body.appendChild(ov);
    ov.querySelector("#iaRdX").addEventListener("click",function(){ ov.remove(); });
  }
  // ensure 400-book library is available even if data.js not loaded on this page
  var __localBooksLoaded = false;
  function ensureLocalBooks(){
    if(window.BOOKS && window.BOOKS.length) return Promise.resolve(window.BOOKS);
    if(__localBooksLoaded) return Promise.resolve(window.BOOKS||[]);
    __localBooksLoaded = true;
    return fetch("js/data.js", {cache:"force-cache"}).then(function(r){ return r.text(); }).then(function(txt){
      try{
        // js/data.js is `const BOOKS = [...]` ; evaluate safely to extract
        var m = txt.match(/const BOOKS\s*=\s*(\[[\s\S]*?\]);/);
        if(m && m[1]){
          try{ var arr = JSON.parse(m[1]); window.BOOKS = arr; return arr; }catch(e){}
        }
        // fallback eval
        eval(txt);
        return window.BOOKS||[];
      }catch(e){ return window.BOOKS||[]; }
    }).catch(function(){ return window.BOOKS||[]; });
  }
  function localBookSearch(q){
    try{
      var books = [];
      if(window.BOOKS && Array.isArray(window.BOOKS)) books = window.BOOKS;
      else if(window.TSB_BOOKS && Array.isArray(window.TSB_BOOKS)) books = window.TSB_BOOKS;
      else if(window.__BOOKS__ && Array.isArray(window.__BOOKS__)) books = window.__BOOKS__;
      // fallback: try to read from data.js global if not yet loaded
      if(!books.length) return [];
      var toks = tokens(q);
      if(!toks.length) return books.slice(0,6);
      var scored = books.map(function(b){
        // comprehensive text: title, author, category, oneLiner, bigIdea, lessons titles + summaries + examples
        var txt = (b.title||"")+" "+(b.author||"")+" "+(b.category||"")+" "+(b.oneLiner||"")+" "+(b.t||"")+" "+(b.bigIdea||"")+" "
          + ((b.lessons||[]).map(function(l){ return l.title+" "+(l.chapter||"")+" "+(l.summary||"")+" "+(l.example||""); }).join(" "));
        txt = txt.toLowerCase();
        var sc = 0;
        toks.forEach(function(w){ if(txt.indexOf(w)>=0) sc+=2; });
        // bonus for title exact and healing/love etc in title
        if(toks.some(function(w){ return (b.title||"").toLowerCase().indexOf(w)>=0; })) sc+=3;
        if(toks.some(function(w){ return (b.category||"").toLowerCase().indexOf(w)>=0; })) sc+=1;
        return {b:b, sc:sc};
      }).sort(function(a,b){ return b.sc - a.sc; });
      var top = scored.filter(function(x){ return x.sc>0; }).slice(0,4).map(function(x){ return x.b; });
      // if fewer than 2 relevant, pad with next best so you always get 2-4 suggestions (compact on mobile)
      if(top.length<4){
        var filler = scored.filter(function(x){ return x.sc===0; }).slice(0, 4 - top.length).map(function(x){ return x.b; });
        top = top.concat(filler);
      }
      return top.slice(0,4);
    }catch(e){ return []; }
  }
  function cardLocalBook(b){
    var cover = b.cover ? b.cover : (b.id ? "assets/covers/"+b.id+".jpg" : "");
    var lessons = (b.lessons||[]).length;
    return '<div style="background:#fff;border:2.5px solid #111;border-radius:14px;padding:10px;display:flex;gap:10px;align-items:center;">' +
      (cover ? '<img src="'+esc(cover)+'" alt="" style="width:56px;height:78px;object-fit:cover;border-radius:8px;border:2px solid #111;flex:none;" loading="lazy" onerror="this.style.display=\'none\'">' : '<div style="width:56px;height:78px;border-radius:8px;border:2px solid #111;background:#fffdf5;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none;">📕</div>') +
      '<div style="flex:1 1 auto;min-width:0;">' +
        '<div style="font:800 12px Space Grotesk,sans-serif;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(b.title||b.t||"")+'</div>' +
        '<div style="font:600 11px Space Grotesk,sans-serif;color:#64748b;margin-top:2px;">'+esc(b.author||b.a||"")+(b.category?" · "+esc(b.category):"")+ (lessons ? " · "+lessons+" lessons":"")+'</div>' +
        '<div style="font:600 10px Space Grotesk,sans-serif;color:#16a34a;letter-spacing:.5px;text-transform:uppercase;margin-top:4px;">📚 TheSmallBook · tap to use</div>' +
      '</div>' +
      '<button type="button" data-use-local="'+esc(b.id||b.title)+'" style="flex:none;border:2px solid #111;background:#ffc800;border-radius:999px;padding:7px 10px;font:700 10px Space Grotesk,sans-serif;cursor:pointer;white-space:nowrap">+ Use</button>' +
    '</div>';
  }
  function essayStarter(query, wikiExtract, book){
    // Build a concise 3-4 line essay starter that blends Wiki + book ideology — ready to insert & rewrite
    var q = String(query||"").trim() || "this";
    var wiki = String(wikiExtract||"").trim().replace(/\s+/g," ").slice(0, 240);
    // fallback wiki if empty: use generic
    if(!wiki) wiki = "Every story needs a clear idea — start with what happened, then what it meant.";
    var title = book ? (book.title||"") : "";
    var author = book ? (book.author||"") : "";
    var oneLiner = book ? (book.oneLiner||book.bigIdea||"") : "";
    // pick first lesson title for angle
    var lesson = "";
    try{ if(book && book.lessons && book.lessons[0]) lesson = book.lessons[0].title; }catch(e){}
    // craft 3-part starter: hook (book) + context (wiki) + prompt (your voice)
    var hook = "";
    if(title){
      hook = 'As ' + (author? author+" shows in \u201C"+title+"\u201D — ": "In \u201C"+title+"\u201D — ") + (oneLiner ? oneLiner.split(".")[0].slice(0, 110) + "." : "a lens for "+q+".");
    } else {
      hook = "A good story about \u201C"+q+"\u201D starts with one honest moment.";
    }
    var context = wiki ? ("Context: " + wiki + (wiki.length>=240?"\u2026":"")) : "";
    var prompt = "Your turn — rewrite these 3 lines in your voice: (1) What happened with "+q+"? (2) What did it teach you? (3) What would you tell someone feeling this now" + (lesson? " — hint: "+lesson+"." : ".");
    var full = hook + " " + context + " " + prompt;
    // card html — compact, not bombarded, easy on mobile
    var html = '<div style="background:#fff;border:3px solid #111;border-radius:16px;padding:12px;box-shadow:4px 4px 0 #111;">' +
      '<div style="font:800 11px Space Grotesk,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:#111;margin-bottom:8px;">\u270D\uFE0F Story starter for &ldquo;'+esc(q)+'&rdquo;'+(title?' &middot; inspired by '+esc(title):'')+'</div>' +
      '<div style="font:500 12.5px Space Grotesk,sans-serif;color:#1f2937;line-height:1.55;background:#fffdf5;border:2px solid #111;border-radius:12px;padding:10px;">'+esc(hook)+'<br><span style="color:#334155">'+esc(context)+'</span><br><span style="font:700 11.5px Space Grotesk,sans-serif;color:#0f172a">'+esc(prompt)+'</span></div>' +
      '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
        '<button type="button" data-use-essay="'+esc(full).replace(/"/g,"&quot;")+'" style="flex:1 1 140px;border:2.5px solid #111;background:#ffc800;border-radius:999px;padding:9px 12px;font:800 11px Space Grotesk,sans-serif;cursor:pointer;box-shadow:2px 2px 0 #111;">\u2728 Insert story starter</button>' +
        '<button type="button" data-copy-essay style="border:2.5px solid #111;background:#fff;border-radius:999px;padding:9px 12px;font:700 11px Space Grotesk,sans-serif;cursor:pointer;">\uD83D\uDCCB Copy</button>' +
      '</div>' +
      '<div style="font:600 10px Space Grotesk,sans-serif;color:#94a3b8;text-align:center;margin-top:6px;">Tap Insert — it drops in your editor. Rewrite in your voice before publishing.</div>' +
    '</div>';
    return {html:html, text:full};
  }

  function sheetShell(inner){
    var wrap=document.createElement("div");
    wrap.className="stu-wrap";
    wrap.style.zIndex="99992";
    wrap.innerHTML =
      '<div class=\"stu-sheet\" style=\"max-width:640px;max-height:94vh;display:flex;flex-direction:column;\">' +
        '<div class=\"stu-top\" style=\"background:linear-gradient(135deg,#0f172a 0%,#1e293b 55%,#ffb700 100%);color:#fff;border-bottom-color:#000;flex:none\"><b>✨ INSPIRE DESK<small style=\"color:#fde68a;opacity:1\">live library — quotes · images · research · tap to use</small></b><button class=\"stu-x\" id=\"inspX\">✕</button></div>' +
        '<div style=\"flex:1 1 auto;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:12px;background:#fffdf5;\">' + inner + '</div>' +
        '<div class=\"stu-foot\" style=\"flex:none;gap:8px;background:#fff;border-top:2.5px solid #111\">' +
          '<button id=\"inspClose2\" class=\"stu-dl\" style=\"background:#fff\">Close</button>' +
          '<button id=\"inspShare\" class=\"stu-apply\">↗ Share desk</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener("click",function(e){ if(e.target===wrap) wrap.remove(); });
    wrap.querySelector("#inspX").addEventListener("click",function(){wrap.remove();});
    var c2=wrap.querySelector("#inspClose2"); if(c2) c2.addEventListener("click",function(){wrap.remove();});
    wrap.querySelector("#inspShare").addEventListener("click", function(){
      var txt="✨ Inspire Desk — TheSmallBook live library of quotes, images & research to create faster. Try it in Write → Inspire Desk.";
      if(navigator.share) navigator.share({title:"Inspire Desk — TheSmallBook", text:txt}).catch(function(){});
      else if(navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){toast("📋 Copied — paste anywhere");});
    });
    return wrap;
  }
  function chipRow(chips, active){
    var h='<div style=\"display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 8px\">';
    chips.forEach(function(c){
      var on = active===c.id ? 'background:#111;color:#ffc800;box-shadow:2px 2px 0 #111;' : 'background:#fff;color:#111;';
      h+='<button type=\"button\" data-chip=\"'+esc(c.id)+'\" style=\"border:2px solid #111;border-radius:999px;padding:6px 10px;font:700 11px Space Grotesk,sans-serif;cursor:pointer;'+on+'\">'+esc(c.label)+'</button>';
    });
    h+='</div>';
    return h;
  }

  function openDesk(initialTab, seedQuery, callbacks){
    callbacks=callbacks||{};
    // OPTIMISED: allow caller to limit tabs — Quote wants [quotes,images], Stories wants [images,research]
    var allowed = callbacks.tabs || ["quotes","images","research"];
    if(allowed.indexOf(initialTab)===-1) initialTab = allowed[0];
    seedQuery=seedQuery||"";

    var QUOTE_TAGS = [
      {id:"motivational", label:"🔥 Motivational"},
      {id:"love", label:"❤️ Love"},
      {id:"wisdom", label:"🦉 Wisdom"},
      {id:"life", label:"🌱 Life"},
      {id:"success", label:"🏆 Success"},
      {id:"friendship", label:"🤝 Friendship"},
      {id:"healing", label:"🩹 Healing"},
      {id:"lonely", label:"🌙 Lonely"},
      {id:"startup", label:"🚀 Startup"}
    ];
    var IMAGE_TAGS = [
      {id:"minimal", label:" Minimal"},
      {id:"nature", label:"🌿 Nature"},
      {id:"ocean", label:"🌊 Ocean"},
      {id:"aesthetic", label:"✨ Aesthetic"},
      {id:"books", label:"📚 Books"},
      {id:"city", label:"🏙 City"},
      {id:"vintage", label:"📜 Vintage"},
      {id:"night", label:"🌌 Night"},
      {id:"beige", label:"Beige"}
    ];
    var RESEARCH_TAGS = [
      {id:"habits", label:" Habits"},
      {id:"psychology", label:" Psychology"},
      {id:"money", label:" Money"},
      {id:"philosophy", label:" Philosophy"},
      {id:"startup", label:" Startup"},
      {id:"love", label:" Love"},
      {id:"loneliness", label:" Loneliness"}
    ];

    // Build tabs HTML only for allowed set — keeps Quote=2 tabs, Stories=2 tabs, not 3 everywhere (professional, not everywhere)
    var tabHtml = '<div style="display:flex;gap:6px;flex-wrap:wrap;flex:none;">';
    if(allowed.indexOf("quotes")>=0) tabHtml += '<button type="button" id="tabQuotes" style="flex:1 1 90px;border:2.5px solid #111;border-radius:999px;padding:9px 10px;font:800 12px Archivo Black,sans-serif;letter-spacing:.6px;cursor:pointer;text-transform:uppercase;">💬 Quotes</button>';
    if(allowed.indexOf("images")>=0) tabHtml += '<button type="button" id="tabImages" style="flex:1 1 90px;border:2.5px solid #111;border-radius:999px;padding:9px 10px;font:800 12px Archivo Black,sans-serif;letter-spacing:.6px;cursor:pointer;text-transform:uppercase;">🖼️ Images</button>';
    if(allowed.indexOf("research")>=0) tabHtml += '<button type="button" id="tabResearch" style="flex:1 1 100px;border:2.5px solid #111;border-radius:999px;padding:9px 10px;font:800 12px Archivo Black,sans-serif;letter-spacing:.6px;cursor:pointer;text-transform:uppercase;">📖 Research</button>';
    tabHtml += '</div>';
    var html =
      tabHtml +
      '<div style="background:#fff;border:3px solid #111;border-radius:16px;padding:12px;box-shadow:4px 4px 0 #111;flex:none;">' +
        '<div style="display:flex;gap:8px;align-items:center;">' +
          '<input id="inspQ" type="text" placeholder="Type anything — e.g. lonely after breakup, startup failure, love…" value="'+esc(seedQuery)+'" style="flex:1 1 auto;border:2.5px solid #111;border-radius:999px;padding:11px 14px;font:600 13px Space Grotesk,sans-serif;outline:none;">' +
          '<button id="inspClear" type="button" title="Clear" style="flex:none;width:36px;height:36px;border:2px solid #111;border-radius:999px;background:#fff;font:800 13px Space Grotesk,sans-serif;cursor:pointer;">✕</button>' +
          '<button id="inspGo" type="button" style="flex:none;border:2.5px solid #111;border-radius:999px;padding:10px 14px;font:800 12px Space Grotesk,sans-serif;background:#ffc800;box-shadow:2px 2px 0 #111;cursor:pointer;white-space:nowrap">Search →</button>' +
        '</div>' +
        '<div id="inspChips"></div>' +
        '<div style="font-size:11px;color:#8f8a80;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-top:6px;">LIVE · as you type it filters · tap <span style="background:#ffc800;padding:1px 6px;border-radius:999px;border:1.5px solid #111;color:#111">Use this</span> to drop instantly</div>' +
      '</div>' +
      '<div id="inspResults" style="display:flex;flex-direction:column;gap:10px;min-height:120px;flex:none;">' +
        '<div style="text-align:center;padding:18px 10px;color:#8f8a80;font:600 13px Space Grotesk,sans-serif;">Loading live library…</div>' +
      '</div>';

    var wrap = sheetShell(html);
    var $q = wrap.querySelector("#inspQ");
    var $go = wrap.querySelector("#inspGo");
    var $clr = wrap.querySelector("#inspClear");
    var $chips = wrap.querySelector("#inspChips");
    var $res = wrap.querySelector("#inspResults");
    var $tQ = wrap.querySelector("#tabQuotes");
    var $tI = wrap.querySelector("#tabImages");
    var $tR = wrap.querySelector("#tabResearch");

    var activeTab = initialTab;
    var activeTag = "";
    var pending = false;
    var lastQuery = "";

    function paintTabs(){
      // only style tabs that exist (filtered set)
      var tabs = [];
      if($tQ) tabs.push($tQ);
      if($tI) tabs.push($tI);
      if($tR) tabs.push($tR);
      tabs.forEach(function(b){
        b.style.border="2.5px solid #111";
        b.style.borderRadius="999px";
        b.style.padding="9px 10px";
        b.style.font="800 12px Archivo Black,sans-serif";
        b.style.letterSpacing=".6px";
        b.style.cursor="pointer";
        b.style.textTransform="uppercase";
        b.style.flex="1 1 90px";
        b.style.background="#fff";
        b.style.color="#111";
      });
      if($tQ && activeTab==="quotes"){ $tQ.style.background="#111"; $tQ.style.color="#ffc800"; }
      if($tI && activeTab==="images"){ $tI.style.background="#111"; $tI.style.color="#ffc800"; }
      if($tR && activeTab==="research"){ $tR.style.background="#111"; $tR.style.color="#ffc800"; }
      if(activeTab==="quotes") $chips.innerHTML = chipRow(QUOTE_TAGS, activeTag);
      else if(activeTab==="images") $chips.innerHTML = chipRow(IMAGE_TAGS, activeTag);
      else $chips.innerHTML = chipRow(RESEARCH_TAGS, activeTag);
      $chips.querySelectorAll("[data-chip]").forEach(function(b){
        b.addEventListener("click", function(){
          activeTag = b.getAttribute("data-chip");
          $q.value = "";
          run(true);
          paintTabs();
        });
      });
      $q.placeholder = activeTab==="quotes" ? "Type anything — e.g. lonely after breakup, healing, Rumi…" : activeTab==="images" ? "Search aesthetic images — minimal, ocean, beige, nature…" : "Research YOUR topic — from your story, or anything…";
    }

    function cardQuote(q){
      var srcLive = q._live ? '<span style="font:700 9px Space Grotesk,sans-serif;letter-spacing:.6px;text-transform:uppercase;background:#dcfce7;border:1px solid #16a34a;color:#166534;padding:2px 6px;border-radius:999px;margin-left:6px;">LIVE</span>' : '';
      return '<div style="background:#fff;border:3px solid #111;border-radius:16px;padding:14px;box-shadow:4px 4px 0 #111;">' +
        '<div style="font-family:Georgia,serif;font-size:1.08rem;font-style:italic;line-height:1.45;color:#111">“ '+esc(q.c)+' ”'+srcLive+'</div>' +
        '<div style="font:700 11px Space Grotesk,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:#64748b;margin-top:8px;">— '+esc(q.a)+' '+(q.tags&&q.tags.length?'<span style="font-weight:400;text-transform:none;letter-spacing:0;color:#94a3b8">· '+esc(q.tags.slice(0,2).join(", "))+'</span>':"")+'</div>' +
        '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
          '<button type="button" data-use-quote="'+esc(q.c).replace(/\"/g,"&quot;")+'" data-author="'+esc(q.a)+'" style="flex:1 1 120px;border:2.5px solid #111;background:#ffc800;border-radius:999px;padding:9px 12px;font:800 11px Space Grotesk,sans-serif;letter-spacing:.6px;cursor:pointer;box-shadow:2px 2px 0 #111;">✨ Use this quote</button>' +
          '<button type="button" data-copy-quote style="border:2.5px solid #111;background:#fff;border-radius:999px;padding:9px 12px;font:700 11px Space Grotesk,sans-serif;cursor:pointer;">📋 Copy</button>' +
        '</div>' +
      '</div>';
    }
    function cardImage(im){
      // v247: definite-height photo band (190px) — grid rows can NEVER collapse or overlap again;
      // full photo shown via contain, "Use as cover" glued ON the photo (z-index 2 = untouchable)
      return '<div style="background:#fff;border:2.5px solid #111;border-radius:16px;overflow:hidden;box-shadow:3px 3px 0 #111;">' +
        '<div style="position:relative;height:190px;background:#0e0c0a;border-bottom:2.5px solid #111;">' +
          '<img src="'+esc(im.thumb)+'" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;display:block;" loading="lazy">' +
          '<button type="button" data-use-image="'+esc(im.full)+'" style="position:absolute;left:8px;right:8px;bottom:8px;z-index:2;border:2.5px solid #111;background:#ffc800;border-radius:999px;padding:9px 10px;font:800 11.5px Space Grotesk,sans-serif;letter-spacing:.3px;cursor:pointer;box-shadow:2px 2px 0 #111;text-shadow:none;">\u2728 Use as cover</button>' +
        '</div>' +
        '<div style="padding:6px 9px 7px;display:flex;align-items:center;gap:6px;">' +
          '<div style="flex:1 1 auto;min-width:0;font:700 10.5px Space Grotesk,sans-serif;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(im.title.slice(0,52))+'</div>' +
          '<div style="flex:none;font:700 8.5px Space Grotesk,sans-serif;color:#16a34a;letter-spacing:.5px;text-transform:uppercase;background:#dcfce7;border:1px solid #16a34a;padding:2px 6px;border-radius:999px;">LIVE</div>' +
        '</div>' +
      '</div>';
    }
    function cardResearchWiki(sum){
      if(!sum) return '<div style="background:#fff;border:3px solid #111;border-radius:16px;padding:14px;box-shadow:4px 4px 0 #111;"><div style="font:800 13px Space Grotesk,sans-serif;color:#111">No summary yet</div><div style="font:500 12px Space Grotesk,sans-serif;color:#64748b;margin-top:6px">Try broader: habits, loneliness, stoicism.</div></div>';
      return '<div style="background:#fff;border:3px solid #111;border-radius:16px;padding:14px;box-shadow:4px 4px 0 #111;">' +
        (sum.thumb ? '<img src="'+esc(sum.thumb)+'" alt="" style="width:100%;height:140px;object-fit:cover;border-radius:12px;border:2px solid #111;margin-bottom:10px;">' : '') +
        '<div style="font:800 13px Archivo Black,sans-serif;color:#0f172a;">'+esc(sum.title)+' <span style="font:700 9px Space Grotesk,sans-serif;letter-spacing:.6px;text-transform:uppercase;background:#dcfce7;border:1px solid #16a34a;color:#166534;padding:2px 6px;border-radius:999px;vertical-align:2px;">LIVE Wikipedia</span></div>' +
        '<div style="font:500 12px Space Grotesk,sans-serif;color:#334155;line-height:1.6;margin-top:6px;">'+esc(sum.extract.slice(0,300))+(sum.extract.length>300?"…":"")+'</div>' +
        '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
          '<button type="button" data-use-research style="flex:1 1 120px;border:2.5px solid #111;background:#ffc800;border-radius:999px;padding:9px 12px;font:800 11px Space Grotesk,sans-serif;cursor:pointer;box-shadow:2px 2px 0 #111;">✨ Insert snippet</button>' +
          (sum.url ? '<a href="'+esc(sum.url)+'" target="_blank" rel="noopener" style="border:2.5px solid #111;background:#fff;border-radius:999px;padding:9px 12px;font:700 11px Space Grotesk,sans-serif;text-decoration:none;color:#111;text-align:center;">Wikipedia →</a>' : '') +
        '</div>' +
      '</div>';
    }
    function cardBook(b){
      var cover = b.cover ? "https://covers.openlibrary.org/b/id/"+b.cover+"-M.jpg" : "";
      // v244: READABLE — one tap opens the full book in the Archive.org reader. Different from TheSmallBook's own library by design.
      return '<div style="background:#fff;border:2.5px solid #111;border-radius:14px;padding:10px;display:flex;gap:10px;align-items:center;">' +
        (cover ? '<img src="'+esc(cover)+'" alt="" style="width:56px;height:78px;object-fit:cover;border-radius:8px;border:2px solid #111;flex:none;" loading="lazy" onerror="this.style.opacity=.25">' : '<div style="width:56px;height:78px;border-radius:8px;border:2px solid #111;background:#fffdf5;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none;">📖</div>') +
        '<div style="flex:1 1 auto;min-width:0;">' +
          '<div style="font:800 12px Space Grotesk,sans-serif;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(b.title)+'</div>' +
          '<div style="font:600 11px Space Grotesk,sans-serif;color:#64748b;margin-top:2px;">'+esc(b.author||"")+(b.year?" · "+b.year:"")+'</div>' +
          '<div style="font:600 10px Space Grotesk,sans-serif;color:#16a34a;letter-spacing:.5px;text-transform:uppercase;margin-top:4px;">Read free · full book · Open Library</div>' +
        '</div>' +
        (b.ia ? '<button type="button" data-read-ia="'+esc(b.ia)+'" data-read-title="'+esc(b.title)+'" style="flex:none;border:2px solid #111;background:#ffc800;border-radius:999px;padding:8px 11px;font:800 10px Space Grotesk,sans-serif;cursor:pointer;white-space:nowrap;box-shadow:2px 2px 0 #111">📖 Read</button>' : '') +
        '<button type="button" data-use-book="'+esc(b.title)+'" data-book-author="'+esc(b.author||"")+'" title="Add as reference in your story" style="flex:none;border:2px solid #111;background:#fff;border-radius:999px;padding:7px 10px;font:700 10px Space Grotesk,sans-serif;cursor:pointer;white-space:nowrap">+ Use</button>' +
      '</div>';
    }
    // v244: LIVE Wikiquote card — voices & lines you can drop into your story
    function cardVoices(list, q){
      if(!list || !list.length) return "";
      return '<div style="background:#fff;border:3px solid #111;border-radius:16px;padding:14px;box-shadow:4px 4px 0 #111;">' +
        '<div style="font:800 11px Space Grotesk,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:#0f172a;margin-bottom:8px;">💬 Voices & lines — LIVE Wikiquote <span style="font:700 9px Space Grotesk,sans-serif;letter-spacing:.6px;text-transform:uppercase;background:#dcfce7;border:1px solid #16a34a;color:#166534;padding:2px 6px;border-radius:999px;">facts you can add</span></div>' +
        list.map(function(h){
          return '<div style="border:2px solid #e2e8f0;border-radius:12px;padding:9px 11px;margin-top:8px;background:#fffdf5;">' +
            '<b style="font:800 12px Space Grotesk,sans-serif;color:#111">'+esc(h.title)+'</b>' +
            '<div style="font:500 11.5px Space Grotesk,sans-serif;color:#475569;line-height:1.5;margin-top:3px;">'+esc(h.snippet.slice(0,150))+(h.snippet.length>150?"…":"")+'</div>' +
            '<div style="display:flex;gap:8px;margin-top:7px;flex-wrap:wrap;">' +
              '<button type="button" data-use-voice="'+esc((h.title+" — "+h.snippet.slice(0,180)).replace(/"/g,"&quot;"))+'" style="border:2px solid #111;background:#ffc800;border-radius:999px;padding:6px 11px;font:800 10px Space Grotesk,sans-serif;cursor:pointer;">✨ Insert</button>' +
              '<a href="https://en.wikiquote.org/wiki/'+encodeURIComponent(h.title.replace(/\s+/g,"_"))+'" target="_blank" rel="noopener" style="border:2px solid #111;background:#fff;border-radius:999px;padding:6px 11px;font:700 10px Space Grotesk,sans-serif;text-decoration:none;color:#111;">Wikiquote →</a>' +
            '</div></div>';
        }).join("") +
      '</div>';
    }
    // v244: LIVE dictionary card — word power with meaning + example
    function cardDict(d){
      if(!d) return "";
      return '<div style="background:#fff;border:3px solid #111;border-radius:16px;padding:14px;box-shadow:4px 4px 0 #111;">' +
        '<div style="font:800 11px Space Grotesk,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:#0f172a;margin-bottom:6px;">🔤 Word power — LIVE Dictionary</div>' +
        '<div style="font:800 16px Space Grotesk,sans-serif;color:#111;">'+esc(d.word)+' <span style="font:600 11px Space Grotesk,sans-serif;color:#94a3b8;">'+esc(d.ph||"")+(d.pos?" · "+esc(d.pos):"")+'</span></div>' +
        '<div style="font:500 12.5px Space Grotesk,sans-serif;color:#334155;line-height:1.55;margin-top:5px;">'+esc(d.def)+'</div>' +
        (d.ex ? '<div style="font:500 12px Space Grotesk,sans-serif;color:#64748b;font-style:italic;margin-top:4px;">“'+esc(d.ex)+'”</div>' : '') +
        '<button type="button" data-use-dict="'+esc(("“"+d.word+"”"+(d.pos?" ("+d.pos+")":"")+" — "+d.def).replace(/"/g,"&quot;"))+'" style="margin-top:9px;border:2.5px solid #111;background:#ffc800;border-radius:999px;padding:8px 12px;font:800 11px Space Grotesk,sans-serif;cursor:pointer;box-shadow:2px 2px 0 #111;">✨ Insert meaning</button>' +
      '</div>';
    }
    // v244: Explore board — no default topic ever again; rotating live topics with real summaries
    function cardExplore(sum){
      if(!sum) return "";
      return '<div style="background:#fff;border:2.5px solid #111;border-radius:14px;overflow:hidden;box-shadow:3px 3px 0 #111;display:flex;flex-direction:column;">' +
        (sum.thumb ? '<img src="'+esc(sum.thumb)+'" alt="" style="width:100%;height:92px;object-fit:cover;border-bottom:2px solid #111;" loading="lazy">' : '') +
        '<div style="padding:9px 11px;display:flex;flex-direction:column;gap:5px;flex:1;">' +
          '<div style="font:800 12px Space Grotesk,sans-serif;color:#111;">'+esc(sum.title)+'</div>' +
          '<div style="font:500 11px Space Grotesk,sans-serif;color:#475569;line-height:1.45;">'+esc(sum.extract.slice(0,110))+(sum.extract.length>110?"…":"")+'</div>' +
          '<div style="display:flex;gap:6px;margin-top:auto;padding-top:4px;flex-wrap:wrap;">' +
            '<button type="button" data-use-research-sum="'+esc(sum.extract.slice(0,400).replace(/"/g,"&quot;"))+'" style="flex:1 1 auto;border:2px solid #111;background:#ffc800;border-radius:999px;padding:6px 9px;font:800 10px Space Grotesk,sans-serif;cursor:pointer;">✨ Insert</button>' +
            (sum.url ? '<a href="'+esc(sum.url)+'" target="_blank" rel="noopener" style="border:2px solid #111;background:#fff;border-radius:999px;padding:6px 9px;font:700 10px Space Grotesk,sans-serif;text-decoration:none;color:#111;">Open →</a>' : '') +
          '</div>' +
        '</div></div>';
    }

    function wireResultActions(){
      $res.querySelectorAll("[data-use-quote]").forEach(function(b){
        b.addEventListener("click", function(){
          var txt=b.getAttribute("data-use-quote"); var auth=b.getAttribute("data-author")||"";
          if(callbacks.onUseQuote) callbacks.onUseQuote({text:txt, author:auth});
          else { var t=document.getElementById("wTitle")||document.getElementById("stuQuoteTa"); if(t){ t.value=txt; t.dispatchEvent(new Event("input",{bubbles:true})); toast("✨ Quote dropped in — edit to make it yours"); } else if(navigator.clipboard) navigator.clipboard.writeText("“ "+txt+" ” — "+auth).then(function(){ toast("📋 Copied"); }); }
          b.textContent="✓ Added"; b.style.background="#22c55e"; b.style.color="#fff"; setTimeout(function(){ b.textContent="✨ Use this quote"; b.style.background="#ffc800"; b.style.color="#111"; },1600);
        });
      });
      $res.querySelectorAll("[data-copy-quote]").forEach(function(b){
        b.addEventListener("click", function(){
          var card=b.closest("div").parentNode; var txt=card.querySelector("[data-use-quote]")?card.querySelector("[data-use-quote]").getAttribute("data-use-quote"):""; var auth=card.querySelector("[data-use-quote]")?card.querySelector("[data-use-quote]").getAttribute("data-author"):""; var full="“ "+txt+" ” — "+auth; if(navigator.clipboard) navigator.clipboard.writeText(full).then(function(){ toast("📋 Copied"); });
        });
      });
      $res.querySelectorAll("[data-use-image]").forEach(function(b){
        b.addEventListener("click", async function(){
          var url=b.getAttribute("data-use-image"); b.textContent="… loading";
          try{
            if(callbacks.onUseImage) await callbacks.onUseImage(url);
            else {
              var blob=await fetch(url,{mode:"cors"}).then(function(r){ return r.blob(); }).catch(function(){ return null; });
              if(blob){
                var file=new File([blob],"inspire-"+Date.now()+".jpg",{type:blob.type||"image/jpeg"});
                if(window.TSB_COMMUNITY && window.TSB_COMMUNITY.upload){
                  toast("… uploading image as cover");
                  var upUrl=await window.TSB_COMMUNITY.upload(file,"tsb-covers");
                  var prev=document.getElementById("wCoverPrev"); if(prev){ prev.src=upUrl; prev.hidden=false; }
                  var ss=document.getElementById("saveState"); if(ss) ss.textContent="✓ cover from Inspire";
                  toast("✨ Cover set from Inspire Desk");
                } else window.open(url,"_blank");
              } else window.open(url,"_blank");
            }
          }catch(e){ toast("Couldn't use image — opened it"); window.open(url,"_blank"); }
          b.textContent="✨ Use as cover";
        });
      });
      $res.querySelectorAll("[data-use-research]").forEach(function(b){
        b.addEventListener("click", function(){
          var snippet=$res._lastWikiExtract||"";
          if(callbacks.onUseResearch) callbacks.onUseResearch(snippet);
          else { var body=document.getElementById("wBody"); if(body){ body.focus(); document.execCommand("insertText", false, "\n\n"+snippet+"\n"); body.dispatchEvent(new Event("input",{bubbles:true})); toast("✨ Snippet inserted — rewrite in your voice"); } else if(navigator.clipboard) navigator.clipboard.writeText(snippet).then(function(){ toast("📋 Copied"); }); }
          b.textContent="✓ Inserted"; setTimeout(function(){ b.textContent="✨ Insert snippet"; },1500);
        });
      });
      $res.querySelectorAll("[data-use-book]").forEach(function(b){
        b.addEventListener("click", function(){
          var t=b.getAttribute("data-use-book"); var a=b.getAttribute("data-book-author"); var txt=t+(a?" — "+a:"");
          if(callbacks.onUseResearch) callbacks.onUseResearch(txt);
          else { var bd=document.getElementById("wBody"); if(bd){ bd.focus(); document.execCommand("insertText", false, "Reference: "+txt+"\n"); bd.dispatchEvent(new Event("input",{bubbles:true})); toast("✨ Reference added"); } else if(navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){ toast("📋 Copied"); }); }
        });
      });
      $res.querySelectorAll("[data-use-essay]").forEach(function(b){
        b.addEventListener("click", function(){
          var txt=b.getAttribute("data-use-essay")||"";
          if(callbacks.onUseResearch) callbacks.onUseResearch(txt);
          else { var bdE=document.getElementById("wBody"); if(bdE){ bdE.focus(); document.execCommand("insertText", false, "\n\n"+txt+"\n"); bdE.dispatchEvent(new Event("input",{bubbles:true})); toast("\u2728 Story starter inserted — rewrite in your voice before publishing"); } else if(navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){ toast("\uD83D\uDCCB Copied"); }); }
          b.textContent="\u2713 Inserted"; setTimeout(function(){ b.textContent="\u2728 Insert story starter"; },1400);
        });
      });
      $res.querySelectorAll("[data-copy-essay]").forEach(function(b){
        b.addEventListener("click", function(){
          var txtEl=$res.querySelector("[data-use-essay]"); var txt= txtEl ? txtEl.getAttribute("data-use-essay") : ($res._lastWikiExtract||"");
          if(navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){ toast("\uD83D\uDCCB Copied"); });
          b.textContent="\u2713 Copied"; setTimeout(function(){ b.textContent="\uD83D\uDCCB Copy"; },1400);
        });
      });
      // v244: READ a real book right here — Archive.org reader overlay
      $res.querySelectorAll("[data-read-ia]").forEach(function(b){
        b.addEventListener("click", function(){
          openReader(b.getAttribute("data-read-ia"), b.getAttribute("data-read-title")||"Book");
        });
      });
      // v244: insert a Wikiquote voice/line
      $res.querySelectorAll("[data-use-voice]").forEach(function(b){
        b.addEventListener("click", function(){
          var txt=b.getAttribute("data-use-voice")||"";
          if(callbacks.onUseResearch) callbacks.onUseResearch(txt);
          else { var bv=document.getElementById("wBody"); if(bv){ bv.focus(); document.execCommand("insertText", false, "\n\n"+txt+"\n"); bv.dispatchEvent(new Event("input",{bubbles:true})); toast("✨ Voice added — rewrite in your voice"); } else if(navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){ toast("📋 Copied"); }); }
          b.textContent="✓ Added"; setTimeout(function(){ b.textContent="✨ Insert"; },1400);
        });
      });
      // v244: insert a dictionary meaning
      $res.querySelectorAll("[data-use-dict]").forEach(function(b){
        b.addEventListener("click", function(){
          var txt=b.getAttribute("data-use-dict")||"";
          if(callbacks.onUseResearch) callbacks.onUseResearch(txt);
          else { var bd3=document.getElementById("wBody"); if(bd3){ bd3.focus(); document.execCommand("insertText", false, "\n\n"+txt+"\n"); bd3.dispatchEvent(new Event("input",{bubbles:true})); toast("✨ Meaning added"); } else if(navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){ toast("📋 Copied"); }); }
          b.textContent="✓ Added"; setTimeout(function(){ b.textContent="✨ Insert meaning"; },1400);
        });
      });
      // v244: insert an Explore board fact
      $res.querySelectorAll("[data-use-research-sum]").forEach(function(b){
        b.addEventListener("click", function(){
          var txt=b.getAttribute("data-use-research-sum")||"";
          if(callbacks.onUseResearch) callbacks.onUseResearch(txt);
          else { var bd4=document.getElementById("wBody"); if(bd4){ bd4.focus(); document.execCommand("insertText", false, "\n\n"+txt+"\n"); bd4.dispatchEvent(new Event("input",{bubbles:true})); toast("✨ Facts added — rewrite in your voice"); } else if(navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){ toast("📋 Copied"); }); }
          b.textContent="✓ Added"; setTimeout(function(){ b.textContent="✨ Insert"; },1400);
        });
      });
      $res.querySelectorAll("[data-use-local]").forEach(function(b){
        b.addEventListener("click", function(){
          var id=b.getAttribute("data-use-local");
          var qLocal = ($q.value||"").trim() || activeTag || "habits";
          var allLocal = localBookSearch(qLocal);
          var found = allLocal.find(function(x){ return (x.id||x.title)==id; });
          var title = found ? (found.title||found.t) : id;
          var author = found ? (found.author||found.a||"") : "";
          var snippet = title + (author?" — "+author:"") + (found && found.oneLiner ? "\n“"+found.oneLiner+"”" : "") + (found && found.lessons && found.lessons[0] ? "\nLesson: "+found.lessons[0].title : "");
          if(callbacks.onUseResearch) callbacks.onUseResearch(snippet);
          else { var bd2=document.getElementById("wBody"); if(bd2){ bd2.focus(); document.execCommand("insertText", false, "\n\n"+snippet+"\n"); bd2.dispatchEvent(new Event("input",{bubbles:true})); toast("✨ Book content added — rewrite in your voice"); } else if(navigator.clipboard) navigator.clipboard.writeText(snippet).then(function(){ toast("📋 Copied"); }); }
          b.textContent="✓ Added"; setTimeout(function(){ b.textContent="+ Use"; },1400);
        });
      });
    }

    function run(force){
      var q=($q.value||"").trim();
      // intelligence: if user typed a long sentence, keep it; otherwise use tag
      var effective = q || activeTag || "";
      if(!force && effective===lastQuery && $res.children.length) return;
      lastQuery=effective;
      if(pending) return;
      pending=true;
      $res.innerHTML = '<div style="text-align:center;padding:22px 10px;color:#64748b;font:600 13px Space Grotesk,sans-serif;"><span style="display:inline-block;width:18px;height:18px;border:2.5px solid #111;border-top-color:#ffc800;border-radius:50%;animation:rot .7s linear infinite;margin-right:8px;vertical-align:-4px;"></span> Searching live…</div><style>@keyframes rot{to{transform:rotate(360deg)}}</style>';

      // reset grid vs flex per tab — images is grid, others flex
      if(activeTab==="images"){
        $res.style.flex = "0 0 auto";   // v247: NEVER let flex-shrink crush the grid (that hid the Use buttons)
        $res.style.display = "grid";
        $res.style.gridTemplateColumns = "repeat(2,1fr)";
        $res.style.gridAutoRows = "auto";
        $res.style.gap = "10px";
      } else {
        $res.style.flex = "0 0 auto";   // v247
        $res.style.display = "flex";
        $res.style.flexDirection = "column";
        $res.style.gap = "10px";
        $res.style.gridTemplateColumns = "";
      }
      if(activeTab==="quotes"){
        var qFor = ($q.value||"").trim();
        var tagFor = !qFor ? activeTag : "";
        fetchQuotesLiveSmart(qFor, tagFor).then(function(list){
          if(!list.length) list = CURATED.slice(0,4).map(function(x){ return Object.assign({ _live:false }, x); });
          else list = list.map(function(x){ return Object.assign({ _live:true }, x); });
          $res.innerHTML = list.length ? list.map(cardQuote).join("") : '<div style="text-align:center;padding:18px;color:#94a3b8;font:600 13px Space Grotesk,sans-serif;">No quotes for that — try: lonely, healing, Rumi.</div>';
          // show intelligence note
          if(qFor && list.length){
            var note = document.createElement("div");
            note.style.cssText="text-align:center;font:600 11px Space Grotesk,sans-serif;color:#16a34a;margin-top:4px;";
            note.textContent="LIVE · showing only results for “"+qFor.slice(0,40)+"” — "+list.length+" found";
            $res.prepend(note);
          }
          wireResultActions();
          pending=false;
        }).catch(function(){ $res.innerHTML = CURATED.slice(0,4).map(cardQuote).join(""); wireResultActions(); pending=false; });
      } else if(activeTab==="images"){
        var iq = ($q.value||"").trim() || activeTag || "aesthetic";
        fetchWikimediaImages(iq).then(function(wiki){
          var pics = picsumAesthetic(iq, 8);
          var list = [];
          var isAesthetic = /aesthetic|minimal|beige|pastel|ocean|nature|city|vintage|night/i.test(iq);
          if(isAesthetic){
            // aesthetic query: pics first, then live wiki for accuracy
            list = pics.slice(0,4).concat(wiki.slice(0,4));
          } else if(wiki.length >=6){
            list = wiki.slice(0,6).concat(pics.slice(0,2));
          } else if(wiki.length >=4){
            list = wiki.slice(0,4).concat(pics.slice(0,4));
          } else {
            list = wiki.concat(pics).slice(0,8);
          }
          // dedupe by thumb
          var seen={}, uniq=[];
          list.forEach(function(it){ if(it && it.thumb && !seen[it.thumb]){ seen[it.thumb]=1; uniq.push(it);} });
          list = uniq.slice(0,8);
          if(list.length <8){
            var extra = picsumAesthetic(iq+"-x"+Date.now(), 8 - list.length);
            list = list.concat(extra);
          }
          // Grid 2-2 on mobile: proper preview size, buttons never cut — images as 1:1 cards
          $res.style.display = "grid";
          $res.style.gridTemplateColumns = "repeat(2,1fr)";
          $res.style.gap = "10px";
          $res.style.alignItems = "start";
          $res.innerHTML = list.map(cardImage).join("") ;
          // footnote below grid
          var foot = document.createElement("div");
          foot.style.cssText="grid-column:1/-1;text-align:center;font:600 11px Space Grotesk,sans-serif;color:#94a3b8;margin-top:2px;";
          foot.textContent="LIVE · Wikimedia + Picsum aesthetic · tap “Use as cover”";
          $res.appendChild(foot);
          if($q.value.trim()){
            var n2=document.createElement("div");
            n2.style.cssText="grid-column:1/-1;text-align:center;font:600 11px Space Grotesk,sans-serif;color:#16a34a;";
            n2.textContent="LIVE · images for “"+($q.value.trim().slice(0,30))+"”";
            $res.prepend(n2);
          }
          // reset for other tabs will be flex
          wireResultActions();
          pending=false;
        }).catch(function(){ $res.innerHTML = picsumAesthetic(iq,6).map(cardImage).join(""); wireResultActions(); pending=false; });
      } else {
        // ── v244 RESEARCH: topic-aware + multi-source + NO hardcoded default ──
        // What you typed (or what your story is about) drives everything. Empty search
        // opens a rotating Explore board — never again one lonely default topic.
        var hasQ = ($q.value||"").trim();
        var activeRq = hasQ || activeTag || "";
        var explore = !activeRq;
        var EXPLORE = ["psychology","philosophy","habits","loneliness","money","love","stoicism","discipline","focus","courage","creativity","success"];
        var topics;
        if(explore){
          var si = Math.floor(Math.random()*EXPLORE.length);
          topics = [EXPLORE[si%12], EXPLORE[(si+5)%12], EXPLORE[(si+7)%12]];
        } else topics = [activeRq];
        var rq = explore ? topics[0] : activeRq;
        var toksR = tokens(activeRq);
        var pSums = explore
          ? Promise.all(topics.map(function(t){ return fetchWikiSummary(t); })).then(function(ls){ return ls.filter(Boolean); })
          : fetchWikiSummary(activeRq).then(function(s){ return s ? [s] : []; });
        Promise.all([pSums, wikiSearch(activeRq), wikiQuoteSearch(rq), dictLookup(toksR.length===1?toksR[0]:""), openLibSearch(rq), ensureLocalBooks()]).then(function(res){
          var sums=res[0], hits=res[1], voices=res[2], dict=res[3], books=res[4], localAll=res[5]||[];
          if(!explore && !sums.length && hits.length) return fetchWikiSummary(hits[0].title).then(function(s2){ return [s2?[s2]:[], hits, voices, dict, books, localAll]; });
          return [sums, hits, voices, dict, books, localAll];
        }).then(function(arr){
          var sums=arr[0], hits2=arr[1], voices=arr[2], dict=arr[3], books2=arr[4], localAll=arr[5];
          // books from the live web must NEVER duplicate TheSmallBook's own library — different shelf, always
          var own = {};
          (localAll||[]).forEach(function(b){ own[normTitle(b.title||b.t||"")]=1; });
          books2 = (books2||[]).filter(function(b){ return b.title && !own[normTitle(b.title)]; });
          var localBooks = localBookSearch(activeRq || rq);
          $res._lastWikiExtract = (sums[0] && sums[0].extract) || (hits2[0]?hits2[0].snippet:"");
          var essayObj = null;
          try{ essayObj = essayStarter(rq, $res._lastWikiExtract, (localBooks && localBooks[0]) ? localBooks[0] : null); }catch(e){ essayObj=null; }
          var html="";
          // Story starter first — a ready essay you rewrite in your voice (compact, not bombarding)
          if(essayObj && essayObj.html) html += essayObj.html;
          if(explore && sums.length){
            html+='<div style="font:800 11px Space Grotesk,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:#0f172a;">🔎 Explore — LIVE <span style="font:700 9px Space Grotesk,sans-serif;background:#dcfce7;border:1px solid #16a34a;color:#166534;padding:2px 6px;border-radius:999px;text-transform:uppercase;">fresh every visit</span></div>' +
              '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">' + sums.map(cardExplore).join("") + '</div>';
          }
          if(!explore){
            if(sums.length) html+=cardResearchWiki(sums[0]);
            else if(hits2.length){
              html+='<div style="background:#fff;border:2.5px solid #111;border-radius:14px;padding:12px;"><div style="font:700 11px Space Grotesk,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:#0f172a;">Related on Wikipedia (live)</div>' +
                hits2.map(function(h){ return '<div style="border:2px solid #e2e8f0;border-radius:10px;padding:8px 10px;margin-top:8px;background:#f8fafc"><b style="font:800 12px Space Grotesk,sans-serif">'+esc(h.title)+'</b><br><span style="font:500 11px Space Grotesk,sans-serif;color:#475569">'+esc(h.snippet.slice(0,140))+'</span></div>'; }).join("") +
                '</div>';
            } else {
              html+='<div style="text-align:center;padding:14px;color:#94a3b8;font:600 12px Space Grotesk,sans-serif;">No live wiki page for that — try broader: habits, loneliness, startup.</div>';
            }
          }
          if(dict) html+=cardDict(dict);
          if(voices.length) html+=cardVoices(voices, rq);
          if(books2.length){
            html+='<div style="background:#fff;border:3px solid #111;border-radius:16px;padding:12px;box-shadow:4px 4px 0 #111;margin-top:2px;"><div style="font:800 11px Space Grotesk,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:#0f172a;margin-bottom:8px;">📖 Read free — full books · LIVE Open Library <span style="font:700 9px Space Grotesk,sans-serif;background:#dcfce7;border:1px solid #16a34a;color:#166534;padding:2px 6px;border-radius:999px;text-transform:uppercase;">readable now</span></div>'+books2.map(cardBook).join('<div style="height:8px"></div>')+'<div style="font:600 10px Space Grotesk,sans-serif;color:#94a3b8;margin-top:8px;text-align:center;">Readable classics &amp; public-domain finds — never duplicates TheSmallBook\'s own shelf below.</div></div>';
          } else if(!explore && hasQ){
            html+='<div style="font:600 10px Space Grotesk,sans-serif;color:#94a3b8;text-align:center;margin-top:2px;">No readable full book matched “'+esc(rq)+'” — TheSmallBook\'s own library below covers your topic.</div>';
          }
          if(localBooks.length){
            html+='<div style="background:#ffc800;border:3px solid #111;border-radius:16px;padding:12px;box-shadow:4px 4px 0 #111;margin-top:2px;"><div style="font:800 11px Space Grotesk,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:#111;margin-bottom:8px;">📕 From TheSmallBook — your 400 books (tap to use)</div>'+localBooks.map(cardLocalBook).join('<div style="height:8px"></div>')+'<div style="font:600 10px Space Grotesk,sans-serif;color:#111;margin-top:8px;text-align:center;opacity:.7">Suggestions from our library matching “'+esc(rq)+'”</div></div>';
          }
          $res.innerHTML = html;
          var n3=document.createElement("div");
          n3.style.cssText="text-align:center;font:600 11px Space Grotesk,sans-serif;color:#16a34a;margin-bottom:4px;";
          n3.textContent = explore ? "LIVE · explore board — type above to research YOUR topic (wiki · voices · words · books)" : "LIVE · research for “"+rq.slice(0,36)+"” — Wikipedia · Wikiquote · Dictionary · books";
          $res.prepend(n3);
          wireResultActions();
          pending=false;
        }).catch(function(){ pending=false; $res.innerHTML='<div style="text-align:center;color:#94a3b8;">Couldn\'t load — try again.</div>'; });
      }
    }

    paintTabs();
    if($tQ) $tQ.addEventListener("click", function(){ activeTab="quotes"; activeTag=""; paintTabs(); run(true); });
    if($tI) $tI.addEventListener("click", function(){ activeTab="images"; activeTag=""; paintTabs(); run(true); });
    if($tR) $tR.addEventListener("click", function(){ activeTab="research"; activeTag=""; paintTabs(); run(true); });
    $go.addEventListener("click", function(){ activeTag=""; run(true); });
    $clr.addEventListener("click", function(){ $q.value=""; activeTag=""; $q.focus(); run(true); });
    $q.addEventListener("keydown", function(e){ if(e.key==="Enter"){ e.preventDefault(); activeTag=""; run(true); }});
    var debounced = debounce(function(){ activeTag=""; run(false); }, 420);
    $q.addEventListener("input", debounced);

    run(true);
    setTimeout(function(){ try{ $q.focus(); }catch(e){} }, 300);
    return wrap;
  }

  function verifyQuoteRedirect(q){ return openDesk("quotes", String(q||"").trim(), {}); }
  function verifyImageRedirect(){ return openDesk("images","",{}); }
  function verifyAuthorRedirect(n){ return openDesk("research", String(n||"").trim(), {}); }

  var api = {
    __inspireV235: true,
    __inspireV234: true,
    openInspire: openDesk,
    openDesk: openDesk,
    open: openDesk,
    quotes: function(q, cb){ return openDesk("quotes", q, cb?{onUseQuote:cb}:{}); },
    /* v250: the Quote Desk renders its own live list — same fetchers, no duplicate code */
    quotesLive: function(q, tag){ return fetchQuotesLiveSmart(q, tag); },
    images: function(q, cb){ return openDesk("images", q, cb?{onUseImage:cb}:{}); },
    research: function(q, cb){ return openDesk("research", q, cb?{onUseResearch:cb}:{}); },
    verifyQuote: verifyQuoteRedirect,
    verifyImage: verifyImageRedirect,
    verifyAuthor: verifyAuthorRedirect
  };
  window.TSB_OSINT = api;
  window.TSB_INSPIRE = api;
  window.TSB_LIBRARY = api;
})();
