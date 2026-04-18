import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Plus, Briefcase, Loader2, ChevronRight, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useSendInvite } from "@/hooks/use-invites";

interface PostedTask {
  id: string;
  title: string;
  budget: number;
  category: string;
  status: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  reels: "Reels",
  hooks: "Hooks",
  thumbnails: "Thumbnails",
  other: "Other",
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
}

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  inviteClerkId: string;
  creatorName?: string | null;
}

export function InviteModal({ open, onClose, inviteClerkId, creatorName }: InviteModalProps) {
  const [, navigate] = useLocation();
  const { getToken, userId } = useAuth();
  const sendInvite = useSendInvite();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setSelectedTaskId(null);
  }, [open, inviteClerkId]);

  const { data: myTasks, isLoading, isError, refetch } = useQuery<PostedTask[]>({
    queryKey: ["my-posted-tasks", userId],
    queryFn: () => apiFetch("/api/tasks/my-posted", {}, getToken),
    enabled: open && !!userId,
  });

  const isReady = !isLoading && !isError && myTasks !== undefined;
  const hasNoTasks = isReady && myTasks.length === 0;

  useEffect(() => {
    if (open && hasNoTasks) {
      onClose();
      navigate(`/create?inviteClerkId=${inviteClerkId}`);
    }
  }, [open, hasNoTasks, inviteClerkId, navigate, onClose]);

  function goCreate() {
    onClose();
    navigate(`/create?inviteClerkId=${inviteClerkId}`);
  }

  async function handleSend() {
    if (!selectedTaskId) return;
    try {
      await sendInvite.mutateAsync({ taskId: selectedTaskId, workerClerkId: inviteClerkId });
      toast.success(`Invite sent to ${creatorName ?? "creator"}!`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send invite";
      toast.error(msg);
    }
  }

  return (
    <Dialog open={open && !hasNoTasks} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Invite {creatorName ? <span className="text-purple-400">{creatorName}</span> : "Creator"} to a Task
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Pick an existing open task or create a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          {isLoading || (!myTasks && !isError) ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span>Could not load your tasks.</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => refetch()}>
                  Try again
                </Button>
                <Button size="sm" className="btn-gradient text-white rounded-xl border-0 text-xs font-semibold" onClick={goCreate}>
                  <Plus size={12} className="mr-1" />
                  Create a new task
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {myTasks!.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id === selectedTaskId ? null : task.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-150 flex items-center gap-3 ${
                      selectedTaskId === task.id
                        ? "border-purple-500/50 bg-purple-500/10"
                        : "border-border bg-muted/30 hover:border-purple-500/30 hover:bg-purple-500/[0.04]"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                      <Briefcase size={14} className="text-purple-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabel(task.category)} · ₹{task.budget.toLocaleString()}
                      </p>
                    </div>
                    {selectedTaskId === task.id && (
                      <ChevronRight size={14} className="text-purple-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 pt-1 border-t border-border">
                <Button
                  className="w-full btn-gradient text-white rounded-xl border-0 font-semibold"
                  disabled={!selectedTaskId || sendInvite.isPending}
                  onClick={handleSend}
                >
                  {sendInvite.isPending ? (
                    <Loader2 size={14} className="mr-2 animate-spin" />
                  ) : (
                    <Send size={14} className="mr-2" />
                  )}
                  Send Invite
                </Button>
                <Button
                  variant="ghost"
                  className="w-full rounded-xl text-muted-foreground hover:text-foreground text-sm"
                  onClick={goCreate}
                >
                  <Plus size={13} className="mr-1.5" />
                  Create a new task instead
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
