/* ============================================================
   THESMALLBOOK — ⚡ IDEA AUTOPSY v1 (js/ideaaudit.js) v266
   Rebuilt from scratch for the YOU section. The graveyard's
   308 corpses cross-examine your startup idea.

   THE ENGINE (deterministic — same answers, same verdict):
     · ~20 weighted rules, each with a real why, a real fix and
       a real grave that already paid for the mistake
     · four meters: SURVIVAL / SCALABILITY / TIMING / TRUST LOAD
     · an ordered scale-up plan (the weakest reads come first)
     · free OSINT, keyless: Wikipedia (does it already exist?)
       + Hacker News (who already died trying — field reports)

   THE LOCK (first paywall of the app):
     · FREE  → the four meters, the verdict, and a blurred glimpse
       of two fixes. Steps, grave matches and OSINT stay blurred
       behind the unlock card.
     · UNLOCKED → everything: all fixes, the ordered plan, the
       related graves, the OSINT proof. Unlock = Gold membership
       or the launch batch (the first 500 claims are free).
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_IDEAAUDIT) return;

  /* ---------------- tiny utils ---------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function get(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); if (v !== null && v !== undefined) return v; } catch (e) {}
    return d;
  }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function fetchJSON(url, ms) {
    return new Promise(function (res) {
      var done = false;
      function out(v) { if (!done) { done = true; res(v); } }
      try {
        if (typeof fetch !== "function") return out(null);
        var t = setTimeout(function () { out(null); }, ms || 9000);
        /* text-first with a JSON guess — the free AI answers in plain text,
           the registers answer in JSON; both come home through one door */
        fetch(url).then(function (r) { return r.text(); }).then(function (tx) {
          clearTimeout(t);
          var j = null;
          try { j = JSON.parse(tx); } catch (e) { j = tx; }
          out(j);
        }).catch(function () { clearTimeout(t); out(null); });
      } catch (e) { out(null); }
    });
  }

  /* ---------------- the rules — every one a real grave ---------------- */
  var RULES = [
    { id: "one-time", w: 16, cat: ["STARTUP"],
      test: function (c) { return c.money === "one-time" || has(c.text, ["one-time", "one time", "single purchase", "buy once", "one-off"]); },
      t: "One-and-done revenue", grave: "23andme-dna",
      why: "A product people buy once, priced like a business that needs them back every month. Growth can mask it for years — then the well runs dry.",
      fix: "Answer the brutal question before you scale: what does the customer buy the SECOND time? A refill, an upgrade, a service, a consumable — or accept it's a campaign, not a company." },
    { id: "free-no-engine", w: 15,
      test: function (c) { return has(c.text, ["free", "ad-supported", "ads", "ad revenue", "monetise later", "monetize later", "audience first"]); },
      t: "Free until \u2018someday\u2019", grave: "irl-app",
      why: "\u2018We\u2019ll figure out money later\u2019 is a loan against your own burn. Audience-first apps die in the gap between downloads and a business model.",
      fix: "Pick the money engine NOW, even if you switch later: subscription, take-rate, or a paid tier from day 30. If you can't name who pays and for what, you don't have a business — you have a hobby with servers." },
    { id: "logistics", w: 14,
      test: function (c) { return has(c.text, ["delivery", "deliver", "dispatch", "warehouse", "inventory", "stock", "runners", "fleet", "fulfilment", "fulfillment", "shipping"]); },
      t: "You've become a logistics company", grave: "kozmo-delivery",
      why: "Every delivery adds a cost that grows WITH you. The more customers love you, the faster you bleed — margins never catch up with volume.",
      fix: "Model the cost of order #10,000, not #10. If each new customer costs more than they pay you back in under 90 days, redesign before you scale — partner, aggregate, or drop the legs." },
    { id: "network-empty", w: 14,
      test: function (c) { return has(c.text, ["marketplace", "connect", "platform where", "match", "two-sided", "buyers and sellers", "creators"]); },
      t: "The empty-room problem", grave: "gowalla-foursquare",
      why: "A two-sided platform is an empty hall until both sides show up — and neither will stay in an empty hall. Most marketplaces die of silence, not competition.",
      fix: "Pick ONE side and serve them so well they'd pay alone (the supply side usually). Fake the other side by hand — concierge, curated, single city. Density before breadth, always." },
    { id: "giant-war", w: 12,
      test: function (c) { return has(c.text, ["like amazon", "like google", "better than", "cheaper than", "vs", "versus", "replacement for", "kill"]); } ,
      t: "Declared war on a giant", grave: "borders-amazon",
      why: "Being cheaper or \u2018better\u2019 than an incumbent means they can crush you with one pricing change — or buy the upgrade you spent years building.",
      fix: "Fight where the giant CAN'T follow: a niche too small for their P&L, a workflow they'd never service, a community they can't authentically join. Be the specialist, not the cheaper generalist." },
    { id: "capital-heavy", w: 12,
      test: function (c) { return has(c.text, ["hardware", "satellite", "manufacture", "factory", "device", "chip", "network build", "spectrum"]); },
      t: "Capital-intensive by design", grave: "iridium-sat",
      why: "Businesses that must build the expensive thing BEFORE the first customer can pay run on other people's patience — and patience runs out on a schedule you don't control.",
      fix: "Stage the capital: prove demand with the cheapest possible version (pre-orders, letters of intent, a rented capability) before you commit to owning the expensive part." },
    { id: "trust-heavy", w: 13,
      test: function (c) { return c.category === "HEALTH" || c.category === "FINANCE" || has(c.text, ["medical", "medicine", "medicines", "pharmacy", "prescription", "health records", "diagnosis", "patient", "loan", "insurance", "investment advice", "banking"]); },
      t: "You hold people's health, money or secrets", grave: "theranos-board",
      why: "Trust businesses are graded on their worst day, not their best. One breach, one wrong diagnosis, one regulatory letter — and the brand is unfixable.",
      fix: "Design for auditability from day one: licenses in place, data minimal, an expert on the cap table or the board, and a claims policy stricter than the law requires. Trust is the product." },
    { id: "regulated", w: 12,
      test: function (c) { return has(c.text, ["license", "licence", "regulation", "rbi", "fda", "sebi", "compliance", " KYC", "gaming", "betting", "crypto", "telecom", "spectrum", "edtech certificate"]); },
      t: "The rulebook owns your road", grave: "aircel",
      why: "If a licence, a court or a ministry can pause your business, then your real founder is the regulator — and they don't answer your emails.",
      fix: "Map the permission ladder BEFORE writing code: what needs approval, from whom, in how many months, and what's plan B if the answer is no. Regulatory risk is a timeline, not a footnote." },
    { id: "too-early", w: 10,
      test: function (c) { return has(c.text, ["vr", "ar ", "metaverse", "web3", "blockchain", "brain", "neural", "autonomous", "flying", "quantum"]); },
      t: "Right idea, wrong decade", grave: "gowork-gm",
      why: "Being early is statistically the same as being wrong — the graveyard is full of beautiful products whose customers hadn't been born yet.",
      fix: "Ask what must already be true for this to work (hardware, behaviour, regulation, cost curves). If two or more aren't true today, shrink to the wedge that works NOW or wait with intent." },
    { id: "founder-plays-everything", w: 11,
      test: function (c) { return c.stage === "idea" && has(c.text, ["and also", "everything", "all-in-one", "super app", "multiple", "also a marketplace", "plus a"]); },
      t: "The company is you", grave: "wework-neumann",
      why: "An all-in-one everything app is five companies wearing one logo. None of them gets the depth to survive, and no hire can de-risk the founder.",
      fix: "Cut to the ONE job that hurts most and do it embarrassingly well. The roadmap can keep the rest — the first version can't." },
    { id: "hype-over-product", w: 10,
      test: function (c) { return has(c.text, ["influencer", "viral", "hype", "buzz", "go viral", "marketing budget", "celebrity"]); },
      t: "Marketing ahead of the product", grave: "fyre-festival",
      why: "You can buy attention; you can't buy retention. Hype fills the funnel once — the second cohort arrives only if the product keeps promises.",
      fix: "Flip the order: get 50 users to a result they'd pay for AGAIN, then amplify. Spend on marketing when the product has a repeatable proof, not before." },
    { id: "below-cost", w: 13,
      test: function (c) { return has(c.text, ["cheapest", "undercut", "discount", "cashback", "burn to grow", "lose money", "loss leader", "₹1", "1 rupee", "free delivery"]); },
      t: "Priced below your own costs", grave: "movie-pass",
      why: "Discounts buy customers who leave when discounts do. If price < cost + a real margin, every growth sprint is a race to a bigger hole.",
      fix: "Raise the price until you flinch, then find the customers who don't. If nobody pays a workable price, the cost structure is the bug — not the marketing." },
    { id: "speculation", w: 11,
      test: function (c) { return c.category === "FINANCE" && has(c.text, ["trading", "crypto", "tokens", "yield", "returns", "arbitrage", " leverage"]); },
      t: "Surfing someone else's wave", grave: "three-arrows-cap",
      why: "Businesses built on a market cycle inherit the cycle. When the tide turns, leverage turns a bad quarter into the last quarter.",
      fix: "Make your revenue from serving the market (fees, tools, infrastructure) — not from being exposed to it. If your income statement IS the trade, you're one bad month from zero." },
    { id: "scale-before-unit", w: 12,
      test: function (c) { return c.stage === "launched" || c.stage === "growing"; },
      t: "Scaling before the unit works", grave: "tinyowl-food",
      why: "Growth multiplies whatever it touches. Scale a broken unit economics and all you get is a faster, bigger loss with better brand recall.",
      fix: "Freeze the growth spend until one city / one cohort / one channel pays back in under 90 days. Then press the accelerator with a clear conscience." },
    { id: "no-wound", w: 12,
      test: function (c) { return has(c.text, ["cool", "interesting", "nobody has done", "unique idea", "no one is doing", "first ever"]) || c.problem.length < 40; },
      t: "A solution looking for a wound", grave: "segway-hype",
      why: "\u2018Nobody has done this\u2019 is usually a warning, not a moat. Products without a bleeding wound get attention — and no repeat purchase.",
      fix: "Write the wound in the customer's own words — who hurts, how much, how often, what they use today. If your only answer is \u2018it's cooler\u2019, keep digging for the wound." },
    { id: "rented-land", w: 10,
      test: function (c) { return has(c.text, ["instagram", "whatsapp", "on top of", "api of", "extension of", "plugin", "channel only"]); },
      t: "Building on rented land", grave: "borders-amazon",
      why: "Platforms rent you distribution at a price that changes whenever their strategy does. One policy update can evict your entire business overnight.",
      fix: "Use the platform to ACQUIRE, not to house: own the relationship (email, phone, login), own the data, keep a door that works if the landlord changes the locks." },
    { id: "churn-prone", w: 10,
      test: function (c) { return has(c.text, ["subscription", "monthly plan", "recurring"]) && has(c.text, ["students", "kids", "trend", "event", "seasonal", "exam"]); },
      t: "Built for a season", grave: "tupperware-party",
      why: "Subscriptions need a year-round wound. Seasonal or trend-riding services pay all year for revenue that shows up for a few months.",
      fix: "Either widen the wound (what do they need in month 7?) or price for the season (passes, credits, pay-per-cycle) so costs shrink when revenue does." },
    { id: "ops-heavy-service", w: 9,
      test: function (c) { return has(c.text, ["agency", "consulting", "custom", "bespoke", "service for each", "managed"]); },
      t: "A product that is secretly a job", grave: "daewoo-empire",
      why: "If every new customer needs fresh human hours, you haven't built a product — you've bought yourself a job that scales linearly with your exhaustion.",
      fix: "Productise: fix the scope, fix the price, and let the same asset serve the next customer. Hire for quality control, not for every new account." },
    { id: "fraud-exposed", w: 9,
      test: function (c) { return has(c.text, ["cash on delivery", "cod", "referral bonus", "cash reward", "wallet cash", "coupons unlimited"]); },
      t: "Paying strangers to show up", grave: "bharatpe-grover",
      why: "Every un-verified incentive attracts an industry of extractors. Referral cash without fraud design funds scammers, not growth.",
      fix: "Delay every reward until value is proven (delivered order, paid invoice, retained user). Cap it. Watch it like a CFO, not a cheerleader." },
    { id: "ad-dependent", w: 9,
      test: function (c) { return has(c.text, ["ads", "advertising", "ad revenue", "sponsored"]) && has(c.text, ["app", "feed", "content", "videos", "news"]); },
      t: "Renting your income from an algorithm", grave: "vice-media",
      why: "Ad-dependent media lives at the mercy of platforms and cycles: one ranking change and a newsroom's rent is unpaid.",
      fix: "Layer revenue: subscriptions or products FIRST, ads as the bonus — never the floor. Own at least one channel (email, app) the algorithm can't touch." }
  ];
  var STRENGTHS = [
    { test: function (c) { return has(c.text, ["subscription", "recurring", "retainer", "members"]); }, t: "Recurring revenue from day one — the graveyard's most common absence is your default." },
    { test: function (c) { return has(c.text, ["niche", "small town", "tier-2", "tier 2", "tier-3", "specific for", "only for"]); }, t: "A niche the giants ignore — density beats breadth, and specialists keep margins." },
    { test: function (c) { return c.money === "subscription" || c.money === "commission"; }, t: "A money engine named up front — not \u2018we'll figure it out later\u2019." },
    { test: function (c) { return c.problem.length >= 60; }, t: "The wound is written in the customer's words — that's rare, and it shows." },
    { test: function (c) { return c.stage === "launched" || c.stage === "growing"; }, t: "You're already in the arena — the audit grades evidence, not intentions." }
  ];

  function has(text, words) {
    var t = " " + String(text || "").toLowerCase() + " ";
    for (var i = 0; i < words.length; i++) { if (t.indexOf(words[i]) >= 0) return true; }
    return false;
  }
  function stopwords(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(function (w) {
      return w.length > 2 && !/^(the|and|for|with|your|you|that|this|from|into|our|are|will|can|all|not|who|how|what|when|where|why|its|it|is|of|in|on|to|a|an|be|by|as|at|but|or|if|we|my|me|their|they|them|his|her|she|he|has|have|had|was|were|been|being|about|after|before|between|during|each|also|than|then|because|while|via|per|plus|using|use|used|get|gets|make|makes|like|just|only|even|more|most|very|much|many|some|any|no|yes|new|one|two|three|app|apps|website|site|platform|people|users|user|customers|customer)$/.test(w);
    });
  }

  /* ---------------- the audit itself ---------------- */
  /* signals: {wiki:[{title,snippet}], hn:[{title,...}]} — the audit blends the
     public record into the meters so the score is EVIDENCE, not a guess */
  function analyze(input, signals) {
    var c = {
      text: [input.name, input.problem, input.solution, input.audience].join(" . ").toLowerCase(),
      problem: input.problem || "",
      category: input.category || "STARTUP",
      money: input.money || "",
      stage: input.stage || "idea"
    };
    var weak = [], strong = [], burn = 0;
    RULES.forEach(function (r) {
      var hit = false;
      try { hit = r.test(c); } catch (e) {}
      if (hit) { weak.push({ id: r.id, t: r.t, why: r.why, fix: r.fix, grave: r.grave, w: r.w }); burn += r.w; }
    });
    STRENGTHS.forEach(function (s) {
      var hit = false;
      try { hit = s.test(c); } catch (e) {}
      if (hit) strong.push(s.t);
    });
    weak.sort(function (a, b) { return b.w - a.w; });

    var survival = Math.max(6, Math.min(94, 88 - burn + strong.length * 3));
    var scale = Math.max(8, Math.min(95, 80 - (weak.some(function (x) { return x.id === "logistics" || x.id === "ops-heavy-service"; }) ? 30 : 0)
      - (weak.some(function (x) { return x.id === "one-time" || x.id === "free-no-engine" || x.id === "ad-dependent"; }) ? 24 : 0)
      + (c.money === "subscription" ? 14 : 0) + (c.money === "commission" ? 10 : 0) + strong.length * 2));
    var timing = Math.max(10, Math.min(95, 76 - (weak.some(function (x) { return x.id === "too-early"; }) ? 34 : 0)
      - (weak.some(function (x) { return x.id === "speculation"; }) ? 16 : 0)
      + (weak.some(function (x) { return x.id === "no-wound"; }) ? 0 : 10)));
    var trust = Math.max(10, Math.min(96, 82 - (weak.some(function (x) { return x.id === "trust-heavy"; }) ? 38 : 0)
      - (weak.some(function (x) { return x.id === "fraud-exposed"; }) ? 22 : 0)
      - (weak.some(function (x) { return x.id === "regulated"; }) ? 16 : 0)));

    var overall = Math.round(survival * 0.34 + scale * 0.26 + timing * 0.2 + (100 - trust) * 0.1 + Math.max(0, 10 - weak.length) );
    overall = Math.max(6, Math.min(94, overall));
    var verdict = overall >= 72
      ? { label: "SERIOUS — BUILD IT PROPERLY", color: "#00c48c",
          line: "The bones are good. The audit found real risks, but nothing fatal and unfixable. Your job is sequencing: fix the weakest read first, then press growth." }
      : overall >= 52
        ? { label: "PROMISING — WITH LANDMINES", color: "#ffc800",
            line: "There is a real business hiding in here, and a real funeral. Fix the landmines below BEFORE spending on growth — the graveyard is full of \u2018almosts\u2019 that scaled their flaws." }
        : { label: "DANGER — REDRAW THE PLAN", color: "#ff4d4d",
            line: "The audit found patterns that buried companies your size. That is not a verdict against you — it is the map. Rework the weak reads below before writing another line of code." };

    var steps = planSteps(c, weak);
    var graves = matchGraves(c);

    /* ---- the public record gets a vote ---- */
    var signals = [], sig = signalsOf(input, signals);
    if (sig.wikiKnown) { timing = Math.max(6, timing - 5); overall -= 2;
      signals.push({ ic: "🔍", t: "The space is ON the public record", d: "Wikipedia already documents " + sig.wikiTitle + " — the wound is real and proven, and the room is crowded. Timing gets trimmed." }); }
    if (sig.wikiQuiet) { timing = Math.min(96, timing + 4); overall += 2;
      signals.push({ ic: "🌙", t: "Quiet on the public record", d: "Nothing prominent documents this exact idea — you\u2019re either early, or the wound is quieter than it sounds. Both are worth knowing before you build." }); }
    if (sig.hnLoud) { trust = Math.max(8, trust - 5); overall -= 1;
      signals.push({ ic: "📰", t: "The failure press is loud here", d: sig.hnCount + " recent field reports tell failure stories in this space in the last year. The graveyard is fresh — read them before you spend." }); }
    if (sig.hnSilent) { timing = Math.min(96, timing + 3);
      signals.push({ ic: "🕊️", t: "No fresh post-mortems matched", d: "A quiet year in your space\u2019s failure press. Either survivors, or a field too small to autopsy." }); }
    overall = Math.max(6, Math.min(94, overall));

    return {
      score: overall, meters: { survival: survival, scale: scale, timing: timing, trust: trust },
      verdict: verdict, weak: weak, strong: strong, steps: steps, graves: graves, signals: signals
    };
  }

  function tokens(str) {
    return stopwords(String(str || "")).slice(0, 6);
  }
  function signalsOf(input, out) {
    var wiki = input && input._wiki, hn = input && input._hn;
    var r = { wikiKnown: false, wikiQuiet: false, hnLoud: false, hnSilent: false, wikiTitle: "", hnCount: 0 };
    var kt = tokens(input.name && (input.name + " " + input.problem));
    if (wiki && wiki.length) {
      var best = null, bestScore = 0;
      wiki.forEach(function (wd) {
        var wt = tokens(wd.title + " " + (wd.snippet || ""));
        var hit = 0;
        kt.forEach(function (k) { if (wt.indexOf(k) >= 0) hit++; });
        if (hit > bestScore) { bestScore = hit; best = wd; }
      });
      if (best && bestScore >= Math.max(1, Math.ceil(kt.length / 3))) { r.wikiKnown = true; r.wikiTitle = best.title; }
      else r.wikiQuiet = true;
    } else r.wikiQuiet = !!(wiki);
    if (hn) {
      r.hnCount = (hn || []).length;
      if (r.hnCount >= 3) r.hnLoud = true;
      else if (r.hnCount === 0) r.hnSilent = true;
    }
    return r;
  }

  function planSteps(c, weak) {
    var steps = [
      { t: "Write the wound in the customer's words — who hurts, how much, how often. One sentence you could say out loud at a dinner table.", grave: "segway-hype" },
      { t: "Price the smallest payable version now. \u2018Free for now\u2019 is a loan against your own burn — and lenders ask questions at the worst time.", grave: "movie-pass" },
      { t: "Find 30 customers who already bleed this wound and watch them try today's workaround. Their workaround is your real competitor.", grave: "gowalla-foursquare" },
      { t: "Ship the ONE feature that removes the wound — cut everything else from v1. Roadmaps are where focus goes to die.", grave: "general-magic" },
      { t: "Get 10 of them to pay before you spend a rupee on growth. Payment is the only focus group that doesn't lie.", grave: "fyre-festival" },
      { t: "Know your second purchase before your first sale: the refill, the renewal, the upgrade. One-and-done is a campaign, not a company.", grave: "23andme-dna" }
    ];
    if (c.money === "subscription" || c.money === "commission") {
      steps.splice(5, 1, { t: "Retention beats acquisition: define month-1 and month-6 retention targets now, and the product change that moves each.", grave: "netflix-shift" });
    }
    if (c.stage === "launched" || c.stage === "growing") {
      steps.splice(2, 1, { t: "Audit one cohort end-to-end this week: acquisition cost, payback days, repeat rate. Growth hides in these three numbers.", grave: "tinyowl-food" });
    }
    if (weak.some(function (x) { return x.id === "trust-heavy" || x.id === "regulated"; })) {
      steps.splice(1, 0, { t: "Clear the permission ladder before the code: licences, registrations, data policies — with dates and a plan B for every \u2018no\u2019.", grave: "theranos-board" });
    }
    return steps.slice(0, 6);
  }

  function matchGraves(c) {
    var F = window.FAILURES || [];
    var kws = stopwords([c.text].join(" ")).slice(0, 8);
    var scored = [];
    F.forEach(function (f) {
      var hay = (f.name + " " + f.title + " " + f.story + " " + f.mistake + " " + f.lesson).toLowerCase();
      var s = 0;
      kws.forEach(function (k) { if (hay.indexOf(k) >= 0) s += 2; });
      if (f.category === c.category) s += 3;
      if (s >= 2) scored.push({ f: f, s: s });
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    return scored.slice(0, 4).map(function (x) { return x.f; });
  }

  /* ---------------- free OSINT (keyless) ---------------- */
  function wikiExists(name) {
    var url = "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
      encodeURIComponent(name) + "&srlimit=3&format=json&origin=*";
    return fetchJSON(url).then(function (j) {
      try { return (j.query.search || []).slice(0, 3).map(function (r) {
        return { title: r.title, snippet: String(r.snippet || "").replace(/<[^>]+>/g, "") };
      }); } catch (e) { return []; }
    });
  }
  function hnFailed(keywords) {
    var since = Math.floor(Date.now() / 1000) - 365 * 86400;
    var url = "https://hn.algolia.com/api/v1/search_by_date?query=" + encodeURIComponent(keywords) +
      "&tags=story&numericFilters=created_at_i>" + since + "&hitsPerPage=6";
    return fetchJSON(url).then(function (j) {
      try { return (j.hits || []).filter(function (h) { return h.title && !/ask hn|show hn|tell hn/i.test(h.title); })
        .slice(0, 4).map(function (h) {
          return { title: h.title, url: h.url || ("https://news.ycombinator.com/item?id=" + h.objectID),
            points: h.points || 0, comments: h.num_comments || 0 };
        }); } catch (e) { return []; }
    });
  }

  /* ---------------- THE LOCK ---------------- */
  var BATCH_SIZE = 500;
  function isUnlocked() {
    try { if (window.TSB_GOLD && TSB_GOLD.isGold && TSB_GOLD.isGold()) return true; } catch (e) {}
    return get("tsb_iaudit_unlock", false) === true;
  }
  function batchLeft() { return Math.max(0, BATCH_SIZE - (get("tsb_iaudit_batch", 0) || 0)); }
  function claimBatch() {
    if (batchLeft() <= 0) return false;
    set("tsb_iaudit_batch", (get("tsb_iaudit_batch", 0) || 0) + 1);
    set("tsb_iaudit_unlock", true);
    return true;
  }
  function unlockWithPurchaseFlag() { set("tsb_iaudit_unlock", true); }

  /* ---------------- the free AI read (keyless, optional, honest) ----------------
     Pollinations text API: no key, no signup, plain GET. It NEVER decides the
     score — the deterministic engine does. If it is unreachable, the section
     simply never appears. */
  function aiRead(draft, weakTitles) {
    var prompt = "You are a brutal, experienced startup auditor. Idea: " +
      String(draft.name || "").slice(0, 140) + ". Problem: " + String(draft.problem || "").slice(0, 220) +
      ". Solution: " + String(draft.solution || "").slice(0, 200) +
      ". Weak reads found: " + (weakTitles || []).slice(0, 3).join("; ") +
      ". In under 55 words, give: one sharp observation about this specific idea, then one brutal question the founder must answer. Plain text, no lists, no greetings.";
    var url = "https://text.pollinations.ai/" + encodeURIComponent(prompt);
    return fetchJSON(url, 8000).then(function (j) {
      var t = "";
      try { t = String(typeof j === "string" ? j : (j && j.text) || "").trim(); } catch (e) {}
      if (!t || t.length < 12) return null;
      return t.slice(0, 400);
    }).catch(function () { return null; });
  }

  /* ---------------- exports ---------------- */
  window.TSB_IDEAAUDIT = {
    analyze: analyze,
    wikiExists: wikiExists,
    hnFailed: hnFailed,
    aiRead: aiRead,
    isUnlocked: isUnlocked,
    batchLeft: batchLeft,
    claimBatch: claimBatch,
    unlockWithPurchaseFlag: unlockWithPurchaseFlag,
    esc: esc
  };
})();

