import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { apiFetch } from "@/lib/api";

export interface Invite {
  id: string;
  taskId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  taskTitle: string;
  taskBudget: number;
  taskCategory: string;
  taskStatus: string;
  creatorName: string | null;
  creatorClerkId: string | null;
}

export interface TaskInvite {
  id: string;
  taskId: string;
  workerId: string;
  status: string;
  createdAt: string;
  workerName: string | null;
  workerClerkId: string | null;
}

export interface UserSearchResult {
  id: string;
  clerkId: string;
  name: string | null;
  totalEarnings: number;
}

export function useMyInvites() {
  const { getToken, userId } = useAuth();
  return useQuery<Invite[]>({
    queryKey: ["my-invites"],
    queryFn: () => apiFetch("/api/invites", {}, getToken),
    enabled: !!userId,
  });
}

export function useTaskInvites(taskId: string) {
  const { getToken } = useAuth();
  return useQuery<TaskInvite[]>({
    queryKey: ["task-invites", taskId],
    queryFn: () => apiFetch(`/api/tasks/${taskId}/invites`, {}, getToken),
    enabled: !!taskId,
  });
}

export function useSendInvite() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, workerClerkId }: { taskId: string; workerClerkId: string }) =>
      apiFetch(`/api/tasks/${taskId}/invite`, { method: "POST", data: { workerClerkId } }, getToken),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["task-invites", taskId] });
    },
  });
}

export function useAcceptInvite() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) =>
      apiFetch(`/api/invites/${inviteId}/accept`, { method: "POST" }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-invites"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeclineInvite() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) =>
      apiFetch(`/api/invites/${inviteId}/decline`, { method: "POST" }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-invites"] });
    },
  });
}

export function useSearchUsers(query: string) {
  const { getToken } = useAuth();
  return useQuery<UserSearchResult[]>({
    queryKey: ["user-search", query],
    queryFn: () => apiFetch(`/api/users/search?q=${encodeURIComponent(query)}`, {}, getToken),
    enabled: query.length >= 2,
  });
}
