/* ============================================================
   THESMALLBOOK — UNIVERSAL LANGUAGE ENGINE 🌐  (v3 — natural v222)
   Translates the ENTIRE app into 24+ languages using the Google
   Translate page engine (driven directly, retries included).
   Plus two EXCLUSIVE modes, now NATURAL — the way people actually
   text, not letter-by-letter machine romanisation:

   • HINGLISH — Hindi → Roman, live & natural: "main yeh kaam kal
     shuru karunga" (not "maaIn yaha kaama kala shuru karungaa").
   • GUJLISH  — Gujarati → Roman, natural: "tame aa kaam kal shuru
     karsho" (not "tame aa kaama kala shuru karasho").

   How it works (3 layers, in order):
     1. CURATED VOCABULARY — a hand-built dictionary of the words
        people actually type (hai, nahi, chahiye, samajh, paisa,
        koshish, zindagi…) + plain-word swaps for stiff book words
        (आवश्यक → zaroori, धन्यवाद → shukriya, यदि → agar). Offline.
     2. LIVE TRANSLITERATION — Google Input Tools (JSONP, no key)
        finishes every word the dictionary doesn't know, e.g. book
        names & hard vocabulary. Cached locally, silent fallback.
     3. RULES ENGINE — word-aware Devanagari→Roman that keeps
        natural spelling (short "a", no "aa/ee" verb endings).
   ============================================================ */

