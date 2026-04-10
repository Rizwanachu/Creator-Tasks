import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Task, useAcceptTask } from "@/hooks/use-tasks";
import { useAuth } from "@clerk/react";
import { toast } from "sonner";
import { Clock } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  reels: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  hooks: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  thumbnails: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  other: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  reels: "Reels",
  hooks: "Hooks",
  thumbnails: "Thumbnails",
  other: "Other",
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

export function TaskCard({ task }: { task: Task }) {
  const { userId } = useAuth();
  const acceptTask = useAcceptTask();

  const isCreator = !!userId && userId === task.creatorClerkId;
  const isWorker = !!userId && userId === task.workerClerkId;
  const canAccept = !!userId && !isCreator && task.status === "open";

  const statusColors: Record<string, string> = {
    open: "bg-green-500/10 text-green-500 border-green-500/20",
    in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    submitted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    completed: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    rejected: "bg-red-500/10 text-red-500 border-red-500/20",
    revision_requested: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  };

  const statusLabels: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    submitted: "Submitted",
    completed: "Completed",
    rejected: "Rejected",
    revision_requested: "Revision Needed",
  };

  const handleAccept = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) {
      toast.error("Please sign in to accept tasks");
      return;
    }
    acceptTask.mutate(task.id, {
      onSuccess: () => toast.success("Task accepted!"),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Task no longer available"),
    });
  };

  return (
    <div className="group bg-[#111217] border border-[#1F2228] rounded-2xl p-5 card-glow transition-all duration-300 flex flex-col h-full cursor-default">
      {/* Top row: category + budget */}
      <div className="flex items-center justify-between mb-3">
        <Badge variant="outline" className={`text-xs font-medium ${CATEGORY_COLORS[task.category] ?? CATEGORY_COLORS.other}`}>
          {CATEGORY_LABELS[task.category] ?? task.category}
        </Badge>
        <span className="font-bold text-purple-400 text-sm">₹{task.budget.toLocaleString()}</span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-base text-white line-clamp-2 mb-2 leading-snug group-hover:text-purple-100 transition-colors">
        {task.title}
      </h3>

      {/* Description */}
      <p className="text-zinc-500 text-sm line-clamp-2 mb-5 flex-1 leading-relaxed">
        {task.description}
      </p>

      {/* Bottom row */}
      <div className="mt-auto pt-4 border-t border-white/5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${statusColors[task.status] ?? ""}`}>
                {statusLabels[task.status] ?? task.status}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-600">
              {task.creatorName && <span className="truncate">{task.creatorName}</span>}
              {task.creatorName && <span>·</span>}
              <Clock size={11} />
              <span>{timeAgo(task.createdAt)}</span>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {task.status === "open" && userId && (
              <Button
                size="sm"
                disabled={isCreator || acceptTask.isPending}
                onClick={!isCreator ? handleAccept : undefined}
                className={
                  isCreator
                    ? "rounded-xl opacity-40 cursor-not-allowed btn-gradient text-white text-xs px-3"
                    : "btn-gradient text-white rounded-xl text-xs px-3 border-0"
                }
              >
                {isCreator ? "Yours" : acceptTask.isPending ? "..." : "Accept"}
              </Button>
            )}
            <Button
              asChild
              size="sm"
              className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-white text-xs px-3 transition-all duration-200"
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
