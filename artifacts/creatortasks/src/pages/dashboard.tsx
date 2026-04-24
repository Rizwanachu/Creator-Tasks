import { useState, useEffect } from "react";
import { useSearchParam } from "@/hooks/use-search-param";
import { useDashboard, useWallet, useCreateDepositOrder, useVerifyDeposit, useWithdraw } from "@/hooks/use-wallet";
import { useProfileComplete, useReferral } from "@/hooks/use-profile";
import { useMyInvites, useAcceptInvite, useDeclineInvite } from "@/hooks/use-invites";
import { TaskCard } from "@/components/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletModal } from "@/components/wallet-modal";
import {
  ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, Copy, Gift,
  Users, TrendingUp, Mail, XCircle, AlertTriangle, Bookmark,
  Sparkles, AlertCircle, ClipboardList, Wrench, ReceiptText,
  Shield, LayoutDashboard, Check, ChevronRight,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSubscription, useCreateSubscription, useConfirmSubscription, useCancelSubscription } from "@/hooks/use-subscription";
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
    if (document.getElementById("razorpay-script")) { resolve(true); return; }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const VALID_TABS = ["posted", "accepted", "bookmarks", "transactions", "invitations", "referral", "disputes", "subscription"];

const NAV_ITEMS = [
  { id: "posted",        label: "Posted Tasks",  icon: ClipboardList },
  { id: "accepted",      label: "My Work",        icon: Wrench },
  { id: "transactions",  label: "Transactions",   icon: ReceiptText },
  { id: "invitations",   label: "Invitations",    icon: Mail },
  { id: "bookmarks",     label: "Bookmarks",      icon: Bookmark },
  { id: "referral",      label: "Referral",       icon: Gift },
  { id: "disputes",      label: "Disputes",       icon: Shield },
  { id: "subscription",  label: "Pro",            icon: Sparkles },
];

