import { useState, useEffect } from "react";
import { useSearchParam } from "@/hooks/use-search-param";
import { useTasks, TaskFilters } from "@/hooks/use-tasks";
import type { TaskCategory } from "@/hooks/use-tasks";
import { TaskCard } from "@/components/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Search, SlidersHorizontal, X } from "lucide-react";

const CATEGORIES: { label: string; value: TaskCategory | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Reels", value: "reels" },
  { label: "Hooks", value: "hooks" },
  { label: "Thumbnails", value: "thumbnails" },
  { label: "Other", value: "other" },
];

const SORT_OPTIONS = [
  { label: "Newest first", value: "newest" },
  { label: "Highest budget", value: "highest" },
  { label: "Lowest budget", value: "lowest" },
  { label: "Oldest first", value: "oldest" },
];

const VALID_CATEGORIES = ["reels", "hooks", "thumbnails", "other"];

export function Tasks() {
  const categoryParam = useSearchParam("category");
  const categoryFromUrl = categoryParam && VALID_CATEGORIES.includes(categoryParam)
    ? (categoryParam as TaskCategory)
    : undefined;

  const [activeCategory, setActiveCategory] = useState<TaskCategory | undefined>(categoryFromUrl);

  useEffect(() => {
    setActiveCategory(categoryFromUrl);
  }, [categoryFromUrl]);

  const [searchQ, setSearchQ] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [sort, setSort] = useState<"newest" | "highest" | "lowest" | "oldest">("newest");
  const [showFilters, setShowFilters] = useState(false);

  const filters: TaskFilters = {
    category: activeCategory,
    q: searchQ || undefined,
    minBudget: minBudget ? Number(minBudget) : undefined,
    maxBudget: maxBudget ? Number(maxBudget) : undefined,
    sort,
  };

  const { data: tasks, isLoading, error } = useTasks(filters);

  const hasActiveFilters = searchQ || minBudget || maxBudget || sort !== "newest" || activeCategory;

  function clearFilters() {
    setSearchQ("");
    setMinBudget("");
    setMaxBudget("");
    setSort("newest");
    setActiveCategory(undefined);
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-1">Task Board</h1>
          <p className="text-zinc-500 text-sm">Find opportunities and earn by completing tasks.</p>
        </div>
        <Button asChild className="btn-gradient text-white rounded-xl border-0 font-semibold shrink-0 w-full sm:w-auto">
          <Link href="/create">Post a Task</Link>
        </Button>
      </div>

      {/* Search + filter bar */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="pl-9 rounded-xl h-10 bg-muted/40 border-border"
            />
            {searchQ && (
              <button
                onClick={() => setSearchQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
              showFilters || (minBudget || maxBudget)
                ? "border-purple-500/40 text-purple-400 bg-purple-500/10"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Filters</span>
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-xl border border-border bg-muted/40 text-sm text-foreground px-3 py-2 h-10 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex gap-3 flex-wrap items-center bg-muted/30 border border-border rounded-xl p-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Budget ₹</label>
              <Input
                type="number"
                placeholder="Min"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                className="w-24 h-8 rounded-lg text-sm bg-background"
              />
              <span className="text-muted-foreground text-xs">–</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                className="w-24 h-8 rounded-lg text-sm bg-background"
              />
            </div>
          </div>
        )}

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
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

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 rounded-full text-sm font-medium border border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/10 transition-all whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <X size={11} />
              Clear
            </button>
          )}
        </div>
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
          <p className="text-red-500 mb-4 font-medium">
            {(error as Error)?.message ?? "Failed to load tasks."}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      ) : tasks?.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border rounded-2xl flex flex-col items-center justify-center px-4">
          <h3 className="text-xl font-semibold text-foreground mb-2">No tasks found</h3>
          <p className="text-zinc-500 mb-6 max-w-sm text-sm">
            {hasActiveFilters
              ? "No tasks match your current filters. Try adjusting your search."
              : "There are currently no tasks posted. Be the first to post one."}
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
          ) : (
            <Button asChild className="btn-gradient text-white rounded-xl border-0 font-semibold">
              <Link href="/create">Post a Task</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks?.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
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
