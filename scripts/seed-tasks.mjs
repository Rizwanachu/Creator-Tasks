import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const FAKE_USERS = [
  { id: "00000000-0000-0000-0000-000000000001", clerkId: "seed_alex_m", email: "alex@example.com", name: "Alex M." },
  { id: "00000000-0000-0000-0000-000000000002", clerkId: "seed_sarah_k", email: "sarah@example.com", name: "Sarah K." },
  { id: "00000000-0000-0000-0000-000000000003", clerkId: "seed_devtips", email: "devtips@example.com", name: "DevTips" },
  { id: "00000000-0000-0000-0000-000000000004", clerkId: "seed_growthlabs", email: "growth@example.com", name: "GrowthLabs" },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function hoursAgo(n) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

const TASKS = [
  // completed ones
  {
    title: "Edit 30s viral reel — fitness transformation",
    description: "Cut a 30-second transformation reel from raw footage. Add trending audio, text overlays, and smooth transitions. Must feel native to Instagram Reels.",
    budget: 300,
    category: "reels",
    status: "completed",
    creatorIdx: 0,
    createdAt: daysAgo(5),
  },
  {
    title: "Write 10 high-converting hooks for fitness niche",
    description: "Write 10 scroll-stopping opening lines for short-form fitness videos. Focus on curiosity gaps, pain points, and bold claims. Deliver as a Google Doc.",
    budget: 200,
    category: "hooks",
    status: "completed",
    creatorIdx: 1,
    createdAt: daysAgo(4),
  },
  {
    title: "Create YouTube thumbnail — finance video",
    description: "Design a high-CTR thumbnail for a personal finance video about saving ₹1 lakh in 6 months. Bold text, clear face expression, clean background.",
    budget: 150,
    category: "thumbnails",
    status: "completed",
    creatorIdx: 2,
    createdAt: daysAgo(3),
  },
  {
    title: "Write 5 YouTube video scripts — tech reviews",
    description: "Write engaging 8–10 minute YouTube scripts for tech product reviews. Hook, body sections with B-roll cues, and strong CTA at the end. SEO-friendly.",
    budget: 500,
    category: "other",
    status: "completed",
    creatorIdx: 3,
    createdAt: daysAgo(6),
  },
  {
    title: "Batch edit 5 Instagram Reels — travel vlog",
    description: "Edit 5 short travel reels (15–30s each) from raw clips. Match cuts to beat, add captions, colour grade to a warm cinematic look.",
    budget: 750,
    category: "reels",
    status: "completed",
    creatorIdx: 0,
    createdAt: daysAgo(7),
  },
  // open ones
  {
    title: "Design 3 YouTube thumbnails — crypto channel",
    description: "Create eye-catching thumbnails for a crypto education channel. Use bold fonts, bright contrast, and a shocked/happy face expression. Deliver PSD + PNG.",
    budget: 350,
    category: "thumbnails",
    status: "open",
    creatorIdx: 1,
    createdAt: hoursAgo(8),
  },
  {
    title: "Write 15 viral hooks — personal development niche",
    description: "Write 15 punchy opening lines for YouTube Shorts and Instagram Reels in the self-improvement niche. Each hook must grab attention in the first 3 seconds.",
    budget: 250,
    category: "hooks",
    status: "open",
    creatorIdx: 2,
    createdAt: hoursAgo(3),
  },
  {
    title: "Edit 60s product showcase reel — skincare brand",
    description: "Create a polished 60-second product reel for a skincare brand. Aesthetic transitions, on-brand colour palette (soft pinks), and trending audio track.",
    budget: 450,
    category: "reels",
    status: "open",
    creatorIdx: 3,
    createdAt: hoursAgo(5),
  },
  {
    title: "Thumbnail pack — 10 thumbnails for cooking channel",
    description: "Design 10 consistent YouTube thumbnails for a cooking channel. Must have a unified style — bright background, food close-up, large bold title text.",
    budget: 600,
    category: "thumbnails",
    status: "open",
    creatorIdx: 0,
    createdAt: hoursAgo(12),
  },
  {
    title: "Write email newsletter — 3 issues, SaaS niche",
    description: "Write 3 weekly email newsletters for a B2B SaaS product. Each issue: 400–500 words, 1 main insight, 1 case study snippet, clear CTA. Conversational tone.",
    budget: 380,
    category: "other",
    status: "open",
    creatorIdx: 1,
    createdAt: hoursAgo(2),
  },
  {
    title: "Edit short-form reel — motivational quotes",
    description: "Create a 30s motivational quote reel with cinematic B-roll, text animation, and an epic music track. Deliverable: MP4 optimised for Reels/Shorts.",
    budget: 200,
    category: "reels",
    status: "open",
    creatorIdx: 2,
    createdAt: hoursAgo(1),
  },
  {
    title: "Write 8 curiosity hooks — business & money niche",
    description: "Write 8 irresistible hooks for finance/business short-form content. Focus on curiosity, contrast, and bold opener. Optimised for watch time retention.",
    budget: 160,
    category: "hooks",
    status: "open",
    creatorIdx: 3,
    createdAt: hoursAgo(6),
  },
  {
    title: "LinkedIn carousel design — startup growth tips",
    description: "Design a 10-slide LinkedIn carousel on startup growth hacks. Clean minimal style, brand colours (navy + orange), icons, and punchy copy per slide.",
    budget: 420,
    category: "other",
    status: "open",
    creatorIdx: 0,
    createdAt: daysAgo(1),
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    for (const u of FAKE_USERS) {
      await client.query(
        `INSERT INTO users (id, clerk_id, email, name, balance, pending_balance)
         VALUES ($1, $2, $3, $4, 0, 0)
         ON CONFLICT (clerk_id) DO NOTHING`,
        [u.id, u.clerkId, u.email, u.name]
      );
    }
    console.log("✓ Seeded fake users");

    for (const t of TASKS) {
      const creatorId = FAKE_USERS[t.creatorIdx].id;
      await client.query(
        `INSERT INTO tasks (title, description, budget, category, status, creator_id, revision_count, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 0, $7)`,
        [t.title, t.description, t.budget, t.category, t.status, creatorId, t.createdAt]
      );
    }
    console.log(`✓ Seeded ${TASKS.length} tasks`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
