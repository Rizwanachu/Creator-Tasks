import { useRoute } from "wouter";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@clerk/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Briefcase, CheckCircle, TrendingUp, Send, ExternalLink, Instagram, Youtube, AlertCircle, Pencil, Image } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function avatarSrc(objectPath: string | null | undefined): string | null {
  if (!objectPath) return null;
  return `${API_BASE}/api/storage${objectPath}`;
}

function portfolioSrc(objectPath: string): string {
  return `${API_BASE}/api/storage${objectPath}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  reels: "Reels", hooks: "Hooks", thumbnails: "Thumbnails", other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  reels: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  hooks: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  thumbnails: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  other: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
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

  const initials = profile.name
    ? profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const avgRating = profile.rating.average ? parseFloat(profile.rating.average) : null;
  const imgSrc = avatarSrc(profile.avatarObjectPath);
  const isProfileIncomplete = isOwnProfile && !(profile.name?.trim() && profile.bio?.trim());

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      {/* Incomplete profile banner (own profile only) */}
      {isProfileIncomplete && (
        <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">Your profile is incomplete</p>
            <p className="text-xs text-amber-400/70 mt-0.5">Add your name and bio to post tasks and apply for work.</p>
          </div>
          <Button asChild size="sm" className="btn-gradient text-white rounded-xl border-0 text-xs shrink-0">
            <Link href="/profile/edit">Complete Profile</Link>
          </Button>
        </div>
      )}

      {/* Profile header */}
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <Avatar className="w-20 h-20 border-2 border-border rounded-2xl shrink-0">
            {imgSrc && <AvatarImage src={imgSrc} alt={profile.name ?? ""} className="object-cover" />}
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

            {/* Skills */}
            {(profile.skills?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-3">
              <StarRating value={avgRating} />
              {profile.rating.total > 0 && (
                <span className="text-xs text-muted-foreground">({profile.rating.total} review{profile.rating.total !== 1 ? "s" : ""})</span>
              )}
            </div>

            {/* Social links */}
            <div className="flex flex-wrap gap-3">
              {profile.instagramHandle && (
                <a
                  href={`https://instagram.com/${profile.instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-pink-400 hover:text-pink-300 transition-colors"
                >
                  <Instagram size={13} />
                  @{profile.instagramHandle}
                </a>
              )}
              {profile.youtubeHandle && (
                <a
                  href={`https://youtube.com/@${profile.youtubeHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <Youtube size={13} />
                  @{profile.youtubeHandle}
                </a>
              )}
              {profile.portfolioUrl && (
                <a
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink size={13} />
                  Portfolio
                </a>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex flex-wrap gap-2">
              {isOwnProfile && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs"
                >
                  <Link href="/profile/edit">
                    <Pencil size={13} className="mr-1.5" />
                    Edit Profile
                  </Link>
                </Button>
              )}
              {!isOwnProfile && userId && (
                <Button
                  asChild
                  size="sm"
                  className="btn-gradient text-white rounded-xl border-0 font-semibold text-xs"
                >
                  <Link href={`/create?inviteClerkId=${clerkId}`}>
                    <Send size={13} className="mr-2" />
                    Invite to a Task
                  </Link>
                </Button>
              )}
            </div>
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

      {/* Portfolio Gallery */}
      {(profile.portfolioItems?.length ?? 0) > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <Image size={16} className="text-muted-foreground" />
            Portfolio Gallery
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {profile.portfolioItems.map((item) => (
              <div key={item.id} className="aspect-square rounded-xl overflow-hidden border border-border bg-muted relative group">
                <img
                  src={portfolioSrc(item.imageObjectPath)}
                  alt={item.caption ?? "Portfolio"}
                  className="w-full h-full object-cover"
                />
                {item.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">{item.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0.5 ${CATEGORY_COLORS[task.category] ?? CATEGORY_COLORS.other}`}
                  >
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
