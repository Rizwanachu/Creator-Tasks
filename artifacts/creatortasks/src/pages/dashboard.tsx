import { useDashboard, useWallet } from "@/hooks/use-wallet";
import { TaskCard } from "@/components/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock } from "lucide-react";

export function Dashboard() {
  const { data: dashboard, isLoading: loadingDash } = useDashboard();
  const { data: wallet, isLoading: loadingWallet } = useWallet();

  const isLoading = loadingDash || loadingWallet;

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
              <div className="text-5xl font-semibold text-white tracking-tight">
                ₹{wallet?.balance?.toLocaleString() || "0"}
              </div>
            )}
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
                  No transactions found.
                </div>
              ) : (
                wallet?.transactions?.map((tx) => (
                  <div key={tx.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        tx.type === 'deposit' || tx.type === 'payment' ? 'bg-green-500/10 text-green-500' :
                        tx.type === 'fee' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {tx.type === 'deposit' || tx.type === 'payment' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
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
                        tx.type === 'deposit' || tx.type === 'payment' ? 'text-green-500' : 'text-white'
                      }`}>
                        {tx.type === 'deposit' || tx.type === 'payment' ? '+' : '-'}₹{tx.amount}
                      </div>
                      <div className="text-xs mt-1 flex items-center justify-end gap-1">
                        {tx.status === 'completed' ? (
                          <><CheckCircle2 size={12} className="text-green-500" /> <span className="text-zinc-400 capitalize">{tx.status}</span></>
                        ) : (
                          <><Clock size={12} className="text-yellow-500" /> <span className="text-zinc-400 capitalize">{tx.status}</span></>
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
    </div>
  );
}
