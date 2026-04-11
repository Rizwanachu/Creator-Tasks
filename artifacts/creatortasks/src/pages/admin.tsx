import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { apiFetch } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, AlertTriangle, Users, TrendingUp, CheckCircle, Loader2 } from "lucide-react";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className={`flex items-center gap-2 mb-2 ${color}`}>
        <Icon size={16} />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
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
        <p className="text-muted-foreground text-sm">Set ADMIN_CLERK_ID in your environment to access the admin panel.</p>
      </div>
    );
  }

  const openDisputes = (disputes ?? []).filter((d: any) => d.status === "open");
  const resolvedDisputes = (disputes ?? []).filter((d: any) => d.status === "resolved");

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
          <ShieldCheck size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Platform overview and moderation</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
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

      {/* Users */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Users size={16} className="text-blue-400" />
            Users ({stats.users?.length ?? 0})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Name</th>
                <th className="text-right p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Balance</th>
                <th className="text-right p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Total Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(stats.users ?? []).map((u: any) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-foreground font-medium">{u.name || "—"}</td>
                  <td className="p-4 text-right tabular-nums text-green-400">₹{(u.balance ?? 0).toLocaleString()}</td>
                  <td className="p-4 text-right tabular-nums text-purple-400">₹{(u.totalEarnings ?? 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
