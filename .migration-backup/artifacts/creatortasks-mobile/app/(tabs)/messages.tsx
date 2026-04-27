import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const PLACEHOLDER_MESSAGES = [
  { id: "1", name: "Alex M.", time: "2h ago", preview: "Task approved! Payment is on its way...", unread: true },
  { id: "2", name: "Priya K.", time: "5h ago", preview: "Can you revise the thumbnail? The text needs...", unread: true },
  { id: "3", name: "Rahul S.", time: "1d ago", preview: "Great work on the reel! Exactly what we wanted.", unread: false },
  { id: "4", name: "Sara J.", time: "2d ago", preview: "Hey, I posted a new task that matches your skills.", unread: false },
];

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Messages</Text>
        <Pressable style={[styles.iconBtn, { backgroundColor: colors.card }]}>
          <Feather name="edit" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {PLACEHOLDER_MESSAGES.map((msg) => (
          <Pressable
            key={msg.id}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {msg.name.charAt(0)}
              </Text>
              {msg.unread && (
                <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
              )}
            </View>
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text style={[styles.name, { color: colors.foreground }, msg.unread && styles.bold]}>
                  {msg.name}
                </Text>
                <Text style={[styles.time, { color: colors.mutedForeground }]}>{msg.time}</Text>
              </View>
              <Text
                style={[styles.preview, { color: msg.unread ? colors.foreground : colors.mutedForeground }]}
                numberOfLines={1}
              >
                {msg.preview}
              </Text>
            </View>
          </Pressable>
        ))}

        <View style={styles.emptyHint}>
          <Feather name="message-circle" size={36} color={colors.mutedForeground} style={{ marginBottom: 10 }} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Full messaging coming soon
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: "absolute",
    bottom: 1,
    right: 1,
    borderWidth: 2,
    borderColor: "#0a0a0a",
  },
  rowBody: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  bold: {
    fontFamily: "Inter_600SemiBold",
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  preview: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  emptyHint: {
    alignItems: "center",
    paddingTop: 36,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
