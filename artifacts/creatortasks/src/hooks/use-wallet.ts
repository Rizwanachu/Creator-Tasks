import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { apiFetch } from "@/lib/api";
import { Task } from "./use-tasks";

export interface Transaction {
  id: string;
  amount: number;
  type: "deposit" | "withdrawal" | "payment" | "fee" | "refund";
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

export interface DepositOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
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

export function useCreateDepositOrder() {
  const { getToken } = useAuth();
  return useMutation({
    mutationFn: (amount: number) =>
      apiFetch("/api/wallet/deposit/create-order", {
        method: "POST",
        data: { amount },
      }, getToken) as Promise<DepositOrder>,
  });
}

export function useVerifyDeposit() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      amount: number;
    }) =>
      apiFetch("/api/wallet/deposit/verify", {
        method: "POST",
        data,
      }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useWithdraw() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ amount, upiId }: { amount: number; upiId: string }) =>
      apiFetch("/api/wallet/withdraw", {
        method: "POST",
        data: { amount, upiId },
      }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
