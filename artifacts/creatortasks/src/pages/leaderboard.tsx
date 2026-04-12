import { Link } from "wouter";
import { useLeaderboard } from "@/hooks/use-bookmarks";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, CheckCircle2, Clock, Users } from "lucide-react";
import { useUser } from "@clerk/react";

function timeAgo(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function RatingBadge({ avg, total }: { avg: string | null; total: number }) {
  const v = avg ? parseFloat(avg) : null;
  if (!v) return null;
  return (
    <span className="flex items-center gap-0.5 text-xs text-zinc-400">
      <Star size={10} className="text-amber-400 fill-amber-400 shrink-0" />
      <span>{avg}</span>
      <span className="text-zinc-600">({total})</span>
    </span>
  );
}

export function LeaderboardPage() {
  const { data, isLoading } = useLeaderboard();
  const { user } = useUser();

  const qualifyingCreators = data ?? [];

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4">
          <Users size={22} className="text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Top Creators</h1>
        <p className="text-muted-foreground text-sm">Creators actively completing tasks and earning on the platform.</p>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4">
              <Skeleton className="w-8 h-8 rounded-full bg-white/5 shrink-0" />
              <Skeleton className="w-11 h-11 rounded-xl bg-white/5 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-36 bg-white/5" />
                <Skeleton className="h-3 w-24 bg-white/5" />
                <Skeleton className="h-2.5 w-20 bg-white/5" />
              </div>
            </div>
          ))}
        </div>

      ) : qualifyingCreators.length === 0 ? (
        /* Empty state */
        <div className="text-center py-20 bg-card border border-border rounded-2xl px-8">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={26} className="text-purple-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Be one of the first creators here</h2>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto mb-6">
            Complete your first task and get featured. The leaderboard fills up as creators earn.
          </p>
          <Button asChild className="btn-gradient text-white border-0 font-semibold rounded-xl">
            <Link href="/tasks">Browse Open Tasks</Link>
          </Button>
        </div>

      ) : (
        <>
          {/* Creator rows */}
          <div className="space-y-2.5">
            {qualifyingCreators.map((entry, idx) => {
              const initials = entry.name
                ? entry.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
                : "?";
              const isMe = user?.id === entry.clerkId;
              const ago = timeAgo(entry.lastCompletedAt);

              return (
                <Link key={entry.id} href={`/profile/${entry.clerkId}`}>
                  <div
                    className={`flex items-center gap-4 bg-card border rounded-2xl p-4 transition-all duration-200 hover:border-purple-500/30 hover:bg-purple-500/[0.025] cursor-pointer ${
                      isMe
                        ? "border-purple-500/40 shadow-[0_0_18px_rgba(168,85,247,0.08)]"
                        : "border-border"
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-7 text-center shrink-0">
                      <span className="text-sm font-bold text-zinc-500">#{idx + 1}</span>
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-11 h-11 border border-border rounded-xl shrink-0">
                      <AvatarFallback className="text-sm font-bold rounded-xl bg-gradient-to-br from-purple-600/25 to-pink-600/25 text-purple-300">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-foreground text-sm truncate">
                          {entry.name || "Anonymous"}
                        </span>
                        {isMe && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20 shrink-0">
                            You
                          </span>
                        )}
                      </div>

                      {/* Primary: tasks completed */}
                      <div className="flex items-center gap-1 mb-0.5">
                        <CheckCircle2 size={11} className="text-green-500 shrink-0" />
                        <span className="text-sm font-semibold text-foreground">
                          {entry.completedTasksCount} task{entry.completedTasksCount !== 1 ? "s" : ""} completed
                        </span>
                      </div>

                      {/* Secondary: rating · earnings */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <RatingBadge avg={entry.rating.average} total={entry.rating.total} />
                        <span className="text-xs text-zinc-500">
                          ₹{(entry.totalEarnings ?? 0).toLocaleString()} earned
                        </span>
                        {ago && (
                          <span className="flex items-center gap-0.5 text-xs text-zinc-600">
                            <Clock size={9} className="shrink-0" />
                            {ago}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="mt-8 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-base font-bold text-foreground mb-0.5">Your turn</div>
              <div className="text-sm text-zinc-500">Browse open tasks and start earning today.</div>
            </div>
            <Button asChild className="btn-gradient text-white border-0 font-semibold rounded-xl shrink-0">
              <Link href="/tasks">Browse Tasks</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
