import { useParams, Link } from "wouter";
import {
  useTask,
  useAcceptTask,
  useSubmitTask,
  useApproveTask,
  useRejectTask,
  useRequestRevision,
  useCancelTask,
  useRateTask,
  useDisputeTask,
} from "@/hooks/use-tasks";
import { useCreateDepositOrder, useVerifyDeposit } from "@/hooks/use-wallet";
import { useAuth } from "@clerk/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { WalletModal } from "@/components/wallet-modal";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Wallet, Star, ExternalLink, AlertCircle, Timer } from "lucide-react";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) { resolve(true); return; }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const CATEGORY_COLORS: Record<string, string> = {
  reels: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  hooks: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  thumbnails: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  other: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  reels: "Reels", hooks: "Hooks", thumbnails: "Thumbnails", other: "Other",
};

function deadlineDisplay(deadline: string | null) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hrs = Math.floor(diff / (1000 * 60 * 60));
  if (diff < 0) return { label: "Deadline passed", urgent: true };
  if (hrs < 24) return { label: `${hrs} hours left`, urgent: true };
  return { label: `${days} day${days !== 1 ? "s" : ""} left`, urgent: days <= 2 };
}

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={24}
            className={i <= (hovered || value)
              ? "text-amber-400 fill-amber-400"
              : "text-muted-foreground/30"
            }
          />
        </button>
      ))}
    </div>
  );
}

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: task, isLoading, error } = useTask(id || "");
  const { userId } = useAuth();

  const acceptTask = useAcceptTask();
  const submitTask = useSubmitTask();
  const approveTask = useApproveTask();
  const rejectTask = useRejectTask();
  const requestRevision = useRequestRevision();
  const cancelTask = useCancelTask();
  const rateTask = useRateTask();
  const disputeTask = useDisputeTask();

  const [submissionContent, setSubmissionContent] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [topUpRequired, setTopUpRequired] = useState<number | null>(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingDone, setRatingDone] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const createOrder = useCreateDepositOrder();
  const verifyDeposit = useVerifyDeposit();

  const handleDeposit = async () => {
    const amount = Number(depositAmount);
    if (isNaN(amount) || amount < 100) { toast.error("Minimum deposit is ₹100"); return; }
    const loaded = await loadRazorpayScript();
    if (!loaded) { toast.error("Failed to load payment system."); return; }
    createOrder.mutate(amount, {
      onSuccess: (order) => {
        setShowTopUpModal(false);
        const rzp = new (window as any).Razorpay({
          key: order.keyId, amount: order.amount * 100, currency: order.currency,
          name: "CreatorTasks", description: "Wallet Top-up", order_id: order.orderId,
          handler: (response: any) => {
            verifyDeposit.mutate(
              { razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, amount },
              {
                onSuccess: () => { toast.success(`₹${amount} added!`); setDepositAmount(""); setTopUpRequired(null); },
                onError: (err) => toast.error(err instanceof Error ? err.message : "Verification failed"),
              }
            );
          },
          theme: { color: "#7C5CFF" }, modal: { escape: true },
        });
        rzp.open();
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to initiate payment"),
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
            <Skeleton className="h-10 w-3/4 bg-white/5" />
            <div className="flex gap-4"><Skeleton className="h-6 w-24 bg-white/5" /><Skeleton className="h-6 w-32 bg-white/5" /></div>
            <Skeleton className="h-40 w-full bg-white/5" />
          </div>
          <div className="space-y-6 order-1 lg:order-2"><Skeleton className="h-[220px] w-full rounded-2xl bg-white/5" /></div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">Task not found</h2>
        <Button asChild className="btn-gradient text-white rounded-xl border-0">
          <Link href="/tasks">Back to Tasks</Link>
        </Button>
      </div>
    );
  }

  const isCreator = !!userId && userId === task.creatorClerkId;
  const isWorker = !!userId && userId === task.workerClerkId;
  const canAccept = !!userId && !isCreator && task.status === "open";
  const canRate = (isCreator || isWorker) && task.status === "completed" && !ratingDone;
  const dl = deadlineDisplay(task.deadline);

  const statusColors: Record<string, string> = {
    open: "bg-green-500/10 text-green-400 border-green-500/20",
    in_progress: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    submitted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    completed: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    revision_requested: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    cancelled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };

  const statusLabels: Record<string, string> = {
    open: "Open", in_progress: "In Progress", submitted: "Submitted",
    completed: "Completed", rejected: "Rejected", revision_requested: "Revision Requested", cancelled: "Cancelled",
  };

  const handleAccept = () => {
    acceptTask.mutate(task.id, {
      onSuccess: () => toast.success("Task accepted!"),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to accept task"),
    });
  };

  const handleSubmitWork = () => {
    if (!submissionContent.trim()) { toast.error("Please provide submission details or a link"); return; }
    submitTask.mutate({ id: task.id, content: submissionContent, submissionUrl: submissionUrl || undefined }, {
      onSuccess: () => { toast.success("Work submitted successfully!"); setSubmissionContent(""); setSubmissionUrl(""); },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to submit work"),
    });
  };

  const handleApprove = () => {
    approveTask.mutate(task.id, {
      onSuccess: () => toast.success("Submission approved! Payment transferred."),
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Failed to approve";
        if (msg.toLowerCase().includes("insufficient")) {
          setTopUpRequired(task.budget); setDepositAmount(String(task.budget)); setShowTopUpModal(true);
        }
        toast.error(msg);
      },
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
      onSuccess: () => { toast.success("Revision requested."); setRevisionNote(""); setShowRevisionForm(false); },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to request revision"),
    });
  };

  const handleCancel = () => {
    cancelTask.mutate(task.id, {
      onSuccess: (data: any) => toast.success(`Task cancelled. ₹${data.refunded?.toLocaleString()} refunded.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to cancel task"),
    });
  };

  const handleRate = () => {
    if (!ratingScore) { toast.error("Please select a star rating"); return; }
    rateTask.mutate({ id: task.id, score: ratingScore, comment: ratingComment || undefined }, {
      onSuccess: () => { toast.success("Rating submitted! Thank you."); setRatingDone(true); setShowRatingForm(false); },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to submit rating"),
    });
  };

  const handleDispute = () => {
    if (disputeReason.trim().length < 10) { toast.error("Please describe the issue (at least 10 characters)"); return; }
    disputeTask.mutate({ id: task.id, reason: disputeReason }, {
      onSuccess: () => { toast.success("Dispute filed. Our team will review it."); setShowDisputeForm(false); setDisputeReason(""); },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to file dispute"),
    });
  };

  const actionsPending = approveTask.isPending || rejectTask.isPending || requestRevision.isPending || cancelTask.isPending;

  return (
    <>
      <Helmet>
        <title>{task.title} — ₹{task.budget.toLocaleString()} | CreatorTasks</title>
        <meta name="description" content={task.description.slice(0, 155)} />
        <meta property="og:title" content={`${task.title} — ₹${task.budget.toLocaleString()}`} />
        <meta property="og:description" content={task.description.slice(0, 200)} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="CreatorTasks" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${task.title} — ₹${task.budget.toLocaleString()}`} />
        <meta name="twitter:description" content={task.description.slice(0, 200)} />
      </Helmet>

      <div className="container mx-auto px-4 py-8 md:py-12">
        <Link href="/tasks" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors group">
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Tasks
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left: Task Details */}
          <div className="lg:col-span-2 order-2 lg:order-1 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {task.flagged && (
                  <Badge variant="outline" className="text-orange-400 bg-orange-500/10 border-orange-500/20 text-xs flex items-center gap-1">
                    <AlertCircle size={10} /> Flagged
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight leading-tight mb-4">
                {task.title}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mb-6">
                <Badge variant="outline" className={statusColors[task.status]}>
                  {statusLabels[task.status]}
                </Badge>
                <Badge variant="outline" className={CATEGORY_COLORS[task.category] ?? CATEGORY_COLORS.other}>
                  {CATEGORY_LABELS[task.category] ?? task.category}
                </Badge>
                {dl && (
                  <Badge variant="outline" className={dl.urgent
                    ? "bg-red-500/10 text-red-400 border-red-500/20 flex items-center gap-1"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20 flex items-center gap-1"
                  }>
                    <Timer size={10} /> {dl.label}
                  </Badge>
                )}
                <span className="text-zinc-500 text-sm">by {task.creatorName || "Anonymous"}</span>
                <span className="text-zinc-600 text-sm">{new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="card-lit bg-card border border-border rounded-2xl p-5 md:p-8 whitespace-pre-wrap text-muted-foreground leading-relaxed text-sm md:text-base">
              {task.description}
            </div>

            {/* Attachment */}
            {task.attachmentUrl && (
              <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-center gap-3">
                <ExternalLink size={16} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Reference / Attachment</p>
                  <a
                    href={task.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-400 hover:text-purple-300 underline truncate block"
                  >
                    {task.attachmentUrl}
                  </a>
                </div>
              </div>
            )}

            {/* Submission display */}
            {task.submissionContent && (
              <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Work Submission
                </h3>
                <div className="bg-muted/40 rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap break-words mb-3">
                  {task.submissionContent}
                </div>
                {task.submissionUrl && (
                  <a
                    href={task.submissionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors"
                  >
                    <ExternalLink size={13} />
                    View delivered work
                  </a>
                )}
              </div>
            )}

            {/* Rating form */}
            {canRate && !showRatingForm && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">How was the experience?</p>
                  <p className="text-xs text-muted-foreground">Rate the {isCreator ? "creator" : "poster"} to help others</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowRatingForm(true)}
                  className="btn-gradient text-white rounded-xl border-0 shrink-0"
                >
                  <Star size={13} className="mr-1" />
                  Rate now
                </Button>
              </div>
            )}

            {canRate && showRatingForm && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold text-foreground">Leave a rating</h3>
                <StarRatingInput value={ratingScore} onChange={setRatingScore} />
                <Textarea
                  placeholder="Optional comment..."
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  className="min-h-[80px] resize-none text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleRate}
                    disabled={rateTask.isPending || !ratingScore}
                    className="btn-gradient text-white rounded-xl border-0 flex-1"
                  >
                    {rateTask.isPending ? "Submitting..." : "Submit Rating"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowRatingForm(false)} className="text-muted-foreground">
                    Skip
                  </Button>
                </div>
              </div>
            )}

            {ratingDone && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 text-center text-sm text-green-400 font-medium">
                ✅ Rating submitted — thank you!
              </div>
            )}

            {/* Dispute button */}
            {userId && (isCreator || isWorker) && task.status !== "completed" && task.status !== "cancelled" && !task.flagged && (
              <div className="border-t border-border pt-4">
                {!showDisputeForm ? (
                  <button
                    onClick={() => setShowDisputeForm(true)}
                    className="text-xs text-muted-foreground hover:text-orange-400 transition-colors flex items-center gap-1"
                  >
                    <AlertCircle size={11} /> Report an issue with this task
                  </button>
                ) : (
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-orange-400">Report a problem</p>
                    <Textarea
                      placeholder="Describe the issue in detail (min 10 characters)..."
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="min-h-[80px] resize-none text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleDispute}
                        disabled={disputeTask.isPending}
                        className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl border-0"
                      >
                        {disputeTask.isPending ? "Filing..." : "File Dispute"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowDisputeForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="space-y-4 order-1 lg:order-2">
            <Card className="card-lit bg-card border-border">
              <CardContent className="p-5 md:p-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Task Budget</div>
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
                      isCreator ? "bg-muted text-muted-foreground cursor-not-allowed" : "btn-gradient text-white"
                    }`}
                  >
                    {isCreator ? "You posted this" : acceptTask.isPending ? "Accepting..." : "Accept Task"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {isCreator && task.status === "open" && (
              <Card className="bg-card border border-border">
                <CardContent className="p-4">
                  <Button
                    onClick={handleCancel}
                    disabled={actionsPending}
                    variant="outline"
                    className="w-full border-zinc-700 text-zinc-500 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/5 rounded-xl bg-transparent text-sm font-medium"
                  >
                    {cancelTask.isPending ? "Cancelling..." : "Cancel & Refund Escrow"}
                  </Button>
                  <p className="text-xs text-zinc-700 text-center mt-2">
                    Only available while no creator has accepted.
                  </p>
                </CardContent>
              </Card>
            )}

            {isWorker && (task.status === "in_progress" || task.status === "revision_requested") && (
              <Card className={`bg-card border ${task.status === "revision_requested" ? "border-amber-500/30" : "border-border"}`}>
                <CardContent className="p-5 md:p-6">
                  <h3 className="text-base font-semibold text-foreground mb-4">
                    {task.status === "revision_requested" ? "Submit Revision" : "Submit Your Work"}
                  </h3>

                  {task.status === "revision_requested" && task.revisionNote && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4 text-sm text-amber-300">
                      <div className="text-xs text-amber-500 mb-1 font-medium">Creator's note:</div>
                      {task.revisionNote}
                    </div>
                  )}

                  <Textarea
                    placeholder="Describe your delivery or paste a Google Drive / Figma link..."
                    className="min-h-[100px] focus-visible:ring-ring resize-none mb-3 text-sm"
                    value={submissionContent}
                    onChange={(e) => setSubmissionContent(e.target.value)}
                  />
                  <Input
                    placeholder="Delivery link (optional) — Drive, Dropbox, Figma..."
                    value={submissionUrl}
                    onChange={(e) => setSubmissionUrl(e.target.value)}
                    className="rounded-xl mb-4 text-sm h-9"
                  />
                  <Button
                    onClick={handleSubmitWork}
                    disabled={submitTask.isPending || !submissionContent.trim()}
                    className="w-full btn-gradient text-white rounded-xl border-0 font-semibold"
                  >
                    {submitTask.isPending ? "Submitting..." : task.status === "revision_requested" ? "Submit Revision" : "Submit for Review"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {isCreator && task.status === "submitted" && (
              <Card className="bg-card border border-blue-500/30">
                <CardContent className="p-5 md:p-6">
                  <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Review Submission
                  </h3>

                  {showRevisionForm ? (
                    <div className="mb-4">
                      <label className="text-sm text-muted-foreground mb-2 block">Revision note (optional)</label>
                      <Textarea
                        placeholder="Describe what needs to change..."
                        className="min-h-[80px] focus-visible:ring-ring resize-none mb-3 text-sm"
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
                        <Button onClick={() => setShowRevisionForm(false)} variant="ghost" className="text-muted-foreground">
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
                          className="flex-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 rounded-xl bg-transparent text-sm"
                        >
                          Request Revision
                        </Button>
                        {(task.revisionCount ?? 0) > 0 ? (
                          <Button
                            onClick={handleReject}
                            disabled={actionsPending}
                            variant="outline"
                            className="flex-1 border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-xl bg-transparent text-sm"
                          >
                            Reject
                          </Button>
                        ) : (
                          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-border text-muted-foreground text-sm cursor-not-allowed" title="Request 1 revision first">
                            🔒 Reject
                          </div>
                        )}
                      </div>
                      {(task.revisionCount ?? 0) === 0 && (
                        <p className="text-xs text-zinc-600 text-center">Request a revision first before rejecting</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {isWorker && task.status === "submitted" && (
              <Card className="bg-card border border-blue-500/20">
                <CardContent className="p-5 text-center">
                  <div className="text-blue-400 mb-2 font-semibold">Pending Review</div>
                  <p className="text-zinc-500 text-sm">Your work has been submitted. Payment arrives once approved.</p>
                </CardContent>
              </Card>
            )}

            {task.status === "completed" && (
              <Card className="bg-card border border-purple-500/20">
                <CardContent className="p-5 text-center">
                  <div className="text-purple-400 mb-2 text-lg font-bold">Task Completed ✅</div>
                  <p className="text-zinc-500 text-sm">
                    {isWorker
                      ? `₹${Math.floor(task.budget * 0.9).toLocaleString()} credited to your wallet.`
                      : "Payment was sent to the creator."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <WalletModal open={showTopUpModal} onClose={() => setShowTopUpModal(false)} title="Top Up Wallet to Approve">
          <div className="space-y-4">
            {topUpRequired && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-sm text-amber-400">
                You need at least <strong>₹{topUpRequired.toLocaleString()}</strong> to approve this task.
              </div>
            )}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block font-medium">Amount to Add (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">₹</span>
                <Input type="number" placeholder="1000" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="pl-8 focus-visible:ring-ring rounded-xl" />
              </div>
            </div>
            <div className="flex gap-2">
              {[500, 1000, 2000, 5000].map((p) => (
                <button key={p} onClick={() => setDepositAmount(String(p))} className="flex-1 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:border-purple-500/40 hover:text-foreground transition-all font-medium">
                  ₹{p >= 1000 ? `${p / 1000}k` : p}
                </button>
              ))}
            </div>
            <Button onClick={handleDeposit} disabled={createOrder.isPending} className="w-full btn-gradient text-white rounded-xl border-0 font-semibold flex items-center justify-center gap-2">
              <Wallet size={15} />
              {createOrder.isPending ? "Loading..." : "Add Money with Razorpay"}
            </Button>
          </div>
        </WalletModal>
      </div>
    </>
  );
}
