import { useParams, Link } from "wouter";
import { useTask, useAcceptTask, useSubmitTask, useApproveTask, useRejectTask } from "@/hooks/use-tasks";
import { useAuth } from "@clerk/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: task, isLoading, error } = useTask(id || "");
  const { userId } = useAuth();
  
  const acceptTask = useAcceptTask();
  const submitTask = useSubmitTask();
  const approveTask = useApproveTask();
  const rejectTask = useRejectTask();

  const [submissionContent, setSubmissionContent] = useState("");

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-10 w-3/4 bg-white/5" />
            <div className="flex gap-4">
              <Skeleton className="h-6 w-24 bg-white/5" />
              <Skeleton className="h-6 w-32 bg-white/5" />
            </div>
            <Skeleton className="h-40 w-full bg-white/5" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[300px] w-full rounded-2xl bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Task not found</h2>
        <Button asChild className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl">
          <Link href="/tasks">Back to Tasks</Link>
        </Button>
      </div>
    );
  }

  const isCreator = !!userId && userId === task.creatorClerkId;
  const isWorker = !!userId && userId === task.workerClerkId;
  const canAccept = !!userId && !isCreator && task.status === "open";

  const statusColors = {
    open: "bg-green-500/10 text-green-500 border-green-500/20",
    in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    submitted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    completed: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  const statusLabels = {
    open: "Open",
    in_progress: "In Progress",
    submitted: "Submitted",
    completed: "Completed",
    rejected: "Rejected",
  };

  const handleAccept = () => {
    acceptTask.mutate(task.id, {
      onSuccess: () => toast.success("Task accepted!"),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to accept task")
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
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to submit work")
    });
  };

  const handleApprove = () => {
    approveTask.mutate(task.id, {
      onSuccess: () => toast.success("Submission approved! Payment transferred."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to approve")
    });
  };

  const handleReject = () => {
    rejectTask.mutate(task.id, {
      onSuccess: () => toast.success("Submission rejected."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to reject")
    });
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <Link href="/tasks" className="text-zinc-400 hover:text-white text-sm mb-6 inline-flex items-center">
        &larr; Back to Tasks
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Task Details */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-3xl font-semibold text-white tracking-tight leading-tight">
              {task.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-8">
            <Badge variant="outline" className={statusColors[task.status]}>
              {statusLabels[task.status]}
            </Badge>
            <span className="text-zinc-400 text-sm">
              Posted by {task.creatorName || "Anonymous"}
            </span>
            <span className="text-zinc-400 text-sm">
              {new Date(task.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="prose prose-invert max-w-none">
            <div className="bg-[#111217] border border-[#1F2228] rounded-2xl p-6 md:p-8 whitespace-pre-wrap text-zinc-300 leading-relaxed">
              {task.description}
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Status */}
        <div className="space-y-6">
          {/* Budget Card */}
          <Card className="bg-[#111217] border-[#1F2228]">
            <CardContent className="p-6">
              <div className="text-sm text-zinc-400 mb-1">Task Budget</div>
              <div className="text-4xl font-semibold text-purple-500 mb-6">₹{task.budget}</div>
              
              {task.status === "open" && (
                <Button 
                  onClick={handleAccept} 
                  disabled={!canAccept || acceptTask.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl py-6 text-lg font-medium"
                >
                  {isCreator ? "You posted this" : acceptTask.isPending ? "Accepting..." : "Accept Task"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Dynamic Panel based on role and status */}
          {isWorker && task.status === "in_progress" && (
            <Card className="bg-[#111217] border-[#1F2228]">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-white mb-4">Submit Your Work</h3>
                <Textarea 
                  placeholder="Paste link to your work (Google Drive, Figma, frame.io, etc) or provide details..."
                  className="min-h-[120px] bg-background border-white/10 text-white focus-visible:ring-purple-500 resize-none mb-4"
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                />
                <Button 
                  onClick={handleSubmitWork}
                  disabled={submitTask.isPending || !submissionContent.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl"
                >
                  {submitTask.isPending ? "Submitting..." : "Submit for Review"}
                </Button>
              </CardContent>
            </Card>
          )}

          {isCreator && task.status === "submitted" && (
            <Card className="bg-[#111217] border border-blue-500/30">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  Review Submission
                </h3>
                <div className="bg-background border border-white/10 rounded-xl p-4 mb-6 text-sm text-zinc-300 break-words whitespace-pre-wrap">
                  {task.submissionContent}
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={handleApprove}
                    disabled={approveTask.isPending || rejectTask.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-xl"
                  >
                    Approve & Pay
                  </Button>
                  <Button 
                    onClick={handleReject}
                    disabled={approveTask.isPending || rejectTask.isPending}
                    variant="outline"
                    className="flex-1 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-400 rounded-xl bg-transparent"
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isWorker && task.status === "submitted" && (
            <Card className="bg-[#111217] border border-blue-500/20">
              <CardContent className="p-6 text-center">
                <div className="text-blue-500 mb-2">⏳ Pending Review</div>
                <p className="text-zinc-400 text-sm">
                  Your work has been submitted to the creator. You'll receive payment once approved.
                </p>
              </CardContent>
            </Card>
          )}

          {task.status === "completed" && (
            <Card className="bg-[#111217] border border-purple-500/20">
              <CardContent className="p-6 text-center">
                <div className="text-purple-500 mb-2 text-xl">🎉 Task Completed</div>
                <p className="text-zinc-400 text-sm">
                  {isWorker ? "Payment has been credited to your wallet!" : "You approved the submission and payment was sent."}
                </p>
              </CardContent>
            </Card>
          )}

          {task.status === "rejected" && (
            <Card className="bg-[#111217] border border-red-500/20">
              <CardContent className="p-6">
                <div className="text-red-500 mb-2 text-center">❌ Submission Rejected</div>
                {isWorker && (
                  <div className="mt-4">
                    <p className="text-zinc-400 text-sm mb-4 text-center">You can submit a revised version.</p>
                    <Textarea 
                      placeholder="Paste revised work link..."
                      className="min-h-[100px] bg-background border-white/10 text-white focus-visible:ring-purple-500 resize-none mb-4"
                      value={submissionContent}
                      onChange={(e) => setSubmissionContent(e.target.value)}
                    />
                    <Button 
                      onClick={handleSubmitWork}
                      disabled={submitTask.isPending || !submissionContent.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl"
                    >
                      Submit Revision
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
