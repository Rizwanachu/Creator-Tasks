import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { apiFetch } from "@/lib/api";

export interface PortfolioItem {
  id: string;
  userId?: string;
  url: string;
  caption: string | null;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  clerkId: string;
  name: string | null;
  bio: string | null;
  skills: string[];
  portfolioUrl: string | null;
  instagramHandle: string | null;
  youtubeHandle: string | null;
  avatarUrl: string | null;
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
  portfolioItems: PortfolioItem[];
}

/** Represents the authenticated /users/me response — includes private fields (upiId) */
export interface PrivateProfile {
  id: string;
  clerkId: string;
  name: string | null;
  bio: string | null;
  skills: string[];
  portfolioUrl: string | null;
  instagramHandle: string | null;
  youtubeHandle: string | null;
  upiId: string | null;
  avatarUrl: string | null;
  portfolioItems: PortfolioItem[];
}

/** @deprecated Use PrivateProfile instead */
export interface MyProfile extends PrivateProfile {}

export function useProfile(clerkId: string | undefined) {
  return useQuery<UserProfile>({
    queryKey: ["profile", clerkId],
    queryFn: () => apiFetch(`/api/users/${clerkId}`),
    enabled: !!clerkId,
  });
}

export function useMyProfile() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery<PrivateProfile>({
    queryKey: ["my-profile"],
    queryFn: () => apiFetch("/api/users/me", {}, getToken),
    enabled: !!isSignedIn,
  });
}

export function useProfileComplete(clerkId: string | undefined) {
  const { data: profile, isLoading } = useProfile(clerkId);

  const isComplete = !!(profile?.name?.trim() && profile?.bio?.trim());
  const completionPercent = isLoading ? 0 : (() => {
    let pct = 0;
    if (profile?.name?.trim()) pct += 40;
    if (profile?.bio?.trim()) pct += 40;
    if ((profile?.skills?.length ?? 0) > 0 || profile?.portfolioUrl || (profile?.portfolioItems?.length ?? 0) > 0) pct += 20;
    return pct;
  })();

  return { isComplete, completionPercent, isLoading, profile };
}

export function useUpdateProfile() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name?: string;
      bio?: string;
      skills?: string[];
      portfolioUrl?: string;
      instagramHandle?: string;
      youtubeHandle?: string;
      upiId?: string;
      avatarUrl?: string;
    }) => apiFetch("/api/users/me", { method: "PUT", data }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export function useAddPortfolioItem() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { url: string; caption?: string }) =>
      apiFetch("/api/users/me/portfolio", { method: "POST", data }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export function useDeletePortfolioItem() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/users/me/portfolio/${id}`, { method: "DELETE" }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export interface ReferralEntry {
  id: string;
  referredUserId: string;
  commissionEarned: number;
  completedTaskCount: number;
  milestone3Paid: boolean;
  milestone5Paid: boolean;
  nextMilestone: number | null;
  createdAt: string;
}

export interface ReferralData {
  code: string | null;
  referralLink: string;
  totalReferrals: number;
  totalCommissionEarned: number;
  totalTasksCompleted: number;
  commissionPct: number;
  lifetimeCommission: number;
  milestonesEarned: number;
  signupBonusPerFriend: number;
  referrals: ReferralEntry[];
  isReferred: boolean;
  referredCompletedTasks: number;
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
