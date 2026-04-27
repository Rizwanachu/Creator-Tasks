import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { Send, ArrowLeft, MessageSquare, AlertTriangle, ShieldCheck, Lock } from "lucide-react";
import {
  useConversations,
  useConversationMessages,
  useSendMessage,
  useMarkRead,
  useTypingStatus,
  useSetTyping,
  type Conversation,
  type Message,
} from "@/hooks/use-chat";
import { useMobileShell } from "@/components/layout";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function avatarSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE}/api/storage${url}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isThisYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString([], { month: "short", day: "numeric", ...(isThisYear ? {} : { year: "numeric" }) });
}

function formatTimeFull(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ConversationItem({
  conv,
  active,
  myDbId,
  onClick,
}: {
  conv: Conversation;
  active: boolean;
  myDbId: string | undefined;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/60 transition-colors text-left border-b border-border/40 ${
        active ? "bg-muted" : ""
      }`}
    >
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10 border border-border">
          <AvatarImage src={avatarSrc(conv.otherUser?.avatarUrl)} />
          <AvatarFallback className="bg-purple-600 text-white text-sm font-semibold">
            {conv.otherUser?.name?.charAt(0) ?? "?"}
          </AvatarFallback>
        </Avatar>
        {(conv.unreadCount ?? 0) > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-purple-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-semibold text-foreground truncate">
            {conv.otherUser?.name ?? "Unknown"}
          </span>
          {conv.lastMessage && (
            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
              {formatTime(conv.lastMessage.createdAt)}
            </span>
          )}
        </div>
        <p
          className={`text-xs truncate ${
            (conv.unreadCount ?? 0) > 0
              ? "text-foreground font-medium"
              : "text-muted-foreground"
          }`}
        >
          {conv.lastMessage
            ? (conv.lastMessage.senderId === myDbId ? "You: " : "") + conv.lastMessage.content
            : "No messages yet"}
        </p>
      </div>
    </button>
  );
}

function MessageBubble({
  msg,
  isMe,
}: {
  msg: Message;
  isMe: boolean;
}) {
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isMe
            ? "bg-purple-600 text-white rounded-br-sm"
            : "bg-card border border-border text-foreground rounded-bl-sm"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        <p
          className={`text-[10px] mt-1 ${
            isMe ? "text-purple-200/70 text-right" : "text-muted-foreground"
          }`}
        >
          {formatTimeFull(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

function ChatPanel({
  conversationId,
  myDbId,
  onBack,
}: {
  conversationId: string;
  myDbId: string | undefined;
  onBack: () => void;
}) {
  const { data, isLoading } = useConversationMessages(conversationId);
  const sendMessage = useSendMessage();
  const markRead = useMarkRead();
  const setTyping = useSetTyping();
  const { data: typingData } = useTypingStatus(conversationId);
  const otherTyping = !!typingData?.typing;
  const { setHideBottomNav } = useMobileShell();
  const [text, setText] = useState("");
  const [warned, setWarned] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingHeartbeatRef = useRef<number>(0);
  const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHideBottomNav(true);
    return () => setHideBottomNav(false);
  }, [setHideBottomNav]);

  useEffect(() => {
    if (data?.messages?.length || otherTyping) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [data?.messages?.length, otherTyping]);

  useEffect(() => {
    if (conversationId) {
      markRead.mutate(conversationId);
    }
  }, [conversationId, data?.messages]);

  const sendTypingHeartbeat = () => {
    if (!conversationId) return;
    const now = Date.now();
    if (now - typingHeartbeatRef.current > 3000) {
      typingHeartbeatRef.current = now;
      setTyping.mutate({ conversationId, typing: true });
    }
    if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
    typingClearTimerRef.current = setTimeout(() => {
      typingHeartbeatRef.current = 0;
      setTyping.mutate({ conversationId, typing: false });
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
      if (conversationId && typingHeartbeatRef.current) {
        setTyping.mutate({ conversationId, typing: false });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage.mutate(
      { conversationId, content: trimmed },
      {
        onSuccess: (result) => {
          setText("");
          if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
          typingHeartbeatRef.current = 0;
          setTyping.mutate({ conversationId, typing: false });
          if (result.warn) {
            setWarned(true);
            toast.warning(result.warn);
          }
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to send"),
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherUser = data?.conversation?.otherUser;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header — fixed top row */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <button
          onClick={onBack}
          className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        {isLoading ? (
          <Skeleton className="h-9 w-9 rounded-full bg-white/5" />
        ) : (
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={avatarSrc(otherUser?.avatarUrl)} />
            <AvatarFallback className="bg-purple-600 text-white text-sm font-semibold">
              {otherUser?.name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1 min-w-0">
          {isLoading ? (
            <Skeleton className="h-4 w-28 bg-white/5" />
          ) : (
            <p className="font-semibold text-foreground text-sm truncate">
              {otherUser?.name ?? "Unknown User"}
            </p>
          )}
        </div>

        <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-1">
          <ShieldCheck size={11} />
          Secure
        </span>
      </div>

      {/* Warning banner — fixed sub-row */}
      <div className="flex items-start gap-2 px-4 py-2 bg-amber-500/10 dark:bg-amber-500/5 border-b border-amber-500/30 dark:border-amber-500/20 shrink-0">
        <Lock size={13} className="text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-amber-800 dark:text-amber-300/80 leading-relaxed">
          Do not share personal contact info. Keep all communication and payments on CreatorTasks.
        </p>
      </div>

      {/* Messages — only this section scrolls */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-0.5">
        {isLoading ? (
          <div className="space-y-3 pt-4">
            <div className="flex justify-start"><Skeleton className="h-10 w-48 rounded-2xl bg-white/5" /></div>
            <div className="flex justify-end"><Skeleton className="h-10 w-36 rounded-2xl bg-white/5" /></div>
            <div className="flex justify-start"><Skeleton className="h-10 w-56 rounded-2xl bg-white/5" /></div>
          </div>
        ) : data?.messages?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <MessageSquare size={22} className="text-purple-400" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Discuss details, clarify requirements, and share updates here.
            </p>
          </div>
        ) : (
          data?.messages?.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} isMe={msg.senderId === myDbId} />
          ))
        )}
        {otherTyping && (
          <div className="flex justify-start mb-2">
            <div className="bg-card border border-border text-foreground rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1.5">
              <span className="sr-only">{otherUser?.name ?? "Someone"} is typing</span>
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input — fixed bottom row */}
      <div className="px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)] border-t border-border bg-card shrink-0">
        {warned && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
            <AlertTriangle size={12} />
            Keep communication on platform. Avoid sharing personal contact details.
          </div>
        )}
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim()) sendTypingHeartbeat();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Discuss details, clarify requirements, and share updates here"
            className="resize-none min-h-[44px] max-h-32 bg-background border-border text-sm rounded-xl focus-visible:ring-purple-500/50 flex-1"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!text.trim() || sendMessage.isPending}
            className="btn-gradient text-white border-0 rounded-xl h-11 w-11 p-0 shrink-0"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
        <MessageSquare size={28} className="text-purple-400" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">Select a conversation</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Choose a conversation from the sidebar to start messaging.
        </p>
      </div>
    </div>
  );
}

function NoConversations() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center">
        <MessageSquare size={28} className="text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">No messages yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Start by accepting or posting a task — the Message button will appear once a task has an assigned worker.
        </p>
      </div>
    </div>
  );
}

export function MessagesPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const { data, isLoading } = useConversations();
  const conversations = data?.conversations ?? [];

  // Get my DB user ID from the first conversation
  const myDbId = conversations.length > 0
    ? (conversations[0].participantOneId === conversations[0].otherUser?.id
        ? conversations[0].participantTwoId
        : conversations[0].participantOneId)
    : undefined;

  // Auto-select from URL hash
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setActiveConvId(hash);
      setShowSidebar(false);
    }
  }, []);

  if (isLoaded && !isSignedIn) {
    setLocation("/sign-in");
    return null;
  }

  const handleSelectConv = (id: string) => {
    setActiveConvId(id);
    setShowSidebar(false);
    window.history.replaceState(null, "", `/messages#${id}`);
  };

  return (
    <>
      <Helmet>
        <title>Messages — CreatorTasks</title>
      </Helmet>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`flex flex-col border-r border-border bg-card/30 ${
            showSidebar ? "flex" : "hidden md:flex"
          } w-full md:w-80 shrink-0`}
        >
          <div className="px-4 py-4 border-b border-border shrink-0">
            <h2 className="text-base font-semibold text-foreground">Messages</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-full bg-white/5 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-28 bg-white/5" />
                      <Skeleton className="h-3 w-40 bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <NoConversations />
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  active={conv.id === activeConvId}
                  myDbId={myDbId}
                  onClick={() => handleSelectConv(conv.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div
          className={`flex-1 flex flex-col overflow-hidden ${
            !showSidebar ? "flex" : "hidden md:flex"
          }`}
        >
          {activeConvId ? (
            <ChatPanel
              conversationId={activeConvId}
              myDbId={myDbId}
              onBack={() => {
                setShowSidebar(true);
                window.history.replaceState(null, "", "/messages");
              }}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </>
  );
}
