import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface PlatformStats {
  completedTasks: number;
  totalPaidOut: number;
  activeCreators: number;
  openTasks: number;
}

export function useStats() {
  return useQuery<PlatformStats>({
    queryKey: ["stats"],
    queryFn: () => apiFetch("/api/stats"),
    staleTime: 60000,
  });
}
