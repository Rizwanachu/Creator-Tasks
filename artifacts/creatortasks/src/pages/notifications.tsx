import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { useNotifications, useMarkAllRead, useMarkRead } from "@/hooks/use-notifications";
import { Link } from "wouter";
import { Bell, BellRing, BellOff, Check, CheckCheck, ArrowLeft, Inbox, CheckCircle2, Upload, RotateCcw, XCircle, Ban, Wallet, AlertTriangle, ShieldCheck, Gift, FilePlus, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  enableWebPush,
  disableWebPush,
  isCurrentlySubscribed,
  isPushSupported,
  getPushPermission,
  isIOS,
  isStandalone,
  getIOSVersion,
} from "@/lib/web-push";

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  task_accepted: CheckCircle2,
  work_submitted: Upload,
  task_approved: CheckCircle2,
  revision_requested: RotateCcw,
  task_rejected: XCircle,
  task_cancelled: Ban,
  wallet_credited: Wallet,
  dispute_opened: AlertTriangle,
  dispute_resolved: ShieldCheck,
  referral_commission: Gift,
  withdrawal_requested: Wallet,
  withdrawal_paid: Wallet,
  withdrawal_rejected: XCircle,
  admin_new_task: FilePlus,
  admin_new_user: UserPlus,
  admin_withdrawal_request: Wallet,
};

function PushEnableCard() {
  const { getToken } = useAuth();
  const supported = isPushSupported();
  const [permission, setPermission] = useState(supported ? getPushPermission() : "unsupported" as const);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sub = await isCurrentlySubscribed();
      if (!cancelled) setSubscribed(sub);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!supported) {
    const ios = isIOS();
    const standalone = isStandalone();
    const iosVer = getIOSVersion();

    let title = "Push notifications aren't supported";
    let body = "This browser doesn't support web push notifications.";

    if (ios && !standalone) {
      title = "Add CreatorTasks to your Home Screen";
      body = "Tap the Share button in Safari, choose 'Add to Home Screen', then open CreatorTasks from the new icon and come back here.";
    } else if (ios && standalone && iosVer !== null && iosVer < 16.4) {
      title = "Update iOS to enable notifications";
      body = `iOS ${iosVer} doesn't support web push. Update to iOS 16.4 or later in Settings → General → Software Update.`;
    } else if (ios && standalone) {
      title = "Push isn't available right now";
      body = "Your iPhone is running the app from the Home Screen, but push isn't available. Make sure iOS is fully updated, then reopen the app.";
    }

    return (
      <div className="border border-border rounded-2xl p-4 mb-6 flex items-start gap-3 bg-muted/30">
        <BellOff size={18} className="text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-sm">
          <div className="font-medium text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{body}</div>
        </div>
      </div>
    );
  }

  const handleEnable = async () => {
    setBusy(true);
    const r = await enableWebPush(getToken);
    setBusy(false);
    if (r.ok) {
      setSubscribed(true);
      setPermission(getPushPermission());
      toast.success("Push notifications enabled");
    } else {
      toast.error(r.error || "Couldn't enable notifications");
      setPermission(getPushPermission());
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    await disableWebPush(getToken);
    setSubscribed(false);
    setBusy(false);
    toast.success("Push notifications disabled");
  };

  if (subscribed) {
    return (
      <div className="border border-green-500/20 bg-green-500/5 rounded-2xl p-4 mb-6 flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <BellRing size={18} className="text-green-400 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-foreground">Push notifications are on</div>
            <div className="text-xs text-muted-foreground">You'll get alerts on this device even when the app is closed.</div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleDisable} disabled={busy} className="rounded-lg text-xs">
          Turn off
        </Button>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="border border-amber-500/20 bg-amber-500/5 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <BellOff size={18} className="text-amber-400 mt-0.5" />
        <div className="text-sm">
          <div className="font-medium text-foreground">Notifications are blocked</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Enable notifications for this site in your browser settings, then reload this page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card rounded-2xl p-4 mb-6 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-start gap-3">
        <Bell size={18} className="text-primary mt-0.5" />
        <div>
          <div className="text-sm font-medium text-foreground">Get push notifications</div>
          <div className="text-xs text-muted-foreground">Real alerts on your phone or desktop — even when the app is closed.</div>
        </div>
      </div>
      <Button size="sm" onClick={handleEnable} disabled={busy} className="rounded-lg text-xs">
        {busy ? <Loader2 size={13} className="animate-spin mr-1" /> : <BellRing size={13} className="mr-1" />}
        Enable notifications
      </Button>
    </div>
  );
}

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

      <PushEnableCard />

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

              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                {(() => { const Icon = TYPE_ICONS[n.type] ?? Bell; return <Icon size={16} className="text-muted-foreground" />; })()}
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
