/**
 * THESMALLBOOK - WhatsApp Multi-Track Live Automation Engine
 * 
 * Works directly with OpenWA or pure WhatsApp Webhooks.
 * Zero external npm dependencies (pure Node.js).
 * 
 * Customizes daily book summaries according to the reader's onboarding goal:
 *  Track 1: Money & Finance
 *  Track 2: Productivity & Focus
 *  Track 3: Business & Startups
 *  Track 4: Psychology & People
 *  Track 5: Power & Strategy
 *  Track 6: Self-Improvement & Habits
 * 
 * Commands:
 *   node tools/whatsapp-engine.js --start                Start the 24/7 automation engine
 *   node tools/whatsapp-engine.js --send-now             Trigger today's batch right now
 *   node tools/whatsapp-engine.js --add-test <phone> <track> Add test subscriber with track
 *   node tools/whatsapp-engine.js --list                 View all subscribers and their tracks
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const CONFIG = {
  port: parseInt(process.env.BOT_PORT || "3000", 10),
  openwaUrl: process.env.OPENWA_URL || "http://localhost:2785",
  sessionId: process.env.OPENWA_SESSION_ID || "thesmallbook",
  apiKey: process.env.OPENWA_API_KEY || "",
  sendHour: 9, // 9:00 AM daily
  sendMinute: 0,
  minDelaySec: 5,
  maxDelaySec: 15,
  siteUrl: "https://thesmallbook.in"
};

const DB_PATH = path.join(__dirname, "subscribers.json");

// Personalized Onboarding Tracks (7 curated books per track from TheSmallBook)
const TRACKS = {
  money: {
    name: "Money & Finance",
    books: [
      {
        day: 1,
        title: "The Psychology of Money",
        author: "Morgan Housel",
        tagline: "Timeless lessons on wealth, greed, and happiness.",
        spark: "Doing well with money has a little to do with how smart you are and a lot to do with how you behave.",
        lesson: "Getting wealthy and staying wealthy are different skills. Stay humble, avoid debt, and let compounding work uninterrupted.",
        link: "https://thesmallbook.in/books/psychology-of-money.html"
      },
      {
        day: 2,
        title: "Rich Dad Poor Dad",
        author: "Robert Kiyosaki",
        tagline: "What the rich teach their kids about money that the poor and middle class do not.",
        spark: "The poor and the middle class work for money. The rich have money work for them.",
        lesson: "Buy assets that put cash in your pocket, not liabilities that look like assets.",
        link: "https://thesmallbook.in/books/rich-dad-poor-dad.html"
      },
      {
        day: 3,
        title: "Common Stocks and Uncommon Profits",
        author: "Philip Fisher",
        tagline: "The blueprint for investing in exceptional compounders.",
        spark: "The stock market is filled with individuals who know the price of everything, but the value of nothing.",
        lesson: "Do the scuttlebutt research: interview customers, competitors, and ex-employees before buying any business.",
        link: "https://thesmallbook.in/books/common-stocks-and-uncommon-profits.html"
      },
      {
        day: 4,
        title: "Let's Talk Money",
        author: "Monika Halan",
        tagline: "A clean, practical financial plan for modern India.",
        spark: "Money management is not about becoming a billionaire; it is about sleeping peacefully without money anxiety.",
        lesson: "Separate your money into 3 bank accounts: Income/Spends, Emergency Safety Net, and Wealth Investments.",
        link: "https://thesmallbook.in/books/lets-talk-money.html"
      },
      {
        day: 5,
        title: "The Intelligent Investor",
        author: "Benjamin Graham",
        tagline: "The definitive book on value investing.",
        spark: "The investor's chief problem - and even his worst enemy - is likely to be himself.",
        lesson: "Insist on a margin of safety on every investment, and treat market volatility as your servant, not your master.",
        link: "https://thesmallbook.in/books/intelligent-investor.html"
      },
      {
        day: 6,
        title: "Your Money or Your Life",
        author: "Vicki Robin and Joe Dominguez",
        tagline: "Transforming your relationship with money and achieving financial independence.",
        spark: "Money is something you trade your life energy for.",
        lesson: "Calculate your real hourly wage after commutes, work clothes, and stress decompression, then evaluate purchases by hours of life traded.",
        link: "https://thesmallbook.in/books/your-money-or-your-life.html"
      },
      {
        day: 7,
        title: "The Millionaire Next Door",
        author: "Thomas Stanley and William Danko",
        tagline: "The surprising secrets of America's wealthy.",
        spark: "Wealth is what you accumulate, not what you spend.",
        lesson: "Most real millionaires live below their means, drive modest used cars, and prioritize financial independence over high-status display.",
        link: "https://thesmallbook.in/books/millionaire-next-door.html"
      }
    ]
  },
  productivity: {
    name: "Productivity & Focus",
    books: [
      {
        day: 1,
        title: "Atomic Habits",
        author: "James Clear",
        tagline: "Tiny changes, remarkable results.",
        spark: "You do not rise to the level of your goals; you fall to the level of your systems.",
        lesson: "Shrink any new habit to under 2 minutes. Standardize before you optimize.",
        link: "https://thesmallbook.in/books/atomic-habits.html"
      },
      {
        day: 2,
        title: "Deep Work",
        author: "Cal Newport",
        tagline: "Rules for focused success in a distracted world.",
        spark: "The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable.",
        lesson: "Block 90 minutes of zero-distraction focus every morning before opening email or social media.",
        link: "https://thesmallbook.in/books/deep-work.html"
      },
      {
        day: 3,
        title: "The Power of Habit",
        author: "Charles Duhigg",
        tagline: "Why we do what we do in life and business.",
        spark: "Change might not be fast and it isn't always easy. But with time and effort, almost any habit can be reshaped.",
        lesson: "You cannot eliminate a bad habit; you can only replace the routine while keeping the cue and reward intact.",
        link: "https://thesmallbook.in/books/power-of-habit.html"
      },
      {
        day: 4,
        title: "Eat That Frog!",
        author: "Brian Tracy",
        tagline: "21 great ways to stop procrastinating and get more done in less time.",
        spark: "If you have to eat a live frog, it does not pay to sit and look at it for very long.",
        lesson: "Do your hardest, highest-leverage task first thing in the morning when your mental energy is at its peak.",
        link: "https://thesmallbook.in/books/eat-that-frog.html"
      },
      {
        day: 5,
        title: "Essentialism",
        author: "Greg McKeown",
        tagline: "The disciplined pursuit of less.",
        spark: "If you don't prioritize your life, someone else will.",
        lesson: "Say no to almost everything so you can say a full, uncompromised yes to the vital few things.",
        link: "https://thesmallbook.in/books/essentialism.html"
      },
      {
        day: 6,
        title: "Make Time",
        author: "Jake Knapp and John Zeratsky",
        tagline: "How to focus on what matters every day.",
        spark: "You are not failing to focus because you are weak; modern devices are engineered to steal your attention.",
        lesson: "Pick one Daily Highlight each morning, protect 60-90 minutes for it, and put friction on your smartphone infinity pools.",
        link: "https://thesmallbook.in/books/make-time.html"
      },
      {
        day: 7,
        title: "The 80/20 Principle",
        author: "Richard Koch",
        tagline: "The secret to achieving more with less.",
        spark: "Eighty percent of your results come from twenty percent of your efforts.",
        lesson: "Ruthlessly identify the 20 percent of clients, activities, and tasks producing 80 percent of your value, and cut the rest.",
        link: "https://thesmallbook.in/books/80-20-principle.html"
      }
    ]
  },
  business: {
    name: "Business & Startups",
    books: [
      {
        day: 1,
        title: "Zero to One",
        author: "Peter Thiel",
        tagline: "Notes on startups, or how to build the future.",
        spark: "The most contrarian thing of all is not to oppose the crowd, but to think for yourself.",
        lesson: "Competition is for losers. Build a creative monopoly by solving a unique problem in a small, concentrated market.",
        link: "https://thesmallbook.in/books/zero-to-one.html"
      },
      {
        day: 2,
        title: "The Lean Startup",
        author: "Eric Ries",
        tagline: "How today's entrepreneurs use continuous innovation to create radically successful businesses.",
        spark: "The only way to win is to learn faster than anyone else.",
        lesson: "Build an MVP fast, measure real customer behavior, and learn whether to pivot or persevere before burning cash.",
        link: "https://thesmallbook.in/books/lean-startup.html"
      },
      {
        day: 3,
        title: "Hooked",
        author: "Nir Eyal",
        tagline: "How to build habit-forming products.",
        spark: "Products that create daily habits change user behavior and create unassailable competitive advantages.",
        lesson: "Design your product loop: Trigger to Action to Variable Reward to Investment.",
        link: "https://thesmallbook.in/books/hooked.html"
      },
      {
        day: 4,
        title: "Shoe Dog",
        author: "Phil Knight",
        tagline: "A memoir by the creator of Nike.",
        spark: "Don't tell people how to do things, tell them what to do and let them surprise you with their results.",
        lesson: "Surviving in business is about staying in the race long enough for luck and momentum to find you.",
        link: "https://thesmallbook.in/books/shoe-dog.html"
      },
      {
        day: 5,
        title: "Working Backwards",
        author: "Colin Bryar and Bill Carr",
        tagline: "Insights, stories, and secrets from inside Amazon.",
        spark: "Start with the customer press release and FAQ before writing a single line of code.",
        lesson: "Write the launch press release first to ensure the customer benefit is crystal clear before building.",
        link: "https://thesmallbook.in/books/working-backwards.html"
      },
      {
        day: 6,
        title: "Rework",
        author: "Jason Fried and David Heinemeier Hansson",
        tagline: "Change the way you work forever.",
        spark: "Workaholics aren't heroes. They don't save the day, they just use it up.",
        lesson: "Bootstrap, stay small, embrace constraints, and say no to outside venture capital that forces premature scale.",
        link: "https://thesmallbook.in/books/rework.html"
      },
      {
        day: 7,
        title: "Good to Great",
        author: "Jim Collins",
        tagline: "Why some companies make the leap and others don't.",
        spark: "Greatness is not a function of circumstance. Greatness is largely a matter of conscious choice and discipline.",
        lesson: "First who, then what: get the right people on the bus in the right seats before deciding where to drive.",
        link: "https://thesmallbook.in/books/good-to-great.html"
      }
    ]
  },
  psychology: {
    name: "Psychology & People",
    books: [
      {
        day: 1,
        title: "Thinking, Fast and Slow",
        author: "Daniel Kahneman",
        tagline: "The two systems that drive the way we think.",
        spark: "A reliable way to make people believe in falsehoods is frequent repetition, because familiarity is not easily distinguished from truth.",
        lesson: "System 1 is fast and emotional; System 2 is slow and deliberate. Slow down major decisions to avoid cognitive bias.",
        link: "https://thesmallbook.in/books/thinking-fast-and-slow.html"
      },
      {
        day: 2,
        title: "How to Win Friends and Influence People",
        author: "Dale Carnegie",
        tagline: "The timeless bestseller on relationships and leadership.",
        spark: "You can make more friends in two months by becoming interested in other people than you can in two years by trying to get people interested in you.",
        lesson: "Remember people's names, listen actively, and speak in terms of what the other person values.",
        link: "https://thesmallbook.in/books/how-to-win-friends.html"
      },
      {
        day: 3,
        title: "Influence: The Psychology of Persuasion",
        author: "Robert Cialdini",
        tagline: "The 6 universal principles of persuasion.",
        spark: "We all fool ourselves from time to time in order to keep our thoughts and beliefs consistent with what we have already done.",
        lesson: "Master the 6 levers of influence: Reciprocity, Commitment, Social Proof, Authority, Liking, and Scarcity.",
        link: "https://thesmallbook.in/books/influence.html"
      },
      {
        day: 4,
        title: "Never Split the Difference",
        author: "Chris Voss",
        tagline: "Negotiating as if your life depended on it.",
        spark: "Conflict brings out truth, creativity, and resolution if handled with tactical empathy.",
        lesson: "Use calibrated open-ended questions ('How am I supposed to do that?') and mirror the last 3 words to lead negotiations.",
        link: "https://thesmallbook.in/books/never-split-the-difference.html"
      },
      {
        day: 5,
        title: "Predictably Irrational",
        author: "Dan Ariely",
        tagline: "The hidden forces that shape our decisions.",
        spark: "We are all far less rational in our decision-making than standard economic theory assumes.",
        lesson: "Beware the power of 'FREE!' and arbitrary anchoring prices that unconsciously dictate what you are willing to pay.",
        link: "https://thesmallbook.in/books/predictably-irrational.html"
      },
      {
        day: 6,
        title: "Games People Play",
        author: "Eric Berne",
        tagline: "The basic handbook of transactional analysis.",
        spark: "Every human interaction is governed by subconscious psychological games.",
        lesson: "Recognize when conversations shift into Parent, Adult, or Child states to defuse manipulative social games.",
        link: "https://thesmallbook.in/books/games-people-play.html"
      },
      {
        day: 7,
        title: "Attached",
        author: "Amir Levine and Rachel Heller",
        tagline: "The new science of adult attachment.",
        spark: "Dependency is a paradox: it is only after our dependency needs are met that we are able to be independent.",
        lesson: "Identify your attachment style (Secure, Anxious, Avoidant) to communicate needs clearly and choose compatible partners.",
        link: "https://thesmallbook.in/books/attached.html"
      }
    ]
  },
  strategy: {
    name: "Power & Strategy",
    books: [
      {
        day: 1,
        title: "The 48 Laws of Power",
        author: "Robert Greene",
        tagline: "3,000 years of ruthless strategy distilled into 48 laws.",
        spark: "Always make those above you feel comfortably superior.",
        lesson: "Conceal your intentions, guard your reputation fiercely, and court attention at all costs.",
        link: "https://thesmallbook.in/books/48-laws-of-power.html"
      },
      {
        day: 2,
        title: "The Art of War",
        author: "Sun Tzu",
        tagline: "The ancient military treatise on strategy and tactics.",
        spark: "The supreme art of war is to subdue the enemy without fighting.",
        lesson: "Know yourself and know your enemy, and you need not fear the result of a hundred battles.",
        link: "https://thesmallbook.in/books/art-of-war.html"
      },
      {
        day: 3,
        title: "Good Strategy Bad Strategy",
        author: "Richard Rumelt",
        tagline: "The difference and why it matters.",
        spark: "Good strategy requires leaders who are willing to say no to a wide variety of actions and interests.",
        lesson: "A real strategy is not a wish list: it diagnoses the core obstacle, creates a guiding policy, and focuses coherent action.",
        link: "https://thesmallbook.in/books/good-strategy-bad-strategy.html"
      },
      {
        day: 4,
        title: "The Prince",
        author: "Niccolo Machiavelli",
        tagline: "The classic treatise on political power and realism.",
        spark: "It is much safer to be feared than loved, if one cannot be both.",
        lesson: "Adapt your conduct to the times; rigid moral idealism in a pragmatic world leads to downfall.",
        link: "https://thesmallbook.in/books/the-prince.html"
      },
      {
        day: 5,
        title: "The 33 Strategies of War",
        author: "Robert Greene",
        tagline: "Master the subtle, psychological game of daily warfare.",
        spark: "Strategy is the art of looking beyond the present moment and calculating the moves ahead.",
        lesson: "Do not fight the last war; ruthlessly adapt to present conditions and create unexpected angles of attack.",
        link: "https://thesmallbook.in/books/33-strategies-of-war.html"
      },
      {
        day: 6,
        title: "Blue Ocean Strategy",
        author: "W. Chan Kim and Renee Mauborgne",
        tagline: "How to create uncontested market space and make the competition irrelevant.",
        spark: "The only way to beat the competition is to stop trying to beat the competition.",
        lesson: "Shift from competing in crowded red oceans to creating uncontested blue oceans through value innovation.",
        link: "https://thesmallbook.in/books/blue-ocean-strategy.html"
      },
      {
        day: 7,
        title: "Thinking in Bets",
        author: "Annie Duke",
        tagline: "Making smarter decisions when you don't have all the facts.",
        spark: "Quality of decision and quality of outcome are not the same thing.",
        lesson: "Avoid resulting: judge decisions by the quality of your process and probabilities, not by whether the short-term outcome was lucky.",
        link: "https://thesmallbook.in/books/thinking-in-bets.html"
      }
    ]
  },
  growth: {
    name: "Self-Improvement & Habits",
    books: [
      {
        day: 1,
        title: "Can't Hurt Me",
        author: "David Goggins",
        tagline: "Master your mind and defy the odds.",
        spark: "When your mind is telling you you're done, you're really only 40 percent done.",
        lesson: "Callous your mind through voluntary discomfort and use the Accountability Mirror to confront reality.",
        link: "https://thesmallbook.in/books/cant-hurt-me.html"
      },
      {
        day: 2,
        title: "Man's Search for Meaning",
        author: "Viktor Frankl",
        tagline: "The classic tribute to hope from the Holocaust.",
        spark: "He who has a why to live can bear almost any how.",
        lesson: "Between stimulus and response there is a space, and in that space lies our freedom and power to choose our response.",
        link: "https://thesmallbook.in/books/mans-search.html"
      },
      {
        day: 3,
        title: "The Subtle Art of Not Giving a F*ck",
        author: "Mark Manson",
        tagline: "A counterintuitive approach to living a good life.",
        spark: "Who you are is defined by what you're willing to struggle for.",
        lesson: "You cannot avoid problems; true growth comes from picking good problems with meaningful struggles.",
        link: "https://thesmallbook.in/books/subtle-art.html"
      },
      {
        day: 4,
        title: "Ikigai",
        author: "Hector Garcia and Francesc Miralles",
        tagline: "The Japanese secret to a long and happy life.",
        spark: "Only staying active will make you want to live a hundred years.",
        lesson: "Find the intersection of what you love, what you are good at, what the world needs, and what you can get paid for.",
        link: "https://thesmallbook.in/books/ikigai.html"
      },
      {
        day: 5,
        title: "12 Rules for Life",
        author: "Jordan Peterson",
        tagline: "An antidote to chaos.",
        spark: "Compare yourself to who you were yesterday, not to who someone else is today.",
        lesson: "Stand up straight with your shoulders back, treat yourself like someone you are responsible for helping, and clean your room.",
        link: "https://thesmallbook.in/books/12-rules-for-life.html"
      },
      {
        day: 6,
        title: "The Mountain Is You",
        author: "Brianna Wiest",
        tagline: "Transforming self-sabotage into self-mastery.",
        spark: "Your mountain is the block between you and the life you want to live.",
        lesson: "Self-sabotage is not a lack of willpower; it is an unconscious coping mechanism protecting you from fear of change.",
        link: "https://thesmallbook.in/books/mountain-is-you.html"
      },
      {
        day: 7,
        title: "Siddhartha",
        author: "Hermann Hesse",
        tagline: "A novel of self-discovery and spiritual awakening.",
        spark: "Wisdom cannot be conveyed. The wisdom which a wise man tries to convey always sounds foolish.",
        lesson: "No teacher can hand you truth; experience cannot be borrowed, it must be lived through your own quiet practice.",
        link: "https://thesmallbook.in/books/siddhartha.html"
      }
    ]
  }
};

// Database helper
function loadSubscribers() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify({ subscribers: [] }, null, 2));
      return [];
    }
    const data = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    return data.subscribers || [];
  } catch (e) {
    return [];
  }
}

function saveSubscribers(list) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify({ subscribers: list }, null, 2));
  } catch (e) {
    console.error("[DB Error] Failed to save subscribers:", e.message);
  }
}

// Map user text/onboarding answer to a track key
function detectTrack(text) {
  const t = (text || "").toLowerCase();
  if (/money|finance|invest|wealth|cash|budget/i.test(t)) return "money";
  if (/productiv|focus|deep work|time|habit/i.test(t)) return "productivity";
  if (/business|startup|founder|entrepreneur|company/i.test(t)) return "business";
  if (/psycholog|people|negotiat|persuade|mind/i.test(t)) return "psychology";
  if (/power|strateg|chess|influence|war/i.test(t)) return "strategy";
  if (/self|growth|discipline|improve|life/i.test(t)) return "growth";
  return "growth"; // default
}

// Add or update subscriber with their customized track
function registerSubscriber(phone, trackKey) {
  let list = loadSubscribers();
  let existing = list.find(s => s.phone === phone);
  if (!existing) {
    existing = {
      phone: phone,
      track: trackKey || "growth",
      day: 0,
      joinedAt: new Date().toISOString(),
      active: true,
      lastSentAt: null
    };
    list.push(existing);
    saveSubscribers(list);
    console.log(`[New Subscriber] Enrolled ${phone} on Track: ${TRACKS[existing.track].name}`);
  } else if (trackKey && existing.track !== trackKey) {
    existing.track = trackKey;
    saveSubscribers(list);
    console.log(`[Track Updated] ${phone} switched to Track: ${TRACKS[trackKey].name}`);
  }
  return existing;
}

// Helper to make HTTP POST requests to OpenWA
function sendViaOpenWA(chatId, text) {
  return new Promise((resolve) => {
    try {
      const url = new URL(`${CONFIG.openwaUrl}/api/sessions/${CONFIG.sessionId}/messages/send-text`);
      const body = JSON.stringify({ chatId, text });
      const req = http.request({
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          ...(CONFIG.apiKey ? { "X-API-Key": CONFIG.apiKey } : {})
        }
      }, (res) => {
        let resData = "";
        res.on("data", chunk => resData += chunk);
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[Sent] Successfully messaged ${chatId}`);
            resolve(true);
          } else {
            console.warn(`[OpenWA API Error] status ${res.statusCode}: ${resData}`);
            resolve(false);
          }
        });
      });
      req.on("error", (err) => {
        console.warn(`[OpenWA Offline] Could not reach OpenWA at ${CONFIG.openwaUrl} (${err.message})`);
        resolve(false);
      });
      req.write(body);
      req.end();
    } catch (e) {
      resolve(false);
    }
  });
}

// Format daily message for a specific track
function buildDailyMessage(item, dayNumber, trackName) {
  return (
    `🌅 *Day ${dayNumber} - TheSmallBook (${trackName})*\n\n` +
    `📖 *${item.title.toUpperCase()}*\n` +
    `✍️ By ${item.author}\n` +
    `_${item.tagline}_\n\n` +
    `💡 *The Core Idea:*\n"${item.spark}"\n\n` +
    `🔑 *Today's Action:*\n${item.lesson}\n\n` +
    `📲 *Read full 5-minute summary online:*\n${item.link}\n\n` +
    `_Reply 'SWITCH' to change your track, or 'STOP' to pause._`
  );
}

// Handle incoming messages & customize track based on onboarding
async function handleIncomingMessage(chatId, text) {
  if (!chatId) return;
  const cleanPhone = chatId.replace(/@.*$/, "");
  const lower = (text || "").toLowerCase().trim();

  // Check for opt-out
  if (/stop|unsubscribe|pause|off/i.test(lower)) {
    let list = loadSubscribers();
    let sub = list.find(s => s.phone === cleanPhone);
    if (sub) {
      sub.active = false;
      saveSubscribers(list);
    }
    await sendViaOpenWA(chatId, "You have been unsubscribed from daily book sparks. Reply 'START' anytime to re-activate!");
    return;
  }

  // Check for track switch command
  if (/switch|change track/i.test(lower)) {
    await sendViaOpenWA(chatId,
      `📚 *Choose your customized daily track:*\n\n` +
      `Reply with the number of your focus area:\n` +
      `1️⃣ *Money & Finance*\n` +
      `2️⃣ *Productivity & Focus*\n` +
      `3️⃣ *Business & Startups*\n` +
      `4️⃣ *Psychology & People*\n` +
      `5️⃣ *Power & Strategy*\n` +
      `6️⃣ *Self-Improvement*\n\n` +
      `_Example: Reply '1' for Money & Finance._`
    );
    return;
  }

  // Handle number choices 1-6
  let chosenTrack = null;
  if (lower === "1") chosenTrack = "money";
  else if (lower === "2") chosenTrack = "productivity";
  else if (lower === "3") chosenTrack = "business";
  else if (lower === "4") chosenTrack = "psychology";
  else if (lower === "5") chosenTrack = "strategy";
  else if (lower === "6") chosenTrack = "growth";
  else chosenTrack = detectTrack(text);

  const sub = registerSubscriber(cleanPhone, chosenTrack);
  const trackInfo = TRACKS[sub.track];
  const day1Book = trackInfo.books[0];

  if (/gold|pricing|pdf|cheat/i.test(lower)) {
    const goldMsg = 
      `👑 *TheSmallBook Gold Pass*\n\n` +
      `Get unlimited 1-page visual PDF cheat-sheets for all 600 books to print, save, and read anywhere:\n` +
      `• ₹49 for a 75-Day PDF Pass\n` +
      `• ₹99/mo for Gold Membership\n` +
      `• ₹999/yr for Annual Founding Pass\n\n` +
      `Activate in 30 seconds: https://thesmallbook.in/gold.html`;
    await sendViaOpenWA(chatId, goldMsg);
    return;
  }

  // Welcome reply customized to their onboarding track
  const welcome = 
    `📕 *Welcome to TheSmallBook!*\n\n` +
    `Your daily book sequence is customized to your focus: *${trackInfo.name}*.\n\n` +
    `Every morning at 9:00 AM, you will receive one actionable breakdown from the top books in ${trackInfo.name}.\n\n` +
    `🌟 *Here is Day 1 to get you started:*\n` +
    `📖 *${day1Book.title}* by ${day1Book.author}\n` +
    `"${day1Book.spark}"\n` +
    `👉 Read online: ${day1Book.link}\n\n` +
    `_Reply 'SWITCH' anytime to change your reading focus area!_`;

  await sendViaOpenWA(chatId, welcome);
}

// Send the customized daily batch to all active subscribers
async function runDailyBatch() {
  console.log(`[Batch] Running customized daily distribution at ${new Date().toLocaleTimeString()}...`);
  const list = loadSubscribers();
  const activeSubs = list.filter(s => s.active);

  console.log(`[Batch] Found ${activeSubs.length} active subscribers to message.`);

  for (const sub of activeSubs) {
    const track = TRACKS[sub.track] || TRACKS.growth;
    const nextDay = (sub.day % track.books.length) + 1;
    const content = track.books[nextDay - 1];
    const message = buildDailyMessage(content, nextDay, track.name);
    const chatId = `${sub.phone}@c.us`;

    // Safe random anti-ban delay (5 to 15 seconds)
    const delay = Math.floor(Math.random() * (CONFIG.maxDelaySec - CONFIG.minDelaySec + 1) + CONFIG.minDelaySec) * 1000;
    console.log(`[Delay] Waiting ${delay / 1000}s before sending Day ${nextDay} (${track.name}) to ${sub.phone}...`);
    await new Promise(r => setTimeout(r, delay));

    const ok = await sendViaOpenWA(chatId, message);
    if (ok) {
      sub.day = nextDay;
      sub.lastSentAt = new Date().toISOString();
      saveSubscribers(list);
    }
  }
  console.log("[Batch] Completed daily customized distribution.");
}

// The Background Clock (checks time every minute)
function startDailyClock() {
  console.log(`[Scheduler] Daily clock active: will trigger every day at ${CONFIG.sendHour}:00 AM`);
  let lastDaySent = -1;

  setInterval(() => {
    const now = new Date();
    const curHour = now.getHours();
    const curMin = now.getMinutes();
    const curDay = now.getDate();

    if (curHour === CONFIG.sendHour && curMin === CONFIG.sendMinute && lastDaySent !== curDay) {
      lastDaySent = curDay;
      runDailyBatch();
    }
  }, 60000);
}

// Start Webhook Server to receive OpenWA events
function startWebhookServer() {
  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/webhook") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        try {
          const payload = JSON.parse(body);
          const data = payload.data || payload.message || payload;
          const from = data.from || data.chatId;
          const text = data.body || data.text || "";
          if (from) {
            await handleIncomingMessage(from, text);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ok" }));
        } catch (e) {
          res.writeHead(400);
          res.end("Bad JSON");
        }
      });
    } else if (req.url === "/health") {
      const subs = loadSubscribers();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "running", subscribers: subs.length }));
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  });

  server.listen(CONFIG.port, () => {
    console.log(`=======================================================`);
    console.log(`  TheSmallBook WhatsApp Custom Automation Engine Online`);
    console.log(`  Webhook URL: http://localhost:${CONFIG.port}/webhook`);
    console.log(`  OpenWA Target: ${CONFIG.openwaUrl}`);
    console.log(`  Custom Tracks: Money, Productivity, Business, Psychology, Strategy, Growth`);
    console.log(`=======================================================`);
  });

  startDailyClock();
}

// CLI Commands
const cmd = process.argv[2];
if (cmd === "--start") {
  startWebhookServer();
} else if (cmd === "--send-now") {
  runDailyBatch();
} else if (cmd === "--add-test") {
  const phone = process.argv[3];
  const track = process.argv[4] || "money";
  if (!phone) {
    console.log("Usage: node tools/whatsapp-engine.js --add-test <phone> [track]");
    process.exit(1);
  }
  const clean = phone.replace(/[^0-9]/g, "");
  registerSubscriber(clean, track);
  console.log(`Added test phone: ${clean} with track: ${track}`);
} else if (cmd === "--list") {
  const list = loadSubscribers();
  console.log("\nActive Subscribers:");
  console.table(list);
} else {
  console.log("TheSmallBook WhatsApp Customized Automation Engine");
  console.log("Usage:");
  console.log("  node tools/whatsapp-engine.js --start                 Start 24/7 engine");
  console.log("  node tools/whatsapp-engine.js --send-now              Trigger today's batch right now");
  console.log("  node tools/whatsapp-engine.js --add-test <phone> [track] Add a test subscriber");
  console.log("  node tools/whatsapp-engine.js --list                  View all subscribers");
}
