import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/task-card";
import { Task } from "@/hooks/use-tasks";
import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";

const FAKE_TASKS: Task[] = [
  {
    id: "fake-1",
    title: "Edit 30s TikTok Reel from podcast clip",
    description: "Need someone to edit a 30s clip from my recent podcast. Add dynamic captions, B-roll, and sound effects to make it engaging for TikTok.",
    budget: 2500,
    status: "open",
    creatorId: "user_fake",
    workerId: null,
    creatorClerkId: null,
    workerClerkId: null,
    submissionContent: null,
    createdAt: new Date().toISOString(),
    creatorName: "Alex M.",
  },
  {
    id: "fake-2",
    title: "Create 5 viral Twitter hooks for AI thread",
    description: "I need 5 attention-grabbing hooks for a Twitter thread about generative AI tools. They need to create curiosity without being clickbait.",
    budget: 1000,
    status: "open",
    creatorId: "user_fake",
    workerId: null,
    creatorClerkId: null,
    workerClerkId: null,
    submissionContent: null,
    createdAt: new Date().toISOString(),
    creatorName: "Sarah K.",
  },
  {
    id: "fake-3",
    title: "Design YouTube thumbnail for coding tutorial",
    description: "Looking for a bold, high-contrast thumbnail for a React tutorial. Needs to show the end result clearly and have large readable text.",
    budget: 1500,
    status: "open",
    creatorId: "user_fake",
    workerId: null,
    creatorClerkId: null,
    workerClerkId: null,
    submissionContent: null,
    createdAt: new Date().toISOString(),
    creatorName: "DevTips",
  },
];

export function Home() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Redirect to="/tasks" />;
  }

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="py-20 md:py-32 px-4 container mx-auto">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-semibold text-white tracking-tight mb-6 leading-tight">
            Turn AI skills into income
          </h1>
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl leading-relaxed">
            Get paid to create viral reels, hooks, thumbnails and more. Connect with creators who need your skills today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-base px-8 py-6 h-auto">
              <Link href="/tasks">Browse Tasks</Link>
            </Button>
            <Button asChild size="lg" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-base px-8 py-6 h-auto">
              <Link href="/create">Post a Task</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Tasks */}
      <section className="py-16 bg-[#111217] border-y border-[#1F2228]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl font-semibold text-white">Recent Opportunities</h2>
            <Link href="/tasks" className="text-purple-500 hover:text-purple-400 font-medium">
              View all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FAKE_TASKS.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 container mx-auto text-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-4xl font-bold text-white mb-2">120+</div>
            <div className="text-zinc-400">Tasks Completed</div>
          </div>
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-4xl font-bold text-purple-500 mb-2">₹25,000+</div>
            <div className="text-zinc-400">Earned by Creators</div>
          </div>
        </div>
      </section>
    </div>
  );
}
