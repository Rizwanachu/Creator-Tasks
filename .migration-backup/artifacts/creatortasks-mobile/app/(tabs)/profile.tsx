import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, Profile, PortfolioItem } from "@/lib/api";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const WEB_URL = DOMAIN ? `https://${DOMAIN}` : "";
const API_BASE = DOMAIN ? `https://${DOMAIN}` : "";

const MENU_ITEMS = [
  { icon: "user" as const, label: "Edit Profile", path: "/profile" },
  { icon: "briefcase" as const, label: "My Tasks", path: "/tasks" },
  { icon: "dollar-sign" as const, label: "Earnings & Payouts", path: "/dashboard" },
  { icon: "bell" as const, label: "Notifications", path: "/settings" },
  { icon: "settings" as const, label: "Settings", path: "/settings" },
  { icon: "help-circle" as const, label: "Help & Support", path: "/support" },
];

function portfolioSrc(objectPath: string): string {
  if (
    objectPath.startsWith("data:") ||
    objectPath.startsWith("http://") ||
    objectPath.startsWith("https://")
  )
    return objectPath;
  return `${API_BASE}/api/storage${objectPath}`;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const TILE_SIZE = (SCREEN_WIDTH - 40 - 8) / 2;

type LightboxItem = { url: string; caption: string | null };

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [lightbox, setLightbox] = useState<LightboxItem | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery<Profile>({
    queryKey: ["profile-me"],
    queryFn: () => apiFetch<Profile>("/users/me"),
    retry: false,
  });

  function openWeb(path: string) {
    if (WEB_URL) Linking.openURL(`${WEB_URL}${path}`);
  }

  function openImage(item: PortfolioItem) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLightbox({ url: portfolioSrc(item.url), caption: item.caption ?? null });
  }

  function closeLightbox() {
    setLightbox(null);
  }

  const sortedPortfolio = profile?.portfolioItems
    ? [...profile.portfolioItems].sort(
        (a, b) =>
          (a.position ?? Infinity) - (b.position ?? Infinity) ||
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    : [];

  return (
    <>
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
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              {profile?.name ?? "Your Name"}
            </Text>
            <Text style={[styles.profileHandle, { color: colors.mutedForeground }]}>
              {profile?.username
                ? `@${profile.username}`
                : profileLoading
                ? "Loading…"
                : "Sign in to view profile"}
            </Text>
          </View>
          {!profileLoading && !profile && (
            <Pressable
              style={({ pressed }) => [styles.signInBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openWeb("/sign-in"); }}
            >
              <Text style={styles.signInText}>Sign In</Text>
            </Pressable>
          )}
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

        {sortedPortfolio.length > 0 && (
          <View style={[styles.portfolioSection, { borderBottomColor: colors.border }]}>
            <View style={styles.portfolioHeader}>
              <Text style={[styles.portfolioTitle, { color: colors.foreground }]}>Portfolio</Text>
              <Text style={[styles.portfolioCount, { color: colors.mutedForeground }]}>
                {sortedPortfolio.length} item{sortedPortfolio.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <View style={styles.portfolioGrid}>
              {sortedPortfolio.map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.portfolioTile,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={() => openImage(item)}
                >
                  <Image
                    source={{ uri: portfolioSrc(item.url) }}
                    style={styles.portfolioImage}
                    resizeMode="cover"
                  />
                  <View style={styles.zoomBadge}>
                    <Feather name="zoom-in" size={12} color="#fff" />
                  </View>
                  {item.caption ? (
                    <View style={styles.portfolioCaptionOverlay}>
                      <Text style={styles.portfolioCaption} numberOfLines={2}>
                        {item.caption}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        )}

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

      <Modal
        visible={lightbox !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeLightbox}
      >
        <View style={styles.lightboxBackdrop}>
          <TouchableWithoutFeedback onPress={closeLightbox}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <Pressable
            style={[styles.closeBtn, { top: insets.top + 12 }]}
            onPress={closeLightbox}
          >
            <Feather name="x" size={20} color="#fff" />
          </Pressable>

          <View style={styles.lightboxContent} pointerEvents="box-none">
            {lightbox && (
              <>
                <Image
                  source={{ uri: lightbox.url }}
                  style={styles.lightboxImage}
                  resizeMode="contain"
                />
                {lightbox.caption ? (
                  <Text style={styles.lightboxCaption}>{lightbox.caption}</Text>
                ) : null}
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
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
  portfolioSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  portfolioHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  portfolioTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  portfolioCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  portfolioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  portfolioTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  portfolioImage: {
    width: "100%",
    height: "100%",
  },
  zoomBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 6,
    padding: 4,
  },
  portfolioCaptionOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  portfolioCaption: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#fff",
    lineHeight: 15,
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
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxContent: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 16,
  },
  lightboxImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32,
    borderRadius: 12,
  },
  lightboxCaption: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
});
