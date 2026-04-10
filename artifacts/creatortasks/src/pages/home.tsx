import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/task-card";
import { Task } from "@/hooks/use-tasks";
import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";
import { useEffect, useRef, useState } from "react";
import { TrendingUp, Users, CheckCircle, Zap } from "lucide-react";

const FAKE_TASKS: Task[] = [
  {
    id: "fake-1",
    title: "Edit 30s TikTok Reel from podcast clip",
    description: "Need someone to edit a 30s clip from my recent podcast. Add dynamic captions, B-roll, and sound effects to make it engaging for TikTok.",
    budget: 2500,
    category: "reels",
    status: "open",
    revisionNote: null,
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

function useCountUp(target: number, duration = 1500) {
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
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

function StatCard({ icon: Icon, value, prefix = "", suffix = "", label, color }: typeof STATS[0]) {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref} className="relative p-6 rounded-2xl bg-[#111217] border border-[#1F2228] card-glow transition-all duration-300 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-white/5`}>
        <Icon size={20} className={color} />
      </div>
      <div className={`text-3xl font-bold tracking-tight mb-1 ${color}`}>
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-zinc-500">{label}</div>
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
      <div className="border-b border-[#1F2228] bg-[#111217]/60 py-2 overflow-hidden">
        <div className="flex animate-ticker whitespace-nowrap">
          {TICKER_ITEMS.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-6 text-xs text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative py-24 md:py-36 px-4 container mx-auto overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none animate-pulse-slow" />
        <div className="absolute top-1/4 right-0 w-[300px] h-[300px] rounded-full bg-pink-600/8 blur-[100px] pointer-events-none animate-pulse-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] rounded-full bg-blue-600/6 blur-[80px] pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-300 text-xs font-medium mb-8 animate-fade-up">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              AI Content Marketplace
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6 animate-fade-up-delay-1">
              Turn AI skills<br />
              into <span className="text-gradient-purple">real income</span>
            </h1>

            <p className="text-lg md:text-xl text-zinc-400 mb-10 leading-relaxed max-w-lg animate-fade-up-delay-2">
              Post tasks, earn money. Creators get paid for viral reels, hooks, and thumbnails — with real Razorpay payouts.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 animate-fade-up-delay-3">
              <Button asChild size="lg" className="btn-gradient text-white rounded-xl text-base px-8 py-6 h-auto font-semibold border-0">
                <Link href="/tasks">Browse Tasks</Link>
              </Button>
              <Button asChild size="lg" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-base px-8 py-6 h-auto transition-all duration-200 hover:border-white/20">
                <Link href="/create">Post a Task</Link>
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-4 mt-8 animate-fade-up-delay-3">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <CheckCircle size={13} className="text-green-500" />
                Instant payouts
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <CheckCircle size={13} className="text-green-500" />
                10% fee only
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <CheckCircle size={13} className="text-green-500" />
                Razorpay secured
              </div>
            </div>
          </div>

          {/* Right: Floating task cards */}
          <div className="hidden lg:block relative h-[420px]">
            <div className="absolute top-8 right-0 w-72 animate-float">
              <div className="bg-[#111217] border border-[#1F2228] rounded-2xl p-5 card-glass shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded-full font-medium">Reels</span>
                  <span className="text-purple-400 font-bold text-sm">₹2,500</span>
                </div>
                <div className="font-semibold text-white text-sm mb-2">Edit 30s TikTok Reel from podcast</div>
                <div className="text-xs text-zinc-500 mb-4">Add captions, B-roll, and effects...</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600">By Alex M. · 2h ago</span>
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
              </div>
            </div>

            <div className="absolute top-48 right-12 w-64 animate-float-delay">
              <div className="bg-[#111217] border border-purple-500/20 rounded-2xl p-5 card-glass shadow-2xl glow-purple">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle size={12} className="text-green-400" />
                  </div>
                  <span className="text-xs text-green-400 font-medium">Just paid out</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">₹1,350</div>
                <div className="text-xs text-zinc-500">Hooks task approved · 2 min ago</div>
              </div>
            </div>

            <div className="absolute bottom-12 right-4 w-60 animate-float" style={{ animationDelay: "3s" }}>
              <div className="bg-[#111217] border border-[#1F2228] rounded-2xl p-5 card-glass shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-medium">Thumbnails</span>
                  <span className="text-purple-400 font-bold text-sm">₹1,500</span>
                </div>
                <div className="font-semibold text-white text-sm mb-2">YouTube thumbnail for React tutorial</div>
                <div className="flex items-center gap-1.5 mt-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-zinc-500">3 people viewing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tasks */}
      <section className="py-16 border-y border-[#1F2228] bg-[#111217]/40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight mb-1">Recent Opportunities</h2>
              <p className="text-zinc-500 text-sm">Jump in — tasks fill up fast</p>
            </div>
            <Link href="/tasks" className="text-sm text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 transition-colors">
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
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-3">The platform that pays</h2>
          <p className="text-zinc-500 max-w-md mx-auto">Real money, real creators, real results. Join a growing marketplace of AI content professionals.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-purple-500/20 bg-[#111217] p-10 md:p-16 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/10 pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-purple-600/20 blur-3xl pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
                Ready to <span className="text-gradient-purple">earn?</span>
              </h2>
              <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                Sign up free. Browse tasks. Get paid in minutes.
              </p>
              <Button asChild size="lg" className="btn-gradient text-white rounded-xl text-base px-10 py-6 h-auto font-semibold border-0">
                <Link href="/tasks">Start Earning Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1F2228] py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm font-semibold text-white">CreatorTasks</div>
          <div className="text-xs text-zinc-600">AI Content Marketplace · Powered by Razorpay</div>
        </div>
      </footer>
    </div>
  );
}
