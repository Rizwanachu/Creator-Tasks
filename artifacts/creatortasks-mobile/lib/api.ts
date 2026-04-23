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

export interface PortfolioItem {
  id: string;
  userId: string;
  url: string;
  caption: string | null;
  position: number | null;
  createdAt: string;
}

export interface Profile {
  id: string;
  clerkId: string;
  username: string | null;
  name: string | null;
  bio: string | null;
  skills: string[];
  portfolioUrl: string | null;
  instagramHandle: string | null;
  youtubeHandle: string | null;
  avatarUrl: string | null;
  isAvailable: boolean;
  portfolioItems: PortfolioItem[];
}
