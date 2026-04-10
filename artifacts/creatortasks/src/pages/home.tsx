import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/task-card";
import { Task } from "@/hooks/use-tasks";
import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";
import { useEffect, useRef, useState } from "react";
import { TrendingUp, Users, CheckCircle, Zap, ShieldCheck } from "lucide-react";

const FAKE_TASKS: Task[] = [
  {
    id: "fake-1",
    title: "Edit 30s TikTok Reel from podcast clip",
    description: "Need someone to edit a 30s clip from my recent podcast. Add dynamic captions, B-roll, and sound effects to make it engaging for TikTok.",
    budget: 2500,
    category: "reels",
    status: "open",
    revisionNote: null,
    revisionCount: 0,
    creatorId: "user_fake",
    workerId: null,
    creatorClerkId: null,
    workerClerkId: null,
    submissionContent: null,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    creatorName: "Alex M.",
  },
  {
    id: "fake-2",
    title: "Create 5 viral Twitter hooks for AI thread",
    description: "I need 5 attention-grabbing hooks for a Twitter thread about generative AI tools. They need to create curiosity without being clickbait.",
    budget: 1000,
    category: "hooks",
    status: "open",
    revisionNote: null,
    revisionCount: 0,
    creatorId: "user_fake",
    workerId: null,
    creatorClerkId: null,
    workerClerkId: null,
    submissionContent: null,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    creatorName: "Sarah K.",
  },
  {
    id: "fake-3",
    title: "Design YouTube thumbnail for coding tutorial",
    description: "Looking for a bold, high-contrast thumbnail for a React tutorial. Needs to show the end result clearly and have large readable text.",
    budget: 1500,
    category: "thumbnails",
    status: "open",
    revisionNote: null,
    revisionCount: 0,
    creatorId: "user_fake",
    workerId: null,
    creatorClerkId: null,
    workerClerkId: null,
    submissionContent: null,
    createdAt: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
    creatorName: "DevTips",
  },
];

const TICKER_ITEMS = [
  "12 tasks posted today",
  "₹5,200 paid out this week",
  "3 people just earned",
  "New Reels task — ₹3,000",
  "Last payout: 4 minutes ago",
  "47 creators active now",
  "12 tasks posted today",
  "₹5,200 paid out this week",
  "3 people just earned",
  "New Reels task — ₹3,000",
  "Last payout: 4 minutes ago",
  "47 creators active now",
];

