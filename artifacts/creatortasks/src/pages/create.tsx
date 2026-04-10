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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  { value: "reels", label: "Reels — Short-form video editing" },
  { value: "hooks", label: "Hooks — Attention-grabbing openers" },
  { value: "thumbnails", label: "Thumbnails — Click-worthy visuals" },
  { value: "other", label: "Other" },
] as const;

const taskSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().min(20, "Description must be at least 20 characters").max(1000, "Description must be less than 1000 characters"),
  budget: z.coerce.number().min(100, "Minimum budget is ₹100").max(100000, "Maximum budget is ₹100,000"),
  category: z.enum(["reels", "hooks", "thumbnails", "other"]),
});

type TaskFormValues = z.infer<typeof taskSchema>;

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

  function onSubmit(data: TaskFormValues) {
    createTask.mutate(data, {
      onSuccess: () => {
        toast.success("Task created successfully!");
        setLocation("/dashboard");
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to create task");
      },
    });
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">Post a Task</h1>
          <p className="text-zinc-500 text-sm">Create a new opportunity for creators. A 10% commission applies on approval.</p>
        </div>

        <div className="card-lit bg-[#111217] border border-[#1F2228] rounded-2xl p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300 text-sm font-medium">Task Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Edit 30s TikTok Reel from podcast clip"
                        className="bg-background border-white/10 text-white focus-visible:ring-purple-500 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300 text-sm font-medium">Category</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="bg-background border-white/10 text-white focus:ring-purple-500 rounded-xl">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111217] border-[#1F2228] text-white">
                          {CATEGORIES.map((cat) => (
                            <SelectItem
                              key={cat.value}
                              value={cat.value}
                              className="focus:bg-white/10 focus:text-white"
                            >
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300 text-sm font-medium">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the task details, requirements, and deliverables..."
                        className="min-h-[150px] bg-background border-white/10 text-white focus-visible:ring-purple-500 resize-none rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300 text-sm font-medium">Budget (₹)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">₹</span>
                        <Input
                          type="number"
                          placeholder="1000"
                          className="pl-8 bg-background border-white/10 text-white focus-visible:ring-purple-500 rounded-xl"
                          {...field}
                          value={field.value || ""}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-zinc-600 text-xs">
                      Minimum ₹100. Platform takes 10% commission on approval.
                    </FormDescription>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              <div className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-white/[0.06]">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation("/tasks")}
                  className="hover:bg-white/5 text-zinc-400 hover:text-white rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTask.isPending}
                  className="btn-gradient text-white rounded-xl px-8 border-0 font-semibold"
                >
                  {createTask.isPending ? "Posting..." : "Post Task"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
