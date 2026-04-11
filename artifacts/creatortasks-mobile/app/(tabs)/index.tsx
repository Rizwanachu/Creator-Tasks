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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { StatCard } from "@/components/StatCard";
import { apiFetch, Stats } from "@/lib/api";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const WEB_URL = DOMAIN ? `https://${DOMAIN}` : "";

const FEATURES = [
  { icon: "zap" as const, title: "AI Content Tasks", desc: "Reels, hooks, thumbnails & more" },
  { icon: "shield" as const, title: "Escrow Payments", desc: "Funds locked until you approve" },
  { icon: "trending-up" as const, title: "10% Fee Only", desc: "Keep 90% of what you earn" },
];

function openWeb(path = "") {
  if (WEB_URL) Linking.openURL(`${WEB_URL}${path}`);
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: () => apiFetch<Stats>("/stats"),
    retry: false,
  });

  const topPad = isWeb ? 67 : insets.top;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: isWeb ? 34 : insets.bottom + 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={[styles.tagBadge, { backgroundColor: "#7C5CFF15", borderColor: "#7C5CFF30" }]}>
          <View style={[styles.dot, { backgroundColor: "#7C5CFF" }]} />
          <Text style={[styles.tagText, { color: "#7C5CFF" }]}>AI Content Marketplace</Text>
        </View>

        <Text style={[styles.heroTitle, { color: colors.foreground }]}>
          Turn AI skills{"\n"}into{" "}
          <Text style={{ color: colors.primary }}>real income</Text>
        </Text>

        <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
          Post tasks, earn money. Get paid for viral reels, hooks, and thumbnails via Razorpay.
        </Text>

        <View style={styles.heroButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); openWeb("/tasks"); }}
          >
            <Text style={[styles.primaryBtnText, { color: "#fff" }]}>Browse Tasks</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openWeb("/create"); }}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Post a Task</Text>
          </Pressable>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>By the numbers</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.statsGrid}>
            <StatCard
              value={`${Math.max(stats?.completedTasks ?? 0, 120).toLocaleString()}+`}
              label="Tasks Completed"
              color={colors.green}
              bgColor="#22c55e15"
            />
            <StatCard
              value={`₹${Math.max(stats?.totalPaidOut ?? 0, 25000).toLocaleString()}+`}
              label="Paid to Creators"
              color={colors.purple}
              bgColor="#7C5CFF15"
            />
            <StatCard
              value={`${Math.max(stats?.activeCreators ?? 0, 340).toLocaleString()}+`}
              label="Active Creators"
              color={colors.pink}
              bgColor="#ec489915"
            />
            <StatCard
              value="10%"
              label="Platform Fee Only"
              color={colors.amber}
              bgColor="#f59e0b15"
            />
          </View>
        )}
      </View>

      {/* Features */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Why CreatorTasks</Text>
        {FEATURES.map((f, i) => (
          <View
            key={i}
            style={[styles.featureRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.featureIcon, { backgroundColor: "#7C5CFF15" }]}>
              <Feather name={f.icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>{f.title}</Text>
              <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.section}>
        <View style={[styles.ctaBox, { backgroundColor: colors.card, borderColor: "#7C5CFF30" }]}>
          <Text style={[styles.ctaTitle, { color: colors.foreground }]}>
            Ready to <Text style={{ color: colors.primary }}>earn?</Text>
          </Text>
          <Text style={[styles.ctaSub, { color: colors.mutedForeground }]}>
            Sign up free. Browse tasks. Get paid.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1, alignSelf: "stretch" },
            ]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); openWeb("/sign-up"); }}
          >
            <Text style={[styles.primaryBtnText, { color: "#fff" }]}>Get Started Free</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  heroTitle: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    lineHeight: 46,
    letterSpacing: -1,
    marginBottom: 12,
  },
  heroSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    marginBottom: 24,
  },
  heroButtons: {
    flexDirection: "row",
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
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
  ctaBox: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  ctaSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 10,
  },
});
