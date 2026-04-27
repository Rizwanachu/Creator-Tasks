import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const WEB_URL = DOMAIN ? `https://${DOMAIN}` : "";

const DASHBOARD_FEATURES = [
  {
    icon: "dollar-sign" as const,
    title: "Wallet & Payouts",
    desc: "Deposit via Razorpay, withdraw to UPI",
    color: "#22c55e",
  },
  {
    icon: "briefcase" as const,
    title: "Posted Tasks",
    desc: "Manage your open and completed tasks",
    color: "#7C5CFF",
  },
  {
    icon: "award" as const,
    title: "My Work",
    desc: "Track tasks you've accepted and submitted",
    color: "#ec4899",
  },
  {
    icon: "users" as const,
    title: "Referral Program",
    desc: "Earn ₹50 for every friend you invite",
    color: "#f59e0b",
  },
  {
    icon: "bell" as const,
    title: "Notifications",
    desc: "Stay updated on task activity",
    color: "#06b6d4",
  },
];

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom + 20;

  function openDashboard() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (WEB_URL) Linking.openURL(`${WEB_URL}/dashboard`);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Manage your earnings & tasks
        </Text>
      </View>

      {/* Wallet Preview */}
      <View style={styles.section}>
        <View style={[styles.walletCard, { backgroundColor: colors.card, borderColor: "#7C5CFF30" }]}>
          <View style={styles.walletTop}>
            <View>
              <Text style={[styles.walletLabel, { color: colors.mutedForeground }]}>Available Balance</Text>
              <Text style={[styles.walletBalance, { color: colors.foreground }]}>₹—</Text>
            </View>
            <View style={[styles.walletIcon, { backgroundColor: "#7C5CFF20" }]}>
              <Feather name="credit-card" size={22} color={colors.primary} />
            </View>
          </View>
          <View style={styles.walletActions}>
            <Pressable
              style={({ pressed }) => [
                styles.walletBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={openDashboard}
            >
              <Feather name="plus" size={14} color="#fff" />
              <Text style={[styles.walletBtnText, { color: "#fff" }]}>Deposit</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.walletBtnOutline,
                { borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={openDashboard}
            >
              <Feather name="arrow-up-right" size={14} color={colors.foreground} />
              <Text style={[styles.walletBtnText, { color: colors.foreground }]}>Withdraw</Text>
            </Pressable>
          </View>
          <View style={[styles.walletNote, { backgroundColor: "#7C5CFF10", borderColor: "#7C5CFF20" }]}>
            <Feather name="info" size={12} color={colors.primary} />
            <Text style={[styles.walletNoteText, { color: colors.primary }]}>
              Full dashboard available on web
            </Text>
          </View>
        </View>
      </View>

      {/* Feature List */}
      <View style={[styles.section]}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Dashboard Features</Text>
        {DASHBOARD_FEATURES.map((f, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [
              styles.featureItem,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={openDashboard}
          >
            <View style={[styles.featureIconBox, { backgroundColor: `${f.color}15` }]}>
              <Feather name={f.icon} size={18} color={f.color} />
            </View>
            <View style={styles.featureBody}>
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>{f.title}</Text>
              <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{f.desc}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>

      {/* Open Web CTA */}
      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [
            styles.openWebBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={openDashboard}
        >
          <Feather name="external-link" size={16} color="#fff" />
          <Text style={[styles.openWebText, { color: "#fff" }]}>Open Full Dashboard</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  walletCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 16,
  },
  walletTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  walletLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  walletBalance: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  walletActions: {
    flexDirection: "row",
    gap: 10,
  },
  walletBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  walletBtnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  walletBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  walletNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  walletNoteText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureBody: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  openWebBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  openWebText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
