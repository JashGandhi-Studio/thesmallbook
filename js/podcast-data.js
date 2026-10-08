/* ============================================================
   THESMALLBOOK, 🎧 AUDIO ROOM DATA (podcast-data.js) · v302
   Hand-picked real shows, two shelves:
   • PODCASTS WORTH YOUR EARS: real, long-running shows on their
     own platforms. We point, they host: every link lands on the
     show's own home, never a bootleg mirror. Checked monthly.
   • TSB ORIGINALS: our own audio, read from the Deep Dives by
     the app's narrator. Nobody else carries these.
   ============================================================ */
(function () {
  "use strict";
  function yt(q) { return "https://www.youtube.com/results?search_query=" + encodeURIComponent(q); }

  window.TSB_PODCASTS = {
    shows: [
      /* ── founders & builders, India ── */
      { id: "wtf-nikhil", cat: "founders", tag: "INDIA · FOUNDERS", name: "WTF is with Nikhil Kamath",
        rss: "https://feeds.hubhopper.com/664690fdea0d7a6f61a052da119934d3.rss", home: "https://www.youtube.com/results?search_query=WTF+is+with+Nikhil+Kamath+podcast",
        host: "Nikhil Kamath", why: "India's best-known founders and operators in long, unscripted conversation: what they bet on, what broke, what they would do again.",
        start: "the Zerodha founder episodes, then any episode whose guest built something you use", url: yt("WTF is with Nikhil Kamath podcast") },
      { id: "figuring-out", cat: "founders", tag: "INDIA · FOUNDERS", name: "Figuring Out",
        rss: "https://anchor.fm/s/f5347ab0/podcast/rss", home: "https://www.youtube.com/results?search_query=Raj+Shamani+Figuring+Out+podcast",
        host: "Raj Shamani", why: "Founder and creator journeys with real numbers on the table: revenue, failures, first customers. The most-watched business show out of India.",
        start: "the episodes with bootstrapped founders; note the numbers they quote in year one", url: yt("Raj Shamani Figuring Out podcast") },
      { id: "barbershop", cat: "founders", tag: "INDIA · CONVERSATIONS", name: "The Barbershop with Shantanu",
        rss: "https://media.rss.com/thebarbershopwithshantanu/feed.xml", home: "https://www.youtube.com/results?search_query=The+Barbershop+with+Shantanu+podcast",
        host: "Shantanu Deshmukh", why: "Long-form walks and talks with Indian operators, investors and athletes, recorded like two people actually talking, not performing.",
        start: "any episode taped on a walk; the format keeps the honesty high", url: yt("The Barbershop with Shantanu podcast") },
      /* ── books & ideas, global ── */
      { id: "founders-senra", cat: "books", tag: "BOOKS · BIOGRAPHIES", name: "Founders",
        rss: "https://feeds.megaphone.fm/DSLLC6297708582", home: "https://founderspodcast.com/",
        host: "David Senra", why: "One founder biography per episode, read in full and argued with out loud. The closest thing to a book podcast that acts like a mentor.",
        start: "the episodes on Walton, Marriott and the Honda founder; then let the algorithm take the wheel", url: yt("Founders podcast David Senra") },
      { id: "knowledge-project", cat: "books", tag: "BOOKS · DECISIONS", name: "The Knowledge Project",
        rss: "https://feeds.megaphone.fm/FSMI7575968096", home: "https://www.fs.blog/knowledge-project-podcast/",
        host: "Shane Parrish", why: "Clear thinkers on judgment, defaults and deliberate practice; the audio companion to the reading list this app is built on.",
        start: "episodes with poker players, coaches and authors of books you have summaries of", url: yt("The Knowledge Project Shane Parrish podcast") },
      { id: "tim-ferriss", cat: "books", tag: "AUTHORS · CRAFT", name: "The Tim Ferriss Show",
        rss: "https://rss.art19.com/tim-ferriss-show", home: "https://tim.blog/podcast/",
        host: "Tim Ferriss", why: "Hundreds of author interviews where the book's argument gets stress-tested by someone who has lived it.",
        start: "the interviews with the authors already on your shelf", url: yt("Tim Ferriss Show podcast author interviews") },
      { id: "book-review", cat: "books", tag: "BOOKS · WEEKLY", name: "The Book Review",
        rss: "https://feeds.simplecast.com/zyaxg_KL", home: "https://www.nytimes.com/column/the-book-review-podcast",
        host: "The New York Times", why: "Fifteen minutes a week on what is worth reading and why, by people who read for a living.",
        start: "any episode about a nonfiction pick; perfect commute length", url: yt("NYT The Book Review podcast") },
      /* ── money & investing ── */
      { id: "invest-best", cat: "money", tag: "MONEY · INVESTING", name: "Invest Like the Best",
        rss: "https://feeds.megaphone.fm/CLS2859450455", home: "https://joincolossus.com/",
        host: "Patrick O'Shaughnessy", why: "Investors and operators explain how they actually think about risk and compounding, one repeated idea at a time.",
        start: "the episodes with value investors who write letters you can read free", url: yt("Invest Like the Best Patrick O'Shaughnessy podcast") },
      { id: "paisa-waisa", cat: "money", tag: "INDIA · MONEY", name: "Paisa Vaisa",
        rss: "https://www.omnycontent.com/d/playlist/e0dce4b3-2eb8-48cb-822c-af1d00e03e20/b3d9fccc-662e-4aa7-a14a-af4e0097d44b/e2ba1850-2b92-4a77-b08f-af4e0097d46c/podcast.rss", home: "https://ivmpodcasts.com/paisa-vaisa",
        host: "Anupam Gupta", why: "India's longest-running personal finance show: SIPs, insurance, loans and the stuff your bank never explains plainly.",
        start: "the beginner-archive episodes on mutual funds and emergency funds", url: yt("Paisa Vaisa podcast Anupam Gupta") },
      /* ── more founders & India, added v304 ── */
      { id: "the-neon-show", cat: "founders", tag: "INDIA · FOUNDERS", name: "The Neon Show",
        rss: "https://rss.buzzsprout.com/1601695.rss", home: "https://www.youtube.com/results?search_query=The+Neon+Show+Siddhartha+Ahluwalia+podcast",
        host: "Siddhartha Ahluwalia", why: "Indian founders at the messy early stage: first customers, cofounder fights, money running out. Honest numbers from people still in the arena.",
        start: "the solo episodes where Siddhartha breaks down his own startup's mistakes", url: yt("The Neon Show Siddhartha Ahluwalia podcast") },
      { id: "dreamers-unicorns", cat: "founders", tag: "INDIA · STARTUPS", name: "Dreamers and Unicorns",
        rss: "https://feeds.megaphone.fm/HTMEDIALTD6831633219", home: "https://www.youtube.com/results?search_query=Dreamers+and+Unicorns+podcast",
        host: "Nitin Pai · HT Smartcast", why: "How Indian startups actually get built and funded, told by the operators and investors writing the cheques.",
        start: "the season openers; they map where Indian capital is moving next", url: yt("Dreamers and Unicorns podcast") },
      { id: "how-i-built-this", cat: "founders", tag: "FOUNDERS · GLOBAL", name: "How I Built This",
        rss: "https://rss.art19.com/how-i-built-this", home: "https://www.wondery.com/shows/how-i-built-this/",
        host: "Guy Raz", why: "The origin stories behind Airbnb, Spanx, Dropbox and a hundred others, told by the founders themselves with the failures left in.",
        start: "the Airbnb, Bumble and Bootstrapped founders episodes", url: yt("How I Built This Guy Raz podcast") },
      { id: "diary-of-a-ceo", cat: "founders", tag: "FOUNDERS · GLOBAL", name: "The Diary Of A CEO",
        rss: "https://rss2.flightcast.com/xmsftuzjjykcmqwolaqn6mdn", home: "https://www.youtube.com/results?search_query=Diary+of+a+CEO+Steven+Bartlett",
        host: "Steven Bartlett", why: "Long interviews with the people behind the world's biggest companies and loudest ideas, focused on the decisions more than the glory.",
        start: "the code and negotiation episodes; Steven asks about money the way readers of this app do", url: yt("Diary of a CEO Steven Bartlett podcast") },
      /* ── books & ideas, added v304 ── */
      { id: "modern-wisdom", cat: "books", tag: "BOOKS · IDEAS", name: "Modern Wisdom",
        rss: "https://feeds.megaphone.fm/SIXMSB5088139739", home: "https://www.youtube.com/results?search_query=Modern+Wisdom+Chris+Williamson",
        host: "Chris Williamson", why: "Three episodes a week with authors and scientists distilling their life's work into plain talk. A reading list that argues back.",
        start: "any episode whose author guest wrote a book on your shelf", url: yt("Modern Wisdom Chris Williamson podcast") },
      { id: "naval", cat: "books", tag: "WEALTH · WISDOM", name: "Naval",
        rss: "https://feeds.libsyn.com/166112", home: "https://nav.al/",
        host: "Naval Ravikant", why: "The angel investor and philosopher on wealth, leverage and happiness, in short episodes that read like the Almanack he never wrote.",
        start: "the episodes on specific knowledge and long-term games", url: yt("Naval Ravikant podcast") },
      /* ── mind & health, added v304 ── */
      { id: "the-ranveer-show", cat: "mind", tag: "INDIA · CONVERSATIONS", name: "The Ranveer Show",
        rss: "https://feeds.simplecast.com/7PWFZi_d", home: "https://www.youtube.com/results?search_query=The+Ranveer+Show+BeerBiceps",
        host: "Ranveer Allahbadia", why: "India's biggest self-growth show: monks, doctors, investors and historians in long Hinglish conversations about the mind and the country.",
        start: "the episodes with the monks and the money managers; notice how often they agree", url: yt("The Ranveer Show BeerBiceps podcast") },
      { id: "huberman-lab", cat: "mind", tag: "SCIENCE · HEALTH", name: "Huberman Lab",
        rss: "https://feeds.megaphone.fm/hubermanlab", home: "https://www.hubermanlab.com/",
        host: "Andrew Huberman", why: "A Stanford neuroscientist explains focus, sleep, stress and motivation with protocols you can try the same day. Dense, patient, worth it.",
        start: "the episodes on dopamine, morning light and beating procrastination", url: yt("Huberman Lab podcast") },
      { id: "hidden-brain", cat: "mind", tag: "SCIENCE · MIND", name: "Hidden Brain",
        rss: "https://feeds.simplecast.com/kwWc0lhf", home: "https://hiddenbrain.org/",
        host: "Shankar Vedantam", why: "The invisible patterns that run your decisions, told through stories. It does for your biases what the shelf does for your habits.",
        start: "the episodes on habit loops and scarcity; you will recognise yourself", url: yt("Hidden Brain podcast") },
      { id: "on-purpose", cat: "mind", tag: "MIND · HABITS", name: "On Purpose",
        rss: "https://feeds.megaphone.fm/on-purpose", home: "https://www.youtube.com/results?search_query=On+Purpose+Jay+Shetty+podcast",
        host: "Jay Shetty", why: "Calm, practical conversations about discipline, relationships and doing work that means something, with the authors behind the ideas.",
        start: "the solo episodes on building routines that survive bad weeks", url: yt("On Purpose Jay Shetty podcast") }
    ],
    cats: [
      { id: "all", label: "✦ ALL" },
      { id: "founders", label: "🚀 FOUNDERS & INDIA" },
      { id: "books", label: "📚 BOOKS & IDEAS" },
      { id: "money", label: "💰 MONEY" },
      { id: "mind", label: "🧠 MIND & HEALTH" }
    ]
  };

  /* 📚 FREE AUDIOBOOKS: public-domain classics read by LibriVox volunteers,
     streamed straight from Archive.org (metadata fetched on play, cached). */
  window.TSB_AUDIOBOOKS = {
    /* हिंदी: LibriVox's complete Hindi catalog - volunteer-read, public domain */
    "panchatantra-hi":           { id: "panchatantra_2604_librivox",       title: "Panchatantra (Hindi)", dev: "पंचतंत्र", author: "Vishnu Sharma", lang: "hi", ch: 74 },
    "do-sakhiyan-hi":            { id: "dosakhiyan_2512_librivox",         title: "Do Sakhiyan (Hindi)", dev: "दो सखियाँ", author: "Munshi Premchand", lang: "hi", ch: 13 },
    "idgaah-hi":                 { id: "IdgaahByMunshiPremchand",          title: "Idgaah (Hindi)", dev: "ईदगाह", author: "Munshi Premchand", lang: "hi" },
    "gulli-danda-hi":            { id: "gulli-danda-munshi-premchand",     title: "Gulli Danda (Hindi)", dev: "गुल्ली डंडा", author: "Munshi Premchand", lang: "hi" },
    "anaath-ladki-hi":           { id: "AnaathLadkiByMunshiPremchand",     title: "Anaath Ladki (Hindi)", dev: "अनाथ लड़की", author: "Munshi Premchand", lang: "hi" },
    "andher-hi":                 { id: "AndherByMunshiPremchand",          title: "Andher (Hindi)", dev: "अंधेर", author: "Munshi Premchand", lang: "hi" },
    "jhanki-hi":                 { id: "JhankiByMunshiPremchand",          title: "Jhanki (Hindi)", dev: "झाँकी", author: "Munshi Premchand", lang: "hi" },
    "meditations":               { id: "meditations_0708_librivox",        title: "Meditations" , ch: 15 },
    "the-prince":                { id: "prince_librivox",                  title: "The Prince" , ch: 13 },
    "art-of-war":                { id: "art_of_war_librivox",              title: "The Art of War" , ch: 7 },
    "tao-te-ching":              { id: "tao_teh_king_librivox",            title: "Tao Te Ching" , ch: 9 },
    "siddhartha":                { id: "siddhartha_1912_librivox",         title: "Siddhartha" , ch: 12 },
    "as-a-man-thinketh":         { id: "as_a_man_thinketh_1312_librivox",  title: "As a Man Thinketh" , ch: 8 },
    "science-of-getting-rich":   { id: "science_gettingrich_1005_librivox",title: "The Science of Getting Rich" , ch: 18 },
    "autobiography-of-a-yogi":   { id: "autobiographyofayogi_2601_librivox", title: "Autobiography of a Yogi" , ch: 49 },
    "richest-man-babylon":       { id: "richestman_2604_librivox",         title: "The Richest Man in Babylon" , ch: 4 },
    "bhagavad-gita":             { id: "bhagavad_gita_0803_librivox",      title: "Bhagavad Gita" , ch: 19 },
    "the-prophet":               { id: "prophet1_1901_librivox",           title: "The Prophet" , ch: 7 },
    /* more public-domain classics, added v304, all read by LibriVox volunteers */
    "enchiridion":               { id: "enchiridion_librivox",             title: "The Enchiridion" , ch: 1 },
    "letters-from-a-stoic":      { id: "lucilius_epistulae_2003_librivox", title: "Letters from a Stoic" , ch: 125 },
    "franklin-autobiography":    { id: "franklin_autobio_gg_librivox",     title: "The Autobiography of Benjamin Franklin" , ch: 21 },
    "dhammapada":                { id: "dhammapada_0707_librivox",         title: "The Dhammapada" , ch: 7 },
    "upanishads":                { id: "kathaupanishad_1503_librivox",     title: "The Upanishads" , ch: 6 },
    "raja-yoga":                 { id: "rajayoga_1408_librivox",           title: "Raja Yoga" , ch: 27 },
    "yoga-sutras":               { id: "yogasutras_1207_librivox",         title: "The Yoga Sutras of Patanjali" , ch: 10 },
    "analects":                  { id: "analects_confucius_1303_librivox", title: "The Analects" , ch: 21 },
  "walden":                    { id: "walden_librivox",                    title: "Walden", author: "Henry David Thoreau" },
  "zarathustra":               { id: "zarathustra_2010_librivox",          title: "Thus Spake Zarathustra", author: "Friedrich Nietzsche" },
  "24-hours":                  { id: "twenty-four_hours_a_day_librivox",   title: "How to Live on 24 Hours a Day", author: "Arnold Bennett" },
  "acres-of-diamonds":         { id: "acres_of_diamonds_1008_librivox",    title: "Acres of Diamonds", author: "Russell Conwell" },
  "science-of-being-great":    { id: "science_of_being_great_1203_librivox", title: "The Science of Being Great", author: "Wallace D. Wattles" },
  "consolation-philosophy":    { id: "the_consolation_of_philosophy_librivox", title: "The Consolation of Philosophy", author: "Boethius" },
  "kybalion":                  { id: "kybalion_ghs_librivox",              title: "The Kybalion", author: "The Three Initiates" },
  "shortness-of-life":         { id: "shortness_of_life_2305_librivox",    title: "On the Shortness of Life", author: "Seneca" },
  "coolidge":                  { id: "autobiographycoolidge_2507_librivox", title: "The Autobiography of Calvin Coolidge", author: "Calvin Coolidge" },
  "public-speaking":           { id: "art_public_speaking_1101_librivox",  title: "The Art of Public Speaking", author: "Dale Carnegie et al." },
  "common-sense":              { id: "commonsensever4_2507_librivox",      title: "Common Sense", author: "Thomas Paine" },
  "carnegie":                  { id: "autobiography_carnegie_1212_librivox", title: "The Autobiography of Andrew Carnegie", author: "Andrew Carnegie" },
  "frederick-douglass":        { id: "frederick-douglass_jf_librivox",     title: "Narrative of the Life of Frederick Douglass", author: "Frederick Douglass" },
  "odyssey":                   { id: "odyssey_butler_librivox",            title: "The Odyssey", author: "Homer" }
  };
})();
