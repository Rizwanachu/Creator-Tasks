import { useParams, Link } from "wouter";
import {
  useTask,
  useSubmitTask,
  useApproveTask,
  useRejectTask,
  useRequestRevision,
  useCancelTask,
  useRateTask,
  useDisputeTask,
  useApplyToTask,
  useMyApplication,
  useTaskApplications,
  useAcceptApplication,
  useRejectApplication,
} from "@/hooks/use-tasks";
import {
  useTaskInvites,
  useSendInvite,
  useSearchUsers,
} from "@/hooks/use-invites";
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
import { ArrowLeft, Wallet, Star, ExternalLink, AlertCircle, Timer, Send, UserPlus, Search, CheckCircle2, XCircle, Clock, Trophy, FileText } from "lucide-react";

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

  const submitTask = useSubmitTask();
  const approveTask = useApproveTask();
  const rejectTask = useRejectTask();
  const requestRevision = useRequestRevision();
  const cancelTask = useCancelTask();
  const rateTask = useRateTask();
  const disputeTask = useDisputeTask();
  const applyToTask = useApplyToTask();
  const acceptApplication = useAcceptApplication();
  const rejectApplication = useRejectApplication();
  const sendInvite = useSendInvite();

  const { data: myApplication } = useMyApplication(id || "");
  const { data: applicationsData } = useTaskApplications(id || "");
  const { data: taskInvites } = useTaskInvites(id || "");

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

  const [applicationMessage, setApplicationMessage] = useState("");
  const [applicationPortfolio, setApplicationPortfolio] = useState("");
  const [showInviteSearch, setShowInviteSearch] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState("");
  const { data: searchResults } = useSearchUsers(inviteSearchQuery);

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
  const canApply = !!userId && !isCreator && task.status === "open" && !myApplication;
  const hasApplied = !!myApplication;
  const canRate = (isCreator || isWorker) && task.status === "completed" && !ratingDone;
  const dl = deadlineDisplay(task.deadline);
  const pendingApplications = applicationsData?.filter((a) => a.status === "pending") ?? [];
  const allApplications = applicationsData ?? [];

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

  const handleApply = () => {
    if (applicationMessage.trim().length < 10) {
      toast.error("Application message must be at least 10 characters");
      return;
    }
    applyToTask.mutate(
      { id: task.id, message: applicationMessage, portfolioUrl: applicationPortfolio || undefined },
      {
        onSuccess: () => {
          toast.success("Application sent! The creator will review your proposal.");
          setApplicationMessage("");
          setApplicationPortfolio("");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to apply"),
      },
    );
  };

  const handleAcceptApp = (applicationId: string) => {
    acceptApplication.mutate(applicationId, {
      onSuccess: () => toast.success("Worker assigned! They can now start working."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to accept"),
    });
  };

  const handleRejectApp = (applicationId: string) => {
    rejectApplication.mutate(applicationId, {
      onSuccess: () => toast.success("Application rejected."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to reject"),
    });
  };

  const handleInvite = (workerClerkId: string) => {
    sendInvite.mutate(
      { taskId: task.id, workerClerkId },
      {
        onSuccess: () => {
          toast.success("Invite sent!");
          setInviteSearchQuery("");
          setShowInviteSearch(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to send invite"),
      },
    );
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

            {task.attachmentUrl && (
              <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-center gap-3">
                <ExternalLink size={16} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Reference / Attachment</p>
                  <a href={task.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-400 hover:text-purple-300 underline truncate block">
                    {task.attachmentUrl}
                  </a>
                </div>
              </div>
            )}

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
                  <a href={task.submissionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors">
                    <ExternalLink size={13} />
                    View delivered work
                  </a>
                )}
              </div>
            )}

            {/* Application form for workers */}
            {canApply && (
              <div className="bg-card border border-purple-500/20 rounded-2xl p-5 md:p-6 space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Send size={16} className="text-purple-400" />
                  Apply for this Task
                </h3>
                <p className="text-xs text-muted-foreground">
                  Tell the creator why you're the right person for this task. Include relevant experience or samples.
                </p>
                <Textarea
                  placeholder="Write a compelling proposal (min 10 characters)..."
                  className="min-h-[100px] focus-visible:ring-ring resize-none text-sm"
                  value={applicationMessage}
                  onChange={(e) => setApplicationMessage(e.target.value)}
                />
                <Input
                  placeholder="Portfolio or sample link (optional)"
                  value={applicationPortfolio}
                  onChange={(e) => setApplicationPortfolio(e.target.value)}
                  className="focus-visible:ring-ring rounded-xl text-sm"
                />
                <Button
                  onClick={handleApply}
                  disabled={applyToTask.isPending}
                  className="w-full btn-gradient text-white rounded-xl border-0 font-semibold"
                >
                  {applyToTask.isPending ? "Sending..." : "Submit Application"}
                </Button>
              </div>
            )}

            {/* Application status for workers */}
            {hasApplied && (
              <div className={`border rounded-2xl p-5 flex items-center gap-3 ${
                myApplication.status === "accepted"
                  ? "bg-green-500/5 border-green-500/20"
                  : myApplication.status === "rejected"
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-blue-500/5 border-blue-500/20"
              }`}>
                {myApplication.status === "accepted" ? (
                  <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                ) : myApplication.status === "rejected" ? (
                  <XCircle size={18} className="text-red-400 shrink-0" />
                ) : (
                  <Clock size={18} className="text-blue-400 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {myApplication.status === "accepted"
                      ? "Your application was accepted! You've been assigned to this task."
                      : myApplication.status === "rejected"
                      ? "Your application was not selected for this task."
                      : "Your application is under review by the creator."}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Applied {new Date(myApplication.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {/* Applicants section for creators */}
            {isCreator && task.status === "open" && allApplications.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <FileText size={16} className="text-purple-400" />
                  Applicants ({pendingApplications.length} pending, {allApplications.length} total)
                </h3>

                <div className="space-y-3">
                  {allApplications.map((app) => (
                    <div
                      key={app.id}
                      className={`border rounded-xl p-4 transition-colors ${
                        app.status === "accepted"
                          ? "border-green-500/30 bg-green-500/5"
                          : app.status === "rejected"
                          ? "border-zinc-700 bg-zinc-900/30 opacity-60"
                          : "border-border hover:border-purple-500/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(app.workerName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/profile/${app.workerClerkId}`}
                              className="font-medium text-foreground text-sm hover:text-purple-400 transition-colors truncate block"
                            >
                              {app.workerName || "Anonymous"}
                            </Link>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1">
                                <Trophy size={10} className="text-amber-400" />
                                {app.workerCompletedTasks} completed
                              </span>
                              {app.workerRating > 0 && (
                                <span className="flex items-center gap-1">
                                  <Star size={10} className="text-amber-400 fill-amber-400" />
                                  {app.workerRating}
                                </span>
                              )}
                              <span>₹{(app.workerTotalEarnings ?? 0).toLocaleString()} earned</span>
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${
                            app.status === "accepted"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : app.status === "rejected"
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}
                        >
                          {app.status === "accepted" ? "Assigned" : app.status === "rejected" ? "Rejected" : "Pending"}
                        </Badge>
                      </div>

                      <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground/80 mb-3">
                        {app.message}
                      </div>

                      {app.portfolioUrl && (
                        <a
                          href={app.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 mb-3"
                        >
                          <ExternalLink size={11} />
                          View portfolio
                        </a>
                      )}

                      {app.status === "pending" && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptApp(app.id)}
                            disabled={acceptApplication.isPending}
                            className="btn-gradient text-white rounded-lg border-0 text-xs flex-1"
                          >
                            <CheckCircle2 size={12} className="mr-1" />
                            {acceptApplication.isPending ? "..." : "Assign Worker"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectApp(app.id)}
                            disabled={rejectApplication.isPending}
                            className="rounded-lg text-xs border-zinc-700 text-zinc-400 hover:border-red-500/30 hover:text-red-400"
                          >
                            <XCircle size={12} className="mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite section for creators */}
            {isCreator && task.status === "open" && (
              <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <UserPlus size={16} className="text-purple-400" />
                    Direct Invite
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowInviteSearch(!showInviteSearch)}
                    className="rounded-lg text-xs"
                  >
                    <Search size={12} className="mr-1" />
                    {showInviteSearch ? "Close" : "Find Workers"}
                  </Button>
                </div>

                {showInviteSearch && (
                  <div className="space-y-3">
                    <Input
                      placeholder="Search workers by name..."
                      value={inviteSearchQuery}
                      onChange={(e) => setInviteSearchQuery(e.target.value)}
                      className="focus-visible:ring-ring rounded-xl text-sm"
                    />
                    {searchResults && searchResults.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {searchResults
                          .filter((u) => u.clerkId !== userId)
                          .map((user) => {
                            const alreadyInvited = taskInvites?.some((inv) => inv.workerClerkId === user.clerkId);
                            return (
                              <div key={user.id} className="flex items-center justify-between gap-3 border border-border rounded-lg p-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {(user.name || "?").charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{user.name || "Anonymous"}</p>
                                    <p className="text-xs text-muted-foreground">₹{(user.totalEarnings ?? 0).toLocaleString()} earned</p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleInvite(user.clerkId)}
                                  disabled={alreadyInvited || sendInvite.isPending}
                                  className={alreadyInvited
                                    ? "rounded-lg text-xs bg-muted text-muted-foreground cursor-not-allowed"
                                    : "btn-gradient text-white rounded-lg text-xs border-0"
                                  }
                                >
                                  {alreadyInvited ? "Invited" : sendInvite.isPending ? "..." : "Invite"}
                                </Button>
                              </div>
                            );
                          })}
                      </div>
                    )}
                    {inviteSearchQuery.length >= 2 && searchResults?.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">No workers found</p>
                    )}
                  </div>
                )}

                {taskInvites && taskInvites.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground font-medium mb-3">Sent Invites</p>
                    <div className="space-y-2">
                      {taskInvites.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between gap-3 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {(inv.workerName || "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-foreground truncate">{inv.workerName || "Anonymous"}</span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              inv.status === "accepted"
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : inv.status === "declined"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            }`}
                          >
                            {inv.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
                Rating submitted — thank you!
              </div>
            )}

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

                {task.status === "open" && !isCreator && !hasApplied && userId && (
                  <Button
                    onClick={() => document.getElementById("apply-section")?.scrollIntoView({ behavior: "smooth" })}
                    className="w-full rounded-xl py-5 text-base font-semibold border-0 btn-gradient text-white"
                  >
                    Apply Now
                  </Button>
                )}

                {task.status === "open" && !isCreator && hasApplied && (
                  <div className="w-full rounded-xl py-3 text-sm font-medium text-center bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Clock size={14} className="inline mr-1.5" />
                    Application {myApplication?.status === "pending" ? "Under Review" : myApplication?.status === "accepted" ? "Accepted" : "Not Selected"}
                  </div>
                )}

                {task.status === "open" && isCreator && (
                  <div className="w-full rounded-xl py-3 text-sm font-medium text-center bg-muted text-muted-foreground">
                    {pendingApplications.length > 0
                      ? `${pendingApplications.length} application${pendingApplications.length > 1 ? "s" : ""} to review`
                      : "Waiting for applications..."
                    }
                  </div>
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
                    Only available while no worker has been assigned.
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
                    placeholder="Submission URL (optional)"
                    className="focus-visible:ring-ring rounded-xl mb-3 text-sm"
                    value={submissionUrl}
                    onChange={(e) => setSubmissionUrl(e.target.value)}
                  />
                  <Button
                    onClick={handleSubmitWork}
                    disabled={submitTask.isPending}
                    className="w-full btn-gradient text-white rounded-xl border-0 font-semibold"
                  >
                    {submitTask.isPending ? "Submitting..." : "Submit Work"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {isCreator && task.status === "submitted" && (
              <Card className="bg-card border border-blue-500/20">
                <CardContent className="p-5 md:p-6 space-y-3">
                  <h3 className="text-base font-semibold text-foreground mb-4">Review Submission</h3>
                  <Button
                    onClick={handleApprove}
                    disabled={actionsPending}
                    className="w-full btn-gradient text-white rounded-xl border-0 font-semibold"
                  >
                    {approveTask.isPending ? "Approving..." : "Approve & Pay"}
                  </Button>

                  {!showRevisionForm ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowRevisionForm(true)}
                        disabled={actionsPending}
                        className="flex-1 rounded-xl border-amber-500/30 text-amber-400 hover:bg-amber-500/5"
                      >
                        Request Revision
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleReject}
                        disabled={actionsPending || (task.revisionCount ?? 0) < 1}
                        className="flex-1 rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/5 disabled:opacity-30"
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Describe what needs to be changed..."
                        value={revisionNote}
                        onChange={(e) => setRevisionNote(e.target.value)}
                        className="min-h-[80px] resize-none text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleRequestRevision}
                          disabled={actionsPending}
                          className="flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl border-0"
                        >
                          Send Revision Request
                        </Button>
                        <Button variant="ghost" onClick={() => setShowRevisionForm(false)} className="text-muted-foreground">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {(task.revisionCount ?? 0) < 1 && (
                    <p className="text-xs text-zinc-600 text-center">
                      You must request at least one revision before rejecting.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <WalletModal open={showTopUpModal} onClose={() => setShowTopUpModal(false)} title="Top Up Required">
        <div className="space-y-4">
          {topUpRequired && (
            <p className="text-sm text-muted-foreground">
              You need at least ₹{topUpRequired.toLocaleString()} in your wallet to approve this task.
            </p>
          )}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block font-medium">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">₹</span>
              <Input
                type="number"
                placeholder="500"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="pl-8 focus-visible:ring-ring rounded-xl"
              />
            </div>
          </div>
          <Button
            onClick={handleDeposit}
            disabled={createOrder.isPending}
            className="w-full btn-gradient text-white rounded-xl border-0 font-semibold"
          >
            {createOrder.isPending ? "Loading..." : "Pay with Razorpay"}
          </Button>
        </div>
      </WalletModal>

      <div id="apply-section" />
    </>
  );
}