function SubscriptionTab() {
  const queryClient = useQueryClient();
  const { data: sub, isLoading } = useSubscription();
  const createSub = useCreateSubscription();
  const confirmSub = useConfirmSubscription();
  const cancelSub = useCancelSubscription();
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isPro = sub?.isPro ?? false;
  const proUntil = sub?.proUntil ? new Date(sub.proUntil) : null;
  const subscription = sub?.subscription ?? null;

  async function handleSubscribe() {
    setSubscribing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error("Could not load payment system."); setSubscribing(false); return; }
      const data = await createSub.mutateAsync();
      const rzp = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "CreatorTasks Pro",
        description: "₹299/month — Pro subscription",
        handler: async (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => {
          try {
            await confirmSub.mutateAsync({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            });
          } catch {
            queryClient.invalidateQueries({ queryKey: ["subscription"] });
            queryClient.invalidateQueries({ queryKey: ["me"] });
          }
          toast.success("Welcome to Pro! Your badge is active.");
        },
        theme: { color: "#7C5CFF" },
        modal: { escape: true },
      });
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start subscription");
    } finally {
      setSubscribing(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel your Pro subscription? You'll keep access until the end of your billing period.")) return;
    setCancelling(true);
    try {
      await cancelSub.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast.success("Subscription cancelled. You'll keep Pro access until the billing period ends.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground text-sm">Loading subscription…</div>;
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* Status card */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPro ? "bg-purple-500/10" : "bg-muted"}`}>
              <Sparkles size={18} className={isPro ? "text-purple-400 fill-purple-400" : "text-muted-foreground"} />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{isPro ? "CreatorTasks Pro" : "Free Plan"}</p>
              <p className="text-xs text-muted-foreground">
                {isPro
                  ? proUntil
                    ? `Active until ${proUntil.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                    : "Active"
                  : "Upgrade to unlock Pro benefits"}
              </p>
            </div>
            {isPro && (
              <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
                <Check size={10} />
                Active
              </span>
            )}
          </div>

          <div className="space-y-2 mb-5">
            {[
              { label: "Platform fee", value: isPro ? "7% (save 3%)" : "10%", pro: isPro },
              { label: "Daily task posting", value: isPro ? "Unlimited" : "2 tasks/day", pro: isPro },
              { label: "Search ranking", value: isPro ? "Pinned to top" : "Standard", pro: isPro },
              { label: "Pro badge on profile", value: isPro ? "Visible" : "Not included", pro: isPro },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={`text-sm font-medium ${item.pro ? "text-purple-400" : "text-foreground"}`}>{item.value}</span>
              </div>
            ))}
          </div>

          {isPro ? (
            <div className="space-y-3">
              {subscription?.status === "active" && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl text-sm border-red-500/20 text-red-400 hover:bg-red-500/5 hover:border-red-500/40"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelling…" : "Cancel Subscription"}
                </Button>
              )}
              {subscription?.status === "cancelled" && (
                <p className="text-xs text-muted-foreground text-center">
                  Subscription cancelled — access ends {proUntil?.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.
                </p>
              )}
            </div>
          ) : (
            <Button
              className="w-full btn-gradient text-white rounded-xl border-0 font-semibold"
              onClick={handleSubscribe}
              disabled={subscribing}
            >
              {subscribing ? "Opening payment…" : "Upgrade to Pro — ₹299/month"}
              <ChevronRight size={14} className="ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>

      {!isPro && (
        <p className="text-xs text-muted-foreground text-center">
          See full feature breakdown on the{" "}
          <Link href="/pro" className="text-purple-400 hover:underline">pricing page</Link>.
        </p>
      )}
    </div>
  );
}

export function Dashboard() {
  const tabParam = useSearchParam("tab");
  const tabFromUrl = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "posted";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  useEffect(() => { setActiveTab(tabFromUrl); }, [tabFromUrl]);

  const { userId } = useAuth();
  const { data: dashboard, isLoading: loadingDash } = useDashboard();
  const { data: wallet, isLoading: loadingWallet } = useWallet();
  const { isComplete: profileComplete, completionPercent, isLoading: profileLoading } = useProfileComplete(userId ?? undefined);
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
  const openDisputes = myDisputes?.filter((d) => d.status === "open").length ?? 0;

  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState<string>("all");

  const handleDeposit = async () => {
    const amount = Number(depositAmount);
    if (isNaN(amount) || amount < 100) { toast.error("Minimum deposit is ₹100"); return; }
    const loaded = await loadRazorpayScript();
    if (!loaded) { toast.error("Failed to load payment system. Please try again."); return; }
    createOrder.mutate(amount, {
      onSuccess: (order) => {
        setShowDepositDialog(false);
        const rzp = new window.Razorpay({
          key: order.keyId, amount: order.amount * 100, currency: order.currency,
          name: "CreatorTasks", description: "Wallet Deposit", order_id: order.orderId,
          handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            verifyDeposit.mutate(
              { razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, amount },
              {
                onSuccess: () => { toast.success(`₹${amount} deposited to your wallet!`); setDepositAmount(""); },
                onError: (err) => toast.error(err instanceof Error ? err.message : "Payment verification failed"),
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

  const handleWithdraw = () => {
    const amount = Number(withdrawAmount);
    if (isNaN(amount) || amount < 100) { toast.error("Minimum withdrawal is ₹100"); return; }
    if (!upiId.trim()) { toast.error("Please enter your UPI ID"); return; }
    withdraw.mutate({ amount, upiId }, {
      onSuccess: () => { toast.success(`Withdrawal of ₹${amount} requested. You'll receive it within 24 hours.`); setShowWithdrawDialog(false); setWithdrawAmount(""); setUpiId(""); },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Withdrawal failed"),
    });
  };

  const isNewUser = !isLoading && (dashboard?.postedTasks?.length ?? 0) === 0 && (dashboard?.acceptedTasks?.length ?? 0) === 0;
  const activeItem = NAV_ITEMS.find((n) => n.id === activeTab);

  return (
    <div className="container mx-auto px-4 py-6 md:py-10 max-w-7xl">

      {/* Page header */}
      <div className="flex items-center gap-2.5 mb-6">
        <LayoutDashboard size={20} className="text-purple-500" />
        <h1 className="text-xl font-bold text-foreground tracking-tight">Dashboard</h1>
      </div>

      {/* Profile incomplete banner */}
      {userId && !profileComplete && !profileLoading && (
        <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-700 dark:text-amber-300 text-sm mb-0.5">Your profile is incomplete</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="h-1.5 flex-1 rounded-full bg-amber-500/10 overflow-hidden max-w-[160px]">
                <div className="h-full rounded-full bg-amber-400/70 transition-all duration-500" style={{ width: `${completionPercent}%` }} />
              </div>
              <span className="text-xs text-amber-600 dark:text-amber-400">{completionPercent}%</span>
            </div>
          </div>
          <Button asChild size="sm" className="btn-gradient text-white rounded-xl border-0 font-semibold text-xs shrink-0">
            <Link href="/profile/edit">Complete Profile</Link>
          </Button>
        </div>
      )}

      {/* Onboarding banner */}
      {isNewUser && (
        <div className="mb-6 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Sparkles size={22} className="text-purple-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground mb-1">Welcome to CreatorTasks!</h3>
            <p className="text-sm text-muted-foreground mb-3">Post your first task to get content created, or browse open tasks to start earning.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="btn-gradient text-white rounded-xl border-0 font-semibold text-xs">
                <Link href="/create">Post a Task</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-xl text-xs">
                <Link href="/tasks">Browse & Earn</Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className="rounded-xl text-xs text-muted-foreground">
                <Link href="/leaderboard">View Leaderboard</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main layout: sidebar + content */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ─── Sidebar ─── */}
        <aside className="lg:w-64 shrink-0 space-y-4">

          {/* Wallet card */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Wallet Balance</p>
            {loadingWallet ? (
              <Skeleton className="h-9 w-28 mb-4" />
            ) : (
              <p className="text-4xl font-black text-foreground tracking-tight mb-4">
                ₹{wallet?.balance?.toLocaleString() ?? "0"}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => setShowDepositDialog(true)}
                size="sm"
                className="btn-gradient text-white rounded-xl border-0 font-semibold flex-1 text-xs h-8"
              >
                <ArrowDownLeft size={13} className="mr-1" /> Deposit
              </Button>
              <Button
                onClick={() => setShowWithdrawDialog(true)}
                size="sm"
                variant="outline"
                className="rounded-xl flex-1 text-xs h-8"
              >
                <ArrowUpRight size={13} className="mr-1" /> Withdraw
              </Button>
            </div>
            {!loadingWallet && (wallet?.pendingBalance ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                <span className="text-foreground font-medium">₹{wallet!.pendingBalance!.toLocaleString()}</span> locked in escrow
              </p>
            )}
          </div>

          {/* Navigation — desktop vertical */}
          <nav className="hidden lg:block rounded-2xl border border-border bg-card p-2">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const badge = id === "invitations" ? pendingInvites.length : id === "disputes" ? openDisputes : 0;
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                    isActive
                      ? "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon size={15} className={isActive ? "text-purple-500" : "text-muted-foreground group-hover:text-foreground"} />
                  <span className="flex-1 text-left">{label}</span>
                  {badge > 0 && (
                    <span className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${id === "disputes" ? "bg-orange-500" : "bg-purple-500"}`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Navigation — mobile icon grid */}
          <div className="lg:hidden grid grid-cols-4 gap-1.5">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const badge = id === "invitations" ? pendingInvites.length : id === "disputes" ? openDisputes : 0;
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-center transition-all duration-150 ${
                    isActive
                      ? "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-[9px] font-medium leading-tight">{label.split(" ")[0]}</span>
                  {badge > 0 && (
                    <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center ${id === "disputes" ? "bg-orange-500" : "bg-purple-500"}`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* ─── Content ─── */}
        <main className="flex-1 min-w-0">
          {/* Section header */}
          {activeItem && (
            <div className="flex items-center gap-2 mb-5">
              <activeItem.icon size={16} className="text-purple-500" />
              <h2 className="font-semibold text-foreground">{activeItem.label}</h2>
              {activeTab === "invitations" && pendingInvites.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold">{pendingInvites.length} pending</span>
              )}
              {activeTab === "disputes" && openDisputes > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-semibold">{openDisputes} open</span>
              )}
            </div>
          )}

          {/* ── Posted Tasks ── */}
          {activeTab === "posted" && (
            isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                <Skeleton className="h-[200px] w-full rounded-2xl" />
                <Skeleton className="h-[200px] w-full rounded-2xl" />
              </div>
            ) : dashboard?.postedTasks?.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border rounded-2xl px-4">
                <ClipboardList size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground mb-4">You haven't posted any tasks yet.</p>
                <Button asChild className="btn-gradient text-white rounded-xl border-0 font-semibold">
                  <a href="/create">Post Your First Task</a>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {dashboard?.postedTasks?.map((task) => <TaskCard key={task.id} task={task} />)}
              </div>
            )
          )}

          {/* ── My Work ── */}
          {activeTab === "accepted" && (
            isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                <Skeleton className="h-[200px] w-full rounded-2xl" />
                <Skeleton className="h-[200px] w-full rounded-2xl" />
              </div>
            ) : dashboard?.acceptedTasks?.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border rounded-2xl px-4">
                <Wrench size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground mb-4">You haven't accepted any tasks yet.</p>
                <Button asChild className="btn-gradient text-white rounded-xl border-0 font-semibold">
                  <a href="/tasks">Browse Tasks</a>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {dashboard?.acceptedTasks?.map((task) => <TaskCard key={task.id} task={task} />)}
              </div>
            )
          )}

          {/* ── Transactions ── */}
          {activeTab === "transactions" && (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {["all", "deposit", "payment", "withdrawal", "fee", "refund", "referral_commission"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTxTypeFilter(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                      txTypeFilter === t
                        ? "bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300"
                        : "bg-muted border-border text-muted-foreground hover:text-foreground"
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
                          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                          <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div>
                        </div>
                        <Skeleton className="h-5 w-16" />
                      </div>
                    ))
                  ) : wallet?.transactions?.filter((tx) => txTypeFilter === "all" || tx.type === txTypeFilter).length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No transactions{txTypeFilter !== "all" ? ` of type "${txTypeFilter.replace(/_/g, " ")}"` : ""}.
                    </div>
                  ) : (
                    wallet?.transactions?.filter((tx) => txTypeFilter === "all" || tx.type === txTypeFilter).map((tx) => (
                      <div key={tx.id} className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            tx.type === "deposit" || tx.type === "payment" || tx.type === "refund"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : tx.type === "fee"
                              ? "bg-zinc-500/10 text-zinc-500"
                              : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                          }`}>
                            {tx.type === "deposit" || tx.type === "payment" || tx.type === "refund" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground text-sm line-clamp-1">{tx.description}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
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
                              ? "text-green-600 dark:text-green-400"
                              : tx.type === "fee" ? "text-muted-foreground" : "text-foreground"
                          }`}>
                            {tx.type === "deposit" || tx.type === "payment" || tx.type === "refund" ? "+" : "-"}₹{tx.amount.toLocaleString()}
                          </div>
                          <div className="text-xs mt-0.5 flex items-center justify-end gap-1">
                            {tx.status === "completed" ? (
                              <><CheckCircle2 size={11} className="text-green-500" /><span className="text-muted-foreground capitalize">{tx.status}</span></>
                            ) : (
                              <><Clock size={11} className="text-yellow-500" /><span className="text-muted-foreground capitalize">{tx.status}</span></>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </>
          )}

          {/* ── Invitations ── */}
          {activeTab === "invitations" && (
            !myInvites || myInvites.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border rounded-2xl px-4">
                <Mail size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground mb-2">No invitations yet</p>
                <p className="text-xs text-muted-foreground">When a creator invites you to work on a task, it will show up here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myInvites.map((inv) => (
                  <Card key={inv.id} className={`bg-card border ${
                    inv.status === "accepted" ? "border-green-500/20" : inv.status === "declined" ? "border-border opacity-60" : "border-border"
                  }`}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Link href={`/tasks/${inv.taskId}`} className="font-semibold text-foreground text-sm hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                              {inv.taskTitle}
                            </Link>
                            <Badge variant="outline" className={`text-xs ${
                              inv.status === "accepted" ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                              : inv.status === "declined" ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                              : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                            }`}>{inv.status}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="font-semibold text-purple-600 dark:text-purple-400">₹{inv.taskBudget?.toLocaleString()}</span>
                            <span>from {inv.creatorName || "Anonymous"}</span>
                            <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {inv.status === "pending" && inv.taskStatus === "open" && (
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" onClick={() => acceptInvite.mutate(inv.id, { onSuccess: () => toast.success("Invite accepted!"), onError: (err) => toast.error(err instanceof Error ? err.message : "Failed") })} disabled={acceptInvite.isPending} className="btn-gradient text-white rounded-lg text-xs border-0">
                              <CheckCircle2 size={12} className="mr-1" /> Accept
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => declineInvite.mutate(inv.id, { onSuccess: () => toast.success("Invite declined."), onError: (err) => toast.error(err instanceof Error ? err.message : "Failed") })} disabled={declineInvite.isPending} className="rounded-lg text-xs">
                              <XCircle size={12} className="mr-1" /> Decline
                            </Button>
                          </div>
                        )}
                        {inv.status === "pending" && inv.taskStatus !== "open" && (
                          <span className="text-xs text-muted-foreground shrink-0">Task no longer open</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}

          {/* ── Bookmarks ── */}
          {activeTab === "bookmarks" && (
            !bookmarkedTasks?.length ? (
              <div className="text-center py-16 bg-card border border-border rounded-2xl px-4">
                <Bookmark size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground mb-2">No bookmarked tasks yet</p>
                <p className="text-xs text-muted-foreground mb-4">Click the bookmark icon on any task to save it here.</p>
                <Button asChild className="btn-gradient text-white rounded-xl border-0 font-semibold text-sm">
                  <Link href="/tasks">Browse Tasks</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {bookmarkedTasks.map((task) => <TaskCard key={task.id} task={task} />)}
              </div>
            )
          )}

          {/* ── Disputes ── */}
          {activeTab === "disputes" && (
            !myDisputes?.length ? (
              <div className="text-center py-16 bg-card border border-border rounded-2xl px-4">
                <AlertTriangle size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground mb-2">No disputes filed</p>
                <p className="text-xs text-muted-foreground">If you have an issue with a task, use the report button on the task page.</p>
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
                              <Link href={`/tasks/${d.taskId}`} className="font-semibold text-sm text-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                {d.taskTitle || "Unknown Task"}
                              </Link>
                            ) : (
                              <span className="font-semibold text-sm text-foreground">{d.taskTitle || "Unknown Task"}</span>
                            )}
                            <Badge variant="outline" className={`text-xs capitalize ${d.status === "resolved" ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" : "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"}`}>
                              {d.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{d.reason}</p>
                          {d.adminNote && (
                            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border border-border">
                              <span className="font-medium text-foreground">Admin note:</span> {d.adminNote}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</div>
                          {d.resolvedAt && <div className="text-xs text-green-500 mt-1">Resolved {new Date(d.resolvedAt).toLocaleDateString()}</div>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}

          {/* ── Referral ── */}
          {activeTab === "referral" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: Gift, label: "Commission Earned", value: `₹${(referralData?.totalCommissionEarned ?? 0).toLocaleString()}`, sub: "1% on every completed task", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
                  { icon: Users, label: "Friends Referred", value: referralData?.totalReferrals ?? 0, sub: "creators joined via your link", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
                  { icon: TrendingUp, label: "Tasks Completed", value: referralData?.totalTasksCompleted ?? 0, sub: "by your referred creators", color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10 border-green-500/20" },
                ].map(({ icon: Icon, label, value, sub, color, bg }) => (
                  <Card key={label} className="bg-card border-border">
                    <CardContent className="p-5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 border ${bg}`}>
                        <Icon size={16} className={color} />
                      </div>
                      <div className="text-2xl font-black text-foreground mb-0.5">{value}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-card border-border">
                <CardContent className="p-6 space-y-5">
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Your Referral Link</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Share this link. Every completed task your referral does earns you{" "}
                      <span className="text-purple-600 dark:text-purple-400 font-semibold">{referralData?.commissionPct ?? 1}%</span> — automatically.
                    </p>
                    {referralData?.code ? (
                      <div className="flex gap-2">
                        <div className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm font-mono text-foreground truncate">
                          {referralData.referralLink}
                        </div>
                        <Button variant="outline" className="rounded-xl shrink-0" onClick={() => { navigator.clipboard.writeText(referralData.referralLink); toast.success("Referral link copied!"); }}>
                          <Copy size={15} className="mr-2" /> Copy
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-muted border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground animate-pulse">Generating your referral code...</div>
                    )}
                  </div>

                  <div className="border-t border-border pt-5">
                    <h3 className="font-semibold text-foreground mb-3 text-sm">How it works</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { step: "1", label: "Share your link", desc: "Send your referral link to creators you know" },
                        { step: "2", label: "They sign up & work", desc: "Your referred creator joins and completes tasks" },
                        { step: "3", label: "You earn 1%", desc: "1% of every task budget they complete — forever" },
                      ].map(({ step, label, desc }) => (
                        <div key={step} className="bg-muted/40 border border-border rounded-xl p-4">
                          <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400 mb-3">{step}</div>
                          <div className="text-sm font-semibold text-foreground mb-1">{label}</div>
                          <div className="text-xs text-muted-foreground">{desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border pt-5">
                    <h3 className="font-semibold text-foreground mb-3 text-sm">Example earnings</h3>
                    <div className="space-y-2">
                      {[{ budget: 500, label: "₹500 task" }, { budget: 1000, label: "₹1,000 task" }, { budget: 5000, label: "₹5,000 task" }].map(({ budget, label }) => (
                        <div key={budget} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                          <span className="text-sm text-muted-foreground">{label} completed by your referral</span>
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">+₹{Math.floor(budget * 0.01)} to you</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-4">Your Referrals</h3>
                  {!referralData?.referrals?.length ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                        <Users size={20} className="text-purple-500" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">No referrals yet</p>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">Share your link above — you earn 1% on every task they complete, for life.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {referralData.referrals.map((r) => (
                        <div key={r.id} className="flex items-center gap-4 p-4 bg-muted/40 border border-border rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/20 flex items-center justify-center text-purple-500 font-bold text-sm shrink-0">
                            {r.referredUserId.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground mb-0.5">Creator</div>
                            <div className="text-xs text-muted-foreground">{r.completedTaskCount ?? 0} task{(r.completedTaskCount ?? 0) !== 1 ? "s" : ""} completed</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-semibold text-green-600 dark:text-green-400">+₹{(r.commissionEarned ?? 0).toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">earned</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          {/* ── Pro Subscription ── */}
          {activeTab === "subscription" && (
            <SubscriptionTab />
          )}
        </main>
      </div>

      {/* Deposit Modal */}
      <WalletModal open={showDepositDialog} onClose={() => setShowDepositDialog(false)} title="Add Money">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block font-medium">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">₹</span>
              <Input type="number" placeholder="500" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="pl-8 focus-visible:ring-ring rounded-xl" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Minimum ₹100</p>
          </div>
          <div className="flex gap-2">
            {[500, 1000, 2000].map((preset) => (
              <button key={preset} onClick={() => setDepositAmount(String(preset))} className="flex-1 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:border-purple-500/40 hover:text-foreground transition-all duration-200 font-medium">
                ₹{preset}
              </button>
            ))}
          </div>
          <Button onClick={handleDeposit} disabled={createOrder.isPending} className="w-full btn-gradient text-white rounded-xl border-0 font-semibold">
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
              <Input type="number" placeholder="500" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="pl-8 focus-visible:ring-ring rounded-xl" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Available: ₹{wallet?.balance?.toLocaleString() || "0"} · Minimum ₹100</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block font-medium">UPI ID</label>
            <Input placeholder="yourname@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} className="focus-visible:ring-ring rounded-xl" />
          </div>
          <p className="text-xs text-muted-foreground">Withdrawals are processed within 24 hours to your UPI account.</p>
          <Button onClick={handleWithdraw} disabled={withdraw.isPending} className="w-full btn-gradient text-white rounded-xl border-0 font-semibold">
            {withdraw.isPending ? "Processing..." : "Request Withdrawal"}
          </Button>
        </div>
      </WalletModal>
    </div>
  );
}
