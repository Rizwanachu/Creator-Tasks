import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface CreatorSummary {
  id: string;
  clerkId: string;
  username: string | null;
  name: string | null;
  bio: string | null;
  skills: string[];
  avatarUrl: string | null;
  completedTasksCount: number;
  rating: {
    average: string | null;
    total: number;
  };
}

export interface CreatorsResponse {
  creators: CreatorSummary[];
  hasMore: boolean;
  page: number;
}

export interface UseCreatorsParams {
  search?: string;
  skill?: string;
  sort?: "most_active" | "top_rated" | "top_earning";
  limit?: number;
}

function buildUrl(params: UseCreatorsParams & { page: number }): string {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.skill) q.set("skill", params.skill);
  if (params.sort) q.set("sort", params.sort);
  if (params.limit) q.set("limit", String(params.limit));
  q.set("page", String(params.page));
  return `/api/creators?${q.toString()}`;
}

export function useCreators(params: UseCreatorsParams) {
  return useInfiniteQuery<CreatorsResponse>({
    queryKey: ["creators", params],
    queryFn: ({ pageParam = 1 }) =>
      apiFetch(buildUrl({ ...params, page: pageParam as number })),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    initialPageParam: 1,
  });
}
