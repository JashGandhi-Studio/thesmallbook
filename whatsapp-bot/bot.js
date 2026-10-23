/**
 * THESMALLBOOK - WhatsApp Multi-Track Live Automation Bot
 * 
 * Runs with Baileys directly on Windows/Mac/Linux.
 * Zero C++ compilers needed, zero Docker needed.
 * 
 * Supports 6 Custom Onboarding Tracks:
 *  1. Money & Finance
 *  2. Productivity & Focus
 *  3. Business & Startups
 *  4. Psychology & People
 *  5. Power & Strategy
 *  6. Self-Improvement
 */

const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const pino = require("pino");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "subscribers.json");

const TRACKS = {
  money: {
    name: "Money & Finance",
    books: [
      {
        day: 1,
        title: "The Psychology of Money",
        author: "Morgan Housel",
        spark: "Doing well with money has a little to do with how smart you are and a lot to do with how you behave.",
        lesson: "Getting wealthy and staying wealthy are different skills. Stay humble, avoid debt, and let compounding work.",
        link: "https://thesmallbook.in/books/psychology-of-money.html"
      },
      {
        day: 2,
        title: "Rich Dad Poor Dad",
        author: "Robert Kiyosaki",
        spark: "The poor and the middle class work for money. The rich have money work for them.",
        lesson: "Buy assets that put cash in your pocket, not liabilities that look like assets.",
        link: "https://thesmallbook.in/books/rich-dad-poor-dad.html"
      },
      {
        day: 3,
        title: "Common Stocks and Uncommon Profits",
        author: "Philip Fisher",
        spark: "The stock market is filled with individuals who know the price of everything, but the value of nothing.",
        lesson: "Do the scuttlebutt research: interview customers, competitors, and ex-employees before buying any business.",
        link: "https://thesmallbook.in/books/common-stocks-and-uncommon-profits.html"
      },
      {
        day: 4,
        title: "Let's Talk Money",
        author: "Monika Halan",
        spark: "Money management is not about becoming a billionaire; it is about sleeping peacefully without money anxiety.",
        lesson: "Separate your money into 3 accounts: Income/Spends, Emergency Safety Net, and Wealth Investments.",
        link: "https://thesmallbook.in/books/lets-talk-money.html"
      },
      {
        day: 5,
        title: "The Intelligent Investor",
        author: "Benjamin Graham",
        spark: "The investor's chief problem - and even his worst enemy - is likely to be himself.",
        lesson: "Insist on a margin of safety on every investment, and treat market volatility as your servant.",
        link: "https://thesmallbook.in/books/intelligent-investor.html"
      },
      {
        day: 6,
        title: "Your Money or Your Life",
        author: "Vicki Robin",
        spark: "Money is something you trade your life energy for.",
        lesson: "Calculate your real hourly wage after commutes and stress, then evaluate purchases by hours of life traded.",
        link: "https://thesmallbook.in/books/your-money-or-your-life.html"
      },
      {
        day: 7,
        title: "The Millionaire Next Door",
        author: "Thomas Stanley",
        spark: "Wealth is what you accumulate, not what you spend.",
        lesson: "Most real millionaires live below their means and prioritize financial independence over high-status display.",
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
        spark: "You do not rise to the level of your goals; you fall to the level of your systems.",
        lesson: "Shrink any new habit to under 2 minutes. Standardize before you optimize.",
        link: "https://thesmallbook.in/books/atomic-habits.html"
      },
      {
        day: 2,
        title: "Deep Work",
        author: "Cal Newport",
        spark: "The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming valuable.",
        lesson: "Block 90 minutes of zero-distraction focus every morning before opening email or social media.",
        link: "https://thesmallbook.in/books/deep-work.html"
      },
      {
        day: 3,
        title: "The Power of Habit",
        author: "Charles Duhigg",
        spark: "Change might not be fast, but with time and effort, almost any habit can be reshaped.",
        lesson: "You cannot eliminate a bad habit; you can only replace the routine while keeping cue and reward intact.",
        link: "https://thesmallbook.in/books/power-of-habit.html"
      },
      {
        day: 4,
        title: "Eat That Frog!",
        author: "Brian Tracy",
        spark: "If you have to eat a live frog, it does not pay to sit and look at it for very long.",
        lesson: "Do your hardest, highest-leverage task first thing in the morning when mental energy is at its peak.",
        link: "https://thesmallbook.in/books/eat-that-frog.html"
      },
      {
        day: 5,
        title: "Essentialism",
        author: "Greg McKeown",
        spark: "If you don't prioritize your life, someone else will.",
        lesson: "Say no to almost everything so you can say an uncompromised yes to the vital few things.",
        link: "https://thesmallbook.in/books/essentialism.html"
      },
      {
        day: 6,
        title: "Make Time",
        author: "Jake Knapp and John Zeratsky",
        spark: "You are not failing to focus because you are weak; modern devices are engineered to steal your attention.",
        lesson: "Pick one Daily Highlight each morning and put friction on your smartphone infinity pools.",
        link: "https://thesmallbook.in/books/make-time.html"
      },
      {
        day: 7,
        title: "The 80/20 Principle",
        author: "Richard Koch",
        spark: "Eighty percent of your results come from twenty percent of your efforts.",
        lesson: "Ruthlessly identify the 20% of activities producing 80% of your value, and cut the rest.",
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
        spark: "The most contrarian thing of all is not to oppose the crowd, but to think for yourself.",
        lesson: "Competition is for losers. Build a creative monopoly by solving a unique problem in a small niche.",
        link: "https://thesmallbook.in/books/zero-to-one.html"
      },
      {
        day: 2,
        title: "The Lean Startup",
        author: "Eric Ries",
        spark: "The only way to win is to learn faster than anyone else.",
        lesson: "Build an MVP fast, measure real customer behavior, and learn whether to pivot or persevere.",
        link: "https://thesmallbook.in/books/lean-startup.html"
      },
      {
        day: 3,
        title: "Hooked",
        author: "Nir Eyal",
        spark: "Products that create daily habits change user behavior and create unassailable advantages.",
        lesson: "Design your product loop: Trigger to Action to Variable Reward to Investment.",
        link: "https://thesmallbook.in/books/hooked.html"
      },
      {
        day: 4,
        title: "Shoe Dog",
        author: "Phil Knight",
        spark: "Don't tell people how to do things, tell them what to do and let them surprise you with their results.",
        lesson: "Surviving in business is about staying in the race long enough for momentum to find you.",
        link: "https://thesmallbook.in/books/shoe-dog.html"
      },
      {
        day: 5,
        title: "Working Backwards",
        author: "Colin Bryar and Bill Carr",
        spark: "Start with the customer press release and FAQ before writing a single line of code.",
        lesson: "Write the launch press release first to ensure customer benefit is crystal clear.",
        link: "https://thesmallbook.in/books/working-backwards.html"
      },
      {
        day: 6,
        title: "Rework",
        author: "Jason Fried",
        spark: "Workaholics aren't heroes. They don't save the day, they just use it up.",
        lesson: "Bootstrap, stay small, embrace constraints, and say no to outside venture capital.",
        link: "https://thesmallbook.in/books/rework.html"
      },
      {
        day: 7,
        title: "Good to Great",
        author: "Jim Collins",
        spark: "Greatness is not a function of circumstance; it is largely a matter of conscious choice.",
        lesson: "First who, then what: get the right people on the bus before deciding where to drive.",
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
        spark: "A reliable way to make people believe in falsehoods is frequent repetition.",
        lesson: "System 1 is fast and emotional; System 2 is slow and deliberate. Slow down major decisions.",
        link: "https://thesmallbook.in/books/thinking-fast-and-slow.html"
      },
      {
        day: 2,
        title: "How to Win Friends and Influence People",
        author: "Dale Carnegie",
        spark: "You can make more friends in two months by becoming interested in other people.",
        lesson: "Remember people's names, listen actively, and speak in terms of what the other person values.",
        link: "https://thesmallbook.in/books/how-to-win-friends.html"
      },
      {
        day: 3,
        title: "Influence: The Psychology of Persuasion",
        author: "Robert Cialdini",
        spark: "We all fool ourselves from time to time in order to keep our thoughts consistent.",
        lesson: "Master the 6 levers of influence: Reciprocity, Commitment, Social Proof, Authority, Liking, Scarcity.",
        link: "https://thesmallbook.in/books/influence.html"
      },
      {
        day: 4,
        title: "Never Split the Difference",
        author: "Chris Voss",
        spark: "Conflict brings out truth, creativity, and resolution if handled with tactical empathy.",
        lesson: "Use calibrated open-ended questions ('How am I supposed to do that?') and mirror the last 3 words.",
        link: "https://thesmallbook.in/books/never-split-the-difference.html"
      },
      {
        day: 5,
        title: "Predictably Irrational",
        author: "Dan Ariely",
        spark: "We are all far less rational in our decision-making than standard economic theory assumes.",
        lesson: "Beware the power of 'FREE!' and arbitrary anchoring prices that dictate what you are willing to pay.",
        link: "https://thesmallbook.in/books/predictably-irrational.html"
      },
      {
        day: 6,
        title: "Games People Play",
        author: "Eric Berne",
        spark: "Every human interaction is governed by subconscious psychological games.",
        lesson: "Recognize when conversations shift into Parent, Adult, or Child states to defuse manipulation.",
        link: "https://thesmallbook.in/books/games-people-play.html"
      },
      {
        day: 7,
        title: "Attached",
        author: "Amir Levine and Rachel Heller",
        spark: "Dependency is a paradox: once dependency needs are met, we are able to be independent.",
        lesson: "Identify your attachment style (Secure, Anxious, Avoidant) to communicate needs clearly.",
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
        spark: "Always make those above you feel comfortably superior.",
        lesson: "Never outshine the master. Conceal your intentions until you are ready to execute.",
        link: "https://thesmallbook.in/books/48-laws-of-power.html"
      },
      {
        day: 2,
        title: "The Art of War",
        author: "Sun Tzu",
        spark: "The supreme art of war is to subdue the enemy without fighting.",
        lesson: "Know yourself and know your enemy, and you need not fear the result of a hundred battles.",
        link: "https://thesmallbook.in/books/art-of-war.html"
      },
      {
        day: 3,
        title: "Good Strategy Bad Strategy",
        author: "Richard Rumelt",
        spark: "Good strategy requires leaders who are willing to say no to a wide variety of actions.",
        lesson: "A real strategy is not a wish list: it diagnoses the core obstacle and focuses coherent action.",
        link: "https://thesmallbook.in/books/good-strategy-bad-strategy.html"
      },
      {
        day: 4,
        title: "The Prince",
        author: "Niccolo Machiavelli",
        spark: "It is much safer to be feared than loved, if one cannot be both.",
        lesson: "Adapt your conduct to the times; rigid moral idealism in a pragmatic world leads to downfall.",
        link: "https://thesmallbook.in/books/the-prince.html"
      },
      {
        day: 5,
        title: "The 33 Strategies of War",
        author: "Robert Greene",
        spark: "Strategy is the art of looking beyond the present moment and calculating the moves ahead.",
        lesson: "Do not fight the last war; ruthlessly adapt to present conditions.",
        link: "https://thesmallbook.in/books/33-strategies-of-war.html"
      },
      {
        day: 6,
        title: "Blue Ocean Strategy",
        author: "W. Chan Kim",
        spark: "The only way to beat the competition is to stop trying to beat the competition.",
        lesson: "Shift from competing in crowded red oceans to creating uncontested blue oceans.",
        link: "https://thesmallbook.in/books/blue-ocean-strategy.html"
      },
      {
        day: 7,
        title: "Thinking in Bets",
        author: "Annie Duke",
        spark: "Quality of decision and quality of outcome are not the same thing.",
        lesson: "Avoid resulting: judge decisions by the quality of your process, not by lucky outcomes.",
        link: "https://thesmallbook.in/books/thinking-in-bets.html"
      }
    ]
  },
  growth: {
    name: "Self-Improvement",
    books: [
      {
        day: 1,
        title: "Can't Hurt Me",
        author: "David Goggins",
        spark: "When your mind is telling you you're done, you're really only 40% done.",
        lesson: "Callous your mind through voluntary discomfort and use the Accountability Mirror.",
        link: "https://thesmallbook.in/books/cant-hurt-me.html"
      },
      {
        day: 2,
        title: "Man's Search for Meaning",
        author: "Viktor Frankl",
        spark: "He who has a why to live can bear almost any how.",
        lesson: "Between stimulus and response there is a space, and in that space lies our freedom to choose.",
        link: "https://thesmallbook.in/books/mans-search.html"
      },
      {
        day: 3,
        title: "The Subtle Art of Not Giving a F*ck",
        author: "Mark Manson",
        spark: "Who you are is defined by what you're willing to struggle for.",
        lesson: "You cannot avoid problems; true growth comes from picking good problems with meaningful struggles.",
        link: "https://thesmallbook.in/books/subtle-art.html"
      },
      {
        day: 4,
        title: "Ikigai",
        author: "Hector Garcia",
        spark: "Only staying active will make you want to live a hundred years.",
        lesson: "Find the intersection of what you love, what you are good at, and what the world needs.",
        link: "https://thesmallbook.in/books/ikigai.html"
      },
      {
        day: 5,
        title: "12 Rules for Life",
        author: "Jordan Peterson",
        spark: "Compare yourself to who you were yesterday, not to who someone else is today.",
        lesson: "Stand up straight with your shoulders back, and treat yourself like someone you are responsible for helping.",
        link: "https://thesmallbook.in/books/12-rules-for-life.html"
      },
      {
        day: 6,
        title: "The Mountain Is You",
        author: "Brianna Wiest",
        spark: "Your mountain is the block between you and the life you want to live.",
        lesson: "Self-sabotage is not a lack of willpower; it is an unconscious coping mechanism protecting you from fear.",
        link: "https://thesmallbook.in/books/mountain-is-you.html"
      },
      {
        day: 7,
        title: "Siddhartha",
        author: "Hermann Hesse",
        spark: "Wisdom cannot be conveyed. The wisdom which a wise man tries to convey always sounds foolish.",
        lesson: "No teacher can hand you truth; experience must be lived through your own quiet practice.",
        link: "https://thesmallbook.in/books/siddhartha.html"
      }
    ]
  }
};