/* ============================================================
   UI — THE IDEA AUTOPSY ROOM (inside the YOU window)
   Three quick steps → the report → free users see the meters and
   a blurred glimpse; unlocked readers see everything.
   ============================================================ */
(function () {
  "use strict";
  var A = window.TSB_IDEAAUDIT;
  if (!A) return;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return A.esc(s); }
  function hget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); if (v !== null && v !== undefined) return v; } catch (e) {} return d; }
  function hset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var CATS = [
    ["STARTUP", "🚀"], ["HEALTH", "🏥"], ["FINANCE", "💸"], ["EDUCATION", "🎓"],
    ["FOOD", "🍜"], ["TRAVEL", "✈️"], ["RETAIL", "🛍️"], ["TECH", "🤖"],
    ["MEDIA", "🎬"], ["FASHION", "👕"], ["AGRI", "🌾"], ["OTHER", "✳️"]
  ];
  var MONEYS = [["subscription", "🔁 Subscription"], ["one-time", "🛒 One-time sale"], ["commission", " Percent take"], ["ads", "📺 Ads"], ["unsure", "🤷 Not sure yet"]];
  var STAGES = [["idea", "💡 Idea"], ["building", "🔧 Building"], ["launched", "🚢 Launched"], ["growing", "📈 Growing"]];

  var step = 1, last = null, busy = false;
  var draft = { name: "", problem: "", solution: "", audience: "", category: "STARTUP", money: "", stage: "idea" };

  function valid() {
    if (step === 1) return draft.name.trim().length >= 6 && draft.problem.trim().length >= 15;
    if (step === 2) return draft.solution.trim().length >= 12;
    return !!draft.money && !!draft.stage;
  }

  function paint() {
    var body = $("iauditBody");
    if (!body) return;
    var dots = "";
    for (var i = 1; i <= 3; i++) dots += '<i class="iaudit__dot' + (i <= step ? " on" : "") + (i === step ? " now" : "") + '">' + i + "</i>";
    var labels = { 1: "THE IDEA", 2: "THE SHAPE", 3: "THE MONEY" };
    body.innerHTML =
      '<div class="iaudit__steps">' + dots + '<span class="iaudit__slbl">STEP ' + step + ' OF 3 — ' + labels[step] + "</span></div>" +
      (step === 1
        ? '<label class="iaudit__lbl">WHAT DO YOU WANT TO BUILD?</label>' +
          '<input class="iaudit__in" id="iaName" maxlength="140" autocomplete="off" placeholder="One honest line — e.g. \u201810-minute medicine delivery for tier-2 towns\u2019" value="' + esc(draft.name) + '">' +
          '<label class="iaudit__lbl">THE WOUND — who hurts, how much, how often?</label>' +
          '<span class="iaudit__tw"><textarea class="iaudit__in" id="iaProb" rows="3" maxlength="800" placeholder="e.g. tier-2 families can\u2019t get chronic medicines reliably; pharmacies stock out; refills are manual\u2026">' + esc(draft.problem) + "</textarea>" +
          '<button type="button" class="iaudit__mic" id="iaMic">\U0001F399\uFE0F SPEAK</button></span>'
        : step === 2
          ? '<label class="iaudit__lbl">YOUR SOLUTION — what you build, what\u2019s different</label>' +
            '<textarea class="iaudit__in" id="iaSol" rows="3" maxlength="800" placeholder="e.g. an app tied to partner pharmacies with 90-min runners, subscription refills, UPI\u2026">' + esc(draft.solution) + "</textarea>" +
            '<label class="iaudit__lbl">WHO IS IT FOR? <em>(optional — sharpens the audit)</em></label>' +
            '<input class="iaudit__in" id="iaAud" maxlength="120" placeholder="e.g. chronic patients\u2019 families in tier-2 Gujarat\u2026" value="' + esc(draft.audience) + '">'
          : '<label class="iaudit__lbl" style="margin-top:16px">THE CATEGORY</label>' +
            '<div class="iaudit__chips" id="iaCats">' + CATS.map(function (m) {
              return '<button type="button" class="iaudit__chip' + (draft.category === m[0] ? " on" : "") + '" data-cat="' + m[0] + '">' + m[1] + " " + m[0] + "</button>";
            }).join("") + '<button type="button" class="iaudit__chip' + (draft.catCustom ? " on" : "") + '" data-cat="CUSTOM">\u2733\uFE0F CUSTOM</button></div>' +
            '<input class="iaudit__in" id="iaCatCustom" maxlength="40" placeholder="your own category \u2014 e.g. pet tech, wedding planning\u2026" value="' + esc(draft.catCustom || "") + '"' + (draft.catCustom ? "" : " hidden") + ' style="margin-top:8px">' +
            '<label class="iaudit__lbl">HOW WILL IT EARN?</label>' +
            '<div class="iaudit__chips" id="iaMoney">' + MONEYS.map(function (m) {
              return '<button type="button" class="iaudit__chip' + (draft.money === m[0] ? " on" : "") + '" data-money="' + m[0] + '">' + m[1] + "</button>";
            }).join("") + "</div>" +
            '<label class="iaudit__lbl">WHERE ARE YOU TODAY?</label>' +
            '<div class="iaudit__chips" id="iaStage">' + STAGES.map(function (m) {
              return '<button type="button" class="iaudit__chip' + (draft.stage === m[0] ? " on" : "") + '" data-stage="' + m[0] + '">' + m[1] + "</button>";
            }).join("") + "</div>") +
      '<button class="iaudit__run" id="iaNext">' + (step === 3 ? "⛏️ RUN THE AUTOPSY" : "NEXT →") + "</button>" +
      (step > 1 ? '<button class="iaudit__back" id="iaBack">← Back</button>' : "") +
      '<div id="iaHist"></div>';
    bindDraft();
    paintHistory();
  }

  function bindDraft() {
    var n = $("iaName"), p = $("iaProb"), s = $("iaSol"), a = $("iaAud");
    if (n) n.addEventListener("input", function () { draft.name = this.value; });
    if (p) p.addEventListener("input", function () { draft.problem = this.value; });
    if (s) s.addEventListener("input", function () { draft.solution = this.value; });
    if (a) a.addEventListener("input", function () { draft.audience = this.value; });
    var body = $("iauditBody");
    body.querySelectorAll("[data-cat]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = this.getAttribute("data-cat");
        var inp = $("iaCatCustom");
        if (v === "CUSTOM") {
          draft.catCustom = draft.catCustom || "";
          draft.category = "OTHER";
          if (inp) { inp.hidden = false; inp.focus(); }
        } else {
          draft.category = v;
          if (inp) inp.hidden = true;
        }
        body.querySelectorAll("[data-cat]").forEach(function (x) { x.classList.toggle("on", x === b); });
      });
    });
    var cc = $("iaCatCustom");
    if (cc) cc.addEventListener("input", function () {
      draft.catCustom = this.value;
      if (this.value.trim().length >= 3) draft.category = this.value.trim().toUpperCase().slice(0, 24);
    });
    var micb = $("iaMic");
    if (micb) setupMic(micb, function (t) { var p = $("iaProb"); if (p) { p.value = (p.value ? p.value + " " : "") + t; p.dispatchEvent(new Event("input")); } });
    body.querySelectorAll("[data-money]").forEach(function (b) {
      b.addEventListener("click", function () {
        draft.money = this.getAttribute("data-money");
        body.querySelectorAll("[data-money]").forEach(function (x) { x.classList.toggle("on", x === b); });
      });
    });
    body.querySelectorAll("[data-stage]").forEach(function (b) {
      b.addEventListener("click", function () {
        draft.stage = this.getAttribute("data-stage");
        body.querySelectorAll("[data-stage]").forEach(function (x) { x.classList.toggle("on", x === b); });
      });
    });
    var nx = $("iaNext");
    if (nx) nx.addEventListener("click", function () {
      if (busy) return;
      if (!valid()) { shake(body); return; }
      if (step < 3) { step += 1; paint(); return; }
      run();
    });
    var bk = $("iaBack");
    if (bk) bk.addEventListener("click", function () { if (step > 1) { step -= 1; paint(); } });
    var hist = $("iaHist");
    if (hist) hist.addEventListener("click", function (e) {
      var x = e.target.closest("[data-iax]");
      if (x) {
        e.stopPropagation();
        try {
          var h = hget("tsb_iaudits", []) || [];
          h.splice(Number(x.getAttribute("data-iax")), 1);
          hset("tsb_iaudits", h);
        } catch (e2) {}
        paintHistory();
        return;
      }
      var row = e.target.closest("[data-iahis]");
      if (row) {
        try {
          var hh = hget("tsb_iaudits", []) || [];
          var saved = hh[Number(row.getAttribute("data-iahis"))];
          if (saved && saved.draft) {
            draft = Object.assign({ name: "", problem: "", solution: "", audience: "", category: "STARTUP", money: "", stage: "idea" }, saved.draft);
            step = 1;
            last = A.analyze(draft);
            report(last);
            paintHistory();
          }
        } catch (e3) {}
      }
    });
  }

  /* ---- dictation: speak the wound instead of typing it (guarded) ---- */
  function setupMic(btn, onText) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    /* no speech engine on this browser — the button never shows at all */
    if (!SR) { if (btn.parentNode) btn.parentNode.removeChild(btn); return; }
    var rec = null, on = false, retried = false;
    function say(t) { btn.textContent = t; }
    function stop() { on = false; btn.classList.remove("on"); say("\uD83C\uDFA4\uFE0F SPEAK"); }
    function begin() {
      try {
        rec = new SR();
        rec.lang = "en-IN"; rec.interimResults = false; rec.continuous = false;
        rec.onstart = function () { on = true; retried = false; btn.classList.add("on"); say("\uD83D\uDD34 LISTENING\u2026"); };
        rec.onend = stop;
        rec.onresult = function (e) {
          var t = "";
          for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
          if (t.trim()) { stop(); onText(t.trim()); }
        };
        /* first tap on many phones only wakes the engine — wake it again, once */
        rec.onerror = function (ev) {
          var why = (ev && ev.error) || "";
          stop();
          if ((why === "no-speech" || why === "aborted") && !retried) { retried = true; setTimeout(begin, 120); return; }
          if (why === "not-allowed" || why === "service-not-allowed") say("\u26D4 ALLOW MIC");
          else if (why === "network") say("\uD83D\uDD0C OFFLINE");
        };
        rec.start();
      } catch (e) { stop(); }
    }
    btn.addEventListener("click", function () { if (on) { try { rec.stop(); } catch (e) {} return; } retried = false; begin(); });
  }

  function shake(scope) {
    scope.classList.add("iaudit--shake");
    setTimeout(function () { scope.classList.remove("iaudit--shake"); }, 460);
  }

  /* ---------------- the report ---------------- */
  function meter(name, label, v, col) {
    return '<div class="iaudit__meter"><div class="iaudit__meter__top"><span>' + label + "</span><b style=\"color:" + col + '">' + v + "</b></div>" +
      '<div class="iaudit__meter__bar"><i style="width:' + v + '%;background:' + col + '"></i></div></div>';
  }
  function fixCard(w, blurred) {
    return '<div class="iaudit__fix' + (blurred ? " iaudit__fix--blur" : "") + '">' +
      "<b>" + esc(w.t) + "</b>" +
      "<p><i>WHY:</i> " + esc(w.why) + "</p>" +
      "<p><i>THE FIX:</i> " + esc(w.fix) + "</p>" +
      (blurred ? '<span class="iaudit__blurcap">🔒 UNLOCK TO READ</span>' :
        '<a class="iaudit__grave" href="graveyard.html#grave=' + esc(w.grave) + '">⚰️ ' + "MEET THE GRAVE THAT PAID FOR THIS →</a>") +
      "</div>";
  }
  function report(r) {
    var open = A.isUnlocked();
    var fixCount = r.weak.length;
    var freeCap = 2;
    var fixes = r.weak.slice(0, open ? 99 : freeCap).map(function (w) {
      return fixCard(w, !open);
    }).join("");
    if (!open && fixCount > freeCap) {
      fixes += '<div class="iaudit__fix iaudit__fix--blur"><b>+' + (fixCount - freeCap) + " more weak reads the audit found</b><p><i>WHY:</i> locked for free readers</p><p><i>THE FIX:</i> locked</p>" +
        '<span class="iaudit__blurcap">🔒 UNLOCK TO READ</span></div>';
    }
    var strengths = r.strong.length
      ? r.strong.map(function (s) { return '<div class="iaudit__str">✓ ' + esc(s) + "</div>"; }).join("")
      : '<div class="iaudit__str iaudit__str--none">No built-in strengths detected yet — that\u2019s fixable, and the plan below is where.</div>';

    var gravesSec = r.graves.length
      ? r.graves.map(function (f) {
          return '<a class="iaudit__gcard" href="graveyard.html#grave=' + esc(f.id) + '"><span class="iaudit__gcard__rip" translate="no">R.I.P.</span>' +
            "<b>" + esc(f.name) + "</b><i>" + esc(f.title) + "</i>" +
            '<span class="iaudit__gcard__loss">💸 ' + esc(f.loss) + "</span></a>";
        }).join("")
      : '<p class="iaudit__osint-line">No close corpses matched — a rare sign. The classics below still apply.</p>';

    var osintSec = '<div class="iaudit__osint" id="iaOsint"><div class="askel" style="height:14px;width:52%"></div><div class="askel"></div><div class="askel" style="width:78%"></div></div>';

    var html =
      '<div class="iaudit__report">' +
        '<div class="iaudit__score"><div class="iaudit__score__ring" style="--p:' + r.score + '"><b>' + r.score + "</b><span>idea health</span></div>" +
        '<div class="iaudit__verdict"><b style="color:' + r.verdict.color + '">' + r.verdict.label + "</b><p>" + r.verdict.line + "</p></div></div>" +
        '<div class="iaudit__meters">' +
          meter("s", "SURVIVAL", r.meters.survival, "#00c48c") +
          meter("s", "SCALABILITY", r.meters.scale, "#4d7cff") +
          meter("s", "TIMING", r.meters.timing, "#ffc800") +
          meter("s", "TRUST LOAD", 100 - r.meters.trust, "#ff90e8") +
        "</div>" +
        (r.signals && r.signals.length
          ? '<div class="iaudit__sigwrap"><span class="iaudit__sigwrap__lbl">THE PUBLIC RECORD GOT A VOTE</span>' +
            r.signals.map(function (x) {
              return '<div class="iaudit__sig"><b>' + x.ic + " " + esc(x.t) + "</b><p>" + esc(x.d) + "</p></div>";
            }).join("") + "</div>"
          : "") +
        (r.strong.length ? '<h3 class="iaudit__h">💪 WHAT\u2019S ALREADY WORKING</h3>' + strengths : "") +
        '<h3 class="iaudit__h">🔧 THE FIX — WHERE IT GOES WRONG</h3>' + fixes +
        '<div class="iaudit__lockedwrap' + (open ? "" : " iaudit__locked") + '">' +
          '<h3 class="iaudit__h">🪜 YOUR SCALE-UP STEPS — IN ORDER</h3>' +
          (open
            ? '<div class="iaudit__stepsplan">' + r.steps.map(function (s, i) {
                return '<div class="iaudit__stepn"><b>' + (i + 1) + "</b><p>" + esc(s.t) + '</p><a href="graveyard.html#grave=' + esc(s.grave) + '" class="iaudit__stepn__g">tuition paid by: ' + esc((s.grave || "").replace(/-/g, " ")) + "</a></div>";
              }).join("") + "</div>"
            : "") +
          '<h3 class="iaudit__h">⚰️ RELATED FAILURES — YOUR IDEA\u2019S FAMILY HISTORY</h3>' +
          (open ? '<div class="iaudit__ggrid">' + gravesSec + "</div>" : "") +
          '<h3 class="iaudit__h">🔍 THE PROOF — OSINT ON YOUR IDEA</h3>' +
          (open ? osintSec : "") +
          (open ? '<div class="iaudit__ai" id="iaAi"><div class="askel" style="height:12px;width:40%"></div><div class="askel"></div></div>' : "") +
          (!open ? '<div class="iaudit__lockcard">' +
            '<span class="iaudit__lockcard__eyebrow">THE FULL AUTOPSY</span>' +
            "<b>You\u2019ve seen the vitals. The treatment plan is locked.</b>" +
            "<p>All " + Math.max(fixCount, r.weak.length) + " fixes in plain words, the ordered scale-up plan, the family history of failures like yours, and live proof from the public record.</p>" +
            (A.batchLeft() > 0
              ? '<button class="iaudit__unlock" id="iaClaim">🎁 LAUNCH BATCH — FIRST ' + A.batchLeft() + " CLAIMS ARE FREE — UNLOCK NOW</button>"
              : "") +
            '<a class="iaudit__unlock iaudit__unlock--buy" href="store.html">🛍️ UNLOCK WITH A STORE PASS →</a>' +
            "<p class='iaudit__fine'>Gold members read everything, always.</p>" +
            "</div>" : "") +
        "</div>" +
        '<div class="iaudit__again"><button class="iaudit__back" id="iaAgain">⛏️ AUDIT ANOTHER IDEA</button></div>' +
      "</div>";

    var body = $("iauditBody");
    body.innerHTML = html;
    var again = $("iaAgain");
    if (again) again.addEventListener("click", function () { last = null; step = 1; paint(); });
    var claim = $("iaClaim");
    if (claim) claim.addEventListener("click", function () {
      if (A.claimBatch() && last) { last = A.analyze(draft); report(last); }
    });
    if (open) runOsint();
  }

  function runOsint() {
    var box = $("iaOsint");
    if (!box) return;
    Promise.all([
      A.wikiExists(draft.name || draft.problem),
      A.hnFailed(stopwordsLite(draft.problem + " " + draft.solution))
    ]).then(function (res) {
      if (!box.parentNode) return;
      var wiki = res[0] || [], hn = res[1] || [];
      var w = wiki.length
        ? '<b>🔍 ALREADY EXISTS?</b><div class="iaudit__wiki">' + wiki.map(function (x) {
            return '<a target="_blank" rel="noopener" href="https://en.wikipedia.org/wiki/' + encodeURIComponent(String(x.title).replace(/ /g, "_")) + '"><b>' + esc(x.title) + "</b><i>" + esc(x.snippet.slice(0, 110)) + "…</i></a>";
          }).join("") + "</div>"
        : "<b>🔍 ALREADY EXISTS?</b><p class='iaudit__osint-line'>Nothing prominent on the public record — either you\u2019re early or the wound is quieter than it looks. Both are worth knowing.</p>";
      var h = hn.length
        ? "<b>📰 FAILED-LIKE-YOURS — FIELD REPORTS (365 DAYS)</b><div class='iaudit__hns'>" + hn.map(function (x) {
            return '<a target="_blank" rel="noopener" href="' + esc(x.url) + '"><b>' + esc(x.title) + "</b><i>▲ " + x.points + " · 💬 " + x.comments + "</i></a>";
          }).join("") + "</div>"
        : "<b>📰 FAILED-LIKE-YOURS</b><p class='iaudit__osint-line'>No fresh post-mortems matched your keywords this year. Quiet field.</p>";
      box.innerHTML = w + h;
      var ai = $("iaAi");
      if (ai) {
        A.aiRead(draft, (last && last.weak || []).map(function (x) { return x.t; })).then(function (txt) {
          if (!txt) { if (ai.parentNode) ai.parentNode.removeChild(ai); return; }
          ai.innerHTML = '<span class="iaudit__ai__lbl">🤖 SECOND OPINION — A FREE AI READS IT TOO</span><p>' + esc(txt) + "</p>" +
            '<span class="iaudit__ai__fine">One machine\u2019s opinion, not gospel — the meters above come from 308 real case files.</span>';
        });
      }
    }).catch(function () {
      box.innerHTML = "<p class='iaudit__osint-line'>The public record is unreachable right now — the audit above stands on its own.</p>";
    });
  }
  function agoSafe(at) {
    var m = Math.max(1, Math.round((Date.now() - (at || 0)) / 60000));
    if (m < 60) return m + " min ago";
    var h = Math.round(m / 60);
    if (h < 24) return h + " hr ago";
    return Math.round(h / 24) + "d ago";
  }

  function stopwordsLite(s) {
    var w = String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(function (x) { return x.length > 3; });
    return w.slice(0, 6).join(" ") || "startup failed";
  }

  /* the 308 case files arrive only when the autopsy needs them —
     the login page never carries 358KB it doesn't use */
  function ensureFailures() {
    return new Promise(function (res) {
      if (window.FAILURES && window.FAILURES.length) return res();
      var sc = document.createElement("script");
      sc.src = "js/failures.js?v=267";
      sc.onload = function () { res(); };
      sc.onerror = function () { res(); };
      document.head.appendChild(sc);
    });
  }
  function run() {
    if (busy) return;
    busy = true;
    var body = $("iauditBody");
    body.innerHTML = '<div class="iaudit__working"><span class="iaudit__working__rip" translate="no">⚰️</span>' +
      "<b>The graveyard is cross-examining your idea…</b>" +
      '<p>308 case files · the public record · zero mercy</p>' +
      '<div class="iaudit__workbar"><i></i></div></div>';
    ensureFailures().then(function () {
      /* the public record gets its say BEFORE the meters are painted */
      var probe = Promise.all([
        A.wikiExists(draft.name || draft.problem || ""),
        A.hnFailed(stopwordsLite(draft.problem + " " + draft.solution))
      ]).then(function (r) { return { wiki: r[0] || [], hn: r[1] || [] }; })
        .catch(function () { return null; });
      var floor = new Promise(function (res) { setTimeout(res, 950); });
      Promise.all([probe, floor]).then(function (r) {
        busy = false;
        var probeData = r[0];
        if (probeData) { draft._wiki = probeData.wiki; draft._hn = probeData.hn; }
        try { last = A.analyze(draft); } catch (e) { body.innerHTML = "<p class='iaudit__osint-line'>Something broke in the engine — try once more.</p>"; return; }
        saveHistory(last);
        report(last);
      var rep = body.querySelector(".iaudit__report");
      if (rep) rep.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  /* ---- every audit is saved — reopen any of them below the wizard ---- */
  function saveHistory(rep) {
    try {
      var h = hget("tsb_iaudits", []) || [];
      h.unshift({
        at: Date.now(), name: draft.name, score: rep.score, label: rep.verdict.label,
        draft: { name: draft.name, problem: draft.problem, solution: draft.solution,
                 audience: draft.audience, category: draft.category, money: draft.money,
                 stage: draft.stage, catCustom: draft.catCustom || "" }
      });
      hset("tsb_iaudits", h.slice(0, 8));
    } catch (e) {}
  }
  function paintHistory() {
    var h = [];
    try { h = hget("tsb_iaudits", []) || []; } catch (e) {}
    var host = $("iaHist");
    if (!host) return;
    if (!h.length) { host.innerHTML = ""; return; }
    host.innerHTML = '<h3 class="iaudit__h">🕘 YOUR PAST AUTOPSIES — TAP TO REOPEN</h3>' +
      '<div class="iaudit__hist">' + h.map(function (x, i) {
        return '<button type="button" class="iaudit__hist__row" data-iahis="' + i + '">' +
          "<b>" + esc(String(x.name || "Untitled idea").slice(0, 44)) + "</b>" +
          "<i>scored " + x.score + " · " + esc(String(x.label || "").toLowerCase()) + " · " + agoSafe(x.at) + "</i>" +
          '<span class="iaudit__hist__x" data-iax="' + i + '" title="Forget this one">✕</span></button>';
      }).join("") + "</div>";
  }

  /* ---------------- boot ---------------- */
  function init() {
    if (!$("iauditBody")) return;
    step = 1;
    draft = { name: "", problem: "", solution: "", audience: "", category: "STARTUP", money: "", stage: "idea" };
    paint();
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest('[data-sub="subAudit"]')) setTimeout(init, 60);
  });
  window.addEventListener("tsb:iaudit-open", init);
  if ($("iauditBody") && !$("iauditBody").children.length) init();
})();
