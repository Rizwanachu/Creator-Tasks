import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { apiFetch } from "@/lib/api";

export interface OtherUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  clerkId: string;
}

export interface LastMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  taskId: string | null;
  participantOneId: string;
  participantTwoId: string;
  createdAt: string;
  otherUser: OtherUser | null;
  lastMessage: LastMessage | null;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export function useConversations() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery<{ conversations: Conversation[] }>({
    queryKey: ["conversations"],
    queryFn: () => apiFetch("/api/conversations", {}, getToken),
    enabled: !!isSignedIn,
    refetchInterval: 10000,
    staleTime: 5000,
  });
}

export function useUnreadMessageCount() {
  const { data } = useConversations();
  if (!data) return 0;
  return data.conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
}

export function useConversationMessages(conversationId: string | null) {
  const { getToken, isSignedIn } = useAuth();
  return useQuery<{ conversation: Conversation & { otherUser: OtherUser | null }; messages: Message[] }>({
    queryKey: ["conversation", conversationId],
    queryFn: () => apiFetch(`/api/conversations/${conversationId}`, {}, getToken),
    enabled: !!isSignedIn && !!conversationId,
    refetchInterval: 4000,
    staleTime: 2000,
  });
}

export function useStartConversation() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { taskId?: string; otherUserId: string }) =>
      apiFetch<{ conversation: Conversation }>("/api/conversations/start", {
        method: "POST",
        data,
      }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSendMessage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { conversationId: string; content: string }) =>
      apiFetch<{ message: Message; warn: string | null }>("/api/messages", {
        method: "POST",
        data,
      }, getToken),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMarkRead() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      apiFetch("/api/messages/read", {
        method: "POST",
        data: { conversationId },
      }, getToken),
    onSuccess: (_result, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
