import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Task, useAcceptTask } from "@/hooks/use-tasks";
import { useAuth } from "@clerk/react";
import { toast } from "sonner";

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
  };

  const statusLabels: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    submitted: "Submitted",
    completed: "Completed",
    rejected: "Rejected",
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
    <div className="bg-[#111217] border border-[#1F2228] rounded-2xl p-5 hover:border-purple-500/30 hover:bg-white/5 hover:scale-[1.02] transition-all flex flex-col h-full">
      <div className="flex justify-between items-start mb-3 gap-4">
        <h3 className="font-semibold text-lg text-white line-clamp-1">{task.title}</h3>
        <span className="font-semibold text-purple-500 shrink-0">₹{task.budget}</span>
      </div>

      <p className="text-zinc-400 text-sm line-clamp-2 mb-6 flex-1">
        {task.description}
      </p>

      <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5 gap-3">
        <div className="flex flex-col gap-2 min-w-0">
          {task.creatorName && (
            <span className="text-xs text-zinc-500 truncate">By {task.creatorName}</span>
          )}
          <Badge variant="outline" className={statusColors[task.status] ?? ""}>
            {statusLabels[task.status] ?? task.status}
          </Badge>
        </div>

        <div className="flex gap-2 shrink-0">
          {task.status === "open" && !isCreator && userId && (
            <Button
              size="sm"
              disabled={acceptTask.isPending}
              onClick={handleAccept}
              className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl"
            >
              {acceptTask.isPending ? "..." : "Accept"}
            </Button>
          )}
          <Button
            asChild
            size="sm"
            variant={isCreator || isWorker ? "default" : "secondary"}
            className={
              isCreator || isWorker
                ? "bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-white"
                : "bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl"
            }
          >
            <Link href={`/tasks/${task.id}`}>
              {isCreator ? "Manage" : isWorker ? "My Work" : "View"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
