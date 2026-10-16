/* ============================================================
   THESMALLBOOK, ✨ WANT MORE (ab-discovery.js) · v314
   The audiobook shelf grows itself. After the hand-picked shelf
   runs out, WANT MORE pulls the next books in, live, in seconds:
   the app asks Archive.org what LibriVox readers love most, skips
   everything the shelf already carries, then checks each new
   recording against its own metadata page - real chapters, real
   volunteer readers, nothing guessed - before it may join your
   shelf. Every fetch lands on your device, so what you pulled
   once stays yours, even offline. Nothing here is hosted by us;
   LibriVox volunteers read it all, in the public domain.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_ABMORE) return;

  var GOTKEY = "tsb_ab_got";      /* { key: rec } - everything WANT MORE pulled in */
  var POOLKEY = "tsb_ab_pool";    /* cached candidate list from the live search */
  var POOL_AT = "tsb_ab_pool_at";
  var GOT_CAP = 60;

  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* the verified starter pool: search-ranked LibriVox favourites,
     every id checked against the live search this build - and the
     live search refreshes it whenever the phone is online */
  var POOL = [
    ["alice_in_wonderland_librivox", "Alice's Adventures in Wonderland", "Lewis Carroll"],
    ["tom_sawyer_librivox", "The Adventures of Tom Sawyer", "Mark Twain"],
    ["adventures_holmes", "The Adventures of Sherlock Holmes", "Sir Arthur Conan Doyle"],
    ["moby_dick_librivox", "Moby Dick, or the Whale", "Herman Melville"],
    ["huck_finn_librivox", "Adventures of Huckleberry Finn", "Mark Twain"],
    ["pride_and_prejudice_librivox", "Pride and Prejudice", "Jane Austen"],
    ["dracula_librivox", "Dracula", "Bram Stoker"],
    ["count_monte_cristo_0711_librivox", "The Count of Monte Cristo", "Alexandre Dumas"],
    ["peter_pan_0707_librivox", "Peter Pan", "J. M. Barrie"],
    ["secret_garden_librivox", "The Secret Garden", "Frances Hodgson Burnett"],
    ["grimms_english_librivox", "Grimms' Fairy Tales", "Jacob and Wilhelm Grimm"],
    ["1891_collection_bt_librivox", "1891 Collection", "Various"],
    ["thumb06", "Thumbs 06", "LibriVox covermakers"],
    ["uncle_toms_cabin_librivox", "Uncle Tom's Cabin", "Harriet Beecher Stowe"],
    ["tale_two_cities_librivox", "A Tale of Two Cities", "Charles Dickens"],
    ["adventures_pinocchio_librivox", "The Adventures of Pinocchio", "C. Collodi"],
    ["treasure_island_ap_librivox", "Treasure Island", "Robert Louis Stevenson"],
    ["emma_solo_librivox", "Emma", "Jane Austen"],
    ["memoirs_holmes_0709_librivox", "The Memoirs of Sherlock Holmes", "Sir Arthur Conan Doyle"],
    ["aesop_fables_volume_one_librivox", "Aesop's Fables, Volume 1 (Fables 1-25)", "Aesop"],
    ["andersensfairy_1307_librivox", "Andersen's Fairy Tales", "Hans Christian Andersen"],
    ["jane_eyre_ver03_0809_librivox", "Jane Eyre", "Charlotte Brontë"],
    ["swiss_family_robinson_librivox", "The Swiss Family Robinson", "Johann David Wyss"],
    ["return_holmes_0708_librivox", "The Return of Sherlock Holmes", "Sir Arthur Conan Doyle"],
    ["great_expectations_mfs_0812_librivox", "Great Expectations", "Charles Dickens"],
    ["robinson_crusoe_librivox", "The Life and Strange Surprising Adventures of", "Daniel Defoe"],
    ["game_of_life_0911_librivox", "The Game of Life and How to Play It", "Florence Scovel Shinn"],
    ["bleak_house_cl_librivox", "Bleak House", "Charles Dickens"],
    ["anthem_librivox", "Anthem", "Ayn Rand"],
    ["anne_greengables_librivox", "Anne of Green Gables", "Lucy Maud Montgomery"],
    ["romeo_and_juliet_librivox", "Romeo and Juliet", "William Shakespeare"],
    ["invisible_man_librivox", "The Invisible Man", "H.G. Wells"],
    ["timemachine_sjm_librivox", "The Time Machine", "H. G. Wells"],
    ["wizard_of_oz", "The Wonderful Wizard of Oz", "L. Frank Baum"]
  ];

  function cleanTitle(t) {
    t = String(t || "").replace(/\s+/g, " ").trim();
    t = t.replace(/,?\s*by\s+[^,]*$/i, "");
    t = t.replace(/\s*\((?:unabridged|dramatic|version[^)]*)\)\s*/i, " ");
    t = t.replace(/\s+/g, " ").trim();
    return (t || "A LibriVox audiobook").slice(0, 60);
  }

  /* everything the shelf already carries, by archive id and by title,
     so WANT MORE never serves a second recording of something the
     shelf already has */
  function knownIds() {
    var out = {}, AB = window.TSB_AUDIOBOOKS || {};
    Object.keys(AB).forEach(function (k) {
      out[AB[k].id] = 1;
      out["t:" + String(AB[k].title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()] = 1;
    });
    var got = jget(GOTKEY, {});
    Object.keys(got).forEach(function (k) {
      out[got[k].id] = 1;
      out["t:" + String(got[k].title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()] = 1;
    });
    return out;
  }

  /* pulled books ride in localStorage, so they are on the shelf
     forever - inject them before any page paints */
  function boot() {
    if (!window.TSB_AUDIOBOOKS) return;
    var got = jget(GOTKEY, {});
    Object.keys(got).forEach(function (k) {
      if (!window.TSB_AUDIOBOOKS[k]) window.TSB_AUDIOBOOKS[k] = got[k];
    });
  }

  function fetchPool(cb) {
    var cached = jget(POOLKEY, null);
    if (cached && cached.length >= 6 && Date.now() - (jget(POOL_AT, 0)) < 7 * 864e5) { cb(cached); return; }
    var page = 1 + (Math.floor(Date.now() / 864e5) % 4);   /* rotates day to day */
    fetch("https://archive.org/advancedsearch.php?q=collection%3Alibrivoxaudio+AND+language%3A%28eng%29&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator&sort%5B%5D=downloads+desc&rows=100&page=" + page + "&output=json")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var docs = (((d || {}).response || {}).docs || [])
          .filter(function (x) { return x && x.identifier && x.title; })
          .map(function (x) {
            var cr = Array.isArray(x.creator) ? x.creator[0] : x.creator;
            return [x.identifier, cleanTitle(x.title), String(cr || "LibriVox Volunteers").slice(0, 30)];
          });
        if (docs.length >= 6) { jset(POOLKEY, docs); jset(POOL_AT, Date.now()); cb(docs); }
        else cb(POOL);
      })
      .catch(function () { cb(POOL); });
  }

  /* no shelf seat without a real recording: the metadata page must
     list actual mp3 chapters, or the candidate is dropped */
  function verify(id, cb) {
    fetch("https://archive.org/metadata/" + id)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var mp3 = (d.files || []).filter(function (f) { return /\.mp3$/i.test(f.name || ""); });
        if (!mp3.length) { cb(null); return; }
        var meta = d.metadata || {};
        /* v318: the book's own description travels with it - the shelf card
           reads like a friend's recommendation, never like a placeholder */
        var desc = String((Array.isArray(meta.description) ? meta.description[0] : meta.description) || "")
          .replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
        cb({
          id: id,
          title: cleanTitle(meta.title || id),
          author: String((Array.isArray(meta.creator) ? meta.creator[0] : meta.creator) || "LibriVox Volunteers").replace(/\s+/g, " ").trim().slice(0, 30),
          desc: desc.slice(0, 220)
        });
      })
      .catch(function () { cb(null); });
  }

  /* pull the next n audiobooks onto the shelf, verified one by one */
  function serve(n, done) {
    boot();
    var known = knownIds();
    fetchPool(function (pool) {
      var known = knownIds();
      var cand = pool.filter(function (p) {
        if (known[p[0]]) return false;
        if (known["t:" + String(p[1] || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()]) return false;
        return true;
      });
      var out = [], queue = cand.slice(0, n * 4), i = 0;
      (function next() {
        if (out.length >= n || i >= queue.length) { done(out); return; }
        var c = queue[i++];
        verify(c[0], function (rec) {
          if (rec) {
            var key = "got-" + String(c[0]).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
            rec.key = key;
            rec.lang = "en";
            rec.discovered = true;
            var got = jget(GOTKEY, {});
            got[key] = rec;
            /* keep the pulled shelf from growing forever */
            var ks = Object.keys(got);
            if (ks.length > GOT_CAP) ks.slice(0, ks.length - GOT_CAP).forEach(function (k) { delete got[k]; });
            jset(GOTKEY, got);
            window.TSB_AUDIOBOOKS[key] = rec;
            out.push(rec);
          }
          next();
        });
      })();
    });
  }

  function count() { return Object.keys(jget(GOTKEY, {})).length; }

  boot();
  window.TSB_ABMORE = { serve: serve, count: count, boot: boot };
})();