function loadSubs() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify({ subscribers: [] }, null, 2));
      return [];
    }
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8")).subscribers || [];
  } catch (e) { return []; }
}

function saveSubs(list) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify({ subscribers: list }, null, 2));
  } catch (e) {}
}

function detectTrack(text) {
  const t = (text || "").toLowerCase();
  if (/money|finance|invest|wealth|budget/i.test(t)) return "money";
  if (/productiv|focus|deep work|time|habit/i.test(t)) return "productivity";
  if (/business|startup|founder|company/i.test(t)) return "business";
  if (/psycholog|people|negotiat|persuade/i.test(t)) return "psychology";
  if (/power|strateg|chess|war/i.test(t)) return "strategy";
  return "growth";
}

function registerUser(phone, trackKey) {
  let list = loadSubs();
  let sub = list.find(s => s.phone === phone);
  if (!sub) {
    sub = { phone, track: trackKey || "growth", day: 0, joinedAt: new Date().toISOString(), active: true, lastSentAt: null };
    list.push(sub);
    saveSubs(list);
  } else if (trackKey && sub.track !== trackKey) {
    sub.track = trackKey;
    saveSubs(list);
  }
  return sub;
}

function formatDaily(book, day, trackName) {
  return `🌅 *Day ${day} - TheSmallBook (${trackName})*\n\n` +
         `📖 *${book.title.toUpperCase()}*\n` +
         `✍️ By ${book.author}\n\n` +
         `💡 *The Core Idea:*\n"${book.spark}"\n\n` +
         `🔑 *Today's Action:*\n${book.lesson}\n\n` +
         `📲 *Read full 5-minute summary online:*\n${book.link}\n\n` +
         `_Reply 'SWITCH' to change your track, or 'STOP' to pause._`;
}

