/* ============================================================
   THESMALLBOOK — ✨ INSPIRE DESK (osint.js) · v235
   LIVE, INTELLIGENT, SIMPLE — not preloaded.

   OSINT tech, productive: a live library you tap to create.
   - Quotes: LIVE from DummyJSON (1454) + ZenQuotes, filtered
     intelligently by what you actually typed, ranked by
     relevance — not a static list. Offline fallback is only
     when network fails.
   - Images: LIVE Wikimedia Commons search + live Picsum
     aesthetic seeds — every result is a real photo you can
     "Use as cover" instantly. Not preloaded.
   - Research: LIVE Wikipedia summary + OpenLibrary.
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

  // LIVE quotes: try Quotable (if DNS works), then DummyJSON live filter — never preloaded.
  var quoteCache = null; // cache last live fetch for 60s to avoid hammering
  var quoteCacheAt = 0;
  function fetchDummyQuotesLive(){
    // fetch 40 live quotes each time (fresh), filter intelligently
    var now=Date.now();
    if(quoteCache && (now-quoteCacheAt)<60000){
      return Promise.resolve(quoteCache);
    }
    // random skip for variety but still live
    var skip = Math.floor(Math.random()*120)*10 % 1400;
    var url = "https://dummyjson.com/quotes?limit=50&skip="+skip;
    return jfetch(url, 6500).then(function(j){
      var arr=(j.quotes||[]).map(function(x){ return {c:x.quote, a:x.author, tags:[]}; });
      quoteCache=arr; quoteCacheAt=now;
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
      if(list.length) return list;
      // fallback live DummyJSON + intelligent ranking
      return fetchDummyQuotesLive().then(function(live){
        if(!live.length) return [];
        if(!toks.length){
          // no query: return diverse live slice
          return live.slice(0,8);
        }
        // rank by relevance to what they typed
        var ranked = live.map(function(x){ return {x:x, sc: relevance(x.c+" "+x.a, toks)}; });
        ranked.sort(function(a,b){ return b.sc - a.sc; });
        var top = ranked.filter(function(r){ return r.sc>0; }).slice(0,8).map(function(r){ return r.x; });
        if(top.length>=3) return top;
        // if not enough relevant, pad with curated filtered intelligently
        var curated = CURATED.filter(function(c){
          var txt=(c.c+" "+c.a+" "+c.tags.join(" ")).toLowerCase();
          return toks.some(function(t){ return txt.indexOf(t)>=0; });
        }).slice(0,8-top.length);
        return top.concat(curated);
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
    return Array.from({length:n}, function(_,i){
      var seed = encodeURIComponent(base+"-"+i+"-"+(Date.now()%1000));
      var url = "https://picsum.photos/seed/"+seed+"/640/640";
      return {thumb:url, full:url, title: base+" · aesthetic #"+(i+1)};
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
    var url="https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch="+encodeURIComponent(q)+"&srlimit=5&format=json&origin=*";
    return jfetch(url, 6000).then(function(j){
      var hits=(j.query&&j.query.search)||[];
      return hits.map(function(h){ return {title:h.title, snippet:h.snippet.replace(/<\/?[^>]+>/g,"")}; });
    }).catch(function(){return [];});
  }
  function openLibSearch(q){
    var url="https://openlibrary.org/search.json?q="+encodeURIComponent(q)+"&limit=6";
    return jfetch(url, 7000).then(function(j){
      return (j.docs||[]).slice(0,6).map(function(d){ return {title:d.title, author:(d.author_name&&d.author_name[0])||"", year:d.first_publish_year, cover:d.cover_i}; });
    }).catch(function(){return [];});
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
    initialTab=initialTab||"quotes";
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

    var html =
      '<div style=\"display:flex;gap:6px;flex-wrap:wrap;\">' +
        '<button type=\"button\" id=\"tabQuotes\" style=\"flex:1 1 90px;border:2.5px solid #111;border-radius:999px;padding:9px 10px;font:800 12px Archivo Black,sans-serif;letter-spacing:.6px;cursor:pointer;text-transform:uppercase;\">💬 Quotes</button>' +
        '<button type=\"button\" id=\"tabImages\" style=\"flex:1 1 90px;border:2.5px solid #111;border-radius:999px;padding:9px 10px;font:800 12px Archivo Black,sans-serif;letter-spacing:.6px;cursor:pointer;text-transform:uppercase;\">🖼️ Images</button>' +
        '<button type=\"button\" id=\"tabResearch\" style=\"flex:1 1 100px;border:2.5px solid #111;border-radius:999px;padding:9px 10px;font:800 12px Archivo Black,sans-serif;letter-spacing:.6px;cursor:pointer;text-transform:uppercase;\">📖 Research</button>' +
      '</div>' +
      '<div style=\"background:#fff;border:3px solid #111;border-radius:16px;padding:12px;box-shadow:4px 4px 0 #111;\">' +
        '<div style=\"display:flex;gap:8px;align-items:center;\">' +
          '<input id=\"inspQ\" type=\"text\" placeholder=\"Type anything — e.g. lonely after breakup, startup failure, love…\" value=\"'+esc(seedQuery)+'\" style=\"flex:1 1 auto;border:2.5px solid #111;border-radius:999px;padding:11px 14px;font:600 13px Space Grotesk,sans-serif;outline:none;\">' +
          '<button id=\"inspClear\" type=\"button\" title=\"Clear\" style=\"flex:none;width:36px;height:36px;border:2px solid #111;border-radius:999px;background:#fff;font:800 13px Space Grotesk,sans-serif;cursor:pointer;\">✕</button>' +
          '<button id=\"inspGo\" type=\"button\" style=\"flex:none;border:2.5px solid #111;border-radius:999px;padding:10px 14px;font:800 12px Space Grotesk,sans-serif;background:#ffc800;box-shadow:2px 2px 0 #111;cursor:pointer;white-space:nowrap\">Search →</button>' +
        '</div>' +
        '<div id=\"inspChips\"></div>' +
        '<div style=\"font-size:11px;color:#8f8a80;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-top:6px;\">LIVE · as you type it filters · tap <span style=\"background:#ffc800;padding:1px 6px;border-radius:999px;border:1.5px solid #111;color:#111\">Use this</span> to drop instantly</div>' +
      '</div>' +
      '<div id=\"inspResults\" style=\"display:flex;flex-direction:column;gap:10px;min-height:120px;\">' +
        '<div style=\"text-align:center;padding:18px 10px;color:#8f8a80;font:600 13px Space Grotesk,sans-serif;\">Loading live library…</div>' +
      '</div>' +
      '<div style=\"background:#0f172a;color:#e2e8f0;border-radius:14px;padding:12px;font-size:12px;line-height:1.5;\">' +
        '<b style=\"color:#ffc800\">Smart:</b> type normal sentences — “lonely after breakup”, “money habits” — we find only that topic. Images are always aesthetic photos (Wikimedia live + Picsum aesthetic). One tap to use, simple and professional.' +
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
      [$tQ,$tI,$tR].forEach(function(b){
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
      if(activeTab==="quotes"){ $tQ.style.background="#111"; $tQ.style.color="#ffc800"; }
      if(activeTab==="images"){ $tI.style.background="#111"; $tI.style.color="#ffc800"; }
      if(activeTab==="research"){ $tR.style.background="#111"; $tR.style.color="#ffc800"; }
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
      $q.placeholder = activeTab==="quotes" ? "Type anything — e.g. lonely after breakup, healing, Rumi…" : activeTab==="images" ? "Search aesthetic images — minimal, ocean, beige, nature…" : "Search research — habits, money, loneliness…";
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
      return '<div style="background:#fff;border:3px solid #111;border-radius:16px;overflow:hidden;box-shadow:4px 4px 0 #111;display:flex;gap:0;">' +
        '<img src="'+esc(im.thumb)+'" alt="" style="width:112px;height:112px;object-fit:cover;flex:none;border-right:3px solid #111;" loading="lazy">' +
        '<div style="flex:1 1 auto;padding:10px 12px;display:flex;flex-direction:column;gap:6px;">' +
          '<div style="font:800 11px Space Grotesk,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:#111;line-height:1.3;">'+esc(im.title.slice(0,54))+'</div>' +
          '<div style="font:500 11px Space Grotesk,sans-serif;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">LIVE · aesthetic photo</div>' +
          '<div style="display:flex;gap:6px;margin-top:auto;">' +
            '<button type="button" data-use-image="'+esc(im.full)+'" style="flex:1 1 auto;border:2px solid #111;background:#ffc800;border-radius:999px;padding:7px 10px;font:800 11px Space Grotesk,sans-serif;cursor:pointer;">✨ Use as cover</button>' +
            '<a href="'+esc(im.full)+'" target="_blank" rel="noopener" style="border:2px solid #111;background:#fff;border-radius:999px;padding:7px 10px;font:700 11px Space Grotesk,sans-serif;text-decoration:none;color:#111;text-align:center;">Open</a>' +
          '</div>' +
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
      return '<div style="background:#fff;border:2.5px solid #111;border-radius:14px;padding:10px;display:flex;gap:10px;align-items:center;">' +
        (cover ? '<img src="'+esc(cover)+'" alt="" style="width:56px;height:78px;object-fit:cover;border-radius:8px;border:2px solid #111;flex:none;" loading="lazy">' : '<div style="width:56px;height:78px;border-radius:8px;border:2px solid #111;background:#fffdf5;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none;">📚</div>') +
        '<div style="flex:1 1 auto;min-width:0;">' +
          '<div style="font:800 12px Space Grotesk,sans-serif;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(b.title)+'</div>' +
          '<div style="font:600 11px Space Grotesk,sans-serif;color:#64748b;margin-top:2px;">'+esc(b.author||"")+(b.year?" · "+b.year:"")+'</div>' +
          '<div style="font:600 10px Space Grotesk,sans-serif;color:#94a3b8;letter-spacing:.5px;text-transform:uppercase;margin-top:4px;">LIVE OpenLibrary</div>' +
        '</div>' +
        '<button type="button" data-use-book="'+esc(b.title)+'" data-book-author="'+esc(b.author||"")+'" style="flex:none;border:2px solid #111;background:#fff;border-radius:999px;padding:7px 10px;font:700 10px Space Grotesk,sans-serif;cursor:pointer;white-space:nowrap">+ Use</button>' +
      '</div>';
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
        fetchWikimediaImages(iq).then(function(list){
          // supplement with live Picsum aesthetic to guarantee aesthetic choice
          var pics = picsumAesthetic(iq, 4);
          if(list.length < 4){
            // intermix picsum for aesthetic guarantee
            list = list.concat(pics).slice(0,8);
          } else {
            // even when we have wikimedia results, inject 2 aesthetic Picsum for variety
            list = list.slice(0,6).concat(pics.slice(0,2));
          }
          // if user asked for any aesthetic, prioritize Picsum first
          if(/aesthetic|minimal|beige|pastel/i.test(iq)){
            list = pics.slice(0,4).concat(list.slice(0,4));
          }
          $res.innerHTML = list.map(cardImage).join("") + '<div style="text-align:center;font:600 11px Space Grotesk,sans-serif;color:#94a3b8;margin-top:4px;">LIVE · Wikimedia Commons + Picsum aesthetic · tap “Use as cover” — works everywhere.</div>';
          if($q.value.trim()){
            var n2=document.createElement("div");
            n2.style.cssText="text-align:center;font:600 11px Space Grotesk,sans-serif;color:#16a34a;";
            n2.textContent="LIVE · images for “"+($q.value.trim().slice(0,30))+"”";
            $res.prepend(n2);
          }
          wireResultActions();
          pending=false;
        }).catch(function(){ $res.innerHTML = picsumAesthetic(iq,6).map(cardImage).join(""); wireResultActions(); pending=false; });
      } else {
        var rq = ($q.value||"").trim() || activeTag || "habits";
        Promise.all([fetchWikiSummary(rq), wikiSearch(rq), openLibSearch(rq)]).then(function(res){
          var sum=res[0], hits=res[1], books=res[2];
          if(!sum && hits.length) return fetchWikiSummary(hits[0].title).then(function(s2){ return [s2, hits, books]; });
          return [sum, hits, books];
        }).then(function(arr){
          var sum2=arr[0], hits2=arr[1], books2=arr[2];
          $res._lastWikiExtract = sum2 ? sum2.extract : (hits2[0]?hits2[0].snippet:"");
          var html="";
          if(sum2) html+=cardResearchWiki(sum2);
          else if(hits2.length){
            html+='<div style="background:#fff;border:2.5px solid #111;border-radius:14px;padding:12px;"><div style="font:700 11px Space Grotesk,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:#0f172a;">Related on Wikipedia (live)</div>' +
              hits2.map(function(h){ return '<div style="border:2px solid #e2e8f0;border-radius:10px;padding:8px 10px;margin-top:8px;background:#f8fafc"><b style="font:800 12px Space Grotesk,sans-serif">'+esc(h.title)+'</b><br><span style="font:500 11px Space Grotesk,sans-serif;color:#475569">'+esc(h.snippet.slice(0,140))+'</span></div>'; }).join("") +
              '</div>';
          } else {
            html+='<div style="text-align:center;padding:14px;color:#94a3b8;font:600 12px Space Grotesk,sans-serif;">No live wiki page — try broader: habits, loneliness, startup.</div>';
          }
          if(books2.length){
            html+='<div style="background:#fff;border:3px solid #111;border-radius:16px;padding:12px;box-shadow:4px 4px 0 #111;margin-top:2px;"><div style="font:800 11px Space Grotesk,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:#0f172a;margin-bottom:8px;">📚 Books that explore this — LIVE OpenLibrary</div>'+books2.map(cardBook).join('<div style="height:8px"></div>')+'</div>';
          }
          $res.innerHTML = html;
          if(rq){
            var n3=document.createElement("div");
            n3.style.cssText="text-align:center;font:600 11px Space Grotesk,sans-serif;color:#16a34a;margin-bottom:4px;";
            n3.textContent="LIVE · research for “"+rq.slice(0,36)+"”";
            $res.prepend(n3);
          }
          wireResultActions();
          pending=false;
        }).catch(function(){ pending=false; $res.innerHTML='<div style="text-align:center;color:#94a3b8;">Couldn\'t load — try again.</div>'; });
      }
    }

    paintTabs();
    $tQ.addEventListener("click", function(){ activeTab="quotes"; activeTag=""; paintTabs(); run(true); });
    $tI.addEventListener("click", function(){ activeTab="images"; activeTag=""; paintTabs(); run(true); });
    $tR.addEventListener("click", function(){ activeTab="research"; activeTag=""; paintTabs(); run(true); });
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
