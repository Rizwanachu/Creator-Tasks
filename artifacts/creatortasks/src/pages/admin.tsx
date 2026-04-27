import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { apiFetch } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, AlertTriangle, Users, TrendingUp, CheckCircle, Loader2, Wallet, Ban, ShieldOff, ShieldX, History, Trash2, FileText, RotateCcw, Receipt, ArrowUpRight, ArrowDownLeft } from "lucide-react";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-5">
      <div className={`flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 ${color}`}>
        <Icon size={14} className="shrink-0" />
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide truncate">{label}</span>
      </div>
      <p className="text-lg sm:text-2xl font-bold text-foreground tabular-nums truncate">{value}</p>
    </div>
  );
}

export function AdminPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiFetch("/api/admin/stats", {}, getToken),
  });

  const { data: disputes, isLoading: disputesLoading } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: () => apiFetch("/api/admin/disputes", {}, getToken),
  });

  const { data: withdrawalsList, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: () => apiFetch("/api/admin/withdrawals", {}, getToken),
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => apiFetch("/api/admin/audit-logs", {}, getToken),
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: () => apiFetch("/api/admin/transactions", {}, getToken),
  });

  const [taskFilter, setTaskFilter] = useState<"new" | "active" | "completed" | "rejected" | "all">("new");
  const { data: adminTasks, isLoading: adminTasksLoading } = useQuery({
    queryKey: ["admin-tasks", taskFilter],
    queryFn: () => apiFetch(`/api/admin/tasks?filter=${taskFilter}`, {}, getToken),
  });

  const [rejectTaskId, setRejectTaskId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const rejectTask = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiFetch(`/api/admin/tasks/${id}/reject`, { method: "POST", data: { reason } }, getToken),
    onSuccess: () => {
      toast.success("Task removed from marketplace");
      setRejectTaskId(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to reject task"),
  });

  const unrejectTask = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/tasks/${id}/unreject`, { method: "POST" }, getToken),
    onSuccess: () => {
      toast.success("Task restored to marketplace");
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to restore task"),
  });

  const [moderateId, setModerateId] = useState<string | null>(null);
  const [moderateMode, setModerateMode] = useState<"suspend" | "ban" | null>(null);
  const [moderationReason, setModerationReason] = useState("");

  const moderateUser = useMutation({
    mutationFn: ({ id, mode, reason }: { id: string; mode: "suspend" | "ban" | "unsuspend" | "unban"; reason?: string }) =>
      apiFetch(`/api/admin/users/${id}/${mode}`, { method: "POST", data: { reason } }, getToken),
    onSuccess: (_, vars) => {
      const verb = vars.mode === "unsuspend" ? "unsuspended" : vars.mode === "unban" ? "unbanned" : `${vars.mode}ed`;
      toast.success(`User ${verb}`);
      setModerateId(null);
      setModerateMode(null);
      setModerationReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update user"),
  });

  const resolveDispute = useMutation({
    mutationFn: ({ id, adminNote, unflagTask }: { id: string; adminNote: string; unflagTask: boolean }) =>
      apiFetch(`/api/admin/disputes/${id}/resolve`, { method: "POST", data: { adminNote, unflagTask } }, getToken),
    onSuccess: () => {
      toast.success("Dispute resolved");
      setResolveId(null);
      setAdminNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: () => toast.error("Failed to resolve dispute"),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/withdrawals/${id}/mark-paid`, { method: "POST" }, getToken),
    onSuccess: () => {
      toast.success("Marked as paid");
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    },
    onError: () => toast.error("Failed to mark as paid"),
  });

  const rejectWithdrawal = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/withdrawals/${id}/reject`, { method: "POST", data: {} }, getToken),
    onSuccess: () => {
      toast.success("Rejected and refunded to user");
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: () => toast.error("Failed to reject withdrawal"),
  });

  if (statsLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-5xl space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <ShieldCheck size={40} className="mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-bold mb-2">Admin access required</h2>
        <p className="text-muted-foreground text-sm">
          Sign in with the admin email configured in <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">ADMIN_EMAIL</code> to access this panel.
        </p>
      </div>
    );
  }

  const openDisputes = (disputes ?? []).filter((d: any) => d.status === "open");
  const resolvedDisputes = (disputes ?? []).filter((d: any) => d.status === "resolved");

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-10 max-w-5xl">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600 flex items-center justify-center shrink-0">
          <ShieldCheck size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">Admin Panel</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Platform overview and moderation</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard label="Commission Earned" value={`₹${stats.totalCommission?.toLocaleString()}`} icon={TrendingUp} color="text-purple-400" />
        <StatCard label="Completed Tasks" value={stats.completedTasks} icon={CheckCircle} color="text-green-400" />
        <StatCard label="Open Disputes" value={stats.openDisputes} icon={AlertTriangle} color="text-orange-400" />
        <StatCard label="Total Users" value={stats.totalUsers} icon={Users} color="text-blue-400" />
      </div>

      {/* Disputes */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-400" />
            Disputes
          </h2>
          <div className="flex gap-2">
            {openDisputes.length > 0 && (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-xs">
                {openDisputes.length} open
              </Badge>
            )}
            {resolvedDisputes.length > 0 && (
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                {resolvedDisputes.length} resolved
              </Badge>
            )}
          </div>
        </div>

        {disputesLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (disputes ?? []).length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <CheckCircle size={32} className="mx-auto mb-3 text-green-400/40" />
            <p className="text-sm">No disputes filed yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(disputes ?? []).map((d: any) => (
              <div key={d.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className={d.status === "open"
                        ? "text-orange-400 bg-orange-500/10 border-orange-500/20 text-xs"
                        : "text-green-400 bg-green-500/10 border-green-500/20 text-xs"
                      }>
                        {d.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Task: <strong className="text-foreground">{d.taskTitle}</strong></span>
                      <span className="text-xs text-muted-foreground">By: {d.reportedByName}</span>
                    </div>
                    <p className="text-sm text-foreground mb-1">{d.reason}</p>
                    {d.adminNote && (
                      <p className="text-xs text-muted-foreground border-l-2 border-purple-500/40 pl-2 mt-1">Note: {d.adminNote}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Filed {new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>

                  {d.status === "open" && (
                    <div className="shrink-0">
                      {resolveId === d.id ? (
                        <div className="flex flex-col gap-2 min-w-[220px]">
                          <input
                            placeholder="Admin note (optional)"
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            className="px-3 py-1.5 text-sm rounded-lg border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => resolveDispute.mutate({ id: d.id, adminNote, unflagTask: true })}
                              disabled={resolveDispute.isPending}
                              className="flex-1 btn-gradient text-white border-0 rounded-lg text-xs"
                            >
                              {resolveDispute.isPending ? <Loader2 size={13} className="animate-spin" /> : "Resolve"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setResolveId(null); setAdminNote(""); }} className="rounded-lg text-xs">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setResolveId(d.id)} className="rounded-xl text-xs">
                          Resolve
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawal Requests */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Wallet size={16} className="text-amber-400" />
            Withdrawal Requests
          </h2>
          {(() => {
            const pendingCount = (withdrawalsList ?? []).filter((w: any) => w.status === "pending").length;
            return pendingCount > 0 ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                {pendingCount} pending
              </Badge>
            ) : null;
          })()}
        </div>

        {withdrawalsLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (withdrawalsList ?? []).length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Wallet size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm">No withdrawal requests yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(withdrawalsList ?? []).map((w: any) => (
              <div key={w.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className={
                        w.status === "pending"
                          ? "text-amber-400 bg-amber-500/10 border-amber-500/20 text-xs"
                          : w.status === "paid"
                          ? "text-green-400 bg-green-500/10 border-green-500/20 text-xs"
                          : "text-red-400 bg-red-500/10 border-red-500/20 text-xs"
                      }>
                        {w.status}
                      </Badge>
                      <span className="text-base font-bold text-foreground">₹{w.amount?.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">to <span className="font-mono text-foreground">{w.upiId}</span></span>
                    </div>
                    <p className="text-sm text-foreground">{w.userName ?? "—"} <span className="text-muted-foreground">· {w.userEmail}</span></p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested {new Date(w.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  {w.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => markPaid.mutate(w.id)}
                        disabled={markPaid.isPending}
                        className="btn-gradient text-white border-0 rounded-lg text-xs"
                      >
                        {markPaid.isPending ? <Loader2 size={13} className="animate-spin" /> : "Mark as Paid"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`Reject and refund ₹${w.amount} to ${w.userName}?`)) {
                            rejectWithdrawal.mutate(w.id);
                          }
                        }}
                        disabled={rejectWithdrawal.isPending}
                        className="rounded-lg text-xs text-red-400 hover:text-red-300"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tasks Moderation */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6 sm:mb-8">
        <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <FileText size={16} className="text-cyan-400" />
            Marketplace Tasks
          </h2>
          <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto -mx-1 px-1 scrollbar-thin">
            {(["new", "active", "completed", "rejected", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTaskFilter(f)}
                className={`px-3 py-1 text-xs rounded-md capitalize transition-colors shrink-0 ${
                  taskFilter === f
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {adminTasksLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : (adminTasks ?? []).length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <FileText size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm">No tasks to show</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {(adminTasks ?? []).map((t: any) => {
              const isRejected = !!t.rejectedAt;
              const isOpen = rejectTaskId === t.id;
              return (
                <div key={t.id} className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground text-sm sm:text-base break-words">{t.title}</h3>
                        <Badge variant="outline" className="text-xs capitalize">{t.category}</Badge>
                        <span className="text-sm tabular-nums text-green-400">₹{(t.budget ?? 0).toLocaleString()}</span>
                        {isRejected ? (
                          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">Rejected</Badge>
                        ) : t.status === "completed" ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">Completed</Badge>
                        ) : t.status === "open" ? (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">New</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs capitalize">{(t.status || "live").replace(/_/g, " ")}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                      <p className="text-[11px] text-muted-foreground mt-2 break-words">
                        by {t.creatorName || "—"}{t.creatorEmail ? ` (${t.creatorEmail})` : ""} · {new Date(t.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {isRejected && t.rejectionReason && (
                        <p className="text-xs text-red-400 mt-2">Reason: {t.rejectionReason}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end w-full sm:w-auto">
                      {isOpen ? (
                        <div className="flex flex-col gap-2 w-full sm:min-w-[260px]">
                          <input
                            placeholder="Reason for rejection (optional)"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="px-3 py-1.5 text-sm rounded-lg border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-full"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" className="rounded-lg text-xs bg-red-600 hover:bg-red-700 text-white border-0"
                              onClick={() => rejectTask.mutate({ id: t.id, reason: rejectReason })}
                              disabled={rejectTask.isPending}
                            >
                              {rejectTask.isPending ? <Loader2 size={13} className="animate-spin" /> : "Confirm reject"}
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-lg text-xs"
                              onClick={() => { setRejectTaskId(null); setRejectReason(""); }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : isRejected ? (
                        <Button size="sm" variant="outline" className="rounded-lg text-xs w-full sm:w-auto"
                          onClick={() => unrejectTask.mutate(t.id)}
                          disabled={unrejectTask.isPending}
                        >
                          <RotateCcw size={13} className="mr-1" /> Restore
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="rounded-lg text-xs text-red-400 hover:text-red-300 w-full sm:w-auto"
                          onClick={() => { setRejectTaskId(t.id); setRejectReason(""); }}
                        >
                          <Trash2 size={13} className="mr-1" /> Reject
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Users */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6 sm:mb-8">
        <div className="p-4 sm:p-6 border-b border-border">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Users size={16} className="text-blue-400" />
            Users ({stats.users?.length ?? 0})
          </h2>
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Name</th>
                <th className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Status</th>
                <th className="text-right p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Balance</th>
                <th className="text-right p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Total Earned</th>
                <th className="text-right p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(stats.users ?? []).map((u: any) => {
                const isBanned = !!u.bannedAt;
                const isSuspended = !!u.suspendedAt && !isBanned;
                const isThisRowOpen = moderateId === u.id;
                return (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors align-top">
                    <td className="p-4">
                      <div className="text-foreground font-medium">{u.name || "—"}</div>
                      <div className="text-xs text-muted-foreground break-all">{u.email || <span className="italic text-muted-foreground/60">no email on file</span>}</div>
                    </td>
                    <td className="p-4">
                      {isBanned ? (
                        <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">Banned</Badge>
                      ) : isSuspended ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">Suspended</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">Active</Badge>
                      )}
                      {u.moderationReason && (
                        <div className="text-[11px] text-muted-foreground mt-1 max-w-[180px]">{u.moderationReason}</div>
                      )}
                    </td>
                    <td className="p-4 text-right tabular-nums text-green-400">₹{(u.balance ?? 0).toLocaleString()}</td>
                    <td className="p-4 text-right tabular-nums text-purple-400">₹{(u.totalEarnings ?? 0).toLocaleString()}</td>
                    <td className="p-4">
                      {isThisRowOpen && moderateMode ? (
                        <div className="flex flex-col gap-2 min-w-[220px] ml-auto">
                          <input
                            placeholder={`Reason for ${moderateMode} (optional)`}
                            value={moderationReason}
                            onChange={(e) => setModerationReason(e.target.value)}
                            className="px-3 py-1.5 text-sm rounded-lg border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => moderateUser.mutate({ id: u.id, mode: moderateMode, reason: moderationReason })}
                              disabled={moderateUser.isPending}
                              className={`rounded-lg text-xs text-white border-0 ${moderateMode === "ban" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}
                            >
                              {moderateUser.isPending ? <Loader2 size={13} className="animate-spin" /> : `Confirm ${moderateMode}`}
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-lg text-xs"
                              onClick={() => { setModerateId(null); setModerateMode(null); setModerationReason(""); }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end flex-wrap">
                          {isBanned ? (
                            <Button size="sm" variant="outline" className="rounded-lg text-xs"
                              onClick={() => moderateUser.mutate({ id: u.id, mode: "unban" })}
                              disabled={moderateUser.isPending}
                            >
                              <ShieldCheck size={13} className="mr-1" /> Unban
                            </Button>
                          ) : isSuspended ? (
                            <Button size="sm" variant="outline" className="rounded-lg text-xs"
                              onClick={() => moderateUser.mutate({ id: u.id, mode: "unsuspend" })}
                              disabled={moderateUser.isPending}
                            >
                              <ShieldCheck size={13} className="mr-1" /> Unsuspend
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="rounded-lg text-xs text-amber-400 hover:text-amber-300"
                              onClick={() => { setModerateId(u.id); setModerateMode("suspend"); setModerationReason(""); }}
                            >
                              <ShieldOff size={13} className="mr-1" /> Suspend
                            </Button>
                          )}
                          {!isBanned && (
                            <Button size="sm" variant="outline" className="rounded-lg text-xs text-red-400 hover:text-red-300"
                              onClick={() => { setModerateId(u.id); setModerateMode("ban"); setModerationReason(""); }}
                            >
                              <Ban size={13} className="mr-1" /> Ban
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: card list */}
        <div className="md:hidden divide-y divide-border">
          {(stats.users ?? []).map((u: any) => {
            const isBanned = !!u.bannedAt;
            const isSuspended = !!u.suspendedAt && !isBanned;
            const isThisRowOpen = moderateId === u.id;
            return (
              <div key={u.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground font-medium truncate">{u.name || "—"}</div>
                    <div className="text-xs text-muted-foreground break-all">{u.email || <span className="italic text-muted-foreground/60">no email on file</span>}</div>
                  </div>
                  {isBanned ? (
                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-xs shrink-0">Banned</Badge>
                  ) : isSuspended ? (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs shrink-0">Suspended</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs shrink-0">Active</Badge>
                  )}
                </div>
                {u.moderationReason && (
                  <div className="text-[11px] text-muted-foreground">{u.moderationReason}</div>
                )}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold mb-0.5">Balance</div>
                    <div className="tabular-nums text-green-400 text-sm">₹{(u.balance ?? 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground uppercase tracking-wide text-[10px] font-semibold mb-0.5">Total Earned</div>
                    <div className="tabular-nums text-purple-400 text-sm">₹{(u.totalEarnings ?? 0).toLocaleString()}</div>
                  </div>
                </div>
                {isThisRowOpen && moderateMode ? (
                  <div className="flex flex-col gap-2">
                    <input
                      placeholder={`Reason for ${moderateMode} (optional)`}
                      value={moderationReason}
                      onChange={(e) => setModerationReason(e.target.value)}
                      className="px-3 py-2 text-sm rounded-lg border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-full"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => moderateUser.mutate({ id: u.id, mode: moderateMode, reason: moderationReason })}
                        disabled={moderateUser.isPending}
                        className={`flex-1 rounded-lg text-xs text-white border-0 ${moderateMode === "ban" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}
                      >
                        {moderateUser.isPending ? <Loader2 size={13} className="animate-spin" /> : `Confirm ${moderateMode}`}
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-lg text-xs"
                        onClick={() => { setModerateId(null); setModerateMode(null); setModerationReason(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {isBanned ? (
                      <Button size="sm" variant="outline" className="flex-1 rounded-lg text-xs"
                        onClick={() => moderateUser.mutate({ id: u.id, mode: "unban" })}
                        disabled={moderateUser.isPending}
                      >
                        <ShieldCheck size={13} className="mr-1" /> Unban
                      </Button>
                    ) : isSuspended ? (
                      <Button size="sm" variant="outline" className="flex-1 rounded-lg text-xs"
                        onClick={() => moderateUser.mutate({ id: u.id, mode: "unsuspend" })}
                        disabled={moderateUser.isPending}
                      >
                        <ShieldCheck size={13} className="mr-1" /> Unsuspend
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="flex-1 rounded-lg text-xs text-amber-400 hover:text-amber-300"
                        onClick={() => { setModerateId(u.id); setModerateMode("suspend"); setModerationReason(""); }}
                      >
                        <ShieldOff size={13} className="mr-1" /> Suspend
                      </Button>
                    )}
                    {!isBanned && (
                      <Button size="sm" variant="outline" className="flex-1 rounded-lg text-xs text-red-400 hover:text-red-300"
                        onClick={() => { setModerateId(u.id); setModerateMode("ban"); setModerationReason(""); }}
                      >
                        <Ban size={13} className="mr-1" /> Ban
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction Logs */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6 sm:mb-8">
        <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Receipt size={16} className="text-emerald-400" />
            Transaction Logs
          </h2>
          {(txData?.totals ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(txData.totals as any[]).map((t) => (
                <Badge key={t.type} variant="outline" className="text-xs capitalize bg-muted/50">
                  {String(t.type).replace(/_/g, " ")}: ₹{Number(t.total ?? 0).toLocaleString()} ({t.count})
                </Badge>
              ))}
            </div>
          )}
        </div>

        {txLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : (txData?.rows ?? []).length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Receipt size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {(txData.rows as any[]).map((tx) => {
              const isCredit = tx.amount > 0;
              return (
                <div key={tx.id} className="p-3 sm:p-4 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCredit ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                    {isCredit ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs capitalize">{String(tx.type).replace(/_/g, " ")}</Badge>
                      <span className={`tabular-nums text-sm font-semibold ${isCredit ? "text-green-400" : "text-red-400"}`}>
                        {isCredit ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {tx.userName || "—"}{tx.userEmail ? ` · ${tx.userEmail}` : ""}
                    </p>
                    {tx.paymentId && (
                      <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5 truncate">{tx.paymentId}</p>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0 hidden sm:block">
                    {tx.createdAt && new Date(tx.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit Log */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <History size={16} className="text-slate-400" />
            Admin Activity Log
          </h2>
          <span className="text-xs text-muted-foreground">{(auditLogs ?? []).length} entries</span>
        </div>

        {auditLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : (auditLogs ?? []).length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <ShieldX size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm">No admin actions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {(auditLogs ?? []).map((log: any) => (
              <div key={log.id} className="p-4 flex items-start gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs font-mono">{log.action}</Badge>
                    {log.targetName && (
                      <span className="text-xs text-muted-foreground">
                        on <span className="text-foreground">{log.targetName}</span>
                        {log.targetEmail ? <span className="text-muted-foreground"> ({log.targetEmail})</span> : null}
                      </span>
                    )}
                  </div>
                  {log.reason && <p className="text-xs text-muted-foreground mt-1">"{log.reason}"</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    by {log.adminEmail || "admin"} · {new Date(log.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
