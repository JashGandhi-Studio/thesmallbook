/* ============================================================
   THESMALLBOOK — STORY CLOUD ADAPTER
   Uses Supabase (if configured in js/config.js) so stories are
   visible to ALL visitors. Falls back to localStorage otherwise.
   ============================================================ */

(function () {
  const CFG = window.TSB_CONFIG || {};
  const CLOUD = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  const STORE_KEY = "tsb_stories_v1";
  const TABLE = CFG.SUPABASE_URL ? CFG.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/stories" : "";

  function headers(extra) {
    return Object.assign({
      "apikey": CFG.SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + CFG.SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    }, extra || {});
  }

  /* row <-> story mapping (supabase columns are snake_case) */
  function toRow(s) {
    return {
      id: s.id, title: s.title, author: s.author,
      book_id: s.bookId || "", cover: s.cover || "",
      pdf: s.pdf || "", text_body: s.text || "", date: s.date || ""
    };
  }
  function fromRow(r) {
    return {
      id: r.id, title: r.title, author: r.author,
      bookId: r.book_id || "", cover: r.cover || "",
      pdf: r.pdf || "", text: r.text_body || "", date: r.date || ""
    };
  }

  function localLoad() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch { return []; }
  }
  function localSave(list) {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  }

  /* ---------- public API (async) ---------- */
  window.TSB_STORE = {
    isCloud: CLOUD,

    // returns array of stories (user/cloud only; seeds merged by caller)
    async load() {
      if (!CLOUD) return localLoad();
      try {
        const res = await fetch(TABLE + "?select=*&order=date.desc", { headers: headers() });
        if (!res.ok) throw new Error("supabase " + res.status);
        const rows = await res.json();
        return rows.map(fromRow);
      } catch (e) {
        console.warn("Cloud load failed, using local:", e);
        return localLoad();
      }
    },

    // saves one story; returns {ok, cloud, error}
    async save(story) {
      if (CLOUD) {
        try {
          const res = await fetch(TABLE, {
            method: "POST",
            headers: headers({ "Prefer": "return=minimal" }),
            body: JSON.stringify(toRow(story))
          });
          if (!res.ok) throw new Error("supabase " + res.status);
          return { ok: true, cloud: true };
        } catch (e) {
          console.warn("Cloud save failed, falling back to local:", e);
        }
      }
      // local fallback
      try {
        const list = localLoad();
        list.unshift(story);
        localSave(list);
        return { ok: true, cloud: false };
      } catch {
        // storage full — retry without pdf
        try {
          const list = localLoad();
          story = Object.assign({}, story, { pdf: "" });
          list.unshift(story);
          localSave(list);
          return { ok: true, cloud: false, error: "pdf-dropped" };
        } catch {
          return { ok: false, cloud: false, error: "storage-full" };
        }
      }
    },

    // find one story by id (cloud first, then local)
    async find(id) {
      if (CLOUD) {
        try {
          const res = await fetch(TABLE + "?id=eq." + encodeURIComponent(id) + "&select=*", { headers: headers() });
          if (res.ok) {
            const rows = await res.json();
            if (rows.length) return fromRow(rows[0]);
          }
        } catch (e) { console.warn("Cloud find failed:", e); }
      }
      return localLoad().find((s) => s.id === id) || null;
    }
  };
})();
