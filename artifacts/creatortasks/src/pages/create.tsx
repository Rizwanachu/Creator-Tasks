import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateTask } from "@/hooks/use-tasks";
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
import { Zap, Clock, Users } from "lucide-react";

const CATEGORIES = [
  {
    value: "reels",
    label: "Reels",
    icon: "🎬",
    sub: "Short-form video",
    color: "border-pink-500/40 text-pink-400 bg-pink-500/8",
    activeColor: "border-pink-500 bg-pink-500/15 text-pink-300",
  },
  {
    value: "hooks",
    label: "Hooks",
    icon: "✍️",
    sub: "Viral openers",
    color: "border-orange-500/40 text-orange-400 bg-orange-500/8",
    activeColor: "border-orange-500 bg-orange-500/15 text-orange-300",
  },
  {
    value: "thumbnails",
    label: "Thumbnails",
    icon: "🖼",
    sub: "Click-worthy visuals",
    color: "border-cyan-500/40 text-cyan-400 bg-cyan-500/8",
    activeColor: "border-cyan-500 bg-cyan-500/15 text-cyan-300",
  },
  {
    value: "other",
    label: "Other",
    icon: "✨",
    sub: "Anything else",
    color: "border-zinc-500/40 text-zinc-400 bg-zinc-500/8",
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
});

type TaskFormValues = z.infer<typeof taskSchema>;

/** Live preview of what the posted task will look like */
function TaskPreview({
  title,
  description,
  budget,
  category,
}: Partial<TaskFormValues>) {
  const cat = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];
  const hasTitle = title && title.length >= 3;
  const hasDesc = description && description.length >= 10;
  const hasBudget = budget && budget >= 100;
  const creatorEarns = hasBudget ? Math.floor(budget * 0.9) : null;

  return (
    <div className="space-y-4">
      {/* Preview card */}
      <div className="card-lit bg-[#111217] border border-[#1F2228] rounded-2xl p-5 transition-all duration-300">
        {/* Top row */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_BADGE[category ?? "reels"]}`}>
            {cat.icon} {cat.label}
          </span>
          <span className={`font-bold text-sm tabular-nums transition-colors ${hasBudget ? "text-purple-400" : "text-zinc-600"}`}>
            {hasBudget ? `₹${budget.toLocaleString()}` : "₹—"}
          </span>
        </div>

        {/* Title */}
        <h3 className={`font-semibold text-[15px] leading-snug mb-2 transition-colors ${hasTitle ? "text-white" : "text-zinc-700"}`}>
          {hasTitle ? title : "Your task title will appear here"}
        </h3>

        {/* Description */}
        <p className={`text-sm leading-relaxed line-clamp-3 mb-5 transition-colors ${hasDesc ? "text-zinc-500" : "text-zinc-700"}`}>
          {hasDesc ? description : "Your description will appear here as creators see it..."}
        </p>

        {/* Bottom */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 text-xs text-zinc-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Open · just now
          </div>
          <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full font-medium">
            Accept Task
          </span>
        </div>
      </div>

      {/* Payout breakdown */}
      {hasBudget && (
        <div className="bg-[#0e0e13] border border-[#1F2228] rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>You pay</span>
            <span className="font-semibold text-white tabular-nums">₹{budget.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-zinc-500">
            <span>Creator receives</span>
            <span className="text-green-400 font-medium tabular-nums">₹{creatorEarns?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-zinc-600 text-xs">
            <span>Platform fee (10%)</span>
            <span className="tabular-nums">₹{(budget - (creatorEarns ?? 0)).toLocaleString()}</span>
          </div>
        </div>
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

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      budget: undefined,
      category: "reels",
    },
  });

  const watched = form.watch();

  function onSubmit(data: TaskFormValues) {
    createTask.mutate(data, {
      onSuccess: () => {
        toast.success("Task posted! Creators will see it now.");
        setLocation("/dashboard");
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to create task");
      },
    });
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-14 max-w-6xl">
      {/* Page header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/8 text-purple-400 text-xs font-medium mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          New Task
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-3">
          Create a paid AI task
        </h1>
        <p className="text-zinc-500 text-base max-w-lg">
          Get creators to work on your idea in minutes. You only pay when you approve.
        </p>
      </div>

      {/* 2-col layout: form + live preview */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

        {/* ── LEFT: Form ── */}
        <div className="card-lit bg-[#111217] border border-[#1F2228] rounded-2xl p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">

              {/* Task Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-200 text-sm font-semibold">Task Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Edit 30s TikTok Reel from podcast clip"
                        className="bg-[#0B0B0F] border-white/10 text-white focus-visible:ring-purple-500 rounded-xl h-11 placeholder:text-zinc-600"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              {/* Category — visual pills */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-200 text-sm font-semibold">Category</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                        {CATEGORIES.map((cat) => {
                          const isActive = field.value === cat.value;
                          return (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => field.onChange(cat.value)}
                              className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border text-center transition-all duration-200 ${
                                isActive ? cat.activeColor : `border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 text-zinc-500 hover:text-zinc-300`
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
                    <FormLabel className="text-zinc-200 text-sm font-semibold">What should the creator deliver?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`Describe exactly what you need. Be specific — good briefs get better work.\n\nExample:\n• 30s reel with dynamic captions\n• Hook in the first 3 seconds\n• Include trending background music\n• Export as 1080×1920 MP4`}
                        className="min-h-[160px] bg-[#0B0B0F] border-white/10 text-white focus-visible:ring-purple-500 resize-none rounded-xl placeholder:text-zinc-700 text-sm leading-relaxed"
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
                    <FormLabel className="text-zinc-200 text-sm font-semibold">Budget (₹)</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">₹</span>
                          <Input
                            type="number"
                            placeholder="1000"
                            className="pl-8 bg-[#0B0B0F] border-white/10 text-white focus-visible:ring-purple-500 rounded-xl h-11 placeholder:text-zinc-600 text-base font-semibold"
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
                              className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 ${
                                Number(field.value) === preset
                                  ? "btn-gradient text-white border-transparent"
                                  : "border-white/10 text-zinc-500 hover:border-purple-500/30 hover:text-zinc-300 bg-transparent"
                              }`}
                            >
                              ₹{preset >= 1000 ? `${preset / 1000}k` : preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              {/* Footer */}
              <div className="pt-6 border-t border-white/[0.06] flex items-center justify-between gap-4">
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
                  className="btn-gradient text-white rounded-xl px-8 border-0 font-semibold text-base h-11 min-w-[200px]"
                >
                  {createTask.isPending ? "Posting..." : "Post Task & Get Creators"}
                </Button>
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
  );
}
