import { useState, useEffect } from "react";
import { useSearchParam } from "@/hooks/use-search-param";
import { useTasks, TaskFilters } from "@/hooks/use-tasks";
import type { TaskCategory } from "@/hooks/use-tasks";
import { TaskCard } from "@/components/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Search, X } from "lucide-react";

const CATEGORIES: { label: string; value: TaskCategory | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Reels", value: "reels" },
  { label: "Hooks", value: "hooks" },
  { label: "Thumbnails", value: "thumbnails" },
  { label: "Other", value: "other" },
];

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Highest pay", value: "highest" },
  { label: "Lowest pay", value: "lowest" },
  { label: "Oldest", value: "oldest" },
];

const STATUS_TABS = [
  { label: "Open", value: "open" },
  { label: "Completed", value: "completed" },
  { label: "All", value: "" },
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
  const [statusFilter, setStatusFilter] = useState("open");

  const filters: TaskFilters = {
    category: activeCategory,
    q: searchQ || undefined,
    minBudget: minBudget ? Number(minBudget) : undefined,
    maxBudget: maxBudget ? Number(maxBudget) : undefined,
    sort,
    status: statusFilter || undefined,
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
    <div className="container mx-auto px-4 py-6 md:py-10 max-w-6xl">

      {/* Page header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Task Board</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Find opportunities and earn by completing tasks.</p>
        </div>
        <Button asChild className="btn-gradient text-white rounded-xl border-0 font-semibold shrink-0 hidden sm:flex">
          <Link href="/create">Post a Task</Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search tasks…"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="pl-10 pr-10 h-11 rounded-xl bg-muted/40 border-border text-sm"
        />
        {searchQ && (
          <button
            onClick={() => setSearchQ("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Status + Sort on one line */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex gap-1.5">
          {STATUS_TABS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setStatusFilter(value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                statusFilter === value
                  ? value === "completed"
                    ? "bg-green-500/15 border-green-500/40 text-green-400"
                    : value === ""
                    ? "bg-zinc-500/15 border-zinc-500/40 text-zinc-400"
                    : "bg-blue-500/15 border-blue-500/40 text-blue-400"
                  : "border-border text-muted-foreground hover:border-zinc-600 hover:text-foreground bg-transparent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/10 transition-all whitespace-nowrap"
            >
              <X size={10} />
              Clear
            </button>
          )}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-xl border border-border bg-muted/40 text-xs text-foreground px-3 py-1.5 h-8 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
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

      {/* Budget filter (inline, compact) */}
      <div className="flex items-center gap-2 mb-6 -mt-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Budget ₹</span>
        <Input
          type="number"
          placeholder="Min"
          value={minBudget}
          onChange={(e) => setMinBudget(e.target.value)}
          className="w-24 h-7 rounded-lg text-xs bg-muted/40 border-border"
        />
        <span className="text-muted-foreground text-xs">–</span>
        <Input
          type="number"
          placeholder="Max"
          value={maxBudget}
          onChange={(e) => setMaxBudget(e.target.value)}
          className="w-24 h-7 rounded-lg text-xs bg-muted/40 border-border"
        />
      </div>

      {/* Task grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks?.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          <div className="relative bg-card border border-dashed border-purple-500/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 min-h-[160px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />
            <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-500 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              Coming Soon
            </span>
            <p className="text-sm font-semibold text-foreground">More tasks dropping soon</p>
            <p className="text-xs text-muted-foreground max-w-[180px]">New opportunities added daily.</p>
          </div>
        </div>
      )}
    </div>
  );
}
