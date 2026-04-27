import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/task-card";
import { Task, useTasks } from "@/hooks/use-tasks";
import { useStats } from "@/hooks/use-stats";
import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";
import { useEffect, useRef, useState } from "react";
import {
  TrendingUp, Users, CheckCircle, Zap, ShieldCheck,
  ArrowRight, Video, Palette, FileText, Globe, Sparkles, Clapperboard,
} from "lucide-react";

const FAKE_TASKS: Task[] = [
  {
    id: "fake-1",
    title: "Edit 30s TikTok Reel from podcast clip",
    description: "Need someone to edit a 30s clip from my recent podcast. Add dynamic captions, B-roll, and sound effects to make it engaging for TikTok.",
    budget: 2500, category: "reels", status: "open", revisionNote: null, revisionCount: 0,
    creatorId: "user_fake", workerId: null, creatorClerkId: null, workerClerkId: null,
    submissionContent: null, submissionUrl: null, attachmentUrl: null, imageUrl: null, deadline: null, flagged: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), creatorName: "Alex M.",
  },
  {
    id: "fake-2",
    title: "Create animated logo for SaaS startup",
    description: "Need a slick 3-second animated logo reveal for my new SaaS product. Should feel premium and modern — smooth transitions, no fluff.",
    budget: 3200, category: "animation", status: "open", revisionNote: null, revisionCount: 0,
    creatorId: "user_fake", workerId: null, creatorClerkId: null, workerClerkId: null,
    submissionContent: null, submissionUrl: null, attachmentUrl: null, imageUrl: null, deadline: null, flagged: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), creatorName: "Sarah K.",
  },
  {
    id: "fake-3",
    title: "Write 5 viral hooks for AI newsletter",
    description: "Looking for punchy, curiosity-driven openers for a weekly AI tools newsletter. Each hook should work as a subject line and opening line.",
    budget: 1500, category: "copywriting", status: "open", revisionNote: null, revisionCount: 0,
    creatorId: "user_fake", workerId: null, creatorClerkId: null, workerClerkId: null,
    submissionContent: null, submissionUrl: null, attachmentUrl: null, imageUrl: null, deadline: null, flagged: false,
    createdAt: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(), creatorName: "DevTips",
  },
];

const TICKER_ITEMS = [
  "Tasks posted daily", "Real Razorpay payouts", "Join our creator community",
  "AI content marketplace", "Earn from your skills", "Post a task in minutes",
  "Tasks posted daily", "Real Razorpay payouts", "Join our creator community",
  "AI content marketplace", "Earn from your skills", "Post a task in minutes",
];

