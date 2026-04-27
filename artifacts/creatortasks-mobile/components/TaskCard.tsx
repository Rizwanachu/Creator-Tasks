import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Task } from "@/lib/api";

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  reels: { color: "#ec4899", bg: "#ec489915", label: "Reels" },
  hooks: { color: "#7C5CFF", bg: "#7C5CFF15", label: "Hooks" },
  thumbnails: { color: "#06b6d4", bg: "#06b6d415", label: "Thumbnails" },
  other: { color: "#71717a", bg: "#71717a15", label: "Other" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function deadlineBadge(deadline: string | null): string | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return "Expired";
  if (days === 0) return "Due today";
  return `${days}d left`;
}

interface Props {
  task: Task;
  onPress: () => void;
}

export function TaskCard({ task, onPress }: Props) {
  const colors = useColors();
  const cat = CATEGORY_CONFIG[task.category] ?? CATEGORY_CONFIG.other;
  const deadline = deadlineBadge(task.deadline);
  const isExpired = deadline === "Expired";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: cat.bg }]}>
          <Text style={[styles.badgeText, { color: cat.color }]}>{cat.label}</Text>
        </View>
        {deadline && (
          <View style={[styles.badge, { backgroundColor: isExpired ? "#ef444415" : "#22c55e15" }]}>
            <Text style={[styles.badgeText, { color: isExpired ? "#ef4444" : "#22c55e" }]}>
              {deadline}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
        {task.title}
      </Text>
      <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
        {task.description}
      </Text>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.creator, { color: colors.mutedForeground }]}>
          {task.creatorName ?? "Creator"} · {timeAgo(task.createdAt)}
        </Text>
        <Text style={[styles.budget, { color: colors.primary }]}>
          ₹{task.budget.toLocaleString()}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 21,
    marginBottom: 5,
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
  },
  creator: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  budget: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
