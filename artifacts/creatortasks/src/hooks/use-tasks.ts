import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { apiFetch } from "@/lib/api";

export type TaskCategory = "reels" | "hooks" | "thumbnails" | "other";

export interface Task {
  id: string;
  title: string;
  description: string;
  budget: number;
  category: TaskCategory;
  status: "open" | "in_progress" | "submitted" | "completed" | "rejected" | "revision_requested" | "cancelled";
  revisionNote: string | null;
  revisionCount: number;
  creatorId: string;
  workerId: string | null;
  creatorClerkId: string | null;
  workerClerkId: string | null;
  submissionContent: string | null;
  submissionUrl: string | null;
  attachmentUrl: string | null;
  deadline: string | null;
  flagged: boolean;
  createdAt: string;
  creatorName?: string;
}

export interface TaskFilters {
  category?: TaskCategory;
  q?: string;
  minBudget?: number;
  maxBudget?: number;
  sort?: "newest" | "oldest" | "highest" | "lowest";
  status?: string;
}

export function useTasks(filters: TaskFilters = {}) {
  const { getToken } = useAuth();
  return useQuery<Task[]>({
    queryKey: ["tasks", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.category) params.set("category", filters.category);
      if (filters.q) params.set("q", filters.q);
      if (filters.minBudget !== undefined) params.set("minBudget", String(filters.minBudget));
      if (filters.maxBudget !== undefined) params.set("maxBudget", String(filters.maxBudget));
      if (filters.sort) params.set("sort", filters.sort);
      if (filters.status) params.set("status", filters.status);
      const qs = params.toString();
      return apiFetch(`/api/tasks${qs ? `?${qs}` : ""}`, {}, getToken);
    },
  });
}

export function useTask(id: string) {
  const { getToken } = useAuth();
  return useQuery<Task>({
    queryKey: ["tasks", id],
    queryFn: () => apiFetch(`/api/tasks/${id}`, {}, getToken),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      budget: number;
      category: TaskCategory;
      deadline?: string;
      attachmentUrl?: string;
    }) => apiFetch("/api/tasks", { method: "POST", data }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useAcceptTask() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/tasks/${id}/accept`, { method: "POST" }, getToken),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useSubmitTask() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, content, submissionUrl }: { id: string; content: string; submissionUrl?: string }) =>
      apiFetch(`/api/tasks/${id}/submit`, { method: "POST", data: { content, submissionUrl } }, getToken),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useApproveTask() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/tasks/${id}/approve`, { method: "POST" }, getToken),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useRejectTask() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/tasks/${id}/reject`, { method: "POST" }, getToken),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRequestRevision() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      apiFetch(`/api/tasks/${id}/request-revision`, { method: "POST", data: { note } }, getToken),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCancelTask() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/tasks/${id}/cancel`, { method: "POST" }, getToken),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useRateTask() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, score, comment }: { id: string; score: number; comment?: string }) =>
      apiFetch(`/api/tasks/${id}/rate`, { method: "POST", data: { score, comment } }, getToken),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
    },
  });
}

export function useDisputeTask() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch(`/api/tasks/${id}/dispute`, { method: "POST", data: { reason } }, getToken),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
    },
  });
}
