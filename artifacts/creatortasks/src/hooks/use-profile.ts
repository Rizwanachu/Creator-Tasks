import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { apiFetch } from "@/lib/api";

export interface UserProfile {
  id: string;
  clerkId: string;
  name: string | null;
  bio: string | null;
  totalEarnings: number;
  referralCode: string | null;
  completedTasksCount: number;
  postedTasksCount: number;
  rating: {
    average: string | null;
    total: number;
  };
  recentWork: Array<{
    id: string;
    title: string;
    budget: number;
    category: string;
    createdAt: string;
  }>;
}

export function useProfile(clerkId: string | undefined) {
  return useQuery<UserProfile>({
    queryKey: ["profile", clerkId],
    queryFn: () => apiFetch(`/api/users/${clerkId}`),
    enabled: !!clerkId,
  });
}

export function useUpdateProfile() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name?: string; bio?: string }) =>
      apiFetch("/api/users/me", { method: "PUT", data }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export interface ReferralData {
  code: string | null;
  referralLink: string;
  totalEarnings: number;
  referrals: Array<{ id: number; referredUserId: string; commissionEarned: number; createdAt: string }>;
}

export function useReferral() {
  const { getToken } = useAuth();
  return useQuery<ReferralData>({
    queryKey: ["referral"],
    queryFn: () => apiFetch("/api/referral", {}, getToken),
  });
}

export function useApplyReferral() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) =>
      apiFetch("/api/referral/apply", { method: "POST", data: { code } }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["referral"] });
    },
  });
}
