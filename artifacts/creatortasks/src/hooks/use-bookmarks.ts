import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { apiFetch } from "@/lib/api";
import { Task } from "./use-tasks";

export function useBookmarks() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery<Task[]>({
    queryKey: ["bookmarks"],
    queryFn: () => apiFetch("/api/bookmarks", {}, getToken),
    enabled: !!isSignedIn,
  });
}

export function useIsBookmarked(taskId: string) {
  const { getToken, isSignedIn } = useAuth();
  return useQuery<{ bookmarked: boolean }>({
    queryKey: ["bookmark-check", taskId],
    queryFn: () => apiFetch(`/api/bookmarks/check/${taskId}`, {}, getToken),
    enabled: !!isSignedIn && !!taskId,
  });
}

export function useToggleBookmark(taskId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: () => apiFetch(`/api/bookmarks/${taskId}`, { method: "POST" }, getToken),
    onSuccess: () => {
      queryClient.setQueryData(["bookmark-check", taskId], { bookmarked: true });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => apiFetch(`/api/bookmarks/${taskId}`, { method: "DELETE" }, getToken),
    onSuccess: () => {
      queryClient.setQueryData(["bookmark-check", taskId], { bookmarked: false });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  return { add: addMutation, remove: removeMutation };
}

export interface LeaderboardEntry {
  id: string;
  clerkId: string;
  name: string | null;
  bio: string | null;
  totalEarnings: number | null;
  completedTasksCount: number;
  rating: { average: string | null; total: number };
}

export function useLeaderboard() {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: () => apiFetch("/api/leaderboard"),
    staleTime: 5 * 60 * 1000,
  });
}

export interface MyDispute {
  id: string;
  taskId: string | null;
  taskTitle: string | null;
  reason: string;
  status: string;
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export function useMyDisputes() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery<MyDispute[]>({
    queryKey: ["my-disputes"],
    queryFn: () => apiFetch("/api/disputes/mine", {}, getToken),
    enabled: !!isSignedIn,
  });
}
