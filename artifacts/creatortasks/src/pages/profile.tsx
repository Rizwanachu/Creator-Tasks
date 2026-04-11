import { useRoute } from "wouter";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@clerk/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Briefcase, CheckCircle, TrendingUp, Link as LinkIcon } from "lucide-react";
import { Link } from "wouter";

const CATEGORY_LABELS: Record<string, string> = {
  reels: "Reels", hooks: "Hooks", thumbnails: "Thumbnails", other: "Other",
};

function StarRating({ value, size = 16 }: { value: number | null; size?: number }) {
  if (!value) return <span className="text-muted-foreground text-sm">No ratings yet</span>;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(value) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}
        />
      ))}
      <span className="text-sm font-semibold text-foreground ml-1">{value}</span>
    </div>
  );
}

export function ProfilePage() {
  const [, params] = useRoute("/profile/:clerkId");
  const clerkId = params?.clerkId;
  const { userId } = useAuth();
  const { data: profile, isLoading, error } = useProfile(clerkId);

  const isOwnProfile = userId === clerkId;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-8">
        <div className="flex gap-6 items-start">
          <Skeleton className="w-24 h-24 rounded-2xl shrink-0" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-2">Profile not found</h2>
        <p className="text-muted-foreground mb-6">This user doesn't exist or hasn't joined yet.</p>
        <Link href="/tasks">
          <button className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            Browse Tasks
          </button>
        </Link>
      </div>
    );
  }

  const initials = profile.name ? profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?";
  const avgRating = profile.rating.average ? parseFloat(profile.rating.average) : null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      {/* Profile header */}
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          <Avatar className="w-20 h-20 border-2 border-border rounded-2xl">
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-2xl font-bold rounded-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-foreground">{profile.name || "Anonymous Creator"}</h1>
              {isOwnProfile && (
                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
                  You
                </Badge>
              )}
            </div>

            {profile.bio ? (
              <p className="text-muted-foreground text-sm leading-relaxed mb-3 max-w-lg">{profile.bio}</p>
            ) : (
              <p className="text-muted-foreground/50 text-sm mb-3 italic">No bio yet</p>
            )}

            <StarRating value={avgRating} />
            {profile.rating.total > 0 && (
              <span className="text-xs text-muted-foreground ml-1">({profile.rating.total} review{profile.rating.total !== 1 ? "s" : ""})</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-green-400 mb-1">
            <CheckCircle size={16} />
            <span className="text-xl font-bold text-foreground">{profile.completedTasksCount}</span>
          </div>
          <p className="text-xs text-muted-foreground">Tasks Completed</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-purple-400 mb-1">
            <TrendingUp size={16} />
            <span className="text-xl font-bold text-foreground">₹{(profile.totalEarnings ?? 0).toLocaleString()}</span>
          </div>
          <p className="text-xs text-muted-foreground">Total Earned</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center col-span-2 sm:col-span-1">
          <div className="flex items-center justify-center gap-1.5 text-blue-400 mb-1">
            <Briefcase size={16} />
            <span className="text-xl font-bold text-foreground">{profile.postedTasksCount}</span>
          </div>
          <p className="text-xs text-muted-foreground">Tasks Posted</p>
        </div>
      </div>

      {/* Recent work */}
      {profile.recentWork.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <Briefcase size={16} className="text-muted-foreground" />
            Recent Completed Work
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile.recentWork.map((task) => (
              <Link key={task.id} href={`/tasks/${task.id}`}>
                <div className="group rounded-xl border border-border bg-muted/30 hover:border-purple-500/30 hover:bg-purple-500/5 p-4 transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {task.title}
                    </p>
                    <span className="text-xs font-bold text-purple-400 shrink-0">₹{task.budget.toLocaleString()}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground border-border">
                    {CATEGORY_LABELS[task.category] ?? task.category}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