async function start() {
  console.log("Starting TheSmallBook WhatsApp Automation Engine...");
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: state
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;
    if (qr) {
      console.log("\n=======================================================");
      console.log("  SCAN THIS QR CODE WITH WHATSAPP TO CONNECT YOUR BOT");
      console.log("=======================================================\n");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") {
      console.log("\n>>> SUCCESS: WhatsApp Connected and Ready! <<<\n");
    }
    if (connection === "close") {
      console.log("Connection closed, reconnecting...");
      start();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const sender = m.key.remoteJid;
    const cleanPhone = sender.replace(/@.*$/, "");
    const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").trim();
    const lower = text.toLowerCase();

    console.log(`[Message from ${cleanPhone}]: "${text}"`);

    if (/stop|unsubscribe|pause|off/i.test(lower)) {
      let list = loadSubs();
      let sub = list.find(s => s.phone === cleanPhone);
      if (sub) { sub.active = false; saveSubs(list); }
      await sock.sendMessage(sender, { text: "You have been unsubscribed from daily book sparks. Reply 'START' anytime to re-activate!" });
      return;
    }

    if (/switch|change track/i.test(lower)) {
      await sock.sendMessage(sender, {
        text: `📚 *Choose your customized daily track:*\n\n` +
              `Reply with the number of your focus area:\n` +
              `1️⃣ *Money & Finance*\n` +
              `2️⃣ *Productivity & Focus*\n` +
              `3️⃣ *Business & Startups*\n` +
              `4️⃣ *Psychology & People*\n` +
              `5️⃣ *Power & Strategy*\n` +
              `6️⃣ *Self-Improvement*\n\n` +
              `_Reply '1', '2', etc. to switch!_`
      });
      return;
    }

    let chosenTrack = null;
    if (lower === "1") chosenTrack = "money";
    else if (lower === "2") chosenTrack = "productivity";
    else if (lower === "3") chosenTrack = "business";
    else if (lower === "4") chosenTrack = "psychology";
    else if (lower === "5") chosenTrack = "strategy";
    else if (lower === "6") chosenTrack = "growth";
    else chosenTrack = detectTrack(text);

    const sub = registerUser(cleanPhone, chosenTrack);
    const track = TRACKS[sub.track];
    const day1 = track.books[0];

    const welcome = `📕 *Welcome to TheSmallBook!*\n\n` +
                    `Your daily sequence is customized to your onboarding goal: *${track.name}*.\n\n` +
                    `Every morning at 9:00 AM, you will receive one actionable breakdown from ${track.name}.\n\n` +
                    `🌟 *Day 1 to get you started:*\n` +
                    `📖 *${day1.title}* by ${day1.author}\n` +
                    `"${day1.spark}"\n\n` +
                    `👉 Read online: ${day1.link}\n\n` +
                    `_Reply 'SWITCH' anytime to change your reading focus area!_`;

    await sock.sendMessage(sender, { text: welcome });
  });

  // Daily Scheduler at 9:00 AM
  let lastDaySent = -1;
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 9 && now.getMinutes() === 0 && lastDaySent !== now.getDate()) {
      lastDaySent = now.getDate();
      console.log(`[Batch] Running daily 9:00 AM customized distribution...`);
      const list = loadSubs();
      const activeSubs = list.filter(s => s.active);

      for (const sub of activeSubs) {
        const track = TRACKS[sub.track] || TRACKS.growth;
        const nextDay = (sub.day % track.books.length) + 1;
        const book = track.books[nextDay - 1];
        const msg = formatDaily(book, nextDay, track.name);
        const jid = `${sub.phone}@s.whatsapp.net`;

        const delay = Math.floor(Math.random() * 10000) + 5000;
        await new Promise(r => setTimeout(r, delay));

        try {
          await sock.sendMessage(jid, { text: msg });
          sub.day = nextDay;
          sub.lastSentAt = new Date().toISOString();
          saveSubs(list);
          console.log(`[Batch Sent] Day ${nextDay} (${track.name}) to ${sub.phone}`);
        } catch (err) {
          console.error(`[Batch Error] Could not send to ${sub.phone}:`, err.message);
        }
      }
    }
  }, 60000);
}

start();
