import { useState, useEffect } from "react";
import { useSearchParam } from "@/hooks/use-search-param";
import { useDashboard, useWallet, useCreateDepositOrder, useVerifyDeposit, useWithdraw } from "@/hooks/use-wallet";
import { useProfile, useReferral } from "@/hooks/use-profile";
import { useMyInvites, useAcceptInvite, useDeclineInvite } from "@/hooks/use-invites";
import { TaskCard } from "@/components/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletModal } from "@/components/wallet-modal";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, Copy, Gift, Users, TrendingUp, Mail, XCircle, AlertTriangle, Bookmark, Sparkles, AlertCircle } from "lucide-react";
import { useMyDisputes, useBookmarks } from "@/hooks/use-bookmarks";
import { toast } from "sonner";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const VALID_TABS = ["posted", "accepted", "bookmarks", "transactions", "invitations", "referral", "disputes"];

export function Dashboard() {
  const tabParam = useSearchParam("tab");
  const tabFromUrl = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "posted";

  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const { userId } = useAuth();
  const { data: dashboard, isLoading: loadingDash } = useDashboard();
  const { data: wallet, isLoading: loadingWallet } = useWallet();
  const { data: profile } = useProfile(userId ?? undefined);
  const profileComplete = !!(profile?.name?.trim() && profile?.bio?.trim());
  const { data: referralData } = useReferral();

  const { data: myInvites } = useMyInvites();
  const acceptInvite = useAcceptInvite();
  const declineInvite = useDeclineInvite();

  const { data: myDisputes } = useMyDisputes();
  const { data: bookmarkedTasks } = useBookmarks();

  const createOrder = useCreateDepositOrder();
  const verifyDeposit = useVerifyDeposit();
  const withdraw = useWithdraw();

  const isLoading = loadingDash || loadingWallet;
  const pendingInvites = myInvites?.filter((inv) => inv.status === "pending") ?? [];

  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState<string>("all");

  const handleDeposit = async () => {
    const amount = Number(depositAmount);
    if (isNaN(amount) || amount < 100) {
      toast.error("Minimum deposit is ₹100");
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error("Failed to load payment system. Please try again.");
      return;
    }

    createOrder.mutate(amount, {
      onSuccess: (order) => {
        setShowDepositDialog(false);
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount * 100,
          currency: order.currency,
          name: "CreatorTasks",
          description: "Wallet Deposit",
          order_id: order.orderId,
          handler: (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            verifyDeposit.mutate(
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount,
              },
              {
                onSuccess: () => {
                  toast.success(`₹${amount} deposited to your wallet!`);
                  setDepositAmount("");
                },
                onError: (err) => toast.error(err instanceof Error ? err.message : "Payment verification failed"),
              }
            );
          },
          theme: { color: "#7C5CFF" },
          modal: { escape: true },
        });
        rzp.open();
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to initiate payment");
      },
    });
  };

  const handleWithdraw = () => {
    const amount = Number(withdrawAmount);
    if (isNaN(amount) || amount < 100) {
      toast.error("Minimum withdrawal is ₹100");
      return;
    }
    if (!upiId.trim()) {
      toast.error("Please enter your UPI ID");
      return;
    }
    withdraw.mutate({ amount, upiId }, {
      onSuccess: () => {
        toast.success(`Withdrawal of ₹${amount} requested. You'll receive it within 24 hours.`);
        setShowWithdrawDialog(false);
        setWithdrawAmount("");
        setUpiId("");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Withdrawal failed"),
    });
  };

  const isNewUser = !isLoading && (dashboard?.postedTasks?.length ?? 0) === 0 && (dashboard?.acceptedTasks?.length ?? 0) === 0;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-6 md:mb-8">Dashboard</h1>

      {/* Profile incomplete banner */}
      {userId && !profileComplete && profile !== undefined && (
        <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-300 mb-0.5">Your profile is incomplete</h3>
            <p className="text-sm text-amber-400/70">Add your name and bio to post tasks and apply for work.</p>
          </div>
          <Button asChild size="sm" className="btn-gradient text-white rounded-xl border-0 font-semibold text-xs shrink-0">
            <Link href="/profile/edit">Complete Profile</Link>
          </Button>
        </div>
      )}

      {/* Onboarding banner */}
      {isNewUser && (
        <div className="mb-8 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Sparkles size={22} className="text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground mb-1">Welcome to CreatorTasks!</h3>
            <p className="text-sm text-zinc-400 mb-3">You're all set. Post your first task to get content created, or browse open tasks to start earning as a creator.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="btn-gradient text-white rounded-xl border-0 font-semibold text-xs">
                <Link href="/create">Post a Task</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-xl text-xs">
                <Link href="/tasks">Browse & Earn</Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className="rounded-xl text-xs text-zinc-500">
                <Link href="/leaderboard">View Leaderboard</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
        <Card className="card-lit bg-card border-border md:col-span-2">
          <CardContent className="p-5 md:p-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Available Balance</div>
            {loadingWallet ? (
              <Skeleton className="h-10 w-32 mb-6" />
            ) : (
              <div className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-6">
                ₹{wallet?.balance?.toLocaleString() || "0"}
              </div>
            )}
            <div className="flex flex-col xs:flex-row gap-3">
              <Button
                onClick={() => setShowDepositDialog(true)}
                className="btn-gradient text-white rounded-xl border-0 font-semibold flex-1 xs:flex-none"
              >
                <ArrowDownLeft size={16} className="mr-2" />
                Deposit
              </Button>
              <Button
                onClick={() => setShowWithdrawDialog(true)}
                variant="outline"
                className="rounded-xl flex-1 xs:flex-none"
              >
                <ArrowUpRight size={16} className="mr-2" />
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="card-lit bg-card border-border">
          <CardContent className="p-5 md:p-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Pending Escrow</div>
            {loadingWallet ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold text-foreground/70">
                ₹{wallet?.pendingBalance?.toLocaleString() || "0"}
              </div>
            )}
            <p className="text-xs text-zinc-600 mt-2">Locked in ongoing tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-6 md:mb-8">
          <TabsList className="bg-muted border border-border p-1 h-auto rounded-xl inline-flex min-w-full md:min-w-0 w-full md:w-auto">
            <TabsTrigger
              value="posted"
              className="flex-1 md:flex-none rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground text-sm whitespace-nowrap"
            >
              Posted Tasks
            </TabsTrigger>
            <TabsTrigger
              value="accepted"
              className="flex-1 md:flex-none rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground text-sm whitespace-nowrap"
            >
              My Work
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="flex-1 md:flex-none rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground text-sm whitespace-nowrap"
            >
              Transactions
            </TabsTrigger>
            <TabsTrigger
              value="invitations"
              className="flex-1 md:flex-none rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground text-sm whitespace-nowrap relative"
            >
              Invitations
              {pendingInvites.length > 0 && (
                <span className="ml-1.5 w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingInvites.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="bookmarks"
              className="flex-1 md:flex-none rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground text-sm whitespace-nowrap"
            >
              Bookmarks
            </TabsTrigger>
            <TabsTrigger
              value="referral"
              className="flex-1 md:flex-none rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground text-sm whitespace-nowrap"
            >
              Referral
            </TabsTrigger>
            <TabsTrigger
              value="disputes"
              className="flex-1 md:flex-none rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground text-sm whitespace-nowrap"
            >
              Disputes
              {(myDisputes?.filter((d) => d.status === "open").length ?? 0) > 0 && (
                <span className="ml-1.5 w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {myDisputes!.filter((d) => d.status === "open").length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="posted" className="focus-visible:outline-none">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Skeleton className="h-[200px] w-full rounded-2xl bg-white/5" />
              <Skeleton className="h-[200px] w-full rounded-2xl bg-white/5" />
            </div>
          ) : dashboard?.postedTasks?.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-2xl px-4">
              <p className="text-muted-foreground mb-4">You haven't posted any tasks yet.</p>
              <Button asChild className="btn-gradient text-white rounded-xl border-0 font-semibold">
                <a href="/create">Post Your First Task</a>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {dashboard?.postedTasks?.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accepted" className="focus-visible:outline-none">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Skeleton className="h-[200px] w-full rounded-2xl bg-white/5" />
              <Skeleton className="h-[200px] w-full rounded-2xl bg-white/5" />
            </div>
          ) : dashboard?.acceptedTasks?.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-2xl px-4">
              <p className="text-muted-foreground mb-4">You haven't accepted any tasks yet.</p>
              <Button asChild className="btn-gradient text-white rounded-xl border-0 font-semibold">
                <a href="/tasks">Browse Tasks</a>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {dashboard?.acceptedTasks?.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="focus-visible:outline-none">
          {/* Type filter pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {["all", "deposit", "payment", "withdrawal", "fee", "refund", "referral_commission"].map((t) => (
              <button
                key={t}
                onClick={() => setTxTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                  txTypeFilter === t
                    ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                    : "bg-muted border-border text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
                }`}
              >
                {t === "all" ? "All" : t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>
          <Card className="bg-card border-border">
            <div className="divide-y divide-border">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full bg-white/5 shrink-0" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32 bg-white/5" />
                        <Skeleton className="h-3 w-20 bg-white/5" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16 bg-white/5" />
                  </div>
                ))
              ) : wallet?.transactions?.filter((tx) => txTypeFilter === "all" || tx.type === txTypeFilter).length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  No transactions{txTypeFilter !== "all" ? ` of type "${txTypeFilter.replace(/_/g, " ")}"` : ""}.
                </div>
              ) : (
                wallet?.transactions?.filter((tx) => txTypeFilter === "all" || tx.type === txTypeFilter).map((tx) => (
                  <div key={tx.id} className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        tx.type === "deposit" || tx.type === "payment" || tx.type === "refund"
                          ? "bg-green-500/10 text-green-400"
                          : tx.type === "fee"
                          ? "bg-zinc-500/10 text-zinc-500"
                          : "bg-purple-500/10 text-purple-400"
                      }`}>
                        {tx.type === "deposit" || tx.type === "payment" || tx.type === "refund" ? (
                          <ArrowDownLeft size={18} />
                        ) : (
                          <ArrowUpRight size={18} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground text-sm line-clamp-1">{tx.description}</div>
                        <div className="text-xs text-zinc-600 mt-0.5">
                          {new Date(tx.createdAt).toLocaleDateString()}
                          <span className="hidden sm:inline"> · <span className="capitalize">
                            {tx.type === "refund" ? "Escrow Refund" : tx.type === "fee" ? "Platform Fee" : tx.type}
                          </span></span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-semibold text-sm ${
                        tx.type === "deposit" || tx.type === "payment" || tx.type === "refund"
                          ? "text-green-400"
                          : tx.type === "fee"
                          ? "text-zinc-500"
                          : "text-foreground"
                      }`}>
                        {tx.type === "deposit" || tx.type === "payment" || tx.type === "refund" ? "+" : "-"}₹{tx.amount.toLocaleString()}
                      </div>
                      <div className="text-xs mt-0.5 flex items-center justify-end gap-1">
                        {tx.status === "completed" ? (
                          <><CheckCircle2 size={11} className="text-green-500" /><span className="text-zinc-500 capitalize">{tx.status}</span></>
                        ) : (
                          <><Clock size={11} className="text-yellow-500" /><span className="text-zinc-500 capitalize">{tx.status}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="focus-visible:outline-none">
          {!myInvites || myInvites.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-2xl px-4">
              <Mail size={32} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground mb-2">No invitations yet</p>
              <p className="text-xs text-zinc-600">When a creator invites you to work on a task, it will show up here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myInvites.map((inv) => (
                <Card key={inv.id} className={`bg-card border ${
                  inv.status === "accepted"
                    ? "border-green-500/20"
                    : inv.status === "declined"
                    ? "border-zinc-700 opacity-60"
                    : "border-border"
                }`}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Link
                            href={`/tasks/${inv.taskId}`}
                            className="font-semibold text-foreground text-sm hover:text-purple-400 transition-colors"
                          >
                            {inv.taskTitle}
                          </Link>
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
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-medium text-purple-400">₹{inv.taskBudget?.toLocaleString()}</span>
                          <span>from {inv.creatorName || "Anonymous"}</span>
                          <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {inv.status === "pending" && inv.taskStatus === "open" && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => {
                              acceptInvite.mutate(inv.id, {
                                onSuccess: () => toast.success("Invite accepted! You've been assigned to the task."),
                                onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to accept"),
                              });
                            }}
                            disabled={acceptInvite.isPending}
                            className="btn-gradient text-white rounded-lg text-xs border-0"
                          >
                            <CheckCircle2 size={12} className="mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              declineInvite.mutate(inv.id, {
                                onSuccess: () => toast.success("Invite declined."),
                                onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to decline"),
                              });
                            }}
                            disabled={declineInvite.isPending}
                            className="rounded-lg text-xs border-zinc-700 text-zinc-400 hover:border-red-500/30 hover:text-red-400"
                          >
                            <XCircle size={12} className="mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}

                      {inv.status === "pending" && inv.taskStatus !== "open" && (
                        <span className="text-xs text-zinc-500 shrink-0">Task no longer open</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookmarks" className="focus-visible:outline-none">
          {!bookmarkedTasks?.length ? (
            <div className="text-center py-16 bg-card border border-border rounded-2xl px-4">
              <Bookmark size={32} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground mb-2">No bookmarked tasks yet</p>
              <p className="text-xs text-zinc-600">Click the bookmark icon on any task to save it here.</p>
              <Button asChild className="btn-gradient text-white rounded-xl border-0 font-semibold mt-4 text-sm">
                <Link href="/tasks">Browse Tasks</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {bookmarkedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="disputes" className="focus-visible:outline-none">
          {!myDisputes?.length ? (
            <div className="text-center py-16 bg-card border border-border rounded-2xl px-4">
              <AlertTriangle size={32} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground mb-2">No disputes filed</p>
              <p className="text-xs text-zinc-600">If you have an issue with a task, use the report button on the task page.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myDisputes.map((d) => (
                <Card key={d.id} className={`bg-card border ${d.status === "resolved" ? "border-green-500/20" : "border-orange-500/20"}`}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {d.taskId ? (
                            <Link href={`/tasks/${d.taskId}`} className="font-semibold text-sm text-foreground hover:text-purple-400 transition-colors">
                              {d.taskTitle || "Unknown Task"}
                            </Link>
                          ) : (
                            <span className="font-semibold text-sm text-foreground">{d.taskTitle || "Unknown Task"}</span>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs capitalize ${d.status === "resolved" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}`}
                          >
                            {d.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500 mb-2 line-clamp-2">{d.reason}</p>
                        {d.adminNote && (
                          <p className="text-xs text-zinc-400 bg-muted/50 rounded-lg px-3 py-2 border border-border">
                            <span className="font-medium text-foreground">Admin note:</span> {d.adminNote}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-zinc-500">{new Date(d.createdAt).toLocaleDateString()}</div>
                        {d.resolvedAt && (
                          <div className="text-xs text-green-500 mt-1">Resolved {new Date(d.resolvedAt).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="referral" className="focus-visible:outline-none space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-card border-border card-lit">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Gift size={16} className="text-purple-400" />
                  </div>
                  <span className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Total Commission Earned</span>
                </div>
                <div className="text-2xl font-bold text-foreground">₹{(referralData?.totalCommissionEarned ?? 0).toLocaleString()}</div>
                <p className="text-xs text-zinc-500 mt-1">1% on every completed task</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border card-lit">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                    <Users size={16} className="text-pink-400" />
                  </div>
                  <span className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Friends Referred</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{referralData?.totalReferrals ?? 0}</div>
                <p className="text-xs text-zinc-500 mt-1">creators joined via your link</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border card-lit">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <TrendingUp size={16} className="text-green-400" />
                  </div>
                  <span className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Tasks Completed</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{referralData?.totalTasksCompleted ?? 0}</div>
                <p className="text-xs text-zinc-500 mt-1">by your referred creators</p>
              </CardContent>
            </Card>
          </div>

          {/* Referral link */}
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-5">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Your Referral Link</h3>
                <p className="text-xs text-zinc-500 mb-4">
                  Share this link. Every time someone you refer completes a task, you earn{" "}
                  <span className="text-purple-400 font-semibold">{referralData?.commissionPct ?? 1}% of their task budget</span> — automatically added to your wallet.
                </p>
                {referralData?.code ? (
                  <div className="flex gap-2">
                    <div className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm font-mono text-zinc-300 truncate">
                      {referralData.referralLink}
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-xl shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(referralData.referralLink);
                        toast.success("Referral link copied!");
                      }}
                    >
                      <Copy size={15} className="mr-2" />
                      Copy
                    </Button>
                  </div>
                ) : (
                  <div className="bg-muted border border-border rounded-xl px-4 py-3 text-sm text-zinc-500 animate-pulse">
                    Generating your referral code...
                  </div>
                )}
              </div>

              {/* How it works */}
              <div className="border-t border-border pt-5">
                <h3 className="font-semibold text-foreground mb-3 text-sm">How it works</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { step: "1", label: "Share your link", desc: "Send your referral link to creators you know" },
                    { step: "2", label: "They sign up & work", desc: "Your referred creator joins and completes tasks" },
                    { step: "3", label: "You earn 1%", desc: "1% of every task budget they complete — forever" },
                  ].map(({ step, label, desc }) => (
                    <div key={step} className="bg-muted/40 border border-border rounded-xl p-4">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-400 mb-3">{step}</div>
                      <div className="text-sm font-semibold text-foreground mb-1">{label}</div>
                      <div className="text-xs text-zinc-500">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Example earnings */}
              <div className="border-t border-border pt-5">
                <h3 className="font-semibold text-foreground mb-3 text-sm">Example earnings</h3>
                <div className="space-y-2">
                  {[
                    { budget: 500, label: "₹500 task" },
                    { budget: 1000, label: "₹1,000 task" },
                    { budget: 5000, label: "₹5,000 task" },
                  ].map(({ budget, label }) => (
                    <div key={budget} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                      <span className="text-sm text-zinc-400">{label} completed by your referral</span>
                      <span className="text-sm font-semibold text-green-400">+₹{Math.floor(budget * 0.01)} to you</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active referrals list */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Your Referrals</h3>
              {!referralData?.referrals?.length ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                    <Users size={24} className="text-purple-400" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No referrals yet</p>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">Share your link above — you earn 1% on every task they complete, for life.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {referralData.referrals.map((r) => (
                    <div key={r.id} className="flex items-center gap-4 p-4 bg-muted/40 border border-border rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-sm shrink-0">
                        {r.referredUserId.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground mb-0.5">Creator</div>
                        <div className="text-xs text-zinc-500">
                          {r.completedTaskCount ?? 0} task{(r.completedTaskCount ?? 0) !== 1 ? "s" : ""} completed
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-green-400">+₹{(r.commissionEarned ?? 0).toLocaleString()}</div>
                        <div className="text-xs text-zinc-500">earned</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Deposit Modal */}
      <WalletModal open={showDepositDialog} onClose={() => setShowDepositDialog(false)} title="Add Money">
        <div className="space-y-4">
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
            <p className="text-xs text-muted-foreground mt-1">Minimum ₹100</p>
          </div>
          <div className="flex gap-2">
            {[500, 1000, 2000].map((preset) => (
              <button
                key={preset}
                onClick={() => setDepositAmount(String(preset))}
                className="flex-1 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:border-purple-500/40 hover:text-foreground transition-all duration-200 font-medium"
              >
                ₹{preset}
              </button>
            ))}
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

      {/* Withdraw Modal */}
      <WalletModal open={showWithdrawDialog} onClose={() => setShowWithdrawDialog(false)} title="Withdraw Money">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block font-medium">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">₹</span>
              <Input
                type="number"
                placeholder="500"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="pl-8 focus-visible:ring-ring rounded-xl"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Available: ₹{wallet?.balance?.toLocaleString() || "0"} · Minimum ₹100
            </p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block font-medium">UPI ID</label>
            <Input
              placeholder="yourname@upi"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="focus-visible:ring-ring rounded-xl"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Withdrawals are processed within 24 hours to your UPI account.
          </p>
          <Button
            onClick={handleWithdraw}
            disabled={withdraw.isPending}
            className="w-full btn-gradient text-white rounded-xl border-0 font-semibold"
          >
            {withdraw.isPending ? "Processing..." : "Request Withdrawal"}
          </Button>
        </div>
      </WalletModal>
    </div>
  );
}
