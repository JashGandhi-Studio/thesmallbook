const fs = require('fs');

global.window = {};
const dataContent = fs.readFileSync('js/data.js', 'utf8');
eval(dataContent);
const BOOKS = global.window.BOOKS;

const REMAINING_ORIGINALS = {
  "the-zero-discount-diner": [
    {
      title: "Pricing Power Is the Only Real Moat",
      chapter: "CHAPTER 1",
      summary: "Discounting is the desperate refuge of enterprises that have failed to build product differentiation. When you cut prices to match budget competitors, you attract price-sensitive deal chasers who possess zero brand loyalty and depart the moment someone undercuts you by five rupees. A legendary diner charges full price because the culinary consistency, warmth of service, and cultural experience cannot be replicated.",
      example: "Iconic century-old Irani cafes and historic South Indian tiffin rooms refusing to offer delivery aggregator coupons, maintaining packed lines down the street while discount-heavy ghost kitchens burn through seed funding and shutter.",
      action: "Remove all blanket seasonal discounts from your primary product and instead invest that margin into superior raw ingredients and customer service."
    },
    {
      title: "The Sacred Menu Contract",
      chapter: "CHAPTER 2",
      summary: "A diner that tries to serve burgers, sushi, pizza, and regional curries excels at nothing. True culinary authority comes from curating a tight, uncompromising menu of five signature items perfected over decades. Customers return not for novelty, but for the comforting certainty that today's dish will taste identical to the one they loved ten years ago.",
      example: "Famous filter coffee and dosa joints serving only four menu items from six in the morning until noon, generating higher per-square-foot revenue than expansive multi-cuisine hotel buffets.",
      action: "Identify the top twenty percent of your service offerings that generate eighty percent of customer praise, and aggressively retire the bloated bottom half."
    },
    {
      title: "Honoring Frontline Artisans",
      chapter: "CHAPTER 3",
      summary: "The secret to customer retention is not marketing slogans; it is the master chef at the tawa who has brewed the same tea blend for thirty years. Businesses that churn frontline staff in pursuit of rock-bottom hourly labor wages destroy their institutional memory and sacrifice customer trust.",
      example: "Historic heritage diners paying above-market wages and offering profit-sharing to head cooks and senior waitstaff, resulting in forty-year tenures and generational customer loyalty.",
      action: "Audit the turnover rate of your frontline customer-facing staff and introduce performance profit-sharing to retain institutional artisans."
    },
    {
      title: "Cash Flow Over Valuation Narratives",
      chapter: "CHAPTER 4",
      summary: "Modern venture-backed startups celebrate paper valuations based on discounted user acquisition metrics. The independent diner operates on the brutal, beautiful discipline of daily cash registers: either cash collected exceeds expenses by sundown, or the lights go out. Positive daily operating cash flow is the ultimate sovereign independence.",
      example: "Cash-positive independent restaurants self-funding their own multi-location expansion across decades without selling a single share of equity to predatory lenders.",
      action: "Track your enterprise health by weekly cash collected from paying customers rather than speculative future funding rounds."
    },
    {
      title: "Atmosphere as Unconscious Anchor",
      chapter: "CHAPTER 5",
      summary: "Customers do not merely pay for calories; they pay for psychological belonging. The clinking of porcelain cups, the familiar aroma of roasted spices, and the timeless wooden booth create a sanctuary from the frantic outside world that no sterile digital interface can match.",
      example: "Patrons visiting the same neighborhood cafe every morning for forty years to write, read, and converse, treating the space as their indispensable third place.",
      action: "Design your customer environment with sensory warmth, acoustic comfort, and tactile materials that invite unhurried presence."
    },
    {
      title: "Refusing Algorithmic Distraction",
      chapter: "CHAPTER 6",
      summary: "When food delivery apps demand thirty percent commissions and force kitchens to prioritize plastic takeout containers over seated guests, dining room culture degrades. The zero-discount diner prioritizes the physical human being seated at the table over anonymous algorithmic pings.",
      example: "Renowned bakeries turning off third-party delivery tablets during peak weekend rushes to ensure that walking patrons receive warm, freshly baked bread without delays.",
      action: "Protect your core seated clients from being deprioritized in favor of low-margin, high-friction automated aggregators."
    },
    {
      title: "Generational Compounding",
      chapter: "CHAPTER 7",
      summary: "The greatest businesses are built to last across generations rather than flipped in a five-year private equity liquidity cycle. When your time horizon is fifty years, you make decisions that prioritize reputation, community trust, and enduring quality over short-term quarterly margin extraction.",
      example: "Family-owned food institutions celebrating centennial anniversaries with zero debt, having fed prime ministers, students, and grandparents from the exact same counter.",
      action: "Make one strategic decision this quarter with a twenty-year horizon in mind, explicitly declining a short-term profit compromise."
    }
  ],
  "the-first-hundred-patrons": [
    {
      title: "Do Things That Do Not Scale",
      chapter: "CHAPTER 1",
      summary: "The fatal mistake of early-stage founders is attempting to run automated Google Ad campaigns and broad programmatic funnels before achieving product-market resonance. In the beginning, you must manually recruit customers one by one: walk into offices, answer individual emails within four minutes, and handcraft bespoke onboarding experiences that build fanatical evangelists.",
      example: "Stripe founders Patrick and John Collison personally sitting down at developers' laptops during tech meetups and installing the payment SDK on the spot (the Collison Installation).",
      action: "Identify ten ideal potential customers this week and reach out to them personally with a tailored demo addressing their specific workflow pain points."
    },
    {
      title: "Listen to the Outliers, Not the Averages",
      chapter: "CHAPTER 2",
      summary: "Average customers give polite, generic feedback that leads to bland, mediocre compromise. Your first true breakthrough insights come from the obsessive power users who push your product to its absolute limits, complain passionately about obscure edge cases, and invent novel workflows you never anticipated.",
      example: "Superhuman building an elite keyboard-driven email client by exclusively interviewing users who processed over one hundred emails every morning and were desperate for speed.",
      action: "Schedule thirty-minute in-depth video interviews with your top five most active power users and map out their exact daily interaction loops."
    },
    {
      title: "The Power of Radical Transparency",
      chapter: "CHAPTER 3",
      summary: "Early products have bugs, missing features, and downtime. If you hide behind corporate PR statements, you alienate your early community. When you share public roadmaps, openly acknowledge operational failures, and invite early patrons into your engineering slack, customers feel like co-builders rather than transactional consumers.",
      example: "Buffer building a multi-million-dollar SaaS business by making employee salaries, revenue metrics, and architecture roadmaps publicly viewable online.",
      action: "Publish an honest post-mortem or monthly transparency note to your early users outlining your biggest operational challenge and how you plan to fix it."
    },
    {
      title: "Charging Real Money from Day One",
      chapter: "CHAPTER 4",
      summary: "Free users give you false positives: they will tell you they love your prototype because it costs them nothing to be polite. True validation occurs only when an invoice is sent and a credit card is charged. If a customer refuses to pay five hundred rupees for your software, you have not solved an urgent problem.",
      example: "Basecamp starting as a paid tool from the first customer signup, ensuring that every user feedback request was grounded in economic reality.",
      action: "Eliminate permanent free tiers for new enterprise signups; offer a time-limited free trial that requires credit card commitment to test genuine willingness to pay."
    },
    {
      title: "The Velocity of Founder Response",
      chapter: "CHAPTER 5",
      summary: "In the early days, speed of response is your only unassailable competitive advantage against sluggish incumbents. When a user reports a bug at nine at night and the founder deploys a production patch and replies by nine-thirty, that user becomes a lifetime brand ambassador.",
      example: "Early Airbnb founders personally visiting hosts in New York to photograph apartments and rewriting listing descriptions overnight.",
      action: "Set up direct alerts on your phone for new user feedback and commit to replying to all customer support inquiries within fifteen minutes during your initial rollout."
    },
    {
      title: "Curate Your Initial Community",
      chapter: "CHAPTER 6",
      summary: "Your first one hundred patrons establish the cultural DNA and expectations of your entire community. If you let toxic, entitled, or misaligned users in, they drive away your best creative contributors. Be ruthlessly selective about who you invite into your beta program.",
      example: "Figma selectively rolling out beta access to prominent design leaders and agency heads who set a high bar for collaborative design templates in the public gallery.",
      action: "Require a short application or introductory screening call before granting access to your early product beta to ensure user alignment."
    },
    {
      title: "Turn Customers into Shareholders of Pride",
      chapter: "CHAPTER 7",
      summary: "People want to champion the underdog. When you celebrate your early patrons by featuring their achievements, sending handwritten thank-you notes, and crediting them in release notes, they take personal pride in your growth and recommend you to their entire peer network.",
      example: "Monzo issuing distinctive hot-coral debit cards to early crowdfunding backers, turning every retail payment into a viral conversation starter.",
      action: "Send handwritten thank-you notes or personalized video messages to your first twenty paying customers expressing genuine gratitude."
    },
    {
      title: "Transitioning from Hustle to System",
      chapter: "CHAPTER 8",
      summary: "While manual founder hustle gets you from zero to one hundred patrons, it will break at one thousand. Once you understand the manual touchpoints that delight users, codify them into repeatable software workflows, hiring rubrics, and automated onboarding sequences that maintain intimacy at scale.",
      example: "Zapier codifying early manual customer support patterns into comprehensive public documentation and automated onboarding sequences that scale to millions of users.",
      action: "Document the exact steps you take to onboard a new customer manually, and identify which three steps can be turned into automated self-serve workflows."
    }
  ]
};

// Apply updates
let updated = 0;
BOOKS.forEach(b => {
  if (REMAINING_ORIGINALS[b.id]) {
    b.lessons = REMAINING_ORIGINALS[b.id];
    updated++;
    console.log('Enriched remaining original:', b.id, 'with', b.lessons.length, 'lessons');
  }
});

console.log('Updated remaining originals count:', updated);

// Verify total lessons is still exactly 3685!
const newTotal = BOOKS.reduce((acc, b) => acc + b.lessons.length, 0);
console.log('New total lessons:', newTotal);
if (newTotal !== 3685) {
  console.error('ERROR: Total lessons mismatch!');
  process.exit(1);
}

const serialized = 'const BOOKS = ' + JSON.stringify(BOOKS, null, 2) + ';\nif (typeof window !== "undefined") window.BOOKS = BOOKS;\n';

// Verify zero em and en dashes
if (serialized.includes('\u2014') || serialized.includes('\u2013')) {
  console.error('ERROR: em or en dash found!');
  process.exit(1);
}

fs.writeFileSync('js/data.js', serialized, 'utf8');
console.log('js/data.js updated successfully with all remaining originals!');
