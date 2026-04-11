import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Task } from "@/hooks/use-tasks";
import { useAuth } from "@clerk/react";
import { Clock, Eye, Flame, AlertCircle, Timer } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  reels: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  hooks: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  thumbnails: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  other: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  reels: "Reels",
  hooks: "Hooks",
  thumbnails: "Thumbnails",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  submitted: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  completed: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  rejected: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  revision_requested: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  cancelled: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  submitted: "Submitted",
  completed: "Completed",
  rejected: "Rejected",
  revision_requested: "Revision Needed",
  cancelled: "Cancelled",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function deadlineLabel(deadline: string | null): { label: string; urgent: boolean; expired: boolean } | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hrs = Math.floor(diff / (1000 * 60 * 60));
  if (diff < 0) return { label: "Expired", urgent: false, expired: true };
  if (hrs < 24) return { label: `${hrs}h left`, urgent: true, expired: false };
  return { label: `${days}d left`, urgent: days <= 2, expired: false };
}

function viewerCount(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return 2 + (Math.abs(h) % 5);
}

export function TaskCard({ task }: { task: Task }) {
  const { userId } = useAuth();

  const isCreator = !!userId && userId === task.creatorClerkId;
  const isWorker = !!userId && userId === task.workerClerkId;
  const isTrending = task.budget >= 1800;
  const viewers = viewerCount(task.id);
  const dl = deadlineLabel(task.deadline);

  return (
    <div className="group card-lit bg-card border border-border rounded-2xl p-6 card-glow transition-all duration-300 flex flex-col h-full relative">
      {task.flagged && (
        <div className="absolute top-3 right-3 text-orange-500" title="This task has been flagged">
          <AlertCircle size={14} />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={`text-xs font-medium ${CATEGORY_COLORS[task.category] ?? CATEGORY_COLORS.other}`}
          >
            {CATEGORY_LABELS[task.category] ?? task.category}
          </Badge>
          {isTrending && task.status === "open" && (
            <Badge variant="outline" className="text-xs font-medium bg-orange-500/8 text-orange-500 border-orange-500/20 flex items-center gap-1">
              <Flame size={10} />
              Trending
            </Badge>
          )}
          {dl && (
            <Badge
              variant="outline"
              className={`text-xs font-medium flex items-center gap-1 ${
                dl.expired
                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                  : dl.urgent
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  : "bg-blue-500/10 text-blue-500 border-blue-500/20"
              }`}
            >
              <Timer size={10} />
              {dl.label}
            </Badge>
          )}
        </div>
        <span className="font-bold text-purple-600 dark:text-purple-400 text-sm tabular-nums shrink-0">₹{task.budget.toLocaleString()}</span>
      </div>

      <h3 className="font-semibold text-[15px] text-foreground line-clamp-2 mb-2 leading-snug group-hover:text-primary transition-colors duration-200">
        {task.title}
      </h3>

      <p className="text-muted-foreground text-sm line-clamp-2 mb-6 flex-1 leading-relaxed">
        {task.description}
      </p>

      {task.status === "open" && (
        <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye size={11} />
            {viewers} viewing
          </span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Available
          </span>
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <Badge
              variant="outline"
              className={`text-xs w-fit ${STATUS_COLORS[task.status] ?? ""}`}
            >
              {STATUS_LABELS[task.status] ?? task.status}
            </Badge>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {task.creatorName && <span className="truncate">{task.creatorName}</span>}
              {task.creatorName && <span>·</span>}
              <Clock size={10} />
              <span>{timeAgo(task.createdAt)}</span>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {task.status === "open" && userId && !isCreator && (
              <Button
                asChild
                size="sm"
                className="btn-gradient text-white rounded-xl text-xs px-3 border-0"
              >
                <Link href={`/tasks/${task.id}`}>Apply Now</Link>
              </Button>
            )}
            <Button
              asChild
              size="sm"
              className="bg-muted hover:bg-muted/70 border border-border hover:border-primary/30 rounded-xl text-muted-foreground hover:text-foreground text-xs px-3 transition-all duration-200"
            >
              <Link href={`/tasks/${task.id}`}>
                {isCreator ? "Manage" : isWorker ? "My Work" : "View"}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
