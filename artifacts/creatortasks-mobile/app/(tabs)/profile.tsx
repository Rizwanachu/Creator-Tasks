import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const WEB_URL = DOMAIN ? `https://${DOMAIN}` : "";

const MENU_ITEMS = [
  { icon: "user" as const, label: "Edit Profile", path: "/profile" },
  { icon: "briefcase" as const, label: "My Tasks", path: "/tasks" },
  { icon: "dollar-sign" as const, label: "Earnings & Payouts", path: "/dashboard" },
  { icon: "bell" as const, label: "Notifications", path: "/settings" },
  { icon: "settings" as const, label: "Settings", path: "/settings" },
  { icon: "help-circle" as const, label: "Help & Support", path: "/support" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  function openWeb(path: string) {
    if (WEB_URL) Linking.openURL(`${WEB_URL}${path}`);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
      </View>

      <View style={[styles.profileCard, { borderBottomColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
          <Feather name="user" size={32} color={colors.primary} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>Your Name</Text>
          <Text style={[styles.profileHandle, { color: colors.mutedForeground }]}>Sign in to view profile</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.signInBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openWeb("/sign-in"); }}
        >
          <Text style={styles.signInText}>Sign In</Text>
        </Pressable>
      </View>

      <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
        {[
          { label: "Tasks Done", value: "0" },
          { label: "Earned", value: "₹0" },
          { label: "Rating", value: "—" },
        ].map((stat, i) => (
          <View key={i} style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.menu}>
        {MENU_ITEMS.map((item, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [
              styles.menuRow,
              { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openWeb(item.path); }}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.card }]}>
              <Feather name={item.icon} size={17} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  profileHandle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  signInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  signInText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  statsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  menu: {
    paddingTop: 8,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
