import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
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
  const { getToken, isSignedIn } = useAuth();
  return useQuery<SubscriptionData>({
    queryKey: ["subscription"],
    queryFn: () => apiFetch("/api/subscription", {}, getToken),
    enabled: !!isSignedIn,
    staleTime: 60_000,
  });
}

export function useCreateSubscription() {
  const { getToken } = useAuth();
  return useMutation<{ subscriptionId: string; keyId: string }, Error>({
    mutationFn: () =>
      apiFetch("/api/subscription/create", { method: "POST" }, getToken),
  });
}

export function useConfirmSubscription() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }>({
    mutationFn: (data) =>
      apiFetch("/api/subscription/confirm", { method: "POST", data }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useCancelSubscription() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; message: string }, Error>({
    mutationFn: () =>
      apiFetch("/api/subscription/cancel", { method: "POST" }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}
