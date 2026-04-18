import { useState, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { useCreators, type CreatorSummary } from "@/hooks/use-creators";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star, CheckCircle, Users, ArrowRight } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function avatarSrc(objectPath: string | null | undefined): string | null {
  if (!objectPath) return null;
  if (objectPath.startsWith("data:") || objectPath.startsWith("http://") || objectPath.startsWith("https://")) return objectPath;
  return `${API_BASE}/api/storage${objectPath}`;
}

const SKILL_PILLS = [
  { value: "", label: "All" },
  { value: "reels", label: "Reels" },
  { value: "hooks", label: "Hooks" },
  { value: "thumbnails", label: "Thumbnails" },
  { value: "other", label: "Other" },
];

const SKILL_COLORS: Record<string, string> = {
  reels: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  hooks: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  thumbnails: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  other: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

function CreatorCard({ creator }: { creator: CreatorSummary }) {
  const initials = creator.name
    ? creator.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const avg = creator.rating.average ? parseFloat(creator.rating.average) : null;
  const imgSrc = avatarSrc(creator.avatarUrl);
  const profileHref = creator.username ? `/creator/${creator.username}` : `/profile/${creator.clerkId}`;

  return (
    <Link href={profileHref}>
      <div className="group bg-card border border-border rounded-2xl p-5 hover:border-purple-500/30 hover:bg-purple-500/[0.02] transition-all duration-200 cursor-pointer flex flex-col h-full">
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="w-12 h-12 border border-border rounded-xl shrink-0">
            {imgSrc && <AvatarImage src={imgSrc} alt={creator.name ?? ""} className="object-cover" />}
            <AvatarFallback className="bg-gradient-to-br from-purple-600/25 to-pink-600/25 text-purple-300 text-sm font-bold rounded-xl">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span className="font-semibold text-foreground text-sm truncate">{creator.name || "Anonymous"}</span>
            </div>
            {creator.username && (
              <span className="text-xs text-muted-foreground">@{creator.username}</span>
            )}
          </div>
        </div>

        {creator.bio ? (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4 flex-1">{creator.bio}</p>
        ) : (
          <p className="text-xs text-muted-foreground/40 italic mb-4 flex-1">No bio yet</p>
        )}

        {creator.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {creator.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${SKILL_COLORS[skill] ?? SKILL_COLORS.other}`}
              >
                {skill.charAt(0).toUpperCase() + skill.slice(1)}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle size={11} className="text-green-500" />
              {creator.completedTasksCount}
            </span>
            {avg !== null && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Star size={10} className="text-amber-400 fill-amber-400 shrink-0" />
                {creator.rating.average}
                <span className="text-muted-foreground/50 ml-0.5">({creator.rating.total})</span>
              </span>
            )}
          </div>
          <span className="text-xs text-purple-400 group-hover:text-purple-300 flex items-center gap-0.5 transition-colors">
            View Profile <ArrowRight size={11} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function CreatorCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start gap-4 mb-4">
        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-3/4 mb-4" />
      <div className="flex gap-1.5 mb-4">
        <Skeleton className="h-4 w-12 rounded-full" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-px w-full mb-3" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-10" />
      </div>
    </div>
  );
}

export function CreatorsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState("");
  const [sort, setSort] = useState<"most_active" | "top_rated" | "newest">("most_active");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, error } = useCreators({
    search,
    skill,
    sort,
    limit: 12,
  });

  const handleSearch = useCallback(() => {
    setSearch(searchInput.trim());
  }, [searchInput]);

  const allCreators = data?.pages.flatMap((p) => p.creators) ?? [];

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Users size={18} className="text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Browse Creators</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-[52px]">Discover talented creators on the platform and invite them to your tasks.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or @username…"
            className="pl-9 rounded-xl bg-muted/40 border-border text-sm h-10"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl h-10 px-4 text-sm shrink-0"
          onClick={handleSearch}
        >
          Search
        </Button>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-full sm:w-44 rounded-xl bg-muted/40 border-border h-10 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="most_active">Most Active</SelectItem>
            <SelectItem value="top_rated">Top Rated</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2 mb-7">
        {SKILL_PILLS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setSkill(value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
              skill === value
                ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                : "bg-muted/40 text-muted-foreground border-border hover:border-purple-500/30 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          Failed to load creators. Please try again.
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <CreatorCardSkeleton key={i} />)}
        </div>
      ) : allCreators.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <Users size={20} className="text-purple-400" />
          </div>
          <h2 className="text-base font-bold text-foreground mb-1">No creators found</h2>
          <p className="text-sm text-muted-foreground">
            {search || skill ? "Try adjusting your search or filters." : "No creators have joined yet — be the first!"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allCreators.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-8 text-center">
              <Button
                variant="outline"
                className="rounded-xl px-8 border-border text-muted-foreground hover:text-foreground"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading…" : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
