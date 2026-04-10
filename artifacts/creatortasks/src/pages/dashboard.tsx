import { useState } from "react";
import { useDashboard, useWallet, useCreateDepositOrder, useVerifyDeposit, useWithdraw } from "@/hooks/use-wallet";
import { TaskCard } from "@/components/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

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

export function Dashboard() {
  const { data: dashboard, isLoading: loadingDash } = useDashboard();
  const { data: wallet, isLoading: loadingWallet } = useWallet();

  const createOrder = useCreateDepositOrder();
  const verifyDeposit = useVerifyDeposit();
  const withdraw = useWithdraw();

  const isLoading = loadingDash || loadingWallet;

  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [upiId, setUpiId] = useState("");

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

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold text-white tracking-tight mb-8">Dashboard</h1>

      {/* Wallet Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="bg-[#111217] border-[#1F2228] md:col-span-2">
          <CardContent className="p-6">
            <div className="text-zinc-400 font-medium mb-2">Available Balance</div>
            {loadingWallet ? (
              <Skeleton className="h-10 w-32 bg-white/5" />
            ) : (
              <div className="text-5xl font-semibold text-white tracking-tight mb-6">
                ₹{wallet?.balance?.toLocaleString() || "0"}
              </div>
            )}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowDepositDialog(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl"
              >
                <ArrowDownLeft size={16} className="mr-2" />
                Deposit
              </Button>
              <Button
                onClick={() => setShowWithdrawDialog(true)}
                variant="outline"
                className="border-white/10 text-white hover:bg-white/10 rounded-xl bg-transparent"
              >
                <ArrowUpRight size={16} className="mr-2" />
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111217] border-[#1F2228]">
          <CardContent className="p-6">
            <div className="text-zinc-400 font-medium mb-2">Pending Escrow</div>
            {loadingWallet ? (
              <Skeleton className="h-8 w-24 bg-white/5" />
            ) : (
              <div className="text-3xl font-medium text-zinc-300">
                ₹{wallet?.pendingBalance?.toLocaleString() || "0"}
              </div>
            )}
            <p className="text-xs text-zinc-500 mt-2">Locked in ongoing tasks</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="posted" className="w-full">
        <TabsList className="bg-[#111217] border border-[#1F2228] p-1 h-auto mb-8 rounded-xl w-full sm:w-auto overflow-x-auto flex-wrap sm:flex-nowrap justify-start">
          <TabsTrigger
            value="posted"
            className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-zinc-400"
          >
            Posted Tasks
          </TabsTrigger>
          <TabsTrigger
            value="accepted"
            className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-zinc-400"
          >
            My Work
          </TabsTrigger>
          <TabsTrigger
            value="transactions"
            className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-zinc-400"
          >
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posted" className="focus-visible:outline-none">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-[200px] w-full rounded-2xl bg-white/5" />
              <Skeleton className="h-[200px] w-full rounded-2xl bg-white/5" />
            </div>
          ) : dashboard?.postedTasks?.length === 0 ? (
            <div className="text-center py-20 bg-[#111217] border border-[#1F2228] rounded-2xl">
              <p className="text-zinc-400">You haven't posted any tasks yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboard?.postedTasks?.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accepted" className="focus-visible:outline-none">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-[200px] w-full rounded-2xl bg-white/5" />
              <Skeleton className="h-[200px] w-full rounded-2xl bg-white/5" />
            </div>
          ) : dashboard?.acceptedTasks?.length === 0 ? (
            <div className="text-center py-20 bg-[#111217] border border-[#1F2228] rounded-2xl">
              <p className="text-zinc-400">You haven't accepted any tasks yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboard?.acceptedTasks?.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="focus-visible:outline-none">
          <Card className="bg-[#111217] border-[#1F2228]">
            <div className="divide-y divide-[#1F2228]">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full bg-white/5" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32 bg-white/5" />
                        <Skeleton className="h-3 w-20 bg-white/5" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16 bg-white/5" />
                  </div>
                ))
              ) : wallet?.transactions?.length === 0 ? (
                <div className="p-8 text-center text-zinc-400">
                  No transactions yet.
                </div>
              ) : (
                wallet?.transactions?.map((tx) => (
                  <div key={tx.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        tx.type === "deposit" || tx.type === "payment"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-red-500/10 text-red-400"
                      }`}>
                        {tx.type === "deposit" || tx.type === "payment" ? (
                          <ArrowDownLeft size={20} />
                        ) : (
                          <ArrowUpRight size={20} />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white line-clamp-1">{tx.description}</div>
                        <div className="text-sm text-zinc-500 flex items-center gap-2 mt-1">
                          {new Date(tx.createdAt).toLocaleDateString()}
                          <span className="hidden sm:inline">&bull;</span>
                          <span className="hidden sm:inline capitalize">{tx.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-semibold ${
                        tx.type === "deposit" || tx.type === "payment" ? "text-green-500" : "text-white"
                      }`}>
                        {tx.type === "deposit" || tx.type === "payment" ? "+" : "-"}₹{tx.amount}
                      </div>
                      <div className="text-xs mt-1 flex items-center justify-end gap-1">
                        {tx.status === "completed" ? (
                          <><CheckCircle2 size={12} className="text-green-500" /><span className="text-zinc-400 capitalize">{tx.status}</span></>
                        ) : (
                          <><Clock size={12} className="text-yellow-500" /><span className="text-zinc-400 capitalize">{tx.status}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Deposit Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent className="bg-[#111217] border-[#1F2228] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Add Money</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500">₹</span>
                <Input
                  type="number"
                  placeholder="500"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="pl-8 bg-background border-white/10 text-white focus-visible:ring-purple-500"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">Minimum ₹100</p>
            </div>
            <div className="flex gap-3 pt-2">
              {[500, 1000, 2000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDepositAmount(String(preset))}
                  className="flex-1 py-1.5 rounded-lg border border-white/10 text-sm text-zinc-400 hover:border-purple-500/40 hover:text-white transition-colors"
                >
                  ₹{preset}
                </button>
              ))}
            </div>
            <Button
              onClick={handleDeposit}
              disabled={createOrder.isPending}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl"
            >
              {createOrder.isPending ? "Loading..." : "Pay with Razorpay"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="bg-[#111217] border-[#1F2228] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Withdraw Money</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500">₹</span>
                <Input
                  type="number"
                  placeholder="500"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="pl-8 bg-background border-white/10 text-white focus-visible:ring-purple-500"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Available: ₹{wallet?.balance?.toLocaleString() || "0"} &bull; Minimum ₹100
              </p>
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">UPI ID</label>
              <Input
                placeholder="yourname@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="bg-background border-white/10 text-white focus-visible:ring-purple-500"
              />
            </div>
            <p className="text-xs text-zinc-500">
              Withdrawals are processed within 24 hours to your UPI account.
            </p>
            <Button
              onClick={handleWithdraw}
              disabled={withdraw.isPending}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl"
            >
              {withdraw.isPending ? "Processing..." : "Request Withdrawal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
