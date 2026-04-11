const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type TaskCategory = "reels" | "hooks" | "thumbnails" | "other";

export interface Task {
  id: string;
  title: string;
  description: string;
  budget: number;
  category: TaskCategory;
  status: string;
  deadline: string | null;
  attachmentUrl: string | null;
  flagged: boolean;
  createdAt: string;
  creatorName?: string;
}

export interface Stats {
  completedTasks: number;
  totalPaidOut: number;
  activeCreators: number;
  openTasks: number;
}