const CATEGORIES = [
  { label: "Reels", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
  { label: "Hooks", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  { label: "Thumbnails", color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20" },
  { label: "Video Editing", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  { label: "Animation", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { label: "Graphic Design", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  { label: "Logo Design", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  { label: "Website Design", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  { label: "Copywriting", color: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20" },
  { label: "Other", color: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Clapperboard,
    title: "Post a task",
    desc: "Describe what you need — a reel, a logo, a landing page. Set your budget and deadline.",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  {
    step: "02",
    icon: Users,
    title: "Creators apply",
    desc: "Skilled creators from our community review your brief and submit their best work.",
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/20",
  },
  {
    step: "03",
    icon: Zap,
    title: "Approve & pay",
    desc: "Review the work, request revisions if needed, and release payment instantly via Razorpay.",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
  },
];

function useCountUp(target: number, duration = 1600) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

function StatCard({ icon: Icon, value, prefix = "", suffix = "", label, color, bg }: {
  icon: React.ElementType; value: number; prefix?: string; suffix?: string; label: string; color: string; bg: string;
}) {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref} className="relative p-6 rounded-2xl border border-border bg-card transition-all duration-300 overflow-hidden">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${bg}`}>
        <Icon size={18} className={color} />
      </div>
      <div className={`text-3xl font-black tracking-tight mb-1 ${color}`}>
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</div>
    </div>
  );
}

function LiveStatsSection() {
  const { data: stats } = useStats();
  const statsConfig = [
    { icon: CheckCircle, value: stats?.completedTasks ?? 0, prefix: "", suffix: "+", label: "Tasks Completed", color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10 border-green-500/20" },
    { icon: TrendingUp, value: stats?.totalPaidOut ?? 0, prefix: "₹", suffix: "+", label: "Paid to Creators", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
    { icon: Users, value: stats?.activeCreators ?? 0, prefix: "", suffix: "+", label: "Active Creators", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
    { icon: Zap, value: 10, prefix: "", suffix: "%", label: "Platform Fee Only", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statsConfig.map((stat) => <StatCard key={stat.label} {...stat} />)}
    </div>
  );
}

export function Home() {
  const { isSignedIn } = useAuth();
  const { data: openTasksData } = useTasks({ status: "open", sort: "newest" });
  const featuredTasks = openTasksData && openTasksData.length > 0
    ? openTasksData.slice(0, 3)
    : FAKE_TASKS;

  if (isSignedIn) return <Redirect to="/tasks" />;

  return (
    <div className="flex flex-col w-full overflow-x-hidden">

      {/* Live Ticker */}
      <div className="border-b border-border bg-muted/40 py-2 overflow-hidden">
        <div className="flex animate-ticker whitespace-nowrap">
          {TICKER_ITEMS.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-6 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="relative py-20 md:py-32 px-4 container mx-auto overflow-hidden">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-[300px] h-[300px] rounded-full bg-pink-500/10 blur-[100px] pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold mb-7">
              <Sparkles size={11} />
              AI Content Marketplace
            </div>

            <h1 className="text-5xl md:text-6xl font-black tracking-[-0.03em] leading-[0.95] mb-5">
              Turn AI skills<br />into{" "}
              <span className="text-gradient-purple">real income</span>
            </h1>

            <p className="text-base text-muted-foreground mb-8 leading-relaxed max-w-md">
              Brands post content tasks — reels, animations, logos, websites and more. Creators earn. Everyone wins.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Button asChild size="lg" className="btn-gradient text-white rounded-xl text-sm px-8 h-11 font-semibold border-0 shadow-md">
                <Link href="/tasks">Browse Tasks</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-xl text-sm px-8 h-11">
                <Link href="/create">Post a Task</Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck size={13} className="text-green-500" />
                Secure payouts via Razorpay
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users size={12} className="text-purple-500" />
                Growing creator community
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap size={12} className="text-amber-500" />
                10% fee only
              </div>
            </div>
          </div>

          {/* Right — floating cards */}
          <div className="hidden lg:block relative h-[420px]">
            <div className="absolute top-0 right-0 w-[270px] animate-float" style={{ animationDuration: "7s" }}>
              <div className="card-glass rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 px-2.5 py-1 rounded-full font-medium">Reels</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">₹2,500</span>
                </div>
                <div className="font-semibold text-foreground text-sm mb-1.5 leading-snug">Edit 30s TikTok Reel from podcast</div>
                <div className="text-xs text-muted-foreground mb-4 leading-relaxed">Add captions, B-roll, and effects...</div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">Alex M. · 2h ago</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    3 viewing
                  </span>
                </div>
              </div>
            </div>

            <div className="absolute top-[160px] right-[48px] w-[230px] animate-float-delay" style={{ animationDuration: "9s" }}>
              <div className="card-glass rounded-2xl p-5 border border-purple-500/20 shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/15 border border-green-500/20 flex items-center justify-center">
                    <CheckCircle size={12} className="text-green-500" />
                  </div>
                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Just paid out</span>
                </div>
                <div className="text-3xl font-black text-foreground tracking-tight leading-none mb-1">₹1,350</div>
                <div className="text-xs text-muted-foreground mt-2">Animation task approved · 2 min ago</div>
              </div>
            </div>

            <div className="absolute bottom-4 right-4 w-[248px] animate-float" style={{ animationDuration: "8s", animationDelay: "3.5s" }}>
              <div className="card-glass rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-full font-medium">Website Design</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">₹4,000</span>
                </div>
                <div className="font-semibold text-foreground text-sm mb-3 leading-snug">Landing page for fintech app</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-medium">Trending</span>
                  <span className="text-xs text-muted-foreground">6 people viewing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section className="py-14 border-y border-border bg-muted/20">
        <div className="container mx-auto px-4">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">10 task categories</p>
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES.map(({ label, color }) => (
              <Link key={label} href={`/tasks?category=${label.toLowerCase().replace(/ /g, "-")}`}>
                <span className={`inline-flex px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all hover:scale-105 cursor-pointer ${color}`}>
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 container mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Simple process</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">How it works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, color, bg }) => (
            <div key={step} className="relative p-7 rounded-2xl border border-border bg-card">
              <div className="absolute top-6 right-6 text-4xl font-black text-border/60 leading-none select-none">{step}</div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 border ${bg}`}>
                <Icon size={20} className={color} />
              </div>
              <h3 className="font-bold text-foreground text-base mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Tasks */}
      <section className="py-16 border-y border-border bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Live opportunities</h2>
              <p className="text-muted-foreground text-sm mt-0.5">Tasks fill up fast — jump in</p>
            </div>
            <Link href="/tasks" className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featuredTasks.map((task) => (
              <TaskCard key={task.id} task={task} disableActions />
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 container mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">By the numbers</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-2">The platform that pays</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">Real money, real creators, real results.</p>
        </div>
        <LiveStatsSection />
      </section>

      {/* CTA */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-purple-500/20 bg-card p-10 md:p-16 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/5 pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-32 bg-purple-500/15 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                Free to join
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-[-0.03em] leading-[0.95] mb-4">
                Ready to <span className="text-gradient-purple">earn?</span>
              </h2>
              <p className="text-muted-foreground text-sm mb-8 max-w-xs mx-auto leading-relaxed">
                Sign up free. Browse tasks. Get paid in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg" className="btn-gradient text-white rounded-xl text-sm px-10 h-11 font-semibold border-0 shadow-md">
                  <Link href="/tasks">Start Earning Now</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-xl text-sm px-8 h-11">
                  <Link href="/creators">Browse Creators</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