(function () {
  var LS_KEY = "tsb_lang";

  var LANGUAGES = [
    { code: "en",  name: "English",    native: "English",   flag: "🇬🇧" },
    { code: "hi",  name: "Hindi",      native: "हिन्दी",      flag: "🇮🇳" },
    { code: "hi-Latn", name: "Hinglish", native: "Jab aap padhte ho — Hindi in English letters", flag: "🇮🇳", special: true, base: "hi" },
    { code: "gu",  name: "Gujarati",   native: "ગુજરાતી",     flag: "🇮🇳" },
    { code: "gu-Latn", name: "Gujlish", native: "Jya tame vaancho cho — Gujarati in English letters", flag: "🇮🇳", special: true, base: "gu" },
    { code: "mr",  name: "Marathi",    native: "मराठी",       flag: "🇮🇳" },
    { code: "bn",  name: "Bengali",    native: "বাংলা",       flag: "🇮🇳" },
    { code: "ta",  name: "Tamil",      native: "தமிழ்",       flag: "🇮🇳" },
    { code: "te",  name: "Telugu",     native: "తెలుగు",      flag: "🇮🇳" },
    { code: "kn",  name: "Kannada",    native: "ಕನ್ನಡ",       flag: "🇮🇳" },
    { code: "ml",  name: "Malayalam",  native: "മലയാളം",     flag: "🇮🇳" },
    { code: "pa",  name: "Punjabi",    native: "ਪੰਜਾਬੀ",      flag: "🇮🇳" },
    { code: "ur",  name: "Urdu",       native: "اردو",        flag: "🇮🇳" },
    { code: "or",  name: "Odia",       native: "ଓଡ଼ିଆ",       flag: "🇮🇳" },
    { code: "es",  name: "Spanish",    native: "Español",    flag: "🇪🇸" },
    { code: "fr",  name: "French",     native: "Français",   flag: "🇫🇷" },
    { code: "de",  name: "German",     native: "Deutsch",    flag: "🇩🇪" },
    { code: "pt",  name: "Portuguese", native: "Português",  flag: "🇧🇷" },
    { code: "it",  name: "Italian",    native: "Italiano",   flag: "🇮🇹" },
    { code: "ru",  name: "Russian",    native: "Русский",    flag: "🇷🇺" },
    { code: "ar",  name: "Arabic",     native: "العربية",     flag: "🇸🇦" },
    { code: "zh-CN", name: "Chinese",  native: "中文",        flag: "🇨🇳" },
    { code: "ja",  name: "Japanese",   native: "日本語",      flag: "🇯🇵" },
    { code: "ko",  name: "Korean",     native: "한국어",      flag: "🇰🇷" },
    { code: "id",  name: "Indonesian", native: "Bahasa",     flag: "🇮🇩" },
    { code: "tr",  name: "Turkish",    native: "Türkçe",     flag: "🇹🇷" }
  ];

  // comma list of real google codes (bases for the special modes)
  var GOOGLE_CODES = "hi,gu,mr,bn,ta,te,kn,ml,pa,ur,or,es,fr,de,pt,it,ru,ar,zh-CN,ja,ko,id,tr";

  /* ============================================================
     v222: NATURAL VOCABULARY — the words people actually type
     ============================================================ */
  var HINGLISH_DICT = {
    /* pronouns & the little words */
    "मैं": "main", "मैंने": "maine", "मुझे": "mujhe", "मुझको": "mujhe", "मेरा": "mera", "मेरी": "meri", "मेरे": "mere",
    "तुम": "tum", "तुमने": "tumne", "तुझे": "tujhe", "तेरा": "tera", "तेरी": "teri", "तेरे": "tere",
    "आप": "aap", "आपने": "aapne", "आपको": "aapko", "आपका": "aapka", "आपकी": "aapki", "आपके": "aapke",
    "हम": "hum", "हमने": "humne", "हमें": "humein", "हमारा": "hamara", "हमारी": "hamari", "हमारे": "hamare",
    "वह": "woh", "वो": "woh", "उसने": "usne", "उसे": "use", "उसका": "uska", "उसकी": "uski", "उसके": "uske",
    "वे": "woh", "उन्होंने": "unhone", "उन्हें": "unhe", "उनका": "unka", "उनकी": "unki", "उनके": "unke",
    "यह": "yeh", "ये": "yeh", "इसने": "isne", "इसे": "ise", "इसका": "iska", "इसकी": "iski", "इसके": "iske",
    "इन्होंने": "inhone", "इन्हें": "inhe", "अपना": "apna", "अपनी": "apni", "अपने": "apne", "खुद": "khud",
    /* the glue — hai/tha/karna & friends */
    "है": "hai", "हैं": "hain", "हूँ": "hoon", "हो": "ho", "होना": "hona", "होता": "hota", "होती": "hoti", "होते": "hote", "हुआ": "hua", "हुई": "hui", "हुए": "hue",
    "था": "tha", "थी": "thi", "थे": "the", "रहा": "raha", "रही": "rahi", "रहे": "rahe", "रहना": "rahna",
    "करना": "karna", "करता": "karta", "करती": "karti", "करते": "karte", "किया": "kiya", "की": "ki", "का": "ka", "के": "ke", "को": "ko",
    "करके": "karke", "करने": "karne", "करने के लिए": "karne ke liye", "करिये": "kariye", "करिए": "kariye", "कीजिए": "kijiye",
    "जाना": "jaana", "जाता": "jata", "जाती": "jati", "जाते": "jate", "गया": "gaya", "गई": "gayi", "गए": "gaye", "जाओ": "jao",
    "देना": "dena", "दिया": "diya", "देता": "deta", "देती": "deti", "देते": "dete", "दो": "do",
    "लेना": "lena", "लिया": "liya", "लेता": "leta", "लेती": "leti", "लेते": "lete", "लो": "lo",
    "कहना": "kehna", "कहा": "kaha", "कहते": "kehate", "कहती": "kehati", "बोलना": "bolna", "बोला": "bola",
    "बताना": "batana", "बताया": "bataya", "बताओ": "batao", "पूछना": "poochna", "पूछा": "poocha", "पूछो": "poocho",
    "सोचना": "sochna", "सोचा": "socha", "सोचो": "socho", "सोच": "soch", "विचार": "idea",
    "समझना": "samajhna", "समझा": "samjha", "समझो": "samjho", "समझ": "samajh", "समझते": "samajhte", "समझती": "samajhti",
    "देखना": "dekhna", "देखा": "dekha", "देखो": "dekho", "देखें": "dekhein", "दिखा": "dikha", "दिखता": "dikhta", "दिखती": "dikhti",
    "सीखना": "seekhna", "सीखा": "seekha", "सीखो": "seekho", "सीख": "seekh", "सिखाता": "sikhata", "सिखाती": "sikhati",
    "पढ़ना": "padhna", "पढ़ा": "padha", "पढ़ो": "padho", "पढ़ते": "padhte", "पढ़ाई": "padhai", "लिखना": "likhna", "लिखा": "likha", "लिखो": "likho",
    "आना": "aana", "आया": "aaya", "आई": "aayi", "आए": "aaye", "आओ": "aao", "आता": "aata", "आती": "aati", "आते": "aate",
    "जीना": "jeena", "जिया": "jiya", "मरना": "marna", "मरा": "mara", "मिलना": "milna", "मिला": "mila", "मिली": "mili", "मिले": "mile", "मिलता": "milta", "मिलती": "milti", "मिलते": "milte",
    "बनना": "banna", "बना": "bana", "बनी": "bani", "बने": "bane", "बनता": "banta", "बनती": "banti", "बनते": "bante", "बनाओ": "banao",
    "रखना": "rakhna", "रखा": "rakha", "रखो": "rakho", "रखें": "rakhein", "रखता": "rakhta", "रखती": "rakhti",
    "चाहिए": "chahiye", "चाहता": "chahta", "चाहती": "chahti", "चाहते": "chahte", "चाहे": "chahe", "चाहो": "chaho",
    "सकता": "sakta", "सकती": "sakti", "सकते": "sakte", "सकूँ": "sakoon", "सकें": "sakein",
    "होगा": "hoga", "होगी": "hogi", "होंगे": "hongey", "करूँगा": "karunga", "करूँगी": "karungi", "करेंगे": "karenge", "करूँ": "karoon",
    "रोकना": "rokna", "रोका": "roka", "बढ़ना": "badhna", "बढ़ता": "badhta", "बढ़ती": "badhti", "बढ़ते": "badhte", "बढ़ाया": "badhaya",
    "बदलना": "badalna", "बदला": "badla", "बदलता": "badalta", "बदलती": "badalti", "बदलते": "badalte", "बदलो": "badlo",
    "सुधारना": "sudharna", "सुधारा": "sudhara", "सुधरना": "sudhrna", "सुधरा": "sudhra", "सुधार": "sudhaar",
    "शुरू": "shuru", "खत्म": "khatam", "समाप्त": "khatam", "आरंभ": "shuru", "प्रारंभ": "shuru", "अंत": "end",
    /* the words of ordinary life */
    "नहीं": "nahi", "नही": "nahi", "हाँ": "haan", "हां": "haan", "जी": "ji", "न": "na",
    "और": "aur", "या": "ya", "पर": "par", "लेकिन": "lekin", "मगर": "magar", "बल्कि": "balki", "इसलिए": "isliye", "इसीलिए": "isliye", "अतः": "isliye", "क्योंकि": "kyunki", "ताकि": "taaki", "कि": "ki",
    "अगर": "agar", "यदि": "agar", "जब": "jab", "जबकि": "jabki", "जब तक": "jab tak", "जैसे": "jaise", "जैसा": "jaisa", "जैसी": "jaisi", "जैसे ही": "jaise hi",
    "बहुत": "bahut", "काफी": "kaafi", "ज़्यादा": "zyada", "ज्यादा": "zyada", "अधिक": "zyada", "कम": "kam", "थोड़ा": "thoda", "थोड़ी": "thodi", "थोड़े": "thode", "इतना": "itna", "इतनी": "itni", "इतने": "itne", "कितना": "kitna", "कितनी": "kitni", "कितने": "kitne",
    "अच्छा": "achha", "अच्छी": "achhi", "अच्छे": "achhe", "बुरा": "bura", "बुरी": "buri", "बुरे": "bure", "बड़ा": "bada", "बड़ी": "badi", "बड़े": "bade", "छोटा": "chhota", "छोटी": "chhoti", "छोटे": "chhote", "नया": "naya", "नई": "nayi", "नए": "naye", "पुराना": "purana", "पुरानी": "purani", "पुराने": "purane",
    "सही": "sahi", "गलत": "galat", "आसान": "asaan", "आसानी": "asaani", "मुश्किल": "mushkil", "कठिन": "mushkil", "कठोर": "sakht", "ज़रूरी": "zaroori", "जरूरी": "zaroori", "आवश्यक": "zaroori", "ज़रूर": "zaroor", "जरूर": "zaroor", "पक्का": "pakka",
    "हमेशा": "hamesha", "कभी": "kabhi", "कभी-कभी": "kabhi-kabhi", "कब": "kab", "कहाँ": "kahan", "कहां": "kahan", "क्यों": "kyun", "क्यूँ": "kyun", "कैसे": "kaise", "कैसा": "kaisa", "कैसी": "kaisi", "कहीं": "kahin",
    "अब": "ab", "अभी": "abhi", "फिर": "phir", "फिर से": "phir se", "वापस": "wapas", "पहले": "pehle", "पहले से": "pehle se", "बाद": "baad", "बाद में": "baad mein", "आज": "aaj", "कल": "kal", "अभी-अभी": "abhi-abhi", "पास": "paas", "दूर": "door", "यहाँ": "yahan", "वहाँ": "wahan", "हर": "har", "हर कोई": "har koi", "सब": "sab", "सभी": "sab",
    "में": "mein", "से": "se", "ने": "ne", "भी": "bhi", "तो": "to", "ही": "hi", "तक": "tak", "लिए": "liye", "बिना": "bina", "सिवाय": "sivay", "दौरान": "ke time", "के दौरान": "ke time", "के लिए": "ke liye", "की तरह": "ki tarah", "जैसे": "jaise",
    "साथ": "saath", "साथ में": "saath mein", "साथ-साथ": "saath-saath", "खिलाफ": "khilaf", "बारे में": "baare mein", "के बारे में": "ke baare mein",
    /* ordinary nouns (natural words) */
    "काम": "kaam", "बात": "baat", "बातें": "baatein", "बातों": "baaton", "लोग": "log", "दिन": "din", "रात": "raat", "साल": "saal", "सालों": "saalon", "समय": "samay", "पैसा": "paisa", "पैसे": "paise", "किताब": "kitaab", "किताबें": "kitaabein", "किताबों": "kitaabon", "पुस्तक": "kitaab", "पुस्तकें": "kitaabein",
    "घर": "ghar", "स्कूल": "school", "ऑफिस": "office", "दोस्त": "dost", "दोस्तों": "doston", "परिवार": "parivaar", "परिवारों": "parivaaron", "बच्चे": "bachhe", "बच्चों": "bachhon", "माँ": "maa", "मां": "maa", "पिता": "pita", "बेटा": "beta", "बेटी": "beti", "बेटे": "bete",
    "जिंदगी": "zindagi", "ज़िंदगी": "zindagi", "जीवन": "zindagi", "दुनिया": "duniya", "देश": "desh", "शहर": "shahar", "गांव": "gaon", "गाँव": "gaon", "सड़क": "sadak",
    "सफलता": "safalta", "सफल": "safal", "कामयाब": "kamyab", "पैसों": "paison", "पूंजी": "paisa", "निवेश": "investment", "ब्याज": "byaaj", "कर्ज़": "karz", "कर्ज": "karz", "बचत": "bachat", "खर्च": "kharch", "कमाई": "kamai", "मेहनत": "mehnat", "मेहनती": "mehnati",
    "स्वास्थ्य": "health", "सेहत": "sehat", "बीमारी": "bimari", "शरीर": "sharir", "दिमाग": "dimaag", "दिल": "dil", "मन": "man", "आँखें": "aankhein", "हाथ": "haath", "पैर": "pair", "खाना": "khana", "नींद": "neend", "पानी": "paani", "चाय": "chai", "दवा": "dava",
    "शिक्षा": "padhai", "विद्यालय": "school", "अध्याय": "chapter", "पृष्ठ": "page", "अभ्यास": "practice", "परीक्षा": "exam", "सबक": "lesson", "सीख": "seekh", "कहानी": "kahani", "कहानियां": "kahaniyan", "कहानियाँ": "kahaniyan", "कहानियों": "kahaniyon",
    "सवाल": "sawal", "सवालों": "sawalon", "जवाब": "jawaab", "मौका": "mauka", "अवसर": "mauka", "मदद": "madad", "सहायता": "madad", "कोशिश": "koshish", "प्रयास": "koshish", "योजना": "plan", "लक्ष्य": "goal", "मंजिल": "manzil", "सपना": "sapna", "सपने": "sapne", "आदत": "aadat", "आदतें": "aadatein", "आदतों": "aadaton", "तरीका": "tarika", "तरीके": "tareeke",
    "किस्मत": "kismat", "भाग्य": "kismat", "सच": "sach", "सच्चाई": "sachchai", "झूठ": "jhooth", "डर": "dar", "डरना": "darna", "हिम्मत": "himmat", "साहस": "himmat", "शक्ति": "taakat", "ताकत": "taakat", "अफवाह": "afwaah",
    "बढ़िया": "badhiya", "शानदार": "shandaar", "जबरदस्त": "zabardast", "कमाल": "kamaal", "मस्त": "mast", "मज़ेदार": "mazedaar", "बोरिंग": "boring", "उबाऊ": "boring",
    /* everyday verbs & fillers (natural spelling) */
    "पढ़": "padh", "पढ़ें": "padhein", "पढ़ता": "padhta", "पढ़ती": "padhti", "पढ़ते": "padhte", "पढ़ा": "padha",
    "स्वयं": "khud", "प्रत्येक": "har", "कोई": "koi", "काई": "koi", "सपनों": "sapnon", "पता": "pata", "क्या": "kya",
    "पड़ना": "padna", "पड़ता": "padta", "पड़ती": "padti", "पड़ते": "padte", "पड़े": "pade", "पड़ेगा": "padega",
    "लगता": "lagta", "लगती": "lagti", "लगते": "lagte", "लगा": "laga", "लगे": "lage", "लगाना": "lagana", "लगना": "lagna",
    "ठीक": "theek", "बिल्कुल": "bilkul", "खुश": "khush", "खुशी": "khushi", "थकान": "thakan", "थका": "thaka", "अकेला": "akela", "अकेले": "akele", "महत्वपूर्ण": "important",
    "बताइए": "bataiye", "बताएं": "batayein", "दीजिए": "dijiye", "खोजें": "khojein", "खोजो": "khojo", "ढूँढें": "dhoondein", "ढूंढो": "dhoondo", "सुझाव": "suggestion", "सुझाओ": "suggest karo",
    "उपयोग": "use", "प्रयोग": "use", "सुनिश्चित": "sure", "सुनिश्चित करें": "sure karein", "क्षमा करें": "maaf karein", "माफ़ करना": "maaf karna", "माफ़": "maaf",
    "सोना": "sona", "सोया": "soya", "सोओ": "soo", "बैठना": "baithna", "बैठा": "baitha", "बैठे": "baithe", "बैठो": "baitho", "उठना": "uthna", "उठा": "utha", "उठो": "utho",
    "खेलना": "khelna", "खेलते": "khelte", "खेलो": "khelo", "हँसना": "hansna", "हँसते": "hanste", "हँसा": "hansa", "रोना": "rona", "रोया": "roya",
    "जल्दी": "jaldi", "धीरे": "dheere", "शब्द": "shabd", "वाक्य": "vaaky", "पाठ": "path", "अध्याय": "adhyay", "सबक": "sabak",
    "बाकी": "baaki", "साफ": "saaf", "साफ़": "saaf", "गहरा": "gehra", "गहरी": "gehri", "गहरे": "gehre",
    "आगे": "aage", "पीछे": "peeche", "ऊपर": "upar", "नीचे": "neeche", "अंदर": "andar", "बाहर": "bahar",
    "सुबह": "subah", "शाम": "shaam", "रोज़": "roz", "हफ्ता": "hafta", "हफ्ते": "hafte", "महीना": "mahina", "महीने": "mahine", "सरकार": "sarkar", "नेता": "neta", "विदेश": "videsh",
    /* formality swaps — plain words for book words */
    "कृपया": "please", "धन्यवाद": "shukriya", "आभार": "shukriya", "नमस्ते": "namaste", "नमस्कार": "namaste", "स्वागत है": "swagat hai", "स्वागत": "swagat",
    "उदाहरण": "example", "उदाहरण के लिए": "example ke liye", "जैसे कि": "jaise ki", "अर्थात्": "yaani", "यानी": "yaani", "मतलब": "matlab", "वास्तव में": "sach mein", "सच में": "sach mein", "वैसे": "waise", "वैसे भी": "waise bhi",
    "बहुत बड़ा": "bahut bada", "सबसे अच्छा": "sabse achha", "सबसे बड़ा": "sabse bada", "एक दूसरे": "ek dusre", "एक-दूसरे": "ek-dusre", "एक साथ": "ek saath", "आपस में": "aapas mein",
    /* common book/idea vocabulary the way readers text it */
    "लेखक": "writer", "लेखिका": "writer", "पाठक": "reader", "पाठकों": "readers", "सिद्धांत": "principle", "सिद्धांतों": "principles", "नियम": "rule", "नियमों": "rules", "कानून": "kanoon", "बुद्धिमत्ता": "intelligence", "समझदारी": "samajhdari",
    "हेतु": "ke liye", "कार्यरत": "kaam kar rahe", "स्वतंत्रता": "aazaadi", "स्वाधीनता": "aazaadi", "कर्तव्य": "farz", "कर्तव्यों": "farz", "अधिकार": "haq", "अधिकारों": "haq",
    "यात्रा": "safar", "अनुभव": "experience", "अनुभवों": "experiences", "ज्ञान": "gyan", "सत्य": "sach", "उत्तर": "jawaab", "प्रश्न": "sawal",
    "कठिनाई": "mushkil", "दृढ़": "mazboot", "दृढ़ता": "mazbooti", "सकारात्मक": "positive", "नकारात्मक": "negative", "चुनौती": "challenge", "चुनौतियों": "challenges", "बाधा": "rukaavat",
    "समाधान": "solution", "लाभ": "faayda", "हानि": "nuksaan", "नुकसान": "nuksaan", "धन": "paisa", "संपत्ति": "property", "व्यवसाय": "business", "धंधा": "dhandha", "अध्ययन": "padhai",
    "प्रगति": "progress", "उन्नति": "progress", "प्रेरणा": "inspiration", "प्रेरित": "inspire", "स्मरण": "yaad", "आशा": "umeed", "निराशा": "niraas", "निराश": "niraash",
    "शांति": "shaanti", "शान्ति": "shaanti", "क्रोध": "gussa", "गुस्सा": "gussa", "प्रेम": "pyaar", "स्नेह": "pyaar", "दुःख": "dukh", "दुख": "dukh", "वातावरण": "mahaul",
    "परिस्थिति": "situation", "परिस्थितियों": "situations", "उद्देश्य": "maksad", "प्रतिभा": "talent", "व्यक्तित्व": "personality", "विकास": "growth", "विकसित": "developed", "सहित": "samet",
    "अर्थ": "matlab", "कारण": "vajah", "वजह": "vajah", "परिणाम": "result", "परिणामों": "results", "निर्णय": "decision", "आदेश": "order", "प्रकृति": "nature", "प्रकार": "type", "तरह": "tarah",
    "स्थान": "jagah", "जगह": "jagah", "वस्तु": "cheez", "चीज़": "cheez", "कार्य": "kaam", "वर्षों": "saalon", "दिनों": "dinon", "स्थिति": "halat", "हालत": "halat",
    "असंभव": "namumkin", "नामुमकिन": "namumkin", "संभव": "mumkin", "मुमकिन": "mumkin", "विश्वास": "vishwas", "भरोसा": "bharosa", "मुसीबत": "museebat", "सफर": "safar", "आज़ादी": "aazaadi", "इच्छा": "ichchha", "शक्तिशाली": "strong", "निर्भर": "dependent", "निर्भरता": "dependency",
    "धैर्य": "sabr", "सब्र": "sabr", "अनुशासन": "discipline", "आत्मविश्वास": "self-belief", "आत्म-विश्वास": "self-belief", "आत्मा": "aatma", "ध्यान": "dhyaan", "एकाग्रता": "focus", "मनोविज्ञान": "psychology", "भावनाएं": "feelings", "भावनाओं": "feelings", "रिश्ते": "rishte", "रिश्तों": "rishton", "समाज": "samaaj", "संस्कृति": "culture", "इतिहास": "itihaas", "भविष्य": "future", "भविष्य में": "future mein"
  };

  var GUJLISH_DICT = {
    /* pronouns */
    "હું": "hun", "મને": "mane", "મારું": "maru", "મારી": "mari", "મારા": "mara", "અમે": "ame", "અમને": "amne",
    "તમે": "tame", "તમને": "tamne", "તમારું": "tamaru", "તમારી": "tamari", "તમારા": "tamara", "તું": "tu", "તને": "tane", "તારું": "taru", "તારી": "tari", "તારા": "tara",
    "તે": "te", "તેણે": "tene", "તેને": "tene", "તેનું": "tenu", "તેની": "teni", "તેના": "tena", "આ": "aa", "એ": "e", "આપણું": "aapnu", "આપણી": "aapni", "આપણા": "aapna", "આપણે": "aapne",
    /* glue */
    "છે": "che", "છું": "chhun", "છીએ": "chhie", "નથી": "nathi", "નથી.": "nathi", "હતું": "hatu", "હતી": "hati", "હતા": "hata", "થાય": "thay", "થવું": "thavu", "થયું": "thayu", "થયા": "thaya", "થતું": "thatu", "થતી": "thati", "થતા": "thata", "થશે": "thashe", "થશો": "thasho",
    "કરવું": "karvu", "કરે": "kare", "કરે છે": "kare che", "કર્યું": "karyu", "કર્યા": "karya", "કરતું": "kartu", "કરતો": "karto", "કરતી": "karti", "કરતા": "karta", "કરો": "karo", "કરીને": "karine",
    "કરશે": "karshe", "કરશો": "karsho", "કરીશ": "karish", "કરીશું": "karishun", "કરીએ": "kariye",
    "જવું": "javu", "જાય": "jay", "જાય છે": "jay che", "ગયું": "gayu", "ગયા": "gaya", "જાઓ": "jao", "જતું": "jatu", "જતી": "jati", "જતા": "jata", "જશે": "jashe", "જશો": "jasho",
    "આવવું": "aavvu", "આવે": "aave", "આવે છે": "aave che", "આવ્યું": "aavvu", "આવ્યા": "aavya", "આવો": "aavo", "આવશે": "aavshe", "આવશો": "aavsho",
    "જુઓ": "juo", "જુઓ.": "juo", "જોવું": "jovu", "જોયું": "joyu", "જોયા": "joya", "જોતું": "jotu", "જોતી": "joti", "જોતા": "jota",
    "કહેવું": "kehevu", "કહે": "kahe", "કહ્યું": "kahyu", "કહ્યા": "kahya", "કહો": "kaho", "બોલવું": "bolvu", "બોલ્યું": "bolyu",
    "સમજવું": "samajvu", "સમજાય": "samjay", "સમજાય છે": "samjay che", "સમજ્યું": "samajyu", "સમજો": "samjo", "સમજ": "samaj",
    "વિચારવું": "vicharvu", "વિચારો": "vicharo", "વિચાર્યું": "vicharyu", "વિચાર": "vichar",
    "શીખવું": "shikhavu", "શીખ્યું": "shikhyu", "શીખો": "shikho", "શીખ": "shikh", "શીખવે": "shikhave",
    "વાંચવું": "vanchvu", "વાંચ્યું": "vanchyu", "વાંચો": "vancho", "વાંચે": "vanche", "લખવું": "lakhavu", "લખ્યું": "lakhyu", "લખો": "lakho",
    "ભણવું": "bhanvu", "ભણો": "bhano", "ભણ્યું": "bhanyu", "ભણી": "bhani",
    "આપવું": "aapvu", "આપ્યું": "aapyu", "આપો": "aapo", "આપશો": "aapsho", "આપશે": "aapshe",
    "લેવું": "levu", "લીધું": "lidhu", "લો": "lo",
    "જોઈએ": "joiye", "જોઈએ છે": "joiye che", "જોઈતું": "joitu", "જોઈશું": "joishun",
    "શકે": "shake", "શકો": "shako", "શકું": "shakun", "શકાય": "shakay", "શકશે": "shakshe", "શકીએ": "shakie", "કરીએ": "kariye", "જઈએ": "jaiye", "આવીએ": "aaviye",
    "મળવું": "malvu", "મળે": "male", "મળે છે": "male che", "મળ્યું": "malyu", "મળ્યા": "malya", "મળો": "malo", "મળશે": "malshe", "મળશો": "malsho",
    "રહેવું": "rahevu", "રહે": "rahe", "રહ્યું": "rahyu", "રહ્યા": "rahya", "રહો": "raho", "રહેતું": "rahetu", "રહેતી": "raheti", "રહેતા": "raheta", "રહેશે": "raheshe", "રહેશો": "rahesho",
    "બનવું": "banvu", "બને": "bane", "બન્યું": "banyu", "બન્યા": "banya", "બનાવો": "banavo", "બનાવ્યું": "banavyu", "બનશે": "banshe",
    "રોકવું": "rokvu", "રોક્યું": "rokyu", "વધવું": "vadhavu", "વધે": "vadhe", "વધ્યું": "vadhyu", "વધશે": "vadshe",
    "બદલવું": "badalvu", "બદલ્યું": "badlyu", "બદલાય": "badlay", "સુધારવું": "sudharvu", "સુધાર્યું": "sudharyu",
    "પડે": "padhe", "પડશે": "padshe", "પડશો": "padsho",
    "શરૂ": "shuru", "ખતમ": "khatam", "પૂરું": "puru", "અંત": "end", "શરૂ કરવું": "shuru karvu", "શરૂ કરો": "shuru karo",
    /* life words */
    "અને": "ane", "પણ": "pan", "કે": "ke", "પરંતુ": "pan", "તેથી": "etle", "એટલે": "etle", "કારણ કે": "kaaran ke", "જેથી": "jethi", "જો": "jo", "તો": "to", "પછી": "pachhi", "પહેલા": "pehla", "પહેલાં": "pehla", "પછી થી": "pachhi thi",
    "માં": "ma", "થી": "thi", "ને": "ne", "નું": "nu", "ની": "ni", "ના": "na", "માટે": "mate", "સાથે": "sathe", "વગર": "vagra", "સુધી": "sudhi", "વિના": "vagra", "દરમિયાન": "darmiyaan",
    "હા": "ha", "ના": "na", "ના.": "na", "બિલકુલ": "bilkul", "ખરેખર": "kharekhar", "સાચે": "sache", "સાચું": "sachu", "સાચી": "sachi", "સાચા": "sacha", "ખોટું": "khotu", "ખોટી": "khoti",
    "બહુ": "bahu", "ખૂબ": "khub", "ઘણું": "ghanu", "ઓછું": "ochhu", "વધુ": "vadhu", "થોડું": "thodu", "થોડી": "thodi", "થોડા": "thoda", "કેટલું": "ketlu", "કેટલી": "ketli", "કેટલા": "ketla", "ઇતનું": "itnu", "ઇતની": "itni", "ઇતના": "itna",
    "સારું": "saru", "સારી": "sari", "સારા": "sara", "સરસ": "saras", "ખરાબ": "kharab", "મોટું": "motu", "મોટી": "moti", "મોટા": "mota", "નાનું": "nanu", "નાની": "nani", "નાના": "nana", "નવું": "navu", "નવી": "navi", "નવા": "nava", "જૂનું": "junu", "જૂની": "juni", "જૂના": "juna", "સરળ": "saral", "મુશ્કેલ": "mushkel", "જરૂરી": "jaruri", "જરૂર": "jarur", "હંમેશા": "hamesha", "ક્યારેક": "kyarek", "ક્યારે": "kyare", "ક્યાં": "kyan", "કેમ": "kem", "કેવી": "kevi", "કેવું": "kevu", "કેવા": "keva", "કઈ": "kai", "કયું": "kayu", "કયા": "kaya",
    "હવે": "have", "હમણાં": "haman", "પછી": "pachhi", "ફરી": "fari", "ફરી થી": "fari thi", "વાપસ": "wapas", "પાસે": "paase", "દૂર": "door", "અહીં": "ahin", "ત્યાં": "tyan", "દરેક": "darek", "બધા": "badha", "બધું": "badhu", "બધી": "badhi", "કંઈ": "kai", "કોઈ": "koi",
    "કામ": "kaam", "વાત": "vaat", "વાતો": "vaato", "લોકો": "loko", "દિવસ": "divas", "રાત": "raat", "વર્ષ": "varas", "સમય": "samay", "પૈસા": "paisa", "પૈસે": "paise", "કિતાબ": "kitaab", "કિતાબો": "kitaabo", "પુસ્તક": "kitaab", "ઘર": "ghar", "શાળા": "school", "ઓફિસ": "office", "મિત્ર": "dost", "મિત્રો": "dosto", "પરિવાર": "parivaar", "બાળકો": "baalko", "મા": "maa", "પિતા": "pita", "દીકરો": "dikro", "દીકરી": "dikri",
    "જીવન": "jeevan", "દુનિયા": "duniya", "દેશ": "desh", "શહેર": "shahar", "ગામ": "gaam", "રસ્તો": "rasto",
    "પોતાનું": "potanu", "પોતાની": "potani", "પોતાના": "potana", "પોતાને": "potane", "પોતે": "pote",
    "અમારું": "amaru", "અમારી": "amari", "અમારા": "amara", "આનું": "aanu", "આની": "aani", "આના": "aana", "આને": "aane", "એનું": "enu", "એની": "eni", "એના": "ena", "એને": "ene", "કોને": "kone", "જેને": "jene",
    "સફળતા": "safalta", "સફળ": "safal", "કામયાબ": "kamyab", "મહેનત": "mehnat", "બચત": "bachat", "ખર્ચ": "kharch", "કમાણી": "kamani", "દેવું": "deynu", "દેવા": "deva", "વ્યાજ": "vyaaj",
    "શરીર": "sharir", "દિમાગ": "dimaag", "હૃદય": "dil", "મન": "man", "આંખો": "aankho", "હાથ": "haath", "પગ": "pag", "ખાવું": "khavu", "ઊંઘ": "ungh", "પાણી": "paani", "ચા": "cha", "દવા": "dava",
    "શિક્ષણ": "shikshan", "અધ્યાય": "adhyay", "પાનું": "panu", "પ્રેક્ટિસ": "practice", "પરીક્ષા": "exam", "સબક": "sabak", "શીખ": "shikh", "વાર્તા": "vaarta", "વાર્તાઓ": "vaartaao", "વ્યક્તિ": "vyakti", "વ્યક્તિએ": "vyakti e", "વ્યક્તિઓ": "vyaktio",
    "સવાલ": "sawaal", "જવાબ": "jawaab", "તક": "tak", "મદદ": "madad", "કોશિશ": "koshish", "પ્રયત્ન": "koshish", "યોજના": "plan", "લક્ષ્ય": "goal", "સપનું": "sapnu", "સપના": "sapna", "ટેવ": "tev", "ટેવો": "tevo", "રીત": "rit", "રીતે": "rite",
    "નસીબ": "naseeb", "સાચી વાત": "sachi vaat", "ખોટી વાત": "khoti vaat", "ડર": "dar", "હિંમત": "himmat", "તાકાત": "taakat",
    "શાનદાર": "shandaar", "જબરદસ્ત": "zabardast", "કમાલ": "kamaal", "મસ્ત": "mast", "મજેદાર": "majedar", "બોરિંગ": "boring", "કંટાળો": "kantalo",
    /* formality → plain */
    "કૃપા કરીને": "please", "કૃપા": "please", "આભાર": "aabhaar", "ધન્યવાદ": "aabhaar", "નમસ્તે": "namaste", "નમસ્કાર": "namaste", "સ્વાગત": "swagat",
    "ઉદાહરણ": "example", "ઉદાહરણ તરીકે": "example tarike", "એટલે કે": "etle ke", "એટલે": "etle", "મતલબ": "matlab", "ખરેખરમાં": "kharekhar", "જેમ કે": "jem ke",
    "લેખક": "writer", "વાચક": "reader", "સિદ્ધાંત": "principle", "નિયમ": "rule", "કાયદો": "kanoon", "શિસ્ત": "discipline", "આત્મવિશ્વાસ": "self-belief", "ધ્યાન": "dhyaan", "એકાગ્રતા": "focus", "મનોવિજ્ઞાન": "psychology", "લાગણીઓ": "feelings", "સંબંધો": "rishta", "સમાજ": "samaaj", "સંસ્કૃતિ": "culture", "ઇતિહાસ": "itihaas", "ભવિષ્ય": "future",
    "હેતુ": "mate", "કાર્ય": "kaam", "સ્વતંત્રતા": "aazaadi", "આઝાદી": "aazaadi", "ફરજ": "farz", "અધિકાર": "haq", "જ્ઞાન": "gyan", "સત્ય": "sach", "ઉત્તર": "jawaab", "પ્રશ્ન": "sawaal",
    "મુશ્કેલી": "mushkeli", "અડચણ": "rukavat", "હકારાત્મક": "positive", "નકારાત્મક": "negative", "પડકાર": "challenge", "ઉપાય": "upay", "ફાયદો": "faaydo", "નુકસાન": "nukasaan", "સંપત્તિ": "property", "ધંધો": "dhandho",
    "પ્રગતિ": "progress", "પ્રેરણા": "inspiration", "સ્મરણ": "yaad", "આશા": "aasha", "નિરાશા": "niraasha", "શાંતિ": "shaanti", "ક્રોધ": "gussa", "ગુસ્સો": "gussa", "પ્રેમ": "pyaar", "સ્નેહ": "pyaar",
    "દુઃખ": "dukh", "દુખ": "dukh", "વાતાવરણ": "mahol", "પરિસ્થિતિ": "situation", "ઉદ્દેશ્ય": "maksad", "પ્રતિભા": "talent", "વ્યક્તિત્વ": "personality", "વિકાસ": "growth", "સહિત": "samet", "અર્થ": "matlab",
    "કારણ": "karan", "પરિણામ": "result", "નિર્ણય": "decision", "પ્રકૃતિ": "nature", "પ્રકાર": "type", "રીતે": "rite", "સ્થાન": "jagya", "જગ્યા": "jagya", "વસ્તુ": "cheez", "ચીજ": "cheej", "બાબત": "vaat",
    "અશક્ય": "namumkin", "શક્ય": "mumkin", "વિશ્વાસ": "vishwas", "ભરોસો": "bharoso", "મુસીબત": "museebat", "પ્રવાસ": "safar", "ઇચ્છા": "ichchha", "ક્ષમતા": "khamta", "પ્રયોગ": "use", "ઉપયોગ": "use"
  };

  /* build sorted phrase lists (longest first) */
  function dictList(d) {
    return Object.keys(d).sort(function (a, b) { return b.length - a.length; });
  }
  var HI_KEYS = dictList(HINGLISH_DICT);
  var GU_KEYS = dictList(GUJLISH_DICT);

  /* Gujarati postpositions that fuse onto the word (ઘરમાં → ghar ma) */
  var GU_FUSE = ["માં", "નું", "ની", "ના", "ને", "થી", "પર", "માટે", "સુધી", "વગર"];
  function endsWith(s, sfx) {
    return s.length > sfx.length && s.slice(s.length - sfx.length) === sfx;
  }
  /* try to split a fused word; returns null if no known postposition suffix */
  function fuseWord(wd, mode, dict, cache, engine, range) {
    if (mode !== "gu-Latn") return null;
    for (var s = 0; s < GU_FUSE.length; s++) {
      var sfx = GU_FUSE[s];
      if (!endsWith(wd, sfx)) continue;
      var base = wd.slice(0, wd.length - sfx.length);
      if (base.length < 2 || !range.test(base)) continue;
      /* the char before the suffix must be a consonant or matra (a real fusion) */
      var prev = wd[wd.length - sfx.length - 1];
      if (prev && /[a-zA-Z]/.test(prev)) continue;
      var b = romanWord(base, dict, cache, engine, range);
      var s2 = romanWord(sfx, dict, cache, engine, range);
      if (b && s2) return b + " " + s2;
    }
    return null;
  }
  /* romanize a single word: dict → cache → engine */
  function romanWord(wd, dict, cache, engine, range) {
    if (dict[wd]) return dict[wd];
    if (cache[wd]) return cache[wd];
    return engine(wd);
  }

  /* ============================================================
     RULES ENGINE — word-aware transliteration
     (keeps natural short vowels; no "kiyaa / baat / zindagiii")
     ============================================================ */
  var DEV_CONS = { "क":"k","ख":"kh","ग":"g","घ":"gh","ङ":"n","च":"ch","छ":"chh","ज":"j","झ":"jh","ञ":"n","ट":"t","ठ":"th","ड":"d","ढ":"dh","ण":"n","त":"t","थ":"th","द":"d","ध":"dh","न":"n","प":"p","फ":"ph","ब":"b","भ":"bh","म":"m","य":"y","र":"r","ल":"l","व":"v","श":"sh","ष":"sh","स":"s","ह":"h","क़":"q","ख़":"kh","ग़":"g","ज़":"z","ड़":"r","ढ़":"rh","फ़":"f" };
  var DEV_VOW_IND = { "अ":"a","आ":"aa","इ":"i","ई":"ee","उ":"u","ऊ":"oo","ऋ":"ri","ए":"e","ऐ":"ai","ओ":"o","औ":"au","ऑ":"o" };
  var DEV_MATRA = { "ा":"a","ि":"i","ी":"i","ु":"u","ू":"u","ृ":"ri","े":"e","ै":"ai","ो":"o","ौ":"au","ॉ":"o" };
  var GUJ_CONS = { "ક":"k","ખ":"kh","ગ":"g","ઘ":"gh","ઙ":"n","ચ":"ch","છ":"chh","જ":"j","ઝ":"jh","ઞ":"n","ટ":"t","ઠ":"th","ડ":"d","ઢ":"dh","ણ":"n","ત":"t","થ":"th","દ":"d","ધ":"dh","ન":"n","પ":"p","ફ":"ph","બ":"b","ભ":"bh","મ":"m","ય":"y","ર":"r","લ":"l","ળ":"l","વ":"v","શ":"sh","ષ":"sh","સ":"s","હ":"h" };
  var GUJ_VOW_IND = { "અ":"a","આ":"aa","ઇ":"i","ઈ":"i","ઉ":"u","ઊ":"u","ઋ":"ru","એ":"e","ઐ":"ai","ઓ":"o","ઔ":"au","ઍ":"e","ઑ":"o" };
  var GUJ_MATRA = { "ા":"a","િ":"i","ી":"i","ુ":"u","ૂ":"u","ૃ":"ru","ે":"e","ૈ":"ai","ો":"o","ૌ":"au","ૅ":"e","ૉ":"o" };

  function makeTransliterator(cons, vowInd, matra, virama, nasal, range) {
    return function (text) {
      var out = "", i = 0;
      while (i < text.length) {
        var ch = text[i];
        if (cons[ch] && text[i + 1] === nasal.nukta) {
          var comb = ch + nasal.nukta;
          out += cons[comb] || cons[ch];
          i += 2;
          var nx2 = text[i];
          if (nx2 === virama) { i++; continue; }
          if (nx2 && matra[nx2]) { out += matra[nx2]; i++; continue; }
          if (text[i] && range.test(text[i])) out += "a";
          continue;
        }
        if (cons[ch]) {
          out += cons[ch];
          var next = text[i + 1];
          if (next === virama) { i += 2; continue; }
          if (next && matra[next]) { out += matra[next]; i += 2; continue; }
          var after = text[i + 1];
          if (after && range.test(after)) out += "a";
          i++;
          continue;
        }
        if (vowInd[ch]) { out += vowInd[ch]; i++; continue; }
        if (ch === nasal.anusvara) { out += "n"; i++; continue; }
        if (ch === nasal.candrabindu) { out += "n"; i++; continue; }
        if (ch === nasal.visarga) { out += "h"; i++; continue; }
        if (ch === virama || ch === nasal.nukta) { i++; continue; }
        out += ch; i++;
      }
      return out;
    };
  }

  var rulesHi = makeTransliterator(DEV_CONS, DEV_VOW_IND, DEV_MATRA, "्",
    { anusvara: "ं", candrabindu: "ँ", visarga: "ः", nukta: "़" }, /[\u0900-\u097F]/);
  var rulesGu = makeTransliterator(GUJ_CONS, GUJ_VOW_IND, GUJ_MATRA, "્",
    { anusvara: "ં", candrabindu: "ઁ", visarga: "ઃ", nukta: "઼" }, /[\u0A80-\u0AFF]/);

  function toHinglish(text) { return naturalRoman(text, "hi-Latn"); }
  function toGujlish(text) { return naturalRoman(text, "gu-Latn"); }

  /* ============================================================
     LIVE TRANSLITERATION (Google Input Tools via JSONP — no key)
     Cyrillic-free, per-word, cached. Gujarati is mapped onto
     Devanagari first (the two scripts are phonetically aligned)
     because Google only exposes the reverse hi→en IME.
     ============================================================ */
  var trCacheHi = {}, trCacheGu = {};
  try { trCacheHi = JSON.parse(localStorage.getItem("tsb_tr_hi") || "{}"); } catch (e) {}
  try { trCacheGu = JSON.parse(localStorage.getItem("tsb_tr_gu") || "{}"); } catch (e) {}
  var pendingWords = {};      /* word -> attempts left (2) */
  var inFlight = 0;
  var cachingTimer = null;
  var cacheDirty = false;

  var GU2DEV = {
    "ક":"क","ખ":"ख","ગ":"ग","ઘ":"घ","ઙ":"ङ","ચ":"च","છ":"छ","જ":"ज","ઝ":"झ","ઞ":"ञ","ટ":"ट","ઠ":"ठ","ડ":"ड","ઢ":"ढ","ણ":"ण","ત":"त","થ":"थ","દ":"द","ધ":"ध","ન":"न","પ":"प","ફ":"फ","બ":"ब","ભ":"भ","મ":"म","ય":"य","ર":"र","લ":"ल","ળ":"ळ","વ":"व","શ":"श","ષ":"ष","સ":"स","હ":"ह",
    "અ":"अ","આ":"आ","ઇ":"इ","ઈ":"ई","ઉ":"उ","ઊ":"ऊ","ઋ":"ऋ","એ":"ए","ઐ":"ऐ","ઓ":"ओ","ઔ":"औ","ઍ":"ऍ","ઑ":"ऑ",
    "ા":"ा","િ":"ि","ી":"ी","ુ":"ु","ૂ":"ू","ૃ":"ृ","ે":"े","ૈ":"ै","ો":"ो","ૌ":"ौ","ૅ":"ॅ","ૉ":"ॉ",
    "્":"्","ં":"ं","ઁ":"ँ","ઃ":"ः","઼":"़","ઽ":"ऽ"
  };
  function toDev(text) {
    var out = "";
    for (var i = 0; i < text.length; i++) out += GU2DEV[text[i]] || text[i];
    return out;
  }

  function jsonp(url, cbName, timeoutMs) {
    return new Promise(function (resolve) {
      var done = false;
      var s = document.createElement("script");
      var timer = setTimeout(function () { cleanup(); resolve(null); }, timeoutMs || 4500);
      function cleanup() {
        clearTimeout(timer);
        try { delete window[cbName]; } catch (e) {}
        if (s.parentNode) s.parentNode.removeChild(s);
      }
      window[cbName] = function (data) { if (done) return; done = true; cleanup(); resolve(data); };
      s.onerror = function () { if (done) return; done = true; cleanup(); resolve(null); };
      s.src = url;
      document.head.appendChild(s);
    });
  }

  function saveTrCache(mode) {
    var key = mode === "gu-Latn" ? "tsb_tr_gu" : "tsb_tr_hi";
    try { localStorage.setItem(key, JSON.stringify(mode === "gu-Latn" ? trCacheGu : trCacheHi)); } catch (e) {}
  }
  function markCached(mode) {
    cacheDirty = true;
    if (cachingTimer) return;
    cachingTimer = setTimeout(function () { cachingTimer = null; saveTrCache(mode); }, 2000);
  }

  function fetchWord(word, mode, attemptsLeft) {
    if (inFlight >= 2) return false;
    inFlight++;
    var isGu = mode === "gu-Latn";
    var cb = "tsbtr_" + Math.floor(Math.random() * 1e9);
    var payload = isGu ? toDev(word) : word;
    var url = "https://www.google.com/inputtools/request?text=" + encodeURIComponent(payload) +
      "&ime=transliteration_hi_en&num=5&cb=" + cb + "&ie=utf-8&oe=utf-8";
    jsonp(url, cb, 4500).then(function (data) {
      inFlight--;
      try {
        var ok = false;
        if (data && data[0] === "SUCCESS" && data[1] && data[1][0]) {
          var cands = data[1][0][1];
          var roman = Array.isArray(cands) ? (cands[0] || "") : String(cands || "");
          roman = String(roman).replace(/\s+/g, "").trim();
          if (roman && /^[A-Za-z]+$/.test(roman) && roman.length <= 40) {
            var cache = isGu ? trCacheGu : trCacheHi;
            if (!cache[word]) {
              cache[word] = roman;
              markCached(mode);
            }
            ok = true;
          }
        }
        if (!ok && attemptsLeft > 1) {
          pendingWords[word] = attemptsLeft - 1;
        } else if (!ok) {
          delete pendingWords[word]; /* give up quietly — rule engine stands in */
        }
      } catch (e) { delete pendingWords[word]; }
      pumpWords(mode);
    });
    return true;
  }

  function pumpWords(mode) {
    var words = Object.keys(pendingWords);
    if (!words.length) return;
    for (var i = 0; i < words.length && inFlight < 2; i++) {
      var w = words[i];
      if (!cacheFor(mode, w)) fetchWord(w, mode, pendingWords[w]);
    }
  }
  function cacheFor(mode, w) { return (mode === "gu-Latn" ? trCacheGu : trCacheHi)[w]; }

  /* ============================================================
     NATURAL PIPELINE: dict → cache → live API → rules
     ============================================================ */
  function naturalRoman(text, mode) {
    if (!text) return text;
    /* Devanagari danda → plain full stop (both scripts use it) */
    text = String(text).replace(/[।॥]+/g, ".");
    var keys = mode === "gu-Latn" ? GU_KEYS : HI_KEYS;
    var dict = mode === "gu-Latn" ? GUJLISH_DICT : HINGLISH_DICT;
    var cache = mode === "gu-Latn" ? trCacheGu : trCacheHi;
    var engine = mode === "gu-Latn" ? rulesGu : rulesHi;
    var isHi = mode === "hi-Latn";
    var range = isHi ? /[\u0900-\u097F]/ : /[\u0A80-\u0AFF]/;
    /* split into Devanagari/Gujarati word runs + separators */
    var parts = String(text).split(/([\u0900-\u097F\u0A80-\u0AFF]+)/);
    var out = "";
    for (var p = 0; p < parts.length; p++) {
      var seg = parts[p];
      if (!seg) continue;
      if (!range.test(seg)) { out += seg; continue; }
      /* try known phrases/words (longest first, whole-run anchored) */
      var applied = false;
      for (var k = 0; k < keys.length; k++) {
        var ph = keys[k];
        if (seg.indexOf(ph) >= 0) {
          /* protect against half-words: must be at word boundary on both sides */
          var beforeOk = true, afterOk = true;
          var at = seg.indexOf(ph);
          if (at > 0 && range.test(seg[at - 1])) beforeOk = false;
          var end = at + ph.length;
          if (end < seg.length && range.test(seg[end])) afterOk = false;
          if (beforeOk && afterOk) {
            out += seg.slice(0, at) + dict[ph] + seg.slice(end);
            applied = true;
            break;
          }
        }
      }
      if (applied) continue;
      /* try whole-run exact in cache/dict (punctuation-free) */
      var clean = seg.replace(/[.,!?…।॥;:'"()«»“”‘’]/g, "");
      var cached = cache[clean];
      if (cached) { out += cached; continue; }
      if (dict[clean]) { out += dict[clean]; continue; }
      /* try the live API cache per word; queue the rest */
      var words = seg.split(/\s+/);
      var romanParts = [];
      var unknown = [];
      for (var w = 0; w < words.length; w++) {
        var wd = words[w];
        if (!range.test(wd)) { romanParts.push(wd); continue; }
        var wClean = wd.replace(/[.,!?…।॥;:'"()«»“”‘’—–-]/g, "");
        if (cache[wClean]) { romanParts.push(cache[wClean]); continue; }
        if (dict[wClean]) { romanParts.push(dict[wClean]); continue; }
        /* fused postpositions (ઘરમાં → ghar ma) */
        var fused = fuseWord(wClean, mode, dict, cache, engine, range);
        if (fused) { romanParts.push(fused); continue; }
        unknown.push(wClean);
        romanParts.push(engine(wClean));
      }
      /* queue unknowns for the live API (dedupe, 2 attempts max) */
      for (var u = 0; u < unknown.length; u++) {
        if (unknown[u] && unknown[u].length > 1 && !cache[unknown[u]] && !pendingWords[unknown[u]]) {
          pendingWords[unknown[u]] = 2;
        }
      }
      out += romanParts.join(" ");
    }
    return out;
  }

  /* ---------- cookie (helps the widget pick up on load) ---------- */
  function setGoogCookie(target) {
    var expire = "; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    document.cookie = "googtrans=" + expire + "; path=/";
    document.cookie = "googtrans=" + expire + "; path=/; domain=" + location.hostname;
    document.cookie = "googtrans=" + expire + "; path=/; domain=." + location.hostname;
    if (target) {
      var v = "/en/" + target;
      document.cookie = "googtrans=" + v + "; path=/";
      document.cookie = "googtrans=" + v + "; path=/; domain=" + location.hostname;
    }
  }

  /* ---------- widget loading ---------- */
  var widgetRequested = false;
  function loadGoogleWidget() {
    if (widgetRequested) return;
    widgetRequested = true;
    var mount = document.getElementById("google_translate_element");
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "google_translate_element";
      mount.setAttribute("style", "position:fixed; bottom:-9999px; left:-9999px; height:1px; overflow:hidden;");
      document.body.appendChild(mount);
    }
    window.googleTranslateElementInit = function () {
      try {
        new google.translate.TranslateElement({
          pageLanguage: "en",
          includedLanguages: GOOGLE_CODES,
          autoDisplay: false
        }, "google_translate_element");
      } catch (e) {}
    };
    var s = document.createElement("script");
    s.id = "gt-script";
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.onerror = function () {
      toast("🌐 Translation needs internet — please check your connection");
    };
    document.head.appendChild(s);
  }

  /* ---------- THE FIX: drive the widget's selector directly ---------- */
  function fireTranslate(target, attemptsLeft, onFail) {
    var combo = document.querySelector("select.goog-te-combo");
    if (combo && combo.options && combo.options.length > 1) {
      try {
        combo.value = target;
        combo.dispatchEvent(new Event("change", { bubbles: true }));
        setTimeout(function () {
          if (!document.documentElement.classList.contains("translated-ltr") &&
              !document.documentElement.classList.contains("translated-rtl") &&
              !document.querySelector("font")) {
            try {
              combo.value = target;
              combo.dispatchEvent(new Event("change", { bubbles: true }));
            } catch (e) {}
          }
        }, 1500);
        return;
      } catch (e) {}
    }
    if (attemptsLeft > 0) {
      setTimeout(function () { fireTranslate(target, attemptsLeft - 1, onFail); }, 400);
    } else if (onFail) {
      onFail();
    }
  }

  /* ---------- live scanner (natural pipeline + API boost) ---------- */
  var scanTimer = null;
  var origText = new WeakMap();
  var fetchScheduled = false;
  function scheduleFetch(mode) {
    if (fetchScheduled) return;
    fetchScheduled = true;
    setTimeout(function () {
      fetchScheduled = false;
      pumpWords(mode);
    }, 1200);
  }
  function startScanner(mode) {
    stopScanner();
    var range = mode === "hi-Latn" ? /[\u0900-\u097F]/ : /[\u0A80-\u0AFF]/;
    function scan() {
      try {
        var improve = cacheDirty;      /* live API results arrived → refresh converted nodes */
        cacheDirty = false;
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        var node;
        while ((node = walker.nextNode())) {
          if (!range.test(node.nodeValue)) continue;
          var cur = node.nodeValue;
          var orig = origText.get(node);
          if (orig) {
            if (cur === orig) { node.nodeValue = naturalRoman(orig, mode); continue; }
            /* already romanized — apply improved cache entries when they arrive */
            if (improve) {
              var fresh = naturalRoman(orig, mode);
              if (fresh !== cur) node.nodeValue = fresh;
            }
            continue;
          }
          origText.set(node, cur);
          node.nodeValue = naturalRoman(cur, mode);
        }
        scheduleFetch(mode);
      } catch (e) {}
    }
    scan();
    scanTimer = setInterval(scan, 900);
  }
  function stopScanner() {
    if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
  }

  /* ---------- apply language ---------- */
  function activate(code) {
    var entry = findLang(code);
    if (!entry || code === "en") return;
    var target = entry.special ? entry.base : entry.code;
    setGoogCookie(target);
    loadGoogleWidget();
    fireTranslate(target, 40, function () {
      toast("🌐 Couldn't reach the translator — check internet & reload");
    });
    if (entry.special) {
      startScanner(entry.code);
    }
    setTimeout(function () { toast("🌐 Translating to " + entry.name + "..."); }, 300);
  }

  function selectLang(code) {
    setLang(code);
    if (code === "en") {
      setGoogCookie(null);
      stopScanner();
      location.reload();
      return;
    }
    location.reload();
  }

  /* ---------- misc ---------- */
  function getLang() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || "en"; } catch (e) { return "en"; }
  }
  function setLang(code) {
    if (code && code !== "en") {
      try { if (window.TSB) window.TSB.set("tsb_flag_polyglot", "1"); } catch (e) {}
    }
    try { localStorage.setItem(LS_KEY, JSON.stringify(code)); } catch (e) {}
  }
  function findLang(code) {
    for (var i = 0; i < LANGUAGES.length; i++) if (LANGUAGES[i].code === code) return LANGUAGES[i];
    return null;
  }
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast"; t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 3200);
  }

  /* ---------- picker modal ---------- */
  function openLangModal() {
    var modal = document.getElementById("langModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "langModal";
      modal.className = "modal";
      document.body.appendChild(modal);
    }
    var cur = getLang();
    var indian = LANGUAGES.filter(function (l) { return l.flag === "🇮🇳" || l.code === "en"; });
    var world = LANGUAGES.filter(function (l) { return l.flag !== "🇮🇳" && l.code !== "en"; });

    function card(l) {
      return '<button class="langcard ' + (l.code === cur ? "active" : "") + (l.special ? " langcard--special" : "") + '" data-lang="' + l.code + '" translate="no">' +
        '<span class="langcard__flag">' + l.flag + "</span>" +
        '<span class="langcard__name">' + l.name + (l.special ? ' <em class="langcard__badge">EXCLUSIVE</em>' : "") + "</span>" +
        '<span class="langcard__native">' + l.native + "</span></button>";
    }

    modal.innerHTML =
      '<div class="modal__box modal__box--wide">' +
      '<button class="modal__close">✕</button>' +
      '<div class="modal__title" translate="no">🌐 Read in YOUR Language</div>' +
      '<p style="font-weight:600; font-size:.85rem; margin-bottom:14px;">All 400 books, 2,600+ lessons — translated instantly. ' +
      '<strong>Hinglish &amp; Gujlish</strong> are our special modes: Hindi/Gujarati in the way you actually text — ' +
      '"main yeh kaam kal shuru karunga", not machine-roman. 🔥</p>' +
      '<div class="langsection" translate="no">🇮🇳 INDIA</div>' +
      '<div class="langgrid">' + indian.map(card).join("") + "</div>" +
      '<div class="langsection" translate="no">🌍 WORLD</div>' +
      '<div class="langgrid">' + world.map(card).join("") + "</div>" +
      '<p class="support__note">Powered by Google Translate + our natural Hinglish/Gujlish engine (curated vocabulary + live transliteration). Needs internet. Takes 2–5 seconds after the page reloads. Search works best in English.</p>' +
      "</div>";
    modal.classList.add("open");
    modal.querySelector(".modal__close").addEventListener("click", function () { modal.classList.remove("open"); });
    modal.addEventListener("click", function (e) { if (e.target === modal) modal.classList.remove("open"); });
    var cards = modal.querySelectorAll("[data-lang]");
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener("click", function () {
        selectLang(this.getAttribute("data-lang"));
      });
    }
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var cur = getLang();
    var entry = findLang(cur);
    var mounts = document.querySelectorAll("[data-lang-btn]");
    for (var m = 0; m < mounts.length; m++) {
      mounts[m].innerHTML = "🌐" + (cur !== "en" && entry ? ' <span class="langbtn__label">' + entry.name + "</span>" : "");
      mounts[m].setAttribute("translate", "no");
      mounts[m].addEventListener("click", openLangModal);
    }
    if (cur !== "en") activate(cur);
  });

  window.TSB_LANG = {
    open: openLangModal,
    select: selectLang,
    activate: activate,
    get: getLang,
    set: setLang,
    list: LANGUAGES,
    toHinglish: toHinglish,
    toGujlish: toGujlish,
    naturalRoman: naturalRoman,
    _fire: fireTranslate
  };
})();
