import { useParams, Link } from "wouter";
import {
  useTask,
  useAcceptTask,
  useSubmitTask,
  useApproveTask,
  useRejectTask,
  useRequestRevision,
} from "@/hooks/use-tasks";
import { useAuth } from "@clerk/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

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

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: task, isLoading, error } = useTask(id || "");
  const { userId } = useAuth();

  const acceptTask = useAcceptTask();
  const submitTask = useSubmitTask();
  const approveTask = useApproveTask();
  const rejectTask = useRejectTask();
  const requestRevision = useRequestRevision();

  const [submissionContent, setSubmissionContent] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
            <Skeleton className="h-10 w-3/4 bg-white/5" />
            <div className="flex gap-4">
              <Skeleton className="h-6 w-24 bg-white/5" />
              <Skeleton className="h-6 w-32 bg-white/5" />
            </div>
            <Skeleton className="h-40 w-full bg-white/5" />
          </div>
          <div className="space-y-6 order-1 lg:order-2">
            <Skeleton className="h-[220px] w-full rounded-2xl bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Task not found</h2>
        <Button asChild className="btn-gradient text-white rounded-xl border-0">
          <Link href="/tasks">Back to Tasks</Link>
        </Button>
      </div>
    );
  }

  const isCreator = !!userId && userId === task.creatorClerkId;
  const isWorker = !!userId && userId === task.workerClerkId;
  const canAccept = !!userId && !isCreator && task.status === "open";

  const statusColors: Record<string, string> = {
    open: "bg-green-500/10 text-green-400 border-green-500/20",
    in_progress: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    submitted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    completed: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    revision_requested: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  const statusLabels: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    submitted: "Submitted",
    completed: "Completed",
    rejected: "Rejected",
    revision_requested: "Revision Requested",
  };

  const handleAccept = () => {
    acceptTask.mutate(task.id, {
      onSuccess: () => toast.success("Task accepted!"),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to accept task"),
    });
  };

  const handleSubmitWork = () => {
    if (!submissionContent.trim()) {
      toast.error("Please provide submission details or a link");
      return;
    }
    submitTask.mutate({ id: task.id, content: submissionContent }, {
      onSuccess: () => {
        toast.success("Work submitted successfully!");
        setSubmissionContent("");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to submit work"),
    });
  };

  const handleApprove = () => {
    approveTask.mutate(task.id, {
      onSuccess: () => toast.success("Submission approved! Payment transferred."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to approve"),
    });
  };

  const handleReject = () => {
    rejectTask.mutate(task.id, {
      onSuccess: () => toast.success("Submission rejected. Task reopened."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to reject"),
    });
  };

  const handleRequestRevision = () => {
    requestRevision.mutate({ id: task.id, note: revisionNote || undefined }, {
      onSuccess: () => {
        toast.success("Revision requested. Worker will be notified.");
        setRevisionNote("");
        setShowRevisionForm(false);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to request revision"),
    });
  };

  const actionsPending = approveTask.isPending || rejectTask.isPending || requestRevision.isPending;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Link href="/tasks" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm mb-6 transition-colors group">
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Tasks
      </Link>

      {/* Grid: sidebar shows FIRST on mobile (order-1), content second (order-2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

        {/* Left Column: Task Details — order-2 on mobile, order-1 on desktop */}
        <div className="lg:col-span-2 order-2 lg:order-1 space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight mb-4">
              {task.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 mb-6">
              <Badge variant="outline" className={statusColors[task.status]}>
                {statusLabels[task.status]}
              </Badge>
              <Badge variant="outline" className={CATEGORY_COLORS[task.category] ?? CATEGORY_COLORS.other}>
                {CATEGORY_LABELS[task.category] ?? task.category}
              </Badge>
              <span className="text-zinc-500 text-sm">
                by {task.creatorName || "Anonymous"}
              </span>
              <span className="text-zinc-600 text-sm">
                {new Date(task.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="card-lit bg-[#111217] border border-[#1F2228] rounded-2xl p-5 md:p-8 whitespace-pre-wrap text-zinc-300 leading-relaxed text-sm md:text-base">
            {task.description}
          </div>
        </div>

        {/* Right Column: Actions — order-1 on mobile (appears first!), order-2 on desktop */}
        <div className="space-y-4 order-1 lg:order-2">
          {/* Budget Card */}
          <Card className="card-lit bg-[#111217] border-[#1F2228]">
            <CardContent className="p-5 md:p-6">
              <div className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-1">Task Budget</div>
              <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-1">
                ₹{task.budget.toLocaleString()}
              </div>
              <div className="text-xs text-zinc-600 mb-5">
                You earn ₹{Math.floor(task.budget * 0.9).toLocaleString()} after 10% fee
              </div>

              {task.status === "open" && (
                <Button
                  onClick={handleAccept}
                  disabled={!canAccept || acceptTask.isPending}
                  className={`w-full rounded-xl py-5 text-base font-semibold border-0 ${
                    isCreator
                      ? "bg-white/5 text-zinc-500 cursor-not-allowed"
                      : "btn-gradient text-white"
                  }`}
                >
                  {isCreator ? "You posted this" : acceptTask.isPending ? "Accepting..." : "Accept Task"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Worker: submit work */}
          {isWorker && task.status === "in_progress" && (
            <Card className="bg-[#111217] border-[#1F2228]">
              <CardContent className="p-5 md:p-6">
                <h3 className="text-base font-semibold text-white mb-4">Submit Your Work</h3>
                <Textarea
                  placeholder="Paste link (Google Drive, Figma, frame.io...) or describe your delivery"
                  className="min-h-[110px] bg-background border-white/10 text-white focus-visible:ring-purple-500 resize-none mb-4 text-sm"
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                />
                <Button
                  onClick={handleSubmitWork}
                  disabled={submitTask.isPending || !submissionContent.trim()}
                  className="w-full btn-gradient text-white rounded-xl border-0 font-semibold"
                >
                  {submitTask.isPending ? "Submitting..." : "Submit for Review"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Worker: revision requested */}
          {isWorker && task.status === "revision_requested" && (
            <Card className="bg-[#111217] border border-amber-500/30">
              <CardContent className="p-5 md:p-6">
                <h3 className="text-base font-semibold text-amber-400 mb-3">Revision Requested</h3>
                {task.revisionNote && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4 text-sm text-amber-300">
                    <div className="text-xs text-amber-500 mb-1 font-medium">Creator's note:</div>
                    {task.revisionNote}
                  </div>
                )}
                <p className="text-zinc-400 text-sm mb-4">
                  The creator asked for changes. Submit your revised version below.
                </p>
                <Textarea
                  placeholder="Paste revised work link..."
                  className="min-h-[100px] bg-background border-white/10 text-white focus-visible:ring-purple-500 resize-none mb-4 text-sm"
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                />
                <Button
                  onClick={handleSubmitWork}
                  disabled={submitTask.isPending || !submissionContent.trim()}
                  className="w-full btn-gradient text-white rounded-xl border-0 font-semibold"
                >
                  {submitTask.isPending ? "Submitting..." : "Submit Revision"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Creator: review submission */}
          {isCreator && task.status === "submitted" && (
            <Card className="bg-[#111217] border border-blue-500/30">
              <CardContent className="p-5 md:p-6">
                <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  Review Submission
                </h3>
                <div className="bg-background border border-white/10 rounded-xl p-4 mb-5 text-sm text-zinc-300 break-words whitespace-pre-wrap">
                  {task.submissionContent}
                </div>

                {showRevisionForm ? (
                  <div className="mb-4">
                    <label className="text-sm text-zinc-400 mb-2 block">Revision note (optional)</label>
                    <Textarea
                      placeholder="Describe what needs to change..."
                      className="min-h-[80px] bg-background border-white/10 text-white focus-visible:ring-purple-500 resize-none mb-3 text-sm"
                      value={revisionNote}
                      onChange={(e) => setRevisionNote(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <Button
                        onClick={handleRequestRevision}
                        disabled={actionsPending}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold"
                      >
                        {requestRevision.isPending ? "Requesting..." : "Send Request"}
                      </Button>
                      <Button
                        onClick={() => setShowRevisionForm(false)}
                        variant="ghost"
                        className="text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleApprove}
                      disabled={actionsPending}
                      className="w-full bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold"
                    >
                      Approve &amp; Pay
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowRevisionForm(true)}
                        disabled={actionsPending}
                        variant="outline"
                        className="flex-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 rounded-xl bg-transparent text-sm"
                      >
                        Request Revision
                      </Button>
                      <Button
                        onClick={handleReject}
                        disabled={actionsPending}
                        variant="outline"
                        className="flex-1 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl bg-transparent text-sm"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Worker: pending review */}
          {isWorker && task.status === "submitted" && (
            <Card className="bg-[#111217] border border-blue-500/20">
              <CardContent className="p-5 text-center">
                <div className="text-blue-400 mb-2 font-semibold">Pending Review</div>
                <p className="text-zinc-500 text-sm">
                  Your work has been submitted. Payment arrives once approved.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Completed */}
          {task.status === "completed" && (
            <Card className="bg-[#111217] border border-purple-500/20">
              <CardContent className="p-5 text-center">
                <div className="text-purple-400 mb-2 text-lg font-bold">Task Completed</div>
                <p className="text-zinc-500 text-sm">
                  {isWorker
                    ? `₹${Math.floor(task.budget * 0.9).toLocaleString()} credited to your wallet.`
                    : "You approved the submission and payment was sent."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
