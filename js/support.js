/* ============================================================
   THESMALLBOOK — SUPPORT WIDGET
   ⭐ GitHub star button + 🍕 Fuel-the-Library donate modal
   (UPI-linked, with supporter perks). Include on every page.
   ============================================================ */

(function () {
  const GITHUB_URL = "https://github.com/JashGandhi-Studio/thesmallbook";
  const UPI_ID = "9702510680@fam";
  const UPI_LINK = "upi://pay?pa=" + encodeURIComponent(UPI_ID) + "&pn=" + encodeURIComponent("TheSmallBook") + "&cu=INR";
  const CONTACT = (window.TSB_CONFIG && TSB_CONFIG.SUBMIT_EMAIL) || "jashgandhicreator07@gmail.com";

  function toast(msg) {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast"; t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
  }

  function openSupportModal() {
    let modal = document.getElementById("supportModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "supportModal";
      modal.className = "modal";
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="modal__box">
        <button class="modal__close">✕</button>
        <div class="modal__title">🍕 Fuel the Library</div>
        <p style="font-weight:600; margin-bottom:6px;">
          Reading 80 books so you don't have to burns a <em>lot</em> of chai. ☕
          If TheSmallBook saved you from a 300-page grind, toss a coin to your summarizer!
        </p>
        <div class="support__perks">
          <div class="perk"><span class="i">📬</span><div><b>Supporter Updates</b>Early access to new books & features before anyone else sees them</div></div>
          <div class="perk"><span class="i">🗳️</span><div><b>Priority Requests</b>Your book requests jump to the front of the weekly update queue</div></div>
          <div class="perk"><span class="i">🎁</span><div><b>Supporter Pack</b>Exclusive cheat-sheet PDFs of your favorite books' action plans</div></div>
          <div class="perk"><span class="i">🚀</span><div><b>Founding Supporter</b>Early access to every future TheSmallBook project — you'll be first in</div></div>
        </div>
        <div class="upibox">
          <span>📲 UPI:</span>
          <code id="upiId">${UPI_ID}</code>
          <button class="minibtn" id="copyUpi">COPY</button>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <a class="btn btn--support" id="upiPayBtn" href="${UPI_LINK}">📲 PAY VIA UPI APP</a>
          <a class="btn btn--blue" href="mailto:${CONTACT}?subject=${encodeURIComponent("[Supporter] I fueled the library! 🍕")}&body=${encodeURIComponent("Hi Jash!\n\nI just sent some fuel via UPI. Here's my payment reference/screenshot info:\n\n\nPlease add me to the supporter list for early access & the supporter pack!\n\nMy email: ")}">📧 CLAIM YOUR PERKS</a>
        </div>
        <p class="support__note">
          How it works: pay any amount via UPI → email us your payment reference → get your perks.
          Any amount counts. Even ₹10 keeps the squeegee moving. 🪟
        </p>
      </div>`;
    modal.classList.add("open");
    modal.querySelector(".modal__close").addEventListener("click", () => modal.classList.remove("open"));
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); });
    modal.querySelector("#copyUpi").addEventListener("click", () => {
      const doneMsg = () => toast("📋 UPI ID copied — thank you, legend!");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(UPI_ID).then(doneMsg).catch(doneMsg);
      } else doneMsg();
    });
    // desktop fallback: upi:// links only work on phones
    modal.querySelector("#upiPayBtn").addEventListener("click", (e) => {
      const isMobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
      if (!isMobile) {
        e.preventDefault();
        toast("📲 UPI links open on phones — copy the ID instead!");
      }
    });
  }

  /* inject the support bar wherever a mount point exists */
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-supportbar]").forEach((mount) => {
      mount.innerHTML = `
        <a class="btn btn--star" href="${GITHUB_URL}" target="_blank" rel="noopener">⭐ STAR THIS REPO</a>
        <button class="btn btn--support" data-support-open>🍕 FUEL THE LIBRARY</button>`;
    });
    document.querySelectorAll("[data-support-open]").forEach((b) =>
      b.addEventListener("click", openSupportModal));
  });

  window.openSupportModal = openSupportModal;
})();
