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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card className="bg-[#111217] border-[#1F2228] text-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">Post a Task</CardTitle>
          <CardDescription className="text-zinc-400">
            Create a new opportunity for creators. A 10% commission applies on approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Task Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Edit 30s TikTok Reel from podcast clip"
                        className="bg-background border-white/10 text-white focus-visible:ring-purple-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Category</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="bg-background border-white/10 text-white focus:ring-purple-500">
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
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the task details, requirements, and deliverables..."
                        className="min-h-[150px] bg-background border-white/10 text-white focus-visible:ring-purple-500 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Budget (₹)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-zinc-500">₹</span>
                        <Input
                          type="number"
                          placeholder="1000"
                          className="pl-8 bg-background border-white/10 text-white focus-visible:ring-purple-500"
                          {...field}
                          value={field.value || ""}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-zinc-500">
                      Minimum ₹100. Platform takes 10% commission.
                    </FormDescription>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <div className="pt-4 flex justify-end gap-4 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation("/tasks")}
                  className="hover:bg-white/5 text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTask.isPending}
                  className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-8"
                >
                  {createTask.isPending ? "Posting..." : "Post Task"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
