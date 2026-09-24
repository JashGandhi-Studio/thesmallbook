/* ============================================================
   THESMALLBOOK, THE CASE FILE (graveyard originals)
   One genuine, difficult case at a time. Real documents, real
   contradictions, no guaranteed answer: the Founder alone reads
   every verdict, closes the case, and names the winner. No AI
   solves this, because there is nothing to retrieve: it must be
   REASONED. Swap CASE_001 content for a new week's case.
   ============================================================ */
window.TSB_CASEFILE = {
  id: "case-001-novachai",
  no: "001",
  title: "Who Killed NovaChai?",
  seal: "THE VERDICT IS SEALED",
  line: "A fizzy chai startup burns \u20B94 crore in nine months and dies of a 'contamination scare'. The paperwork says otherwise. So does the phone call nobody was supposed to keep.",
  closed: "Fourteen documents. One month. The Founder reads every verdict himself and closes the case this Thursday 9 PM. The winner is announced by him, in the open, and the prize is real. What the prize is: we say when the verdict drops.",
  rules: [
    "Take a pen and real paper first. Map every name, date, time and number on one sheet. Every solver who cracks this works on paper.",
    "This case is genuinely hard. It is built to survive a week, not a commute.",
    "Every document is evidence, and every time-stamp is a witness. Some times matter more than dates.",
    "No AI, no internet sleuthing. There is nothing to look up, only things to reason about.",
    "There is no single right answer. There are defended answers and lazy ones.",
    "The map near the end is one true path through the month, not the only one."
  ],
  wa: "",   /* the Founder's WhatsApp number with country code, e.g. 919XXXXXXXXX. Empty hides the button. */
  closeDay: 4, closeHour: 21, closeMin: 0,   /* the case closes Thursday 21:00 local. 4=Thursday. */

  docs: [
    {
      tab: "01 · THE FILE",
      title: "Case 001 · NovaChai Beverages Pvt Ltd",
      kind: "cover",
      html: "" +
        '<figure class="cf-photo"><img src="assets/case/exhibit-bottle.jpg" alt="Exhibit A: a late-production NovaChai bottle" loading="lazy"><figcaption>EXHIBIT A \u00b7 a late-production bottle. Read the label. Then read document 07 and ask what the label no longer says.</figcaption></figure>' +
        '<p class="cf-lead">Company: <b>NovaChai Beverages Pvt Ltd</b>, Bengaluru. Fizzy ready-to-drink chai. Founded with noise, died with a whisper in nine months.</p>' +
        '<p class="cf-lead">Official cause of death, as printed in every summary written since: <b>"a contamination recall scared customers away."</b></p>' +
        '<p class="cf-lead">This file exists because that sentence is lazy. Four crore rupees went in. Nine months later there was nothing to wind down, barely anything to sell, and five people who each had a reason to watch it burn.</p>' +
        '<table class="cf-table"><tr><th>THE CAST</th><th></th></tr>' +
        '<tr><td>Arjun</td><td>Founder. Ex-ad-agency. All fire, all decks.</td></tr>' +
        '<tr><td>Meera</td><td>Co-founder. Ran supply. The careful one, until she wasn\u2019t.</td></tr>' +
        '<tr><td>Vikram</td><td>COO. Ran vendors, warehouses and the "second unit" everyone was told not to mention.</td></tr>' +
        '<tr><td>Ruth</td><td>CFO. Quit two weeks before the leak. Says she "saw the numbers behind the numbers."</td></tr>' +
        '<tr><td>Brewkart</td><td>The giant competitor. Motive stamped on its forehead.</td></tr></table>' +
        '<p class="cf-note">Read the call first. It is the only time anyone in this file speaks freely \u2014 and that is exactly why it misleads.</p>'
    },
    {
      tab: "02 · THE CALL",
      title: "Intercepted investor call \u2014 41 days before death",
      kind: "call",
      audio: true,
      html:
        '<p class="cf-note">Transcript of the internal investor catch-up. Founder Arjun, two angels, one fund partner. Recorded by a fund analyst "for notes".</p>' +
        '<div class="cf-call">' +
        '<p><b>ARJUN:</b> Gentleman, let me kill the elephant. Yes, there was a quality complaint. One batch, one warehouse, handled. We recalled eight hundred crates, cost us eight lakhs, done. NovaChai today is three weeks from breakeven.</p>' +
        '<p><b>FUND PARTNER:</b> Your burn says otherwise.</p>' +
        '<p><b>ARJUN:</b> Burn is marketing. Marketing is growth. We crossed forty thousand outlets.</p>' +
        '<p><b>ANGEL 1:</b> You said thirty-two thousand last month.</p>' +
        '<p><b>ANGEL 1:</b> And the ad spend tripled in three weeks. Where is it going?</p>' +
        '<p><b>ARJUN:</b> Reach. Sometimes we pay channel partners to push us into new lanes. Cash moves where the market is, gentlemen. You know this.</p>' +
        '<p><b>ARJUN:</b> And last week Brewkart\u2019s people were calling our distributors asking them to return stock. This is a dirty-tricks war and we are winning it anyway.</p>' +
        '<p><b>FUND PARTNER:</b> Ruth\u2019s exit surprised us. She was your discipline.</p>' +
        '<p><b>ARJUN:</b> <i>(laughs)</i> Ruth was tired. You don\u2019t build a rocket on a calculator. Anyway \u2014 even after she left, the second unit kept the COGS flat. The engine is fine, gentlemen. I am three weeks from breakeven, and I will send the sheet myself.</p>' +
        '<p><b>ANGEL 2:</b> Which second unit?</p>' +
        '<p><b>ARJUN:</b> <i>(pause, four seconds \u2014 the analyst logged it)</i> The... packaging annex. Bhiwandi. Forget the name, it\u2019s a shed, it saves us eleven percent on cost. Meera\u2019s find.</p>' +
        '<p><b>FUND PARTNER:</b> Send the sheet.</p>' +
        '<p><b>ARJUN:</b> Tonight.</p>' +
        "</div>" +
        '<p class="cf-note">The sheet never came. Five weeks later the company was gone. Count what he promised against what the ledger shows.</p>'
    },
    {
      tab: "03 · THE LEDGER",
      title: "Last six weeks, condensed by the auditor",
      kind: "doc",
      html:
        '<table class="cf-table">' +
        '<tr><th>WEEK</th><th>AD SPEND</th><th>"SALES"</th><th>NOTES</th></tr>' +
        '<tr><td>W1</td><td>\u20B911.2L</td><td>\u20B918.0L</td><td>normal</td></tr>' +
        '<tr><td>W2</td><td>\u20B911.6L</td><td>\u20B918.9L</td><td>normal</td></tr>' +
        '<tr><td>W3</td><td>\u20B919.4L</td><td>\u20B921.2L</td><td>spend jumps 67%</td></tr>' +
        '<tr><td>W4</td><td>\u20B931.8L</td><td>\u20B924.0L</td><td>recall hits (cost \u20B98L total)</td></tr>' +
        '<tr><td>W5</td><td>\u20B938.1L</td><td>\u20B929.6L</td><td>one distributor = 41% of "sales"</td></tr>' +
        '<tr><td>W6</td><td>\u20B939.9L</td><td>\u20B930.1L</td><td>same distributor, invoice 2277, "pay in 90 days"</td></tr>' +
        "</table>" +
        '<p class="cf-lead">The auditor\u2019s pencil note in the margin: <i>"The recall cost less than one week of the ads that came AFTER it. Companies do not die of an 8-lakh scratch. They die of what the scratch revealed, and of what was being hidden to fund the lipstick."</i></p>' +
        '<p class="cf-lead">Second pencil note: <i>"Ask why a dying company triples ad spend. Ask who bills the agency."</i></p>'
    },
    {
      tab: "04 · THE PRESS",
      title: "Two clippings, one week apart",
      kind: "press",
      html:
        '<div class="cf-clip">' +
        '<span class="cf-clip__tag">THE BUSINESS LEDGER · 14th, page 9</span>' +
        '<h3>"Dirty trick" says Brewkart: we never touched NovaChai</h3>' +
        '<p>A Brewkart spokesperson, responding to rumours that the drinks giant leaked the NovaChai contamination video: <b>"Absurd. We heard about the leak on the 14th, Monday morning, like everyone else. We are a competitor, not a criminal."</b></p>' +
        "</div>" +
        '<div class="cf-clip">' +
        '<span class="cf-clip__tag">STARTUP WEEKLY · 21st</span>' +
        '<h3>NovaChai co-founder Meera exits "to spend time with family"; shares sold to founder at \u20B92.1 Cr valuation</h3>' +
        '<p>Filed filings show the share transfer was executed on the 19th and registered on the 21st. Meera declined to comment. Arjun called it "a routine cleanup, I own more of my dream now."</p>' +
        "</div>" +
        '<p class="cf-note">A calendar is evidence. The 14th that month was a Sunday. Nobody hears a leak "Monday morning" on the 14th and also on the 14th. Somebody is lying about when they knew. The question is which lie matters.</p>'
    },
    {
      tab: "05 · THE EMAIL",
      title: "The 3:12 AM email that started the fire",
      kind: "mail",
      html:
        '<div class="cf-mail">' +
        '<p><b>FROM:</b> a thrown-away account · <b>TO:</b> three food-safety influencers, two journalists</p>' +
        '<p><b>SUBJECT:</b> before you drink NovaChai, read this</p>' +
        '<p class="cf-mail__body">"i worked with there logistics vendor. the bhiwandi shed is not a annex it is the whole truth. they blended cheap dust tea there from a unlicenced supplier to cost cut after the CFO leaved. the expired creamer crates was relabeled. i have photos. i leaved because i costed my soul. check batch NV-2271 to NV-2290. i could not stay quiet anymore."</p>' +
        '<p class="cf-note">Language note by the forensics reader: the writer misspells the same way twice \u2014 <i>"leaved"</i>, and <i>"costed my soul"</i>. </p>' +
        "</div>" +
        '<p class="cf-lead">The video that went with it was clean, cropped, and knew exactly which crate labels to show. Whoever shot it understood the batch numbering system. Consumers don\u2019t. Staff do.</p>'
    },
    {
      tab: "06 · THE AUDIT",
      title: "What the forensic audit found (and underlined twice)",
      kind: "doc",
      html:
        '<p class="cf-lead">\u00A71 \u2014 <b>VPN log, the night of the email.</b> The office was sealed for renovation that week. Exactly one external session touched the shared <i>vendor-onboarding</i> login that night: 03:04 to 03:15 AM. Vendor onboarding was <b>Vikram\u2019s</b> desk. Ruth had already left the company and returned her laptop.</p>' +
        '<p class="cf-lead">\u00A72 \u2014 <b>The share sale paperwork.</b> Meera\u2019s transfer deed is executed on stamp paper invoice <b>#1042, dated the 21st</b>. The stamp vendor\u2019s own register shows <b>#1042 was purchased on the 12th</b> (and #1043 on the 19th). Paper bought on the 12th cannot witness a deed dated the 21st: the exit was being papered <b>six days before the leak</b>. Meera knew the valuation was about to fall, because somebody was about to make it fall.</p>' +
        '<p class="cf-lead">\u00A73 \u2014 <b>The second unit.</b> Bhiwandi shed, no licence, no quality testing, batch numbers NV-2271 to NV-2290 blended there. The recall tested <b>one</b> batch from the main plant only. The shed never appeared in any test.</p>' +
        '<p class="cf-lead">\u00A74 \u2014 <b>The packaging swap.</b> The certified label printer was dropped the same week ad spend tripled; a cheaper press took over. The new label artwork (Exhibit C) quietly dropped the line <i>"lab-tested batch-wise"</i> that the old label carried.</p>' +
        '<p class="cf-lead">\u00A75 \u2014 <b>The 90-day distributor invoice.</b> Invoice 2277 booked \u20B912.4L as "sales" in the final week. The distributor is owned by Arjun\u2019s brother-in-law. Payment terms: 90 days. Revenue recognised immediately.</p>' +
        '<p class="cf-note">Everything above is true at the same time. That is what makes the case hard: the alibi clears the CFO, the register convicts the company, and the company was following orders.</p>' 
    },
    {
      tab: "07 · EXHIBIT C",
      title: "Two labels, one lie",
      kind: "labels",
      html:
        '<div class="cf-labels">' +
        '<div class="cf-label">' +
        '<span class="cf-label__brand">NOVACHAI \u00B7 FIZZY MASALA CHAI</span>' +
        '<span class="cf-label__old">REAL BREW \u00B7 <u>LAB-TESTED BATCH-WISE</u> \u00B7 250ml</span>' +
        '<span class="cf-label__note">printed by Surya Press (certified) \u00B7 till W2</span>' +
        "</div>" +
        '<div class="cf-label cf-label--new">' +
        '<span class="cf-label__brand">NOVACHAI \u00B7 FIZZY MASALA CHAI</span>' +
        '<span class="cf-label__old">REAL BREW \u00B7 250ml</span>' +
        '<span class="cf-label__note">printed by QuickInk (cheapest quote) \u00B7 W3 onwards</span>' +
        "</div>" +
        "</div>" +
        '<p class="cf-lead">The claim that was dropped is the claim that was broken. Labels don\u2019t lie by addition. They lie by subtraction.</p>'
    },
    {
      tab: "08 \u00b7 THE MONEY",
      title: "Bank statement, the last month (auditor's extract)",
      kind: "money",
      html:
        '<table class="cf-table cf-mono">' +
        '<tr><th>DATE</th><th>PAID TO</th><th>AMOUNT</th><th>NARRATION</th></tr>' +
        '<tr><td>10th</td><td>B. Goods, Bhiwandi</td><td>\u20B970,000</td><td>marketing-card UPI, "festive push"</td></tr>' +
        '<tr><td>11th</td><td>B. Goods, Bhiwandi</td><td>\u20B980,000</td><td>marketing-card UPI</td></tr>' +
        '<tr><td>13th</td><td>B. Goods, Bhiwandi</td><td>\u20B91,10,000</td><td>marketing-card UPI, "partnership bonus"</td></tr>' +
        '<tr><td>21st</td><td>QuickInk Press</td><td>\u20B94,20,000</td><td>NEFT, "label job 40,000 sheets, urgent"</td></tr>' +
        '<tr><td>24th</td><td>SR Enterprises</td><td>\u20B98,00,000</td><td>NEFT, "consulting, supply chain"</td></tr>' +
        "</table>" +
        '<p class="cf-lead">Three things the auditor circled. The shed was paid <b>from the marketing card</b>, in cash, days before the leak \u2014 the auditable company never met him. The new labels were ordered <b>after</b> the leak: a relaunch was being priced while the funeral was being written. And SR Enterprises, the "consultant" paid \u20B98L on the 24th, is registered to Meera\u2019s aunt \u2014 paid <b>five days after Meera sold her shares and left</b>.</p>' +
        '<p class="cf-note">Is the 8L severance dressed as consulting? Hush money? Or exactly what it says? The account paper does not say. People do.</p>'
    },
    {
      tab: "09 \u00b7 THE SHED",
      title: "Bhiwandi gate register, seized by the auditor",
      kind: "doc",
      html:
        '<table class="cf-table cf-mono">' +
        '<tr><th>WEEK</th><th>CRATES IN</th><th>CRATES OUT</th><th>NOTE IN REGISTER</th></tr>' +
        '<tr><td>W3</td><td>4,000</td><td>4,000</td><td>storage only</td></tr>' +
        '<tr><td>W4</td><td>6,500</td><td>9,000</td><td>"mixing, new numbers"</td></tr>' +
        '<tr><td>W5</td><td>8,000</td><td>12,500</td><td>"relabel job, night shift"</td></tr>' +
        '<tr><td>W6</td><td>1,500</td><td>5,500</td><td>"last lot, plant numbers"</td></tr>' +
        "</table>" +
        '<p class="cf-lead">Read the last column and then the maths. 20,000 crates went in; 31,000 came out. Four thousand of the difference were plant-numbered crates trucked to the shed and <b>relabeled by the company\u2019s own night shift</b> \u2014 the exact crates, in the exact NV-2271 to NV-2290 range, that the 3:12 AM email told the influencers to check.</p>' +
        '<figure class="cf-photo"><img src="assets/case/exhibit-shed.jpg" alt="Exhibit B: the shed" loading="lazy"><figcaption>EXHIBIT B \u00b7 the Bhiwandi unit, photographed by the auditor</figcaption></figure>' +
        '<figure class="cf-photo"><img src="assets/case/exhibit-crates.jpg" alt="Exhibit C: relabeled crates" loading="lazy"><figcaption>EXHIBIT C \u00b7 fresh stickers over old markings, night shift, seized</figcaption></figure>' +
        '<p class="cf-note">So the poison pen was right about the crates. It lied only about who was holding the pen. A true accusation with a false witness: decide for yourself what that makes the sender.</p>'
    },
    {
      tab: "10 \u00b7 THE CHATS",
      title: "Recovered WhatsApp, Vikram and Arjun",
      kind: "wa",
      html:
        '<div class="cf-wa">' +
        '<p class="cf-wa__l"><b>VIKRAM \u00b7 10th, 11:42 PM</b><br>the shed guy is asking for cash again. says night shift costs extra</p>' +
        '<p class="cf-wa__r"><b>ARJUN \u00b7 10th, 11:51 PM</b><br>pay him from the marketing card. company books never see him</p>' +
        '<p class="cf-wa__l"><b>VIKRAM \u00b7 12th, 8:04 AM</b><br>and if food safety comes asking?</p>' +
        '<p class="cf-wa__r"><b>ARJUN \u00b7 12th, 8:19 AM</b><br>they come for contamination, we show the plant, we are clean. they never come for a shed they don\u2019t know exists</p>' +
        '<p class="cf-wa__l"><b>VIKRAM \u00b7 13th, 9:30 PM</b><br>ruth\u2019s last memo did the rounds. people talk when payrolls late</p>' +
        '<p class="cf-wa__r"><b>ARJUN \u00b7 13th, 9:37 PM</b><br>payroll goes tomorrow. and delete this chat friday</p>' +
        '<p class="cf-wa__l"><b>VIKRAM \u00b7 14th, 7:45 AM</b><br>the plant whatsapp group is spreading something. poison pen again. press is calling me</p>' +
        '<p class="cf-wa__r"><b>ARJUN \u00b7 14th, 8:15 AM</b><br>ignore it. stay away from the office today. i will handle it</p>' +
        "</div>" +
        '<p class="cf-note">The chat was never deleted. Vikram\u2019s phone was surrendered with the rest of the winding-down papers. Read the 12th, 8:19 AM once more: <i>they come for contamination, we show the plant, we are clean.</i></p>'
    },
    {
      tab: "11 \u00b7 THE LAB",
      title: "The official recall test \u2014 and what it never touched",
      kind: "doc",
      html:
        '<p class="cf-lead">The lab report everyone quotes: batch <b>NV-2260</b>, sampled from the <b>main plant</b>, full panel, all parameters <b>PASS</b>. Signed, stamped, clean.</p>' +
        '<p class="cf-lead">Now the auditor\u2019s red pen beside it: the recall tested the plant the shed was hiding. Not one crate from Bhiwandi, not one of the relabeled NV-2271 to NV-2290 lots, was ever opened by an accredited lab \u2014 before or after the leak. The untested milk powder in those crates sat in un-airconditioned sheds through a 40-degree May.</p>' +
        '<p class="cf-lead">So the company\u2019s cleanest document is clean the way an alibi is clean: technically true, arranged in advance. The recall was theatre \u2014 eight lakhs spent to look responsible while the actual risk stayed in the market with new labels on it.</p>' +
        '<p class="cf-note">If there was a child drinking NovaChai from a relabeled crate, no document in this file would have warned anyone. Sit with that. Someone in this story did.</p>'
    },
    {
      tab: "12 \u00b7 RUTH",
      title: "The CFO's statement to the forensic auditor",
      kind: "call",
      html:
        '<div class="cf-call">' +
        '<p><b>RUTH:</b> You want a confession that I burned it down. I won\u2019t give you one, because I didn\u2019t.</p>' +
        '<p><b>AUDITOR:</b> You left two weeks before the leak. Convenient.</p>' +
        '<p><b>RUTH:</b> I left when I saw invoice 2277. Ninety days, brother-in-law, on the dying week. You don\u2019t dress a corpse for sale unless someone is buying corpses. I told Arjun to his face: this is not rounding, this is a story we are selling.</p>' +
        '<p><b>AUDITOR:</b> The email that night came through the vendor login you created.</p>' +
        '<p><b>RUTH:</b> Which I surrendered with my laptop, from a flight to Goa. Ask immigration, I land on their cameras. And you already know three people had that password, because I watched you write that down yesterday.</p>' +
        '<p><b>AUDITOR:</b> The email writes "leaved". Your memos wrote "leaved".</p>' +
        '<p><b>RUTH:</b> My memos were pinned to the office notice board for two years, son. Whoever clipped them also clipped my habit. Check who kept copies. Check who edited my exit memo. I know what I know, and what I know is: I saw the relabel schedule on Vikram\u2019s desk the day I quit, and I said nothing, and that is my whole crime.</p>' +
        "</div>" +
        '<p class="cf-note">Her alibi holds. Her fingerprints are still on the language. That is not a contradiction, it is a method: somebody who studied her wrote the way she writes.</p>'
    },
    {
      tab: "13 \u00b7 THE NOISE",
      title: "Everything else that happened that month",
      kind: "doc",
      html:
        '<p class="cf-lead">A real file is mostly stuff that does not matter. This page is here because it belongs here: all of it true, almost none of it useful. The Founder grades the argument, not the name, and there is more than one honest verdict in this file. His words, not mine.</p>' +
        '<ul class="cf-noise">' +
        '<li><b>9th.</b> A competitor launches "Masala Fizz Orange". NovaChai\u2019s sales do not move that week.</li>' +
        '<li><b>2nd to 6th.</b> The warehouse union complains about canteen food. Settled with a new vendor.</li>' +
        '<li><b>W3.</b> Monsoon rail delays push two ingredient consignments by four days. Claims filed, paid.</li>' +
        '<li><b>18th.</b> Arjun\u2019s podcast drops an episode: "Haters are subscribers." Four hundred and twelve downloads.</li>' +
        '<li><b>20th.</b> An ex-intern posts "told you so" with a photo of a cancelled team lunch. Nothing else. No follow-up, ever.</li>' +
        '<li><b>25th.</b> Meera flies to Goa, six days after Ruth did. Two one-way tickets, two different airlines.</li>' +
        '<li><b>15th.</b> A food blogger\u2019s W2 review resurfaces: "7/10, too sweet, who asked for fizz in chai." Comments argue about sugar.</li>' +
        '<li><b>W4.</b> The office plant service is cancelled. The renovation seal went up the same week.</li>' +
        '<li><b>Somewhere.</b> A marketplace seller lists the handle "novachai-official" for \u20B9499. Buyer unknown.</li>' +
        "</ul>" +
        '<p class="cf-note">Most of these sentences belong in a different story. Find the ones that belong in this one, and you have read the file the way the Founder does. Beware the ones that look like clues and are only lives being lived.</p>'
    },
    {
      tab: "14 \u00b7 THE MAP",
      title: "The whole month on one page",
      kind: "tl",
      html:
        '<div class="cf-tl">' +
        '<div class="cf-tl__row"><span class="cf-tl__d">1st</span><span>Ruth resigns. Her laptop is returned the same evening; her memos stay pinned on the board.</span></div>' +
        '<div class="cf-tl__row"><span class="cf-tl__d">10-13th</span><span>\u20B92.6L in cash to the shed man, off the company books, from the marketing card.</span></div>' +
        '<div class="cf-tl__row"><span class="cf-tl__d">12th</span><span>10:20 AM: stamp paper #1042 is bought \u2014 nine days before the deed dated on it.</span></div>' +
        '<div class="cf-tl__row"><span class="cf-tl__d">14th</span><span>2:58 AM: the camera on the sealed renovation floor powers down. Maintenance will call it "scheduled".</span></div>' +
        '<div class="cf-tl__row cf-tl__row--hot"><span class="cf-tl__d">14th</span><span>3:12 AM: the poison email leaves a dead account. 3:31 AM: the camera wakes up. By evening, the leak is everywhere; Brewkart will swear they first heard of it "Monday morning, the 14th".</span></div>' +
        '<div class="cf-tl__row"><span class="cf-tl__d">14th</span><span>7:45 AM: Vikram texts that the leak is loose and the press is calling him. It was out by breakfast.</span></div>' +
        '<div class="cf-tl__row"><span class="cf-tl__d">14th</span><span>8:15 AM: Arjun replies "ignore it \u2014 I will handle it". Read the chats once more: Vikram never says what <i>it</i> is. Arjun never asks.</span></div>' +
        '<div class="cf-tl__row"><span class="cf-tl__d">16th</span><span>11:00 AM: the \u20B98L recall lands with the press: one clean batch from the clean plant. Theatre.</span></div>' +
        '<div class="cf-tl__row"><span class="cf-tl__d">19th</span><span>Meera\u2019s share transfer is registered, on paper bought on the 12th.</span></div>' +
        '<div class="cf-tl__row"><span class="cf-tl__d">21st</span><span>The filing goes public. QuickInk is paid \u20B94.2L for 40,000 new label sheets \u2014 without the lab-tested line.</span></div>' +
        '<div class="cf-tl__row"><span class="cf-tl__d">24th</span><span>\u20B98L to Meera\u2019s aunt\u2019s firm. "Consulting."</span></div>' +
        '<div class="cf-tl__row"><span class="cf-tl__d">30th</span><span>The investors\u2019 call: "three weeks from breakeven." The sheet never comes.</span></div>' +
        "</div>" +
        '<p class="cf-note">One row on this map is a lie, told in a newspaper. One row is a mistake, told by a stamp vendor. The rest is a machine, running in order.</p>'
    }
  ],

  question: {
    head: "YOUR VERDICT \u00b7 THREE QUESTIONS",
    ask: "One: who sent the 3:12 AM email, and what was it really \u2014 a rescue, a revenge, or an exit? Two: what actually killed NovaChai \u2014 the leak, the fraud, or the ambition that needed both? Three: you hold the investors\u2019 seats \u2014 do you fund the relaunch, sue, or walk away? Defend all three in your own words. Handwritten is welcome \u2014 some verdicts deserve ink.",
    accepted: "There is no single right answer. The Founder reads every verdict personally and grades the reasoning, not the guess."
  },

  verdict: null,   /* sealed. The Founder flips this in next week's build: winner, the full read of the case, and the real prize. */
  prizeTeaser: "The prize is real, physical and worth having. No cash promises, no lottery talk. We announce it with the verdict and send it to the winner."
};

/* ============================================================
   THE CASE MUSEUM (archive)
   The weekly ritual, founder edition:
   1. When a case closes, write what happened into its object:
        verdict: "The full read of the case, in your words."
        winner:  "Name of the reader who cracked it"
        prize:   "What the prize was"
   2. Move the whole object from window.TSB_CASEFILE into the
      array below, and write the new week's case in its place.
   Archived files stay playable forever at casefile.html?case=<id>
   They keep their wall, lose the prize. The museum grows weekly.
   ============================================================ */
window.TSB_CASE_ARCHIVE = [];
