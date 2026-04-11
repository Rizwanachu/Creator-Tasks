import { useNotifications, useMarkAllRead, useMarkRead } from "@/hooks/use-notifications";
import { Link } from "wouter";
import { Bell, Check, CheckCheck, ArrowLeft, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const TYPE_ICONS: Record<string, string> = {
  task_accepted: "✅",
  work_submitted: "📥",
  task_approved: "🎉",
  revision_requested: "🔄",
  task_rejected: "❌",
  task_cancelled: "🚫",
  wallet_credited: "💰",
  dispute_opened: "⚠️",
  dispute_resolved: "🔧",
  referral_commission: "🎁",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const markRead = useMarkRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={15} />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Bell size={22} />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[22px] text-center">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">Stay up to date with your tasks and earnings</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="gap-1.5 text-xs rounded-xl"
          >
            <CheckCheck size={13} />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 flex gap-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border rounded-2xl flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Inbox size={28} className="text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">All caught up!</h3>
            <p className="text-sm text-muted-foreground">No notifications yet. Accept or post a task to get started.</p>
          </div>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/tasks">Browse Tasks</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => { if (!n.isRead) markRead.mutate(n.id); }}
              className={`group relative flex items-start gap-3 rounded-xl p-4 border transition-all duration-200 cursor-pointer ${
                n.isRead
                  ? "bg-card border-border"
                  : "bg-purple-500/5 border-purple-500/20 hover:border-purple-500/40"
              }`}
            >
              {!n.isRead && (
                <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              )}

              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-base">
                {TYPE_ICONS[n.type] ?? "🔔"}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-relaxed ${n.isRead ? "text-muted-foreground" : "text-foreground"}`}>
                  {n.message}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                  {n.taskId && (
                    <Link href={`/tasks/${n.taskId}`} onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors">
                        View task →
                      </span>
                    </Link>
                  )}
                </div>
              </div>

              {n.isRead && (
                <Check size={13} className="text-muted-foreground/40 shrink-0 mt-1" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
