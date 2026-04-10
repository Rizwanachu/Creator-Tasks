import { useTasks } from "@/hooks/use-tasks";
import { TaskCard } from "@/components/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function Tasks() {
  const { data: tasks, isLoading, error } = useTasks();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">Task Board</h1>
          <p className="text-zinc-400">Find opportunities and earn by completing tasks.</p>
        </div>
        <Button asChild className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl">
          <Link href="/create">Post a Task</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-[#111217] border border-[#1F2228] rounded-2xl p-5 h-[200px] flex flex-col">
              <div className="flex justify-between mb-4">
                <Skeleton className="h-6 w-3/4 bg-white/5" />
                <Skeleton className="h-6 w-16 bg-white/5" />
              </div>
              <Skeleton className="h-4 w-full mb-2 bg-white/5" />
              <Skeleton className="h-4 w-2/3 bg-white/5" />
              <div className="mt-auto flex justify-between">
                <Skeleton className="h-5 w-20 bg-white/5" />
                <Skeleton className="h-9 w-24 bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-20 bg-[#111217] border border-red-500/20 rounded-2xl">
          <p className="text-red-500 mb-4">Failed to load tasks.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Try again</Button>
        </div>
      ) : tasks?.length === 0 ? (
        <div className="text-center py-32 bg-[#111217] border border-[#1F2228] rounded-2xl flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <span className="text-2xl text-zinc-500">📋</span>
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No tasks available</h3>
          <p className="text-zinc-400 mb-6 max-w-sm">
            There are currently no tasks posted. Check back later or be the first to post one.
          </p>
          <Button asChild className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl">
            <Link href="/create">Post a Task</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks?.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
