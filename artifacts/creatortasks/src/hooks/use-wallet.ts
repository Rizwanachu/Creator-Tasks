import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { apiFetch } from "@/lib/api";
import { Task } from "./use-tasks";

export interface Transaction {
  id: string;
  amount: number;
  type: "deposit" | "withdrawal" | "payment" | "fee";
  status: "pending" | "completed" | "failed";
  description: string;
  createdAt: string;
}

export interface Wallet {
  balance: number;
  pendingBalance: number;
  transactions: Transaction[];
}

export interface DashboardData {
  postedTasks: Task[];
  acceptedTasks: Task[];
}

export function useWallet() {
  const { getToken } = useAuth();
  return useQuery<Wallet>({
    queryKey: ["wallet"],
    queryFn: () => apiFetch("/api/wallet", {}, getToken),
  });
}

export function useDashboard() {
  const { getToken } = useAuth();
  return useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch("/api/dashboard", {}, getToken),
  });
}
