import { Link } from "wouter";
import { useLeaderboard } from "@/hooks/use-bookmarks";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Star, CheckCircle2, TrendingUp } from "lucide-react";

function StarRow({ avg, total }: { avg: string | null; total: number }) {
  const v = avg ? parseFloat(avg) : null;
  if (!v) return <span className="text-xs text-zinc-500">No ratings</span>;
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map((i) => (
        <Star key={i} size={11} className={i <= Math.round(v) ? "text-amber-400 fill-amber-400" : "text-zinc-700"} />
      ))}
      <span className="text-xs text-zinc-400 ml-1">{avg} ({total})</span>
    </div>
  );
}

const MEDAL_COLORS = [
  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "bg-zinc-400/15 text-zinc-300 border-zinc-400/25",
  "bg-orange-500/15 text-orange-400 border-orange-500/25",
];

export function LeaderboardPage() {
  const { data, isLoading } = useLeaderboard();

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20 mb-4">
          <Trophy size={28} className="text-yellow-400" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Leaderboard</h1>
        <p className="text-muted-foreground text-sm">Top creators ranked by total earnings on the platform.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4">
              <Skeleton className="w-10 h-10 rounded-full bg-white/5 shrink-0" />
              <Skeleton className="w-12 h-12 rounded-full bg-white/5 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 bg-white/5" />
                <Skeleton className="h-3 w-28 bg-white/5" />
              </div>
              <Skeleton className="h-6 w-20 bg-white/5" />
            </div>
          ))}
        </div>
      ) : !data?.length ? (
        <div className="text-center py-24 bg-card border border-border rounded-2xl">
          <Trophy size={40} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No leaderboard data yet. Complete tasks to appear here!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((entry, idx) => {
            const initials = entry.name
              ? entry.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
              : "?";
            const isTop3 = idx < 3;
            return (
              <Link key={entry.id} href={`/profile/${entry.clerkId}`}>
                <div
                  className={`flex items-center gap-4 bg-card border rounded-2xl p-4 transition-all hover:border-purple-500/30 hover:bg-purple-500/[0.02] cursor-pointer ${
                    idx === 0
                      ? "border-yellow-500/30 shadow-[0_0_16px_rgba(234,179,8,0.06)]"
                      : idx === 1
                      ? "border-zinc-400/20"
                      : idx === 2
                      ? "border-orange-500/20"
                      : "border-border"
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {isTop3 ? (
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold ${MEDAL_COLORS[idx]}`}>{idx + 1}</span>
                    ) : (
                      <span className="text-sm font-bold text-zinc-500">#{idx + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="w-12 h-12 border border-border rounded-xl shrink-0">
                    <AvatarFallback
                      className={`text-sm font-bold rounded-xl ${
                        idx === 0
                          ? "bg-gradient-to-br from-yellow-500/30 to-orange-500/30 text-yellow-300"
                          : "bg-gradient-to-br from-purple-600/30 to-pink-600/30 text-purple-300"
                      }`}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{entry.name || "Anonymous"}</span>
                      {idx === 0 && (
                        <Badge variant="outline" className="text-[10px] px-2 bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                          Top Creator
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <StarRow avg={entry.rating.average} total={entry.rating.total} />
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <CheckCircle2 size={11} className="text-green-500" />
                        {entry.completedTasksCount} task{entry.completedTasksCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Earnings */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-purple-400 font-bold text-base">
                      <TrendingUp size={14} />
                      ₹{(entry.totalEarnings ?? 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-zinc-500">earned</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
