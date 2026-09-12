/* ============================================================
   THESMALLBOOK — 🛍️ STORE DATA (store-data.js) · v225
   Curated, LEGAL, official brand programs only: free trials,
   student plans, new-user offers, official deal hubs +
   Hidden Hubs (telecom + bank offer walls you already pay for).
   No scraped / grey referral codes — those die in days and
   embarrass the store. Rules: docs/STORE-OPS.md.

   Every offer:  logo  = assets/logos/<file> (real brand mark,
                          shipped locally — no third-party calls)
                 bg    = tile background behind the logo
                 worth = what the reader actually saves (₹ figure
                          we could verify in Sep 2026)
                 top   = true → shows in the "Editor's picks" rail
   Affiliate: if window.TSB_AFFILIATE maps an id → tracked url
              (EarnKaro / Cuelinks / Amazon Associates), store.js
              uses it automatically. Otherwise the clean official
              url is used. No code changes needed to switch.
   `verified` = month the whole shelf was last hand-checked.
   ============================================================ */
(function () {
  "use strict";
  var V = "Verified Sep 2026";
  window.TSB_STORE_DATA = {
    verified: V,
    offers: [

      /* ───────────── 📚 BOOKS & AUDIO ───────────── */
      { id: "kindle-unlimited", brand: "Kindle Unlimited", cat: "books", logo: "amazon.svg", bg: "#ffffff",
        tag: "FREE TRIAL", value: "30 DAYS FREE", worth: "Worth ₹169", top: true,
        title: "Kindle Unlimited — 30 days of unlimited ebooks, free",
        desc: "Millions of ebooks, magazines and select audiobooks on any phone — no Kindle device needed. Read 10 at a time, no due dates. Perfect companion to your TheSmallBook streak.",
        code: null, url: "https://www.amazon.in/kindle-dbs/hz/subscribe/ku",
        steps: ["Open the Kindle Unlimited page and sign in with your Amazon account.", "Tap “Start your 30-day free trial” (shown only if you’re eligible).", "Read on the free Kindle app. Cancel from Manage Membership before day 30 to pay nothing."],
        tnc: ["New KU members (or 13+ months since your last KU subscription).", "Auto-renews at ₹169/month after the trial unless cancelled.", "Run by Amazon India — eligibility decided at sign-up."] },

      { id: "audible", brand: "Audible", cat: "books", logo: "audible.svg", bg: "#ffffff",
        tag: "FREE TRIAL", value: "30 DAYS + 1 BOOK", worth: "Worth ₹199+", top: true,
        title: "Audible — 30 days free + 1 audiobook credit that’s yours to keep",
        desc: "Human-narrated audiobooks on your commute. The credit buys any title — even a ₹1,000 one — and you keep it forever, even if you cancel. Prime members currently get 2 credits.",
        code: null, url: "https://www.audible.in",
        steps: ["Open audible.in and sign in with your Amazon account.", "Tap “Start your 30-day free trial”.", "Spend your credit on any audiobook — it stays in your library for life.", "Cancel anytime before day 30 to avoid the ₹199/month charge."],
        tnc: ["New Audible members only; one trial per Amazon account.", "₹199/month after the trial unless cancelled.", "Prime 2-credit bonus is a limited-time Audible promotion — check the page.", "Run by Audible (Amazon)."] },

      { id: "storytel", brand: "Storytel", cat: "books", logo: "storytel.png", bg: "#ffffff",
        tag: "FREE TRIAL", value: "14 DAYS FREE", worth: "Worth ₹149–299",
        title: "Storytel — 14-day free trial, audiobooks + ebooks in 10+ Indian languages",
        desc: "Unlimited audiobooks and ebooks with a big Hindi, Marathi, Tamil and Bengali catalogue — the best pick if you read beyond English.",
        code: null, url: "https://www.storytel.com/in",
        steps: ["Open Storytel India and tap “Try free”.", "Sign up and pick a plan (Select or Unlimited) — the trial applies to the recurring plan.", "Cancel inside 14 days to pay nothing."],
        tnc: ["New subscribers only; trial length can vary by campaign (3–14 days).", "Converts to ₹149/month (Select) or ₹299/month (Unlimited) unless cancelled.", "Run by Storytel."] },

      { id: "amazon-books", brand: "Amazon Books", cat: "books", logo: "amazon.svg", bg: "#ffffff",
        tag: "DEALS HUB", value: "UP TO 60% OFF", worth: "Rotating deals",
        title: "Amazon Books — bestsellers & paperbacks, official deals store",
        desc: "Amazon’s own books storefront: daily deals, box sets, and Kindle editions often under ₹99. Bookmark it — the deal badge is the discount, no code needed.",
        code: null, url: "https://www.amazon.in/books-used-books-textbooks/b?node=976389031",
        steps: ["Open the Amazon Books store.", "Use the “Deals” and “Bestsellers” tabs — the badge price is the offer.", "Add to cart; any bank offer shows at checkout."],
        tnc: ["Prices set by Amazon and sellers; change without notice.", "Delivery and returns follow the seller’s policy.", "Run by Amazon India."] },

      { id: "flipkart-books", brand: "Flipkart Books", cat: "books", logo: "flipkart.png", bg: "#ffffff",
        tag: "DEALS HUB", value: "UP TO 50% OFF", worth: "Rotating deals",
        title: "Flipkart Books — the standing books sale hub",
        desc: "Exam prep, fiction and box sets at real markdowns, plus SuperCoins on every order. Great for physical copies of books you loved here.",
        code: null, url: "https://www.flipkart.com/books-store",
        steps: ["Open the Flipkart Books hub.", "Sort by discount — the listed price already includes it.", "Bank/UPI offers apply automatically at payment when eligible."],
        tnc: ["Discounts and stock set by Flipkart and its sellers.", "Bank offers per Flipkart’s current terms.", "Run by Flipkart."] },

      /* ───────────── 🎧 MUSIC & VIDEO ───────────── */
      { id: "youtube-premium", brand: "YouTube Premium", cat: "fun", logo: "youtube.png", bg: "#ffffff",
        tag: "FREE TRIAL", value: "1 MONTH FREE", worth: "Worth ₹149", top: true,
        title: "YouTube Premium — 1 month free, then students pay ₹89",
        desc: "No ads, background play, downloads and YouTube Music included. Students get the ₹89/month plan after the trial — it’s the cheapest legal Premium in India.",
        code: null, url: "https://www.youtube.com/premium",
        steps: ["Open youtube.com/premium signed into your Google account.", "Tap “Try it free” (or “Student” for the ₹89 plan).", "Students verify once via SheerID with a college email or ID.", "Cancel before the trial ends to pay nothing."],
        tnc: ["Trial for accounts that never had Premium/Music Premium before.", "₹149/month (individual) or ₹89/month (verified student, up to 4 years) after the trial.", "Run by Google."] },

      { id: "spotify-student", brand: "Spotify", cat: "fun", logo: "spotify.svg", bg: "#000000",
        tag: "STUDENT", value: "50% OFF · ₹59/MO", worth: "Saves ₹720/yr", top: true,
        title: "Spotify Premium Student — ₹59 a month instead of ₹119",
        desc: "Every Premium feature at half price for verified college students. Ad-free reading-sprint playlists for less than a chai a week.",
        code: null, url: "https://www.spotify.com/in-en/student/",
        steps: ["Open Spotify’s student page and log in.", "Verify with SheerID using your college email or ID card.", "Discount applies instantly; re-verify once a year."],
        tnc: ["Enrolled students at accredited colleges, 18+; max 4 years.", "Standard Premium price applies if verification lapses.", "Run by Spotify."] },

      { id: "apple-music", brand: "Apple Music", cat: "fun", logo: "apple.svg", bg: "#ffffff",
        tag: "FREE TRIAL", value: "1 MONTH FREE", worth: "Worth ₹139",
        title: "Apple Music — first month free, students ₹69 after",
        desc: "100 million songs, lossless and Spatial Audio, works on Android too. New subscribers get a free month; verified students then pay ₹69/month.",
        code: null, url: "https://www.apple.com/in/apple-music/",
        steps: ["Open apple.com/in/apple-music and tap “Try it free”.", "Sign in with your Apple ID (Android users: install the Apple Music app).", "Students: pick the Student plan and verify via UNiDAYS.", "Cancel anytime in Subscriptions before renewal."],
        tnc: ["New subscribers only; ₹139/month after the trial unless cancelled.", "Student price ₹69/month with valid verification.", "Run by Apple."] },

      /* ───────────── 🧠 LEARNING & TOOLS ───────────── */
      { id: "github-student", brand: "GitHub Education", cat: "learning", logo: "github.png", bg: "#ffffff",
        tag: "STUDENT", value: "100+ TOOLS FREE", worth: "Worth ₹1,50,000+", top: true,
        title: "GitHub Student Developer Pack — Copilot, JetBrains, cloud credits, domains",
        desc: "The single most valuable student perk on the internet: GitHub Copilot free, all JetBrains IDEs, $200 DigitalOcean credit, free .me domain, Canva Pro and 100+ more. For any enrolled student, any degree.",
        code: null, url: "https://education.github.com/pack",
        steps: ["Create a free GitHub account (13+).", "Open education.github.com/pack → “Sign up for Student Developer Pack”.", "Verify with your college email or a photo of your student ID / bonafide letter.", "Approval usually lands within 48 hours; unlock each partner from the Education portal."],
        tnc: ["Currently enrolled students at degree/diploma-granting schools.", "Partner offers have their own durations (e.g. 1 year, renewable while enrolled).", "Run by GitHub (Microsoft)."] },

      { id: "notion-students", brand: "Notion", cat: "learning", logo: "notion.svg", bg: "#ffffff",
        tag: "STUDENT", value: "PLUS PLAN FREE", worth: "Worth ₹800/mo",
        title: "Notion Education Plus — the paid plan free for college students",
        desc: "Unlimited blocks, unlimited file uploads, 30-day page history, 100 guests. Write your novel drafts, reading notes and syllabus in one place.",
        code: null, url: "https://www.notion.com/product/notion-for-education",
        steps: ["Sign up (or switch your account email) using your college email address.", "On desktop/web: Settings → Upgrade plan → “Get free Education plan”.", "If your college is recognised, Plus activates instantly."],
        tnc: ["Requires an institution email from a WHED-listed college; personal Gmail won’t work.", "One-member workspace; K-12 students not eligible.", "Run by Notion."] },

      { id: "canva-education", brand: "Canva", cat: "learning", logo: "canva.png", bg: "#ffffff",
        tag: "FREE", value: "PRO FEATURES FREE", worth: "Worth ₹500/mo",
        title: "Canva for Education — Pro features free for teachers & their students",
        desc: "Background remover, Brand Kit, 100 GB storage and premium templates at ₹0 for verified K-12 teachers and the students they invite. College students: get Canva Pro via the GitHub pack above.",
        code: null, url: "https://www.canva.com/education/",
        steps: ["Teachers: open canva.com/education and tap “Get verified”.", "Upload proof of teaching status (school ID / employment letter).", "Once approved, create a class and invite students — they get it free too."],
        tnc: ["Eligible K-12 educators and their students; college students should use the GitHub Student Pack route.", "Verification decided by Canva.", "Run by Canva."] },

      { id: "coursera-audit", brand: "Coursera", cat: "learning", logo: "coursera.png", bg: "#ffffff",
        tag: "FREE", value: "AUDIT ANY COURSE", worth: "Worth ₹3,000+",
        title: "Coursera — audit university courses free (videos + readings)",
        desc: "Stanford, Yale, IIT and Google courses: watch every lecture and read every module at ₹0. You only pay if you want graded work and the certificate.",
        code: null, url: "https://www.coursera.org",
        steps: ["Pick a course and tap “Enroll for free”.", "In the popup choose the small “Audit the course” link.", "Learn free; upgrade only if you later want the certificate."],
        tnc: ["Audit excludes graded assignments and certificates.", "Not every Specialization course offers audit — most standalone courses do.", "Run by Coursera."] },

      { id: "udemy-free", brand: "Udemy", cat: "learning", logo: "udemy.svg", bg: "#ffffff",
        tag: "FREE", value: "10,000+ FREE COURSES", worth: "₹0 forever",
        title: "Udemy — the official free-courses catalogue",
        desc: "Thousands of genuinely free courses (coding, writing, design, finance) filterable in one click. No trial, no card — just enrol.",
        code: null, url: "https://www.udemy.com/courses/free/",
        steps: ["Open udemy.com/courses/free.", "Filter by topic and rating (4.5+ is the sweet spot).", "Enrol — it stays in your library forever."],
        tnc: ["Free courses exclude certificates and Q&A; paid ones go on sale for ₹399–₹499 almost every week.", "Run by Udemy."] },

      /* ───────────── 🍜 FOOD & GROCERY ───────────── */
      { id: "swiggy-one", brand: "Swiggy One", cat: "food", logo: "swiggy.png", bg: "#fc8019",
        tag: "MEMBERSHIP", value: "FROM ₹99 / 3 MO", worth: "Saves ₹25–45 per order",
        title: "Swiggy One Lite — free deliveries & up to 30% extra off, from ₹99",
        desc: "10 free food deliveries + 10 free Instamart deliveries + extra discounts at 20,000+ restaurants. Swiggy also pushes targeted trial offers (₹39–₹149) to individual accounts — check yours.",
        code: null, url: "https://www.swiggy.com",
        steps: ["Open the Swiggy app (membership lives in-app, not on the website) → tap your profile → Swiggy One.", "Your account shows its current price — Lite from ₹99 / 3 months; targeted trials from ₹39 show up here too.", "Tap Join — free deliveries apply on your very next order."],
        tnc: ["Prices are personalised by Swiggy; trial availability varies by city and account.", "Auto-renews unless turned off in the app.", "Run by Swiggy."] },

      { id: "blinkit-new", brand: "Blinkit", cat: "food", logo: "blinkit.png", bg: "#ffffff",
        tag: "NEW USER", value: "FIRST-ORDER DEAL", worth: "Auto-applied",
        title: "Blinkit — new-user welcome discount + first-order free delivery",
        desc: "Groceries in 10 minutes. Fresh accounts get Blinkit’s welcome discount at checkout automatically — no code to hunt for.",
        code: null, url: "https://blinkit.com",
        steps: ["Install Blinkit and sign up with a number that’s never used it.", "Add items — the welcome offer appears on the checkout page by itself.", "If nothing shows, your number already has an account (offer is new-user only)."],
        tnc: ["New users only; amount varies by city and cart value.", "Run by Blinkit (Eternal / Zomato group)."] },

      { id: "zepto-new", brand: "Zepto", cat: "food", logo: "zepto.png", bg: "#ffffff",
        tag: "NEW USER", value: "UP TO ₹200 OFF", worth: "25% on first order",
        title: "Zepto — 25% off (up to ₹200) + free delivery on your first order",
        desc: "Zepto’s standing welcome offer for new accounts: it applies at checkout on order #1. Watch the app’s Offers tab for the current amount.",
        code: null, url: "https://www.zeptonow.com",
        steps: ["Install Zepto and create a new account.", "Open Offers → the welcome coupon is pre-listed; tap Apply at checkout.", "Order — discount plus free delivery reflect on the bill."],
        tnc: ["New users only; amount and minimum cart set by Zepto’s current campaign.", "Run by Zepto."] },

      { id: "bigbasket-new", brand: "bigbasket", cat: "food", logo: "bigbasket.svg", bg: "#ffffff",
        tag: "NEW USER", value: "FIRST-ORDER OFFER", worth: "Shown in app",
        title: "bigbasket — first-order discount for new users",
        desc: "Tata’s grocery app: the new-user offer sits in the Offers tab and applies on your first checkout. Solid for the monthly big shop.",
        code: null, url: "https://www.bigbasket.com",
        steps: ["Create a new bigbasket account.", "Open “Offers” for the current first-order coupon.", "Apply at checkout — the discount reflects on the bill."],
        tnc: ["New users only; amounts change with bigbasket’s campaigns.", "Run by bigbasket (Tata group)."] },

      /* ───────────── 🛒 SHOPPING & MONEY ───────────── */
      { id: "cred", brand: "CRED", cat: "shopping", logo: "cred.svg", bg: "#ffffff",
        tag: "REWARDS", value: "COINS ON EVERY BILL", worth: "Member-only deals",
        title: "CRED — pay credit-card bills, earn coins, unlock member deals",
        desc: "Every bill paid through CRED earns coins you redeem for vouchers and drops in the CRED Store. Also flags hidden charges on your statement.",
        code: null, url: "https://cred.club",
        steps: ["Join CRED (needs a credit card and a credit score CRED accepts).", "Add your card and pay a bill.", "Redeem coins in CRED Store for vouchers and partner deals."],
        tnc: ["Membership criteria set by CRED.", "Coins and rewards follow CRED’s own policy.", "Run by CRED."] },

      { id: "flipkart-supercoins", brand: "Flipkart SuperCoins", cat: "shopping", logo: "flipkart.png", bg: "#ffffff",
        tag: "REWARDS", value: "COINS → VOUCHERS", worth: "Up to 4% back",
        title: "Flipkart SuperCoins — earn on every order, redeem for partner vouchers",
        desc: "Coins on each purchase convert into vouchers from brands inside the SuperCoin zone — including Flipkart Plus benefits once you cross the threshold.",
        code: null, url: "https://www.flipkart.com/plus",
        steps: ["Open the SuperCoin zone in the Flipkart app.", "Check your balance and the voucher wall.", "Redeem — the voucher code is shown by Flipkart on the spot."],
        tnc: ["Earning and redemption rules per Flipkart’s SuperCoins policy.", "Run by Flipkart."] },

      /* ───────────── ✈️ TRAVEL & GOING OUT ───────────── */
      { id: "bookmyshow-offers", brand: "BookMyShow", cat: "travel", logo: "bookmyshow.svg", bg: "#ffffff",
        tag: "DEALS HUB", value: "CARD & UPI OFFERS", worth: "₹75–₹500 off",
        title: "BookMyShow — the official offers wall (cards, UPI, buy-1-get-1)",
        desc: "Every live movie, concert and play offer in one place — bank BOGOs, UPI cashbacks, student deals. Pick your card, apply at payment.",
        code: null, url: "https://in.bookmyshow.com/explore/offers",
        steps: ["Open BookMyShow → Offers.", "Filter by your bank/UPI app.", "Apply the listed offer on the payment page — the code (if any) is printed right there."],
        tnc: ["Each offer has its own bank/limit/T&C shown on the BookMyShow page.", "Run by BookMyShow."] },

      { id: "redbus-offers", brand: "redBus", cat: "travel", logo: "redbus.png", bg: "#ffffff",
        tag: "DEALS HUB", value: "FIRST-BOOKING OFFERS", worth: "Up to ₹300 off",
        title: "redBus — official offers page incl. first-booking discounts",
        desc: "Bus tickets home for the holidays: redBus keeps first-booking and bank offers on one official page, updated weekly.",
        code: null, url: "https://www.redbus.in/offers",
        steps: ["Open redbus.in/offers (also under Offers in the app).", "Pick an offer that matches your route/bank.", "The code shown on the offer applies at checkout."],
        tnc: ["Codes, caps and expiry set by redBus per offer.", "Run by redBus (MakeMyTrip group)."] },

      { id: "makemytrip-deals", brand: "MakeMyTrip", cat: "travel", logo: "makemytrip.png", bg: "#ffffff",
        tag: "DEALS HUB", value: "FLIGHT & HOTEL DEALS", worth: "Rotating offers",
        title: "MakeMyTrip — offers wall for flights, hotels & first bookings",
        desc: "The official page of live offers: first-booking drops, bank instant discounts and holiday sales. Read the exact T&C on the offer card before paying.",
        code: null, url: "https://www.makemytrip.com/offers/",
        steps: ["Open makemytrip.com/offers.", "Choose the offer matching your booking type.", "The listed code applies on the payment page."],
        tnc: ["Offer codes and eligibility set by MakeMyTrip.", "Run by MakeMyTrip."] },

      /* ───────────── 📡 HIDDEN HUBS — you already pay for these ───────────── */
      { id: "jio-bundles", brand: "Jio", cat: "fun", logo: "jio.png", bg: "#ffffff",
        tag: "BUNDLED", value: "NETFLIX + PRIME", worth: "Saves ₹649/yr", top: false,
        title: "Jio ₹749 Postpaid — Netflix Basic + Prime Lite + Hotstar bundled",
        desc: "One bill covers your streaming: 100GB + unlimited 5G & calls, plus Netflix Basic, Amazon Prime Lite and JioHotstar included. Link your existing Netflix in MyJio — no separate OTT payment.",
        code: null, url: "https://www.jio.com/postpaid",
        steps: ["Recharge the ₹749 Family plan on jio.com or the MyJio app (100GB shared, up to 3 SIMs).", "MyJio → JioPostpaidPlus → Link your Netflix (existing logins work).", "Prime Lite & JioHotstar auto-activate — watch without paying those apps separately."],
        tnc: ["₹749/month + GST; includes Netflix Basic, Prime Lite, JioHotstar for the plan’s validity.", "Family plan: up to 3 add-on SIMs, ₹10/GB after pooled 100GB.", "Run by Jio — OTT benefits shown at recharge and in MyJio. Verified May 2026."] },

      { id: "airtel-bundles", brand: "Airtel", cat: "fun", logo: "airtel.png", bg: "#ffffff",
        tag: "BUNDLED", value: "OTT WITH RECHARGE", worth: "Bundled OTT", top: false,
        title: "Airtel Thanks — OTT bundled on select recharge & broadband plans",
        desc: "Airtel bundles Hotstar, Prime, Netflix or Wynk via the Thanks app on select prepaid, postpaid and Xstream Fiber plans. The eligible plan shows its OTT at recharge — easy to miss if you never check.",
        code: null, url: "https://www.airtel.in/offers",
        steps: ["Open airtel.in/offers or the Airtel Thanks app → Rewards / Offers.", "Filter by your plan — each tile lists which OTTs are included.", "Recharge that plan — Airtel SMS gives the activation link for the OTT."],
        tnc: ["OTT bundle varies by plan, circle and tenure — shown before you pay.", "For Airtel users only; OTT activation via Airtel Thanks.", "Run by Airtel."] },

      { id: "hdfc-smartbuy", brand: "HDFC SmartBuy", cat: "shopping", logo: "hdfc.png", bg: "#ffffff",
        tag: "DEALS HUB", value: "5X–10X POINTS", worth: "Up to 33% savings", top: false,
        title: "HDFC SmartBuy — the bank’s own 5X–10X points + cashback mall",
        desc: "The only place HDFC’s bonus fires: flights, hotels, Apple Store, Myntra, PharmEasy and 130+ brand vouchers. Pay through SmartBuy with any HDFC card to trigger the points/cashback printed on the card.",
        code: null, url: "https://offers.smartbuy.hdfc.bank.in/",
        steps: ["Open offers.smartbuy.hdfc.bank.in → sign in with your HDFC card.", "Pick Apple Store / Flights / Hotels / Brand Vouchers — bonus (e.g. 5X, 10X) is printed on the tile.", "Pay on SmartBuy — points/cashback post per your card’s monthly cap (see brand T&C)."],
        tnc: ["For HDFC Bank credit/debit cards only; monthly caps per card variant (e.g. Infinia 15,000 pts).", "Points post in 2 instalments — check brand-wise T&C.", "Run by HDFC Bank — bonus only applies via SmartBuy."] },

      { id: "sbi-offers", brand: "SBI Card", cat: "shopping", logo: "sbi.png", bg: "#ffffff",
        tag: "DEALS HUB", value: "BANK OFFERS", worth: "Rotating discounts", top: false,
        title: "SBI Card Offers — flight, hotel & shopping discounts wall",
        desc: "SBI Card's live wall: MakeMyTrip flights/hotels, BookMyShow BOGO, shopping and MagicPIN dining. Each card shows the code (e.g. SBIDC), min. amount and cap before you pay.",
        code: null, url: "https://www.sbicard.com/en/personal/offers.page",
        steps: ["Open sbicard.com → Offers.", "Filter by category (travel, shopping, dining).", "Copy the code on the card and apply at the partner's checkout — discount previews instantly."],
        tnc: ["Codes, caps and dates set per SBI Card offer — shown on the SBI Card page.", "Some cards (cashback, corporate) excluded — read footnote.", "Run by SBI Card."] },

      { id: "axis-grab", brand: "Axis Grab Deals", cat: "shopping", logo: "axis.png", bg: "#ffffff",
        tag: "CASHBACK HUB", value: "UP TO ₹1,000/MO", worth: "Up to ₹5,000 cashback", top: false,
        title: "Axis Grab Deals — cashback wall for Axis cards (Flipkart, Myntra, Ajio…)",
        desc: "One login via Axis app → shop 35+ brands (Flipkart, Myntra, Pepperfry, Ajio) and earn the Grab Deals cashback shown on the offer — Fest editions were flat 15% up to ₹5,000.",
        code: null, url: "https://www.axisbank.com/grab-deals",
        steps: ["In the Axis mobile app → Grab Deals, or open grabdeals.axis.bank.in.", "Pick your brand — cashback % is printed on the tile.", "Pay with your Axis card on the redirected merchant page to trigger cashback."],
        tnc: ["For Axis Bank credit/debit cards only; % and monthly cap per offer shown before payment.", "Sale Fests cap up to ₹5,000 — regular months up to ₹1,000.", "Run by Axis Bank."] }
    ]
  };
})();
