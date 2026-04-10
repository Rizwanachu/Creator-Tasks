import { useState } from "react";
import { useTasks } from "@/hooks/use-tasks";
import type { TaskCategory } from "@/hooks/use-tasks";
import { TaskCard } from "@/components/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const CATEGORIES: { label: string; value: TaskCategory | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Reels", value: "reels" },
  { label: "Hooks", value: "hooks" },
  { label: "Thumbnails", value: "thumbnails" },
  { label: "Other", value: "other" },
];

export function Tasks() {
  const [activeCategory, setActiveCategory] = useState<TaskCategory | undefined>(undefined);
  const { data: tasks, isLoading, error } = useTasks(activeCategory);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-1">Task Board</h1>
          <p className="text-zinc-500 text-sm">Find opportunities and earn by completing tasks.</p>
        </div>
        <Button asChild className="btn-gradient text-white rounded-xl border-0 font-semibold shrink-0 w-full sm:w-auto">
          <Link href="/create">Post a Task</Link>
        </Button>
      </div>

      {/* Category filter — horizontally scrollable on small screens */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 whitespace-nowrap shrink-0 ${
              activeCategory === cat.value
                ? "btn-gradient text-white border-transparent"
                : "border-border text-muted-foreground hover:border-purple-500/40 hover:text-foreground bg-transparent"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 h-[220px] flex flex-col gap-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="mt-auto flex justify-between items-center">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-card border border-red-500/20 rounded-2xl px-4">
          <p className="text-red-500 mb-4 font-medium">Failed to load tasks.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      ) : tasks?.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border rounded-2xl flex flex-col items-center justify-center px-4">
          <h3 className="text-xl font-semibold text-foreground mb-2">No tasks available</h3>
          <p className="text-zinc-500 mb-6 max-w-sm text-sm">
            {activeCategory
              ? `No ${activeCategory} tasks posted yet. Try another category or post one.`
              : "There are currently no tasks posted. Be the first to post one."}
          </p>
          <Button asChild className="btn-gradient text-white rounded-xl border-0 font-semibold">
            <Link href="/create">Post a Task</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks?.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {/* Coming soon card — always shown at the end */}
          <div className="relative bg-card border border-dashed border-purple-500/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 min-h-[180px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />
            <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-500 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              Coming Soon
            </span>
            <p className="text-sm font-semibold text-foreground">More tasks dropping soon</p>
            <p className="text-xs text-muted-foreground max-w-[180px]">
              New opportunities are added daily. Check back often!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
