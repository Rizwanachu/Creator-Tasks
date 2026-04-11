import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateTask } from "@/hooks/use-tasks";
import { useWallet, useCreateDepositOrder, useVerifyDeposit } from "@/hooks/use-wallet";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WalletModal } from "@/components/wallet-modal";
import { Zap, Clock, Users, Lock, Sparkles, Wallet, AlertTriangle } from "lucide-react";

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

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const CATEGORIES = [
  {
    value: "reels",
    label: "Reels",
    icon: "🎬",
    sub: "Short-form video",
    activeColor: "border-pink-500 bg-pink-500/15 text-pink-300",
  },
  {
    value: "hooks",
    label: "Hooks",
    icon: "✍️",
    sub: "Viral openers",
    activeColor: "border-orange-500 bg-orange-500/15 text-orange-300",
  },
  {
    value: "thumbnails",
    label: "Thumbnails",
    icon: "🖼",
    sub: "Click-worthy visuals",
    activeColor: "border-cyan-500 bg-cyan-500/15 text-cyan-300",
  },
  {
    value: "other",
    label: "Other",
    icon: "✨",
    sub: "Anything else",
    activeColor: "border-zinc-400 bg-zinc-500/15 text-zinc-300",
  },
] as const;

const BUDGET_PRESETS = [500, 1000, 2000, 5000];

const CATEGORY_BADGE: Record<string, string> = {
  reels: "bg-pink-500/10 text-pink-400 border border-pink-500/20",
  hooks: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  thumbnails: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
  other: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
};

const EXAMPLE_TASK = {
  title: "Edit 30s TikTok Reel from my podcast episode",
  description:
    "I have a 30-minute podcast episode and need a highlight reel for TikTok.\n\n• Hook in the first 3 seconds (use the best quote)\n• Dynamic captions synced to speech\n• Add trending background music (low volume)\n• B-roll cutaways if possible\n• Export as 1080×1920 MP4",
  budget: 2500,
  category: "reels" as const,
};

const taskSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be less than 100 characters"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(1000, "Description must be less than 1000 characters"),
  budget: z.coerce
    .number()
    .min(100, "Minimum budget is ₹100")
    .max(100000, "Maximum budget is ₹100,000"),
  category: z.enum(["reels", "hooks", "thumbnails", "other"]),
  deadline: z.string().optional(),
  attachmentUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type TaskFormValues = z.infer<typeof taskSchema>;

/** Animates on key change — detects empty→filled transitions */
function AnimatedPreviewSection({
  animKey,
  children,
}: {
  animKey: string;
  children: React.ReactNode;
}) {
  return (
    <div key={animKey} style={{ animation: "previewIn 0.25s ease forwards" }}>
      {children}
    </div>
  );
}

