import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { TaskCard } from "@/components/TaskCard";
import { apiFetch, Task } from "@/lib/api";

type Category = "all" | "reels" | "hooks" | "thumbnails" | "other";
const CATEGORIES: Category[] = ["all", "reels", "hooks", "thumbnails", "other"];

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");

  const { data: tasks, isLoading, isError, refetch } = useQuery<Task[]>({
    queryKey: ["tasks", category, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (search.trim()) params.set("q", search.trim());
      const qs = params.toString();
      return apiFetch<Task[]>(`/tasks${qs ? `?${qs}` : ""}`);
    },
    retry: 1,
  });

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom + 20;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search + Filter Header */}
      <View style={[styles.headerBar, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Task Board</Text>
        <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>Find work & get paid</Text>

        <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search tasks..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        <View style={styles.filterRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => { Haptics.selectionAsync(); setCategory(cat); }}
              style={[
                styles.filterPill,
                {
                  backgroundColor: category === cat ? colors.primary : colors.card,
                  borderColor: category === cat ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: category === cat ? "#fff" : colors.mutedForeground },
                ]}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Feather name="lock" size={36} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in required</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Please sign in via the web app to browse tasks.
          </Text>
        </View>
      ) : !tasks?.length ? (
        <View style={styles.center}>
          <Feather name="inbox" size={36} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No tasks found</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Try a different search or category.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onPress={() => {
                Haptics.selectionAsync();
                router.push({ pathname: "/tasks/[id]", params: { id: item.id } });
              }}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
          onRefresh={refetch}
          refreshing={false}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginTop: 4,
  },
  screenSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
    margin: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
  },
});
