/* ============================================================
   THESMALLBOOK — SUPPORT WIDGET v2 (PREMIUM)
   ⭐ GitHub star button + 🍕 Fuel-the-Library donate modal
   - Pulsing gradient button (attention-grabbing)
   - ₹ amount presets with UPI deep-link amount pre-fill
   - Premium pitch + perks + claim-by-email flow
   ============================================================ */

(function () {
  const GITHUB_URL = "https://github.com/JashGandhi-Studio/thesmallbook";
  const UPI_ID = "9702510680@fam";
  const CONTACT = (window.TSB_CONFIG && TSB_CONFIG.SUBMIT_EMAIL) || "jashgandhicreator07@gmail.com";

  function upiLink(amount) {
    let l = "upi://pay?pa=" + encodeURIComponent(UPI_ID) + "&pn=" + encodeURIComponent("TheSmallBook") + "&cu=INR";
    if (amount && amount > 0) l += "&am=" + parseInt(amount, 10);
    return l;
  }

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

  function injectStyles() {
    if (document.getElementById("fuel-style")) return;
    const st = document.createElement("style");
    st.id = "fuel-style";
    st.textContent = `
      /* 🍕 premium pulsing fuel button */
      .btn--support {
        background: linear-gradient(135deg, #ffc800 0%, #ff8a3d 60%, #ff5252 100%);
        color: #111 !important;
        border: 3px solid var(--ink, #111) !important;
        box-shadow: 4px 4px 0 var(--ink, #111) !important;
        font-weight: 800;
        animation: fuelPulse 2.2s ease-in-out infinite;
      }
      .btn--support:hover {
        transform: translate(-2px,-2px) !important;
        box-shadow: 6px 6px 0 var(--ink, #111) !important;
      }
      @keyframes fuelPulse {
        0%,100% { box-shadow: 4px 4px 0 var(--ink, #111), 0 0 0 0 rgba(255,200,0,.5); }
        50% { box-shadow: 4px 4px 0 var(--ink, #111), 0 0 0 10px rgba(255,200,0,0); }
      }

      /* modal premium styles */
      .fuel-hero {
        background: linear-gradient(135deg, #ffc800, #ff8a3d);
        border: 3px solid var(--ink, #111);
        box-shadow: 4px 4px 0 var(--ink, #111);
        padding: 16px 18px;
        margin-bottom: 14px;
        text-align: center;
      }
      .fuel-hero .pizza { font-size: 34px; }
      .fuel-hero h3 { font-family: "Archivo Black", sans-serif; font-size: 20px; color: #111; margin: 4px 0 2px; letter-spacing: .5px; }
      .fuel-hero p { font-size: 12px; color: #333; font-weight: 600; margin: 0; }
      .fuel-amounts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
      .fuel-amt {
        border: 3px solid var(--ink, #111); background: #fff;
        font-family: "Archivo Black", sans-serif; font-size: 15px;
        padding: 12px 4px; cursor: pointer; box-shadow: 3px 3px 0 var(--ink, #111);
        transition: transform .1s, box-shadow .1s, background .1s; color: #111;
      }
      .fuel-amt:hover { transform: translate(-1px,-1px); box-shadow: 5px 5px 0 var(--ink, #111); }
      .fuel-amt.sel { background: #ffc800; transform: translate(-1px,-1px); box-shadow: 5px 5px 0 var(--ink, #111); }
      .fuel-amt--custom { font-size: 12px; }
      .fuel-customrow { display: flex; gap: 8px; margin: 10px 0; }
      .fuel-customrow input {
        flex: 1; border: 3px solid var(--ink, #111); padding: 10px 12px;
        font-family: inherit; font-size: 15px; font-weight: 700; box-shadow: 3px 3px 0 var(--ink, #111);
        background: #fff; color: #111; min-width: 0;
      }
      .fuel-pay {
        display: block; width: 100%; text-align: center;
        background: linear-gradient(135deg, #00c48c, #00996d);
        color: #111; border: 3px solid var(--ink, #111); box-shadow: 4px 4px 0 var(--ink, #111);
        font-family: "Archivo Black", sans-serif; font-size: 15px; letter-spacing: 1px;
        padding: 15px 10px; text-decoration: none; margin: 6px 0 10px; box-sizing: border-box;
      }
      .fuel-pay:hover { transform: translate(-1px,-1px); box-shadow: 6px 6px 0 var(--ink, #111); }
      .fuel-pay small { display: block; font-family: "Space Grotesk", sans-serif; font-size: 10.5px; letter-spacing: 0; font-weight: 600; margin-top: 3px; }
      @media (max-width: 420px) {
        .fuel-amounts { grid-template-columns: repeat(2, 1fr); }
      }
    `;
    document.head.appendChild(st);
  }

  function openSupportModal() {
    injectStyles();
    let modal = document.getElementById("supportModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "supportModal";
      modal.className = "modal";
      document.body.appendChild(modal);
    }
    let amt = 50;
    modal.innerHTML = `
      <div class="modal__box">
        <button class="modal__close">✕</button>
        <div class="fuel-hero">
          <div class="pizza">🍕</div>
          <h3>FUEL THE LIBRARY</h3>
          <p>₹0 forever — no ads, no paywall. Toss a coin to your summarizer 💛</p>
        </div>
        <p style="font-weight:600; margin-bottom:6px; font-size:13px;">
          Reading 320 books so you don't have to burns a <em>lot</em> of chai. ☕
          If TheSmallBook saved you from a 300-page grind, pick an amount:
        </p>
        <div class="fuel-amounts">
          <button class="fuel-amt" data-amt="10">₹10</button>
          <button class="fuel-amt sel" data-amt="50">₹50</button>
          <button class="fuel-amt" data-amt="100">₹100</button>
          <button class="fuel-amt" data-amt="500">₹500</button>
        </div>
        <div class="fuel-customrow" style="display:none">
          <input id="fuelCustom" type="number" min="1" max="100000" placeholder="Enter amount ₹" inputmode="numeric">
          <button class="minibtn" id="fuelCustomGo">GO</button>
        </div>
        <a class="fuel-pay" id="fuelPay" href="${upiLink(amt)}">
          📲 PAY ₹${amt} VIA UPI
          <small>UPI ID: ${UPI_ID} · opens your UPI app</small>
        </a>
        <div class="support__perks">
          <div class="perk"><span class="i">📬</span><div><b>Supporter Updates</b>Early access to new books & features before anyone else</div></div>
          <div class="perk"><span class="i">🗳️</span><div><b>Priority Requests</b>Your book requests jump to the front of the queue</div></div>
          <div class="perk"><span class="i">🎁</span><div><b>Supporter Pack</b>Exclusive cheat-sheet PDFs of action plans</div></div>
          <div class="perk"><span class="i">🚀</span><div><b>Founding Supporter</b>Early access to every future TheSmallBook project</div></div>
        </div>
        <div class="upibox">
          <span>📲 UPI:</span>
          <code id="upiId">${UPI_ID}</code>
          <button class="minibtn" id="copyUpi">COPY</button>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <a class="btn btn--blue" href="mailto:${CONTACT}?subject=${encodeURIComponent("[Supporter] I fueled the library! 🍕")}&body=${encodeURIComponent("Hi Jash!\n\nI just sent some fuel via UPI. Here's my payment reference/screenshot info:\n\n\nPlease add me to the supporter list for early access & the supporter pack!\n\nMy email: ")}">📧 CLAIM YOUR PERKS</a>
        </div>
        <p class="support__note">
          Pay → email us your reference → get your perks. Even ₹10 keeps the squeegee moving. 🪟
        </p>
      </div>`;
    modal.classList.add("open");
    const close = () => modal.classList.remove("open");
    modal.querySelector(".modal__close").addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

    const payBtn = modal.querySelector("#fuelPay");
    const amtBtns = modal.querySelectorAll(".fuel-amt");
    const customRow = modal.querySelector(".fuel-customrow");
    const customInp = modal.querySelector("#fuelCustom");

    function setAmount(v, sel) {
      amt = v;
      payBtn.href = upiLink(amt);
      payBtn.innerHTML = `📲 PAY ₹${amt} VIA UPI<small>UPI ID: ${UPI_ID} · opens your UPI app</small>`;
      amtBtns.forEach(b => b.classList.toggle("sel", b.dataset.amt == v));
      customRow.style.display = "none";
    }
    amtBtns.forEach(b => b.addEventListener("click", () => setAmount(parseInt(b.dataset.amt, 10), b)));
    modal.querySelector(".fuel-amt--custom")?.addEventListener("click", () => {
      amtBtns.forEach(b => b.classList.remove("sel"));
      customRow.style.display = "flex";
      customInp.focus();
    });
    modal.querySelector("#fuelCustomGo").addEventListener("click", () => {
      const v = parseInt(customInp.value, 10);
      if (v && v > 0) setAmount(v);
      else toast("Enter a valid amount 🙏");
    });
    customInp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); modal.querySelector("#fuelCustomGo").click(); }
    });

    modal.querySelector("#copyUpi").addEventListener("click", () => {
      const doneMsg = () => toast("📋 UPI ID copied — thank you, legend!");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(UPI_ID).then(doneMsg).catch(doneMsg);
      } else doneMsg();
    });
    // 💸 universal UPI engine — native link + fallback sheet on desktop
    payBtn.addEventListener("click", (e) => {
      if (window.TSB_UPI) {
        e.preventDefault();
        window.TSB_UPI.pay(amt, "Fuel the library — thank you!");
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

  window.TSB_SUPPORT = { open: openSupportModal };
})();
