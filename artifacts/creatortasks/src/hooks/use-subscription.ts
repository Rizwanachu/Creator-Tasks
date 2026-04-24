import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface SubscriptionData {
  isPro: boolean;
  proUntil: string | null;
  subscription: {
    id: string;
    razorpaySubscriptionId: string | null;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelledAt: string | null;
    createdAt: string | null;
  } | null;
}

export function useSubscription() {
  return useQuery<SubscriptionData>({
    queryKey: ["subscription"],
    queryFn: () => apiFetch("/api/subscription"),
    staleTime: 60_000,
  });
}

export function useCreateSubscription() {
  return useMutation<{ subscriptionId: string; keyId: string }, Error>({
    mutationFn: () =>
      apiFetch("/api/subscription/create", { method: "POST" }),
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; message: string }, Error>({
    mutationFn: () =>
      apiFetch("/api/subscription/cancel", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}
