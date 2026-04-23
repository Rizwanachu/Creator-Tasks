import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useProfileByUsername, useMyEndorsements, useEndorseSkill, useRemoveEndorsement } from "@/hooks/use-profile";
import { useAuth } from "@clerk/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Send,
  ExternalLink,
  Instagram,
  Youtube,
  Pencil,
  LayoutGrid,
  CheckCircle2,
  Share2,
  Briefcase,
  GraduationCap,
  MapPin,
  X,
  ZoomIn,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { InviteModal } from "@/components/invite-modal";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function avatarSrc(objectPath: string | null | undefined): string | null {
  if (!objectPath) return null;
  if (
    objectPath.startsWith("data:") ||
    objectPath.startsWith("http://") ||
    objectPath.startsWith("https://")
  )
    return objectPath;
  return `${API_BASE}/api/storage${objectPath}`;
}

function portfolioSrc(objectPath: string): string {
  if (
    objectPath.startsWith("data:") ||
    objectPath.startsWith("http://") ||
    objectPath.startsWith("https://")
  )
    return objectPath;
  return `${API_BASE}/api/storage${objectPath}`;
}

function formatExpDate(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  if (!year) return yearMonth;
  if (!month) return year;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

const CATEGORY_LABELS: Record<string, string> = {
  reels: "Reels", hooks: "Hooks", thumbnails: "Thumbnails",
  "video-editing": "Video Editing", animation: "Animation",
  "graphic-design": "Graphic Design", logo: "Logo Design",
  website: "Website Design", copywriting: "Copywriting", other: "Other",
};
const CATEGORY_COLORS: Record<string, string> = {
  reels: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  hooks: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  thumbnails: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "video-editing": "bg-violet-500/10 text-violet-500 border-violet-500/20",
  animation: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "graphic-design": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  logo: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  website: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  copywriting: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  other: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

function StatStrip({
  stats,
}: {
  stats: Array<{ value: string | number; label: string }>;
}) {
  return (
    <div className="flex items-stretch divide-x divide-border/60 bg-muted/30 rounded-xl border border-border/60 overflow-hidden mb-5">
      {stats.map((s, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center justify-center py-3 px-2 hover:bg-purple-500/5 transition-colors"
        >
          <p className="text-sm font-bold text-foreground leading-none">{s.value}</p>
          <p className="text-[10px] text-muted-foreground mt-1 leading-none whitespace-nowrap">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export function CreatorPage() {
  const [, params] = useRoute("/creator/:username");
  const username = params?.username;
  const { userId, isSignedIn } = useAuth();
  const { data: profile, isLoading, error } = useProfileByUsername(username);
  const { data: myEndorsementsData } = useMyEndorsements(username);
  const endorseSkill = useEndorseSkill(username);
  const removeEndorsement = useRemoveEndorsement(username);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<{ url: string; caption?: string | null } | null>(null);

  useEffect(() => {
    if (!lightboxItem) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxItem(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxItem]);

  const isOwnProfile = userId === profile?.clerkId;
  const myEndorsedSkills = new Set(myEndorsementsData?.endorsedSkills ?? []);

  function handleEndorseToggle(skill: string) {
    const normalized = skill.toLowerCase();
    if (myEndorsedSkills.has(normalized)) {
      removeEndorsement.mutate(normalized, {
        onSuccess: () => toast.success(`Endorsement removed`),
        onError: (e) => toast.error(e.message),
      });
    } else {
      endorseSkill.mutate(normalized, {
        onSuccess: () => toast.success(`Endorsed "${skill.charAt(0).toUpperCase() + skill.slice(1)}"!`),
        onError: (e) => toast.error(e.message),
      });
    }
  }

  function copyProfileLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Profile link copied!");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="w-full h-52 rounded-none" />
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-[300px] shrink-0 md:-mt-16 space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4 pt-16 md:pt-5">
                <Skeleton className="w-[100px] h-[100px] rounded-full -mt-12 md:-mt-14" />
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-9 w-full rounded-xl" />
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            </div>
            <div className="flex-1 space-y-4 pt-4">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-56 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-2">Creator not found</h2>
        <p className="text-muted-foreground mb-6">
          This creator doesn't exist or hasn't joined yet.
        </p>
        <Link href="/tasks">
          <button className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            Browse Tasks
          </button>
        </Link>
      </div>
    );
  }

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";
  const avgRating = profile.rating.average
    ? parseFloat(profile.rating.average)
    : null;
  const imgSrc = avatarSrc(profile.avatarUrl);
  const handle = profile.username ? profile.username.toUpperCase() : "";

  const hasContent =
    !!profile.bio ||
    (profile.portfolioItems?.length ?? 0) > 0 ||
    profile.recentWork.length > 0 ||
    (profile.experience?.length ?? 0) > 0 ||
    (profile.education?.length ?? 0) > 0;

  return (
    <div className="min-h-screen pb-16">
      {/* ── Cover Banner ── */}
      <div className="relative w-full h-52 md:h-60 overflow-hidden">
        <div
          className="absolute inset-0 animate-gradient"
          style={{
            background:
              "linear-gradient(135deg, #3b1f6e 0%, #7C5CFF 30%, #c026d3 60%, #1e3a8a 100%)",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,92,255,0.5)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(236,72,153,0.35)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-black/20" />

        {handle && (
          <div className="absolute inset-0 flex items-center justify-end overflow-hidden pointer-events-none select-none">
            <span
              className="text-white/[0.07] font-black tracking-tighter leading-none pr-6"
              style={{ fontSize: "clamp(3.5rem, 12vw, 9rem)" }}
            >
              #{handle}
            </span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* ── Sidebar ── */}
          <div className="w-full md:w-[300px] shrink-0 md:-mt-20 md:sticky md:top-6 md:self-start space-y-4">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 pb-5">
                {/* Avatar */}
                <div className="relative -mt-12 mb-4 w-fit">
                  <div
                    className="w-[100px] h-[100px] rounded-full overflow-hidden border-4 border-card avatar-glow ring-2 ring-purple-500/50"
                    style={{ background: "linear-gradient(135deg, #7C5CFF, #ec4899)" }}
                  >
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={profile.name ?? ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                        {initials}
                      </div>
                    )}
                  </div>
                  {profile.isAvailable && (
                    <span className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-card shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                  )}
                </div>

                {/* Name + @handle + Available pill — single responsive row */}
                <div className="flex items-baseline gap-2 flex-wrap mb-2">
                  <h1 className="text-[1.1rem] font-bold text-foreground leading-tight">
                    {profile.name || "Anonymous Creator"}
                  </h1>
                  {profile.username && (
                    <span className="text-sm text-muted-foreground shrink-0">
                      @{profile.username}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                      profile.isAvailable
                        ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400"
                        : "bg-zinc-500/15 border-zinc-500/25 text-zinc-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${profile.isAvailable ? "bg-emerald-400" : "bg-zinc-500"}`}
                    />
                    {profile.isAvailable ? "Available" : "Unavailable"}
                  </span>
                </div>

                {/* Creator role chip + extras below */}
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-300 text-[11px] font-semibold tracking-wide">
                    Creator
                  </span>
                  {isOwnProfile && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-300 text-[11px] font-semibold">
                      You
                    </span>
                  )}
                  {profile.rating.total > 0 && avgRating && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300 text-[11px] font-semibold">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      {avgRating.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Stats — horizontal strip with dividers */}
                <StatStrip
                  stats={[
                    { value: profile.completedTasksCount, label: "Tasks Done" },
                    {
                      value: `₹${(profile.totalEarnings ?? 0).toLocaleString("en-IN")}`,
                      label: "Total Earned",
                    },
                    { value: avgRating ? avgRating.toFixed(1) : "—", label: "Avg Rating" },
                    { value: profile.portfolioItems?.length ?? 0, label: "Portfolio" },
                  ]}
                />

                {/* Action buttons */}
                <div className="flex flex-col gap-2 mb-5">
                  {isOwnProfile ? (
                    <Button
                      asChild
                      size="sm"
                      className="w-full btn-gradient text-white rounded-xl border-0 font-semibold text-xs h-9"
                    >
                      <Link href="/profile/edit">
                        <Pencil size={13} className="mr-1.5" />
                        Edit Profile
                      </Link>
                    </Button>
                  ) : (
                    userId && (
                      <Button
                        size="sm"
                        className="w-full btn-gradient text-white rounded-xl border-0 font-semibold text-xs h-9"
                        onClick={() => setInviteModalOpen(true)}
                      >
                        <Send size={13} className="mr-2" />
                        Invite to a Task
                      </Button>
                    )
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full rounded-xl text-xs h-9"
                    onClick={copyProfileLink}
                  >
                    <Share2 size={13} className="mr-1.5" />
                    Share Profile
                  </Button>
                </div>

                {/* Social links */}
                {(profile.instagramHandle ||
                  profile.youtubeHandle ||
                  profile.portfolioUrl) && (
                  <div className="space-y-2 mb-5 pb-5 border-b border-border">
                    {profile.instagramHandle && (
                      <a
                        href={`https://instagram.com/${profile.instagramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-pink-400 transition-colors group"
                      >
                        <Instagram size={13} className="text-pink-400 shrink-0" />
                        <span className="truncate group-hover:underline">
                          @{profile.instagramHandle}
                        </span>
                      </a>
                    )}
                    {profile.youtubeHandle && (
                      <a
                        href={`https://youtube.com/@${profile.youtubeHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-red-400 transition-colors group"
                      >
                        <Youtube size={13} className="text-red-400 shrink-0" />
                        <span className="truncate group-hover:underline">
                          @{profile.youtubeHandle}
                        </span>
                      </a>
                    )}
                    {profile.portfolioUrl && (
                      <a
                        href={profile.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-blue-400 transition-colors group"
                      >
                        <ExternalLink size={13} className="text-blue-400 shrink-0" />
                        <span className="truncate group-hover:underline">Portfolio</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Skills */}
                {(profile.skills?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">
                      Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.map((skill) => {
                        const normalized = skill.toLowerCase();
                        const count = profile.skillEndorsements?.[normalized] ?? 0;
                        const endorsed = myEndorsedSkills.has(normalized);
                        const canEndorse = !!isSignedIn && !isOwnProfile;
                        return (
                          <button
                            key={skill}
                            type="button"
                            disabled={!canEndorse}
                            onClick={() => canEndorse && handleEndorseToggle(skill)}
                            title={canEndorse ? (endorsed ? "Remove endorsement" : "Endorse this skill") : undefined}
                            className={[
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors",
                              canEndorse ? "cursor-pointer" : "cursor-default",
                              endorsed
                                ? "bg-purple-500/15 border-purple-500/60 text-purple-300"
                                : "bg-muted/50 border-border text-muted-foreground hover:border-purple-500/40 hover:text-purple-300",
                            ].join(" ")}
                          >
                            <span>{skill.charAt(0).toUpperCase() + skill.slice(1)}</span>
                            <span className={["text-[10px] font-semibold", endorsed ? "text-purple-400" : "text-muted-foreground/70"].join(" ")}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {!!isSignedIn && !isOwnProfile && (
                      <p className="text-[10px] text-muted-foreground/50 mt-2">Click a skill to endorse it</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Content ── */}
          <div className="flex-1 min-w-0 space-y-4 pt-4 md:pt-5">
            {/* About */}
            {profile.bio && (
              <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
                <SectionHeading>About</SectionHeading>
                <div className="flex gap-3">
                  <div className="w-0.5 shrink-0 rounded-full bg-gradient-to-b from-purple-500 to-pink-500/40 self-stretch" />
                  <p className="text-sm text-foreground/80 leading-relaxed">{profile.bio}</p>
                </div>
              </div>
            )}

            {/* Portfolio Gallery */}
            {(profile.portfolioItems?.length ?? 0) > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <SectionHeading noMargin>Portfolio</SectionHeading>
                  <span className="text-xs text-muted-foreground">
                    {profile.portfolioItems.length} item{profile.portfolioItems.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[...profile.portfolioItems]
                    .sort((a, b) =>
                      (a.position ?? Infinity) - (b.position ?? Infinity) ||
                      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    )
                    .map((item) => (
                    <div
                      key={item.id}
                      className="aspect-square rounded-xl overflow-hidden border border-border bg-muted relative group cursor-zoom-in"
                      onClick={() => setLightboxItem({ url: portfolioSrc(item.url) ?? item.url, caption: item.caption })}
                    >
                      <img
                        src={portfolioSrc(item.url)}
                        alt={item.caption ?? "Portfolio"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute top-2 right-2">
                          <ZoomIn size={14} className="text-white/80" />
                        </div>
                        {item.caption && (
                          <div className="absolute bottom-0 left-0 right-0 p-2.5">
                            <p className="text-xs text-white truncate">{item.caption}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {(profile.experience?.length ?? 0) > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase size={13} className="text-purple-400" />
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Experience</h2>
                </div>
                <div className="space-y-5">
                  {profile.experience.map((entry, idx) => (
                    <div key={entry.id} className="relative pl-4">
                      <div className={`absolute left-0 top-1.5 w-2 h-2 rounded-full border-2 ${idx === 0 ? "bg-purple-500 border-purple-500" : "bg-transparent border-muted-foreground/40"}`} />
                      {idx < profile.experience.length - 1 && (
                        <div className="absolute left-[3px] top-4 bottom-[-1.25rem] w-px bg-border" />
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-tight">{entry.jobTitle}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{entry.company}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-[11px] text-muted-foreground/60">
                              {formatExpDate(entry.startDate)} — {entry.isCurrent ? "Present" : (entry.endDate ? formatExpDate(entry.endDate) : "—")}
                            </span>
                            {entry.location && (
                              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground/60">
                                <MapPin size={10} />
                                {entry.location}
                              </span>
                            )}
                          </div>
                        </div>
                        {idx === 0 && entry.isCurrent && (
                          <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">Current</span>
                        )}
                      </div>
                      {entry.description && (
                        <p className="text-xs text-foreground/60 leading-relaxed mt-2 line-clamp-3">{entry.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {(profile.education?.length ?? 0) > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap size={13} className="text-purple-400" />
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Education</h2>
                </div>
                <div className="space-y-4">
                  {profile.education.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-tight">{entry.degree}{entry.fieldOfStudy ? `, ${entry.fieldOfStudy}` : ""}</p>
                          <p className="text-xs text-purple-300/80 mt-0.5">{entry.institution}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-[11px] text-muted-foreground/60">
                              {entry.startYear} — {entry.isCurrent ? "Present" : (entry.endYear ?? "—")}
                            </span>
                            {entry.grade && (
                              <span className="text-[11px] text-amber-400/80 font-medium">{entry.grade}</span>
                            )}
                          </div>
                        </div>
                        {entry.isCurrent && (
                          <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-300">Studying</span>
                        )}
                      </div>
                      {entry.description && (
                        <p className="text-xs text-foreground/60 leading-relaxed mt-2 line-clamp-3">{entry.description}</p>
                      )}
                      {entry.activities && (
                        <p className="text-[11px] text-muted-foreground/50 mt-1.5">Activities: {entry.activities}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Work */}
            {profile.recentWork.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <SectionHeading noMargin>Recent Work</SectionHeading>
                  <div className="flex items-center gap-1.5 text-xs text-green-400">
                    <CheckCircle2 size={12} className="shrink-0" />
                    <span>{profile.completedTasksCount} completed</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profile.recentWork.map((task) => (
                    <Link key={task.id} href={`/tasks/${task.id}`}>
                      <div className="group rounded-xl border border-border bg-muted/20 hover:border-purple-500/30 hover:bg-purple-500/5 p-4 transition-all cursor-pointer">
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                            {task.title}
                          </p>
                          <span className="text-xs font-bold text-purple-400 shrink-0 mt-0.5">
                            ₹{task.budget.toLocaleString("en-IN")}
                          </span>
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

            {/* Empty state */}
            {!hasContent && (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mx-auto mb-4">
                  <LayoutGrid size={24} className="text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  No content yet
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {isOwnProfile
                    ? "Complete your profile to showcase your work."
                    : "This creator hasn't added content yet."}
                </p>
                {isOwnProfile && (
                  <Link href="/profile/edit">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs">
                      <Pencil size={13} className="mr-1.5" />
                      Complete Profile
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {profile && (
        <InviteModal
          open={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          inviteClerkId={profile.clerkId}
          creatorName={profile.name}
        />
      )}

      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setLightboxItem(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors bg-black/40 rounded-full p-2"
            onClick={() => setLightboxItem(null)}
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxItem.url}
              alt={lightboxItem.caption ?? "Portfolio image"}
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
            {lightboxItem.caption && (
              <p className="text-sm text-white/90 text-center max-w-lg px-2">
                {lightboxItem.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  children,
  noMargin,
}: {
  children: React.ReactNode;
  noMargin?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${noMargin ? "" : "mb-4"}`}>
      <span className="w-3 h-3 rounded-sm bg-purple-500/80 shrink-0" />
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
        {children}
      </h2>
    </div>
  );
}
