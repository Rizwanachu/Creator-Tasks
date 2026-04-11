import React from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { apiFetch, Task } from "@/lib/api";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const WEB_URL = DOMAIN ? `https://${DOMAIN}` : "";

const CATEGORY_COLORS: Record<string, string> = {
  reels: "#ec4899",
  hooks: "#7C5CFF",
  thumbnails: "#06b6d4",
  other: "#71717a",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const bottomPad = isWeb ? 34 : insets.bottom + 20;

  const { data: task, isLoading, isError } = useQuery<Task>({
    queryKey: ["task", id],
    queryFn: () => apiFetch<Task>(`/tasks/${id}`),
    enabled: !!id,
    retry: 1,
  });

  function openWebTask() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (WEB_URL && id) Linking.openURL(`${WEB_URL}/tasks/${id}`);
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError || !task) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="lock" size={40} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Sign in required</Text>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          View this task on the web to accept it.
        </Text>
        <Pressable
          style={[styles.openBtn, { backgroundColor: colors.primary }]}
          onPress={openWebTask}
        >
          <Feather name="external-link" size={15} color="#fff" />
          <Text style={[styles.openBtnText, { color: "#fff" }]}>View on Web</Text>
        </Pressable>
      </View>
    );
  }

  const catColor = CATEGORY_COLORS[task.category] ?? "#71717a";

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Section */}
      <View style={[styles.topSection, { borderBottomColor: colors.border }]}>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: `${catColor}15` }]}>
            <Text style={[styles.badgeText, { color: catColor }]}>
              {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
            </Text>
          </View>
          {task.flagged && (
            <View style={[styles.badge, { backgroundColor: "#ef444415" }]}>
              <Text style={[styles.badgeText, { color: "#ef4444" }]}>Flagged</Text>
            </View>
          )}
        </View>

        <Text style={[styles.taskTitle, { color: colors.foreground }]}>{task.title}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="user" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {task.creatorName ?? "Creator"}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="clock" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {timeAgo(task.createdAt)}
            </Text>
          </View>
          {task.deadline && (
            <View style={styles.metaItem}>
              <Feather name="calendar" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {new Date(task.deadline).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.budgetRow, { backgroundColor: "#7C5CFF10", borderColor: "#7C5CFF25" }]}>
          <Text style={[styles.budgetLabel, { color: colors.mutedForeground }]}>Budget</Text>
          <Text style={[styles.budgetValue, { color: colors.primary }]}>₹{task.budget.toLocaleString()}</Text>
        </View>
      </View>

      {/* Description */}
      <View style={styles.body}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Description</Text>
        <Text style={[styles.description, { color: colors.foreground }]}>{task.description}</Text>

        {task.attachmentUrl && (
          <View style={styles.attachSection}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Reference</Text>
            <Pressable
              style={[styles.attachLink, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => Linking.openURL(task.attachmentUrl!)}
            >
              <Feather name="paperclip" size={14} color={colors.primary} />
              <Text style={[styles.attachText, { color: colors.primary }]} numberOfLines={1}>
                {task.attachmentUrl}
              </Text>
              <Feather name="external-link" size={14} color={colors.primary} />
            </Pressable>
          </View>
        )}
      </View>

      {/* CTA */}
      <View style={styles.ctaSection}>
        <Pressable
          style={({ pressed }) => [
            styles.acceptBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={openWebTask}
        >
          <Feather name="check-circle" size={18} color="#fff" />
          <Text style={[styles.acceptBtnText, { color: "#fff" }]}>Accept Task on Web</Text>
        </Pressable>
        <Text style={[styles.ctaNote, { color: colors.mutedForeground }]}>
          Sign in to accept and submit your work
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  openBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  topSection: {
    padding: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    gap: 12,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  taskTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  budgetLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  budgetValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  body: {
    padding: 20,
    gap: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  attachSection: {
    gap: 6,
  },
  attachLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  attachText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  ctaSection: {
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: "100%",
  },
  acceptBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  ctaNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