function TaskPreview({
  title,
  description,
  budget,
  category,
}: Partial<TaskFormValues>) {
  const cat = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];
  const hasTitle = !!(title && title.length >= 3);
  const hasDesc = !!(description && description.length >= 10);
  const hasBudget = !!(budget && budget >= 100);
  const creatorEarns = hasBudget ? Math.floor(budget! * 0.9) : null;

  const isEmpty = !hasTitle && !hasDesc && !hasBudget;

  // Keys for animation — change when each field transitions empty→filled
  const titleKey = hasTitle ? "t1" : "t0";
  const descKey = hasDesc ? "d1" : "d0";
  const budgetKey = hasBudget ? "b1" : "b0";

  if (isEmpty) {
    return (
      <div className="space-y-4">
        {/* Ghost empty state */}
        <div className="card-lit bg-card border border-border rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/[0.02] to-transparent animate-shimmer pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-16 bg-muted rounded-full" />
            <div className="h-4 w-12 bg-muted rounded-full" />
          </div>
          <div className="h-4 w-3/4 bg-muted rounded-lg mb-2" />
          <div className="h-4 w-1/2 bg-muted rounded-lg mb-5" />
          <div className="h-3 w-full bg-muted/50 rounded mb-2" />
          <div className="h-3 w-4/5 bg-muted/50 rounded mb-5" />
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-5 w-20 bg-muted rounded-full" />
          </div>
        </div>
        <p className="text-center text-xs text-zinc-700 py-2">
          Start typing to preview your task
        </p>
        {/* Trust signals always visible */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-700">
            <Zap size={12} className="text-amber-600" />
            Tasks typically get accepted within minutes
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-700">
            <Users size={12} className="text-purple-600" />
            300+ active creators ready to work
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-700">
            <Clock size={12} className="text-green-700" />
            You only pay when you approve
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview card */}
      <div className="card-lit bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_BADGE[category ?? "reels"]}`}>
            {cat.icon} {cat.label}
          </span>
          <AnimatedPreviewSection animKey={budgetKey}>
            <span className={`font-bold text-sm tabular-nums ${hasBudget ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"}`}>
              {hasBudget ? `₹${budget!.toLocaleString()}` : "₹—"}
            </span>
          </AnimatedPreviewSection>
        </div>

        <AnimatedPreviewSection animKey={titleKey}>
          <h3 className={`font-semibold text-[15px] leading-snug mb-2 ${hasTitle ? "text-foreground" : "text-muted-foreground"}`}>
            {hasTitle ? title : "Your task title will appear here"}
          </h3>
        </AnimatedPreviewSection>

        <AnimatedPreviewSection animKey={descKey}>
          <p className={`text-sm leading-relaxed line-clamp-3 mb-5 ${hasDesc ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
            {hasDesc ? description : "Your description will appear here as creators see it..."}
          </p>
        </AnimatedPreviewSection>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span>⚡ Accepted in ~3 mins</span>
          </div>
          <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full font-medium">
            Accept Task
          </span>
        </div>
      </div>

      {/* Payout breakdown */}
      {hasBudget && (
        <AnimatedPreviewSection animKey={`breakdown-${budgetKey}`}>
          <div className="bg-muted border border-border rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>You pay</span>
              <span className="font-semibold text-foreground tabular-nums">₹{budget!.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Creator receives</span>
              <span className="text-green-400 font-medium tabular-nums">₹{creatorEarns?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-zinc-600 text-xs">
              <span>Platform fee (10%)</span>
              <span className="tabular-nums">₹{(budget! - (creatorEarns ?? 0)).toLocaleString()}</span>
            </div>
          </div>
        </AnimatedPreviewSection>
      )}

      {/* Trust signals */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <Zap size={12} className="text-amber-500" />
          Tasks typically get accepted within minutes
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <Users size={12} className="text-purple-400" />
          300+ active creators ready to work
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <Clock size={12} className="text-green-500" />
          You only pay when you approve
        </div>
      </div>
    </div>
  );
}

export function CreateTask() {
  const [, setLocation] = useLocation();
  const createTask = useCreateTask();
  const { data: wallet } = useWallet();
  const createOrder = useCreateDepositOrder();
  const verifyDeposit = useVerifyDeposit();

  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [pendingSubmitData, setPendingSubmitData] = useState<TaskFormValues | null>(null);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      budget: undefined,
      category: "reels",
      deadline: "",
      attachmentUrl: "",
    },
  });

  const watched = form.watch();

  function fillExample() {
    form.setValue("title", EXAMPLE_TASK.title, { shouldValidate: true });
    form.setValue("description", EXAMPLE_TASK.description, { shouldValidate: true });
    form.setValue("budget", EXAMPLE_TASK.budget, { shouldValidate: true });
    form.setValue("category", EXAMPLE_TASK.category, { shouldValidate: true });
    toast.success("Example task loaded — edit it to make it yours!");
  }

  function submitTask(data: TaskFormValues) {
    createTask.mutate({
      title: data.title,
      description: data.description,
      budget: data.budget,
      category: data.category,
      deadline: data.deadline || undefined,
      attachmentUrl: data.attachmentUrl || undefined,
    }, {
      onSuccess: () => {
        toast.success("Task posted! Budget locked in escrow.");
        setLocation("/dashboard");
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Failed to create task";
        toast.error(msg);
      },
    });
  }

  function onSubmit(data: TaskFormValues) {
    const available = wallet?.balance ?? 0;
    if (available < data.budget) {
      setPendingSubmitData(data);
      setShowTopUpModal(true);
      return;
    }
    submitTask(data);
  }

  const handleDeposit = async () => {
    const amount = Number(depositAmount);
    if (isNaN(amount) || amount < 100) {
      toast.error("Minimum deposit is ₹100");
      return;
    }
    const loaded = await loadRazorpayScript();
    if (!loaded) { toast.error("Failed to load payment system."); return; }
    createOrder.mutate(amount, {
      onSuccess: (order) => {
        setShowTopUpModal(false);
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount * 100,
          currency: order.currency,
          name: "CreatorTasks",
          description: "Wallet Top-up",
          order_id: order.orderId,
          handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            verifyDeposit.mutate(
              { razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, amount },
              {
                onSuccess: () => {
                  toast.success(`₹${amount} added! You can now post your task.`);
                  setDepositAmount("");
                  if (pendingSubmitData) {
                    setPendingSubmitData(null);
                    submitTask(pendingSubmitData);
                  }
                },
                onError: (err) => toast.error(err instanceof Error ? err.message : "Verification failed"),
              }
            );
          },
          theme: { color: "#7C5CFF" },
          modal: { escape: true },
        });
        rzp.open();
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to initiate payment"),
    });
  };

  // Derived feedback hints
  const titleLen = watched.title?.length ?? 0;
  const showTitleHint = titleLen > 0 && titleLen < 12;
  const budgetVal = Number(watched.budget);
  const showBudgetHint = budgetVal > 0 && budgetVal < 500;

  return (
    <>
      {/* CSS for preview-in animation + shimmer */}
      <style>{`
        @keyframes previewIn {
          from { opacity: 0; transform: scale(0.97) translateY(4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%);  }
        }
        .animate-shimmer {
          animation: shimmer 2.5s ease-in-out infinite;
        }
      `}</style>

      <div className="container mx-auto px-4 py-8 md:py-14 max-w-6xl">
        {/* Page header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/8 text-purple-400 text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              New Task
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight leading-tight mb-2">
              Create a paid AI task
            </h1>
            <p className="text-zinc-500 text-sm max-w-md">
              Get creators to work on your idea in minutes. You only pay when you approve.
            </p>
          </div>

          {/* Autofill button */}
          <button
            type="button"
            onClick={fillExample}
            className="self-start sm:mt-10 flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted transition-all duration-200 text-sm font-medium shrink-0"
          >
            <Sparkles size={14} className="text-purple-400" />
            Fill with example
          </button>
        </div>

        {/* 2-col layout: form + live preview */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

          {/* ── LEFT: Form ── */}
          <div className="card-lit bg-card border border-border rounded-2xl p-6 md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">

                {/* Task Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground text-sm font-semibold">Task Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Edit 30s TikTok Reel from podcast clip"
                          className="focus-visible:ring-ring rounded-xl h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                      {/* Intelligent feedback hint */}
                      {showTitleHint && !form.formState.errors.title && (
                        <p className="text-xs text-amber-500/80 flex items-center gap-1.5 mt-1">
                          <Zap size={11} />
                          Tasks with clear, specific titles get accepted faster
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {/* Category — visual pills */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground text-sm font-semibold">Category</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                          {CATEGORIES.map((cat) => {
                            const isActive = field.value === cat.value;
                            return (
                              <button
                                key={cat.value}
                                type="button"
                                onClick={() => field.onChange(cat.value)}
                                className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border text-center transition-all duration-200 active:scale-95 ${
                                  isActive
                                    ? cat.activeColor
                                    : "border-border bg-muted/30 hover:bg-muted hover:border-border text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <span className="text-lg leading-none">{cat.icon}</span>
                                <span className="text-xs font-semibold leading-none">{cat.label}</span>
                                <span className="text-[10px] leading-none opacity-60">{cat.sub}</span>
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                {/* Description — guided */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground text-sm font-semibold">What should the creator deliver?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`Describe exactly what you need. Be specific — good briefs get better work.\n\nExample:\n• 30s reel with dynamic captions\n• Hook in the first 3 seconds\n• Include trending background music\n• Export as 1080×1920 MP4`}
                          className="min-h-[160px] focus-visible:ring-ring resize-none rounded-xl text-sm leading-relaxed"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                {/* Budget — input + presets */}
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground text-sm font-semibold">Budget (₹)</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">₹</span>
                            <Input
                              type="number"
                              placeholder="1000"
                              className="pl-8 focus-visible:ring-ring rounded-xl h-11 text-base font-semibold"
                              {...field}
                              value={field.value || ""}
                            />
                          </div>
                          {/* Quick presets */}
                          <div className="flex gap-2">
                            {BUDGET_PRESETS.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => field.onChange(preset)}
                                className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 active:scale-95 ${
                                  Number(field.value) === preset
                                    ? "btn-gradient text-white border-transparent"
                                    : "border-border text-muted-foreground hover:border-purple-500/30 hover:text-foreground bg-transparent"
                                }`}
                              >
                                ₹{preset >= 1000 ? `${preset / 1000}k` : preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                      {/* Intelligent budget hint */}
                      {showBudgetHint && !form.formState.errors.budget && (
                        <p className="text-xs text-amber-500/80 flex items-center gap-1.5 mt-1">
                          <Zap size={11} />
                          Higher budgets attract more experienced creators
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {/* Deadline (optional) */}
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground text-sm font-semibold">Deadline (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                          className="focus-visible:ring-ring rounded-xl h-11 text-foreground"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                {/* Attachment URL (optional) */}
                <FormField
                  control={form.control}
                  name="attachmentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground text-sm font-semibold">Reference / Attachment URL (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://drive.google.com/... or Figma link"
                          className="focus-visible:ring-ring rounded-xl h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                {/* Escrow notice + balance indicator */}
                {(() => {
                  const budgetNum = Number(watched.budget);
                  const available = wallet?.balance ?? 0;
                  const locked = wallet?.pendingBalance ?? 0;
                  const hasInsufficientFunds = budgetNum >= 100 && available < budgetNum;
                  return (
                    <div className={`rounded-xl border p-3 text-xs space-y-1.5 ${hasInsufficientFunds ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/30"}`}>
                      <div className="flex items-center justify-between text-zinc-500">
                        <span className="flex items-center gap-1.5">
                          <Lock size={10} className="text-purple-400" />
                          Budget locked in escrow on post
                        </span>
                        <span className="text-zinc-400 font-medium">
                          Wallet: ₹{available.toLocaleString()}
                          {locked > 0 && <span className="text-zinc-600"> · ₹{locked.toLocaleString()} locked</span>}
                        </span>
                      </div>
                      {hasInsufficientFunds && (
                        <div className="flex items-center gap-1.5 text-amber-400">
                          <AlertTriangle size={10} />
                          You need ₹{(budgetNum - available).toLocaleString()} more — we'll prompt you to top up.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Footer */}
                <div className="pt-4 border-t border-border space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setLocation("/tasks")}
                      className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      disabled={createTask.isPending}
                      className="btn-gradient text-white rounded-xl px-8 border-0 font-semibold text-base h-11 min-w-[200px] active:scale-95"
                    >
                      {createTask.isPending ? "Posting..." : "Post Task & Lock Funds"}
                    </Button>
                  </div>
                  {/* Trust line */}
                  <div className="flex items-center justify-end gap-1.5 text-xs text-zinc-700">
                    <Lock size={11} />
                    Secure payouts powered by Razorpay
                  </div>
                </div>

              </form>
            </Form>
          </div>

          {/* ── RIGHT: Live preview (sticky on desktop) ── */}
          <div className="lg:sticky lg:top-24">
            <div className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-3">
              Live Preview
            </div>
            <TaskPreview
              title={watched.title}
              description={watched.description}
              budget={watched.budget}
              category={watched.category}
            />
          </div>
        </div>
      </div>

      {/* Top-up modal — shown when balance is insufficient to post */}
      <WalletModal open={showTopUpModal} onClose={() => { setShowTopUpModal(false); setPendingSubmitData(null); }} title="Top Up Wallet to Post">
        <div className="space-y-4">
          {pendingSubmitData && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-sm text-amber-400">
              You need <strong>₹{pendingSubmitData.budget.toLocaleString()}</strong> in your wallet.
              You currently have ₹{(wallet?.balance ?? 0).toLocaleString()}.
            </div>
          )}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block font-medium">Amount to Add (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">₹</span>
              <input
                type="number"
                placeholder="1000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-input border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {[500, 1000, 2000, 5000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDepositAmount(String(preset))}
                className="flex-1 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:border-purple-500/40 hover:text-foreground transition-all duration-200 font-medium"
              >
                ₹{preset >= 1000 ? `${preset / 1000}k` : preset}
              </button>
            ))}
          </div>
          <Button
            type="button"
            onClick={handleDeposit}
            disabled={createOrder.isPending}
            className="w-full btn-gradient text-white rounded-xl border-0 font-semibold flex items-center justify-center gap-2"
          >
            <Wallet size={15} />
            {createOrder.isPending ? "Loading..." : "Add Money with Razorpay"}
          </Button>
          <p className="text-xs text-zinc-700 text-center">
            Funds will be locked as escrow when the task is posted
          </p>
        </div>
      </WalletModal>
    </>
  );
}