const STATS = [
  { icon: CheckCircle, value: 120, suffix: "+", label: "Tasks Completed", color: "text-green-400" },
  { icon: TrendingUp, value: 25000, prefix: "₹", suffix: "+", label: "Paid to Creators", color: "text-purple-400" },
  { icon: Users, value: 340, suffix: "+", label: "Active Creators", color: "text-pink-400" },
  { icon: Zap, value: 10, suffix: "%", label: "Platform Fee Only", color: "text-amber-400" },
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

function StatCard({ icon: Icon, value, prefix = "", suffix = "", label, color }: typeof STATS[0]) {
  const { count, ref } = useCountUp(value);
  return (
    <div
      ref={ref}
      className="relative p-6 rounded-2xl border border-border card-lit card-glow transition-all duration-300 overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.015] to-transparent pointer-events-none" />
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 bg-muted border border-border`}>
        <Icon size={20} className={color} />
      </div>
      <div className={`text-3xl font-bold tracking-tight mb-1 num-glow ${color}`}>
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-xs text-zinc-500 font-medium uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}

export function Home() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Redirect to="/tasks" />;
  }

  return (
    <div className="flex flex-col w-full overflow-x-hidden">

      {/* Live Ticker */}
      <div className="border-b border-border bg-muted/40 py-2 overflow-hidden">
        <div className="flex animate-ticker whitespace-nowrap">
          {TICKER_ITEMS.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-6 text-xs text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative py-28 md:py-40 px-4 container mx-auto overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-purple-600/8 blur-[140px] pointer-events-none animate-pulse-slow" />
        <div className="absolute top-1/4 right-0 w-[350px] h-[350px] rounded-full bg-pink-600/6 blur-[120px] pointer-events-none animate-pulse-slow" style={{ animationDelay: "2.5s" }} />

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text — this is the dominant element */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/8 text-purple-400 text-xs font-medium mb-8 animate-fade-up">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              AI Content Marketplace
            </div>

            {/* DOMINANT element — h1 is king */}
            <h1 className="text-6xl md:text-[5.5rem] font-black tracking-[-0.03em] leading-[0.95] mb-6 animate-fade-up-delay-1">
              Turn AI skills<br />
              into{" "}
              <span className="text-gradient-purple">real income</span>
            </h1>

            {/* Subtext — clearly subordinate */}
            <p className="text-base text-zinc-500 mb-10 leading-relaxed max-w-md animate-fade-up-delay-2">
              Post tasks, earn money. Get paid for viral reels, hooks, and thumbnails — with real Razorpay payouts.
            </p>

            {/* CTAs — primary dominates, secondary recedes */}
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-up-delay-3">
              <Button
                asChild
                size="lg"
                className="btn-gradient text-white rounded-xl text-base px-9 py-6 h-auto font-semibold border-0 shadow-lg"
              >
                <Link href="/tasks">Browse Tasks</Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="bg-transparent hover:bg-muted border border-border text-muted-foreground hover:text-foreground rounded-xl text-base px-8 py-6 h-auto transition-all duration-200"
              >
                <Link href="/create">Post a Task</Link>
              </Button>
            </div>

            {/* Trust anchor — important credibility line */}
            <div className="flex flex-wrap items-center gap-5 mt-8 pt-8 border-t border-border animate-fade-up-delay-3">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <ShieldCheck size={13} className="text-green-500" />
                <span>Secure payouts via <span className="text-zinc-400 font-medium">Razorpay</span></span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Users size={12} className="text-purple-400" />
                <span>Trusted by <span className="text-zinc-400 font-medium">300+ creators</span></span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Zap size={12} className="text-amber-400" />
                <span className="text-zinc-400 font-medium">10% fee only</span>
              </div>
            </div>
          </div>

          {/* Right: Floating cards — animated UI preview */}
          <div className="hidden lg:block relative h-[440px]">
            {/* Card 1 */}
            <div className="absolute top-0 right-0 w-[280px] animate-float" style={{ animationDuration: "7s" }}>
              <div className="card-glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2.5 py-1 rounded-full font-medium">Reels</span>
                  <span className="text-purple-400 font-bold text-sm">₹2,500</span>
                </div>
                <div className="font-semibold text-foreground text-sm mb-1.5 leading-snug">Edit 30s TikTok Reel from podcast</div>
                <div className="text-xs text-muted-foreground mb-4 leading-relaxed">Add captions, B-roll, and effects...</div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs text-zinc-600">Alex M. · 2h ago</span>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    3 viewing
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 — payout confirmation, most prominent */}
            <div className="absolute top-[170px] right-[44px] w-[240px] animate-float-delay" style={{ animationDuration: "9s" }}>
              <div className="card-glass glow-purple rounded-2xl p-5 border border-purple-500/25">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/15 border border-green-500/20 flex items-center justify-center">
                    <CheckCircle size={12} className="text-green-400" />
                  </div>
                  <span className="text-xs text-green-400 font-semibold">Just paid out</span>
                </div>
                <div className="text-[2rem] font-black text-foreground tracking-tight leading-none mb-1">₹1,350</div>
                <div className="text-xs text-zinc-500 mt-2">Hooks task approved · 2 min ago</div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="absolute bottom-0 right-[16px] w-[252px] animate-float" style={{ animationDuration: "8s", animationDelay: "3.5s" }}>
              <div className="card-glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-full font-medium">Thumbnails</span>
                  <span className="text-purple-400 font-bold text-sm">₹1,500</span>
                </div>
                <div className="font-semibold text-foreground text-sm mb-1.5 leading-snug">YouTube thumbnail for React tutorial</div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                  <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-medium">Trending</span>
                  <span className="text-xs text-zinc-600">4 people viewing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tasks */}
      <section className="py-20 border-y border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight mb-1">Recent Opportunities</h2>
              <p className="text-zinc-600 text-sm">Tasks fill up fast — jump in</p>
            </div>
            <Link href="/tasks" className="text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors">
              View all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FAKE_TASKS.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 container mx-auto">
        <div className="text-center mb-14">
          {/* Section label is subordinate — h2 is the focus */}
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">By the numbers</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-3">The platform that pays</h2>
          <p className="text-zinc-500 text-sm max-w-sm mx-auto">Real money, real creators, real results.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-purple-500/20 bg-card p-12 md:p-20 text-center card-lit">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/10 pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-40 bg-purple-600/15 blur-3xl pointer-events-none" />
            <div className="relative">
              <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-[-0.03em] leading-[0.95] mb-4">
                Ready to <span className="text-gradient-purple">earn?</span>
              </h2>
              {/* Subordinate subtext */}
              <p className="text-zinc-500 text-sm mb-10 max-w-xs mx-auto leading-relaxed">
                Sign up free. Browse tasks. Get paid in minutes.
              </p>
              <Button asChild size="lg" className="btn-gradient text-white rounded-xl text-base px-12 py-6 h-auto font-semibold border-0">
                <Link href="/tasks">Start Earning Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
