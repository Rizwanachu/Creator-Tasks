import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { apiFetch } from "@/lib/api";

export interface Task {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: "open" | "in_progress" | "submitted" | "completed" | "rejected";
  creatorId: string;
  workerId: string | null;
  creatorClerkId: string | null;
  workerClerkId: string | null;
  submissionContent: string | null;
  createdAt: string;
  creatorName?: string;
}

export function useTasks() {
  const { getToken } = useAuth();
  return useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => apiFetch("/api/tasks", {}, getToken),
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
    mutationFn: (data: { title: string; description: string; budget: number }) =>
      apiFetch("/api/tasks", { method: "POST", data }, getToken),
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
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      apiFetch(`/api/tasks/${id}/submit`, { method: "POST", data: { content } }, getToken),
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
