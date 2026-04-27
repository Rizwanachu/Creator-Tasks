import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { apiFetch, PublicProfile, PortfolioItem } from "@/lib/api";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API_BASE = DOMAIN ? `https://${DOMAIN}` : "";

const SCREEN_WIDTH = Dimensions.get("window").width;
const TILE_SIZE = (SCREEN_WIDTH - 40 - 8) / 2;

function portfolioSrc(objectPath: string): string {
  if (
    objectPath.startsWith("data:") ||
    objectPath.startsWith("http://") ||
    objectPath.startsWith("https://")
  )
    return objectPath;
  return `${API_BASE}/api/storage${objectPath}`;
}

type LightboxItem = { url: string; caption: string | null };

export default function CreatorProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [lightbox, setLightbox] = useState<LightboxItem | null>(null);

  const { data: profile, isLoading, isError } = useQuery<PublicProfile>({
    queryKey: ["creator-profile", username],
    queryFn: () => apiFetch<PublicProfile>(`/users/by-username/${encodeURIComponent(username)}`),
    enabled: !!username,
    retry: 1,
  });

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
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with back button */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + 16, borderBottomColor: colors.border },
          ]}
        >
          <Pressable
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Creator</Text>
          <View style={styles.backBtn} />
        </View>

        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}

        {isError && (
          <View style={styles.center}>
            <Feather name="user-x" size={40} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
            <Text style={[styles.errorTitle, { color: colors.foreground }]}>Creator not found</Text>
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
              This creator's profile is not available.
            </Text>
          </View>
        )}

        {profile && (
          <>
            {/* Profile card */}
            <View
              style={[styles.profileCard, { borderBottomColor: colors.border }]}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.primary + "22" },
                ]}
              >
                {profile.avatarUrl ? (
                  <Image
                    source={{ uri: portfolioSrc(profile.avatarUrl) }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Feather name="user" size={32} color={colors.primary} />
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.foreground }]}>
                  {profile.name ?? "Creator"}
                </Text>
                {profile.username && (
                  <Text
                    style={[styles.profileHandle, { color: colors.mutedForeground }]}
                  >
                    @{profile.username}
                  </Text>
                )}
                {profile.isAvailable && (
                  <View style={styles.availableBadge}>
                    <View style={styles.availableDot} />
                    <Text style={styles.availableText}>Available</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stats row */}
            <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {profile.completedTasksCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  Tasks Done
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {profile.rating.average ?? "—"}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  Rating
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {profile.rating.total}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  Reviews
                </Text>
              </View>
            </View>

            {/* Bio */}
            {!!profile.bio && (
              <View style={[styles.section, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  About
                </Text>
                <Text style={[styles.bio, { color: colors.foreground }]}>
                  {profile.bio}
                </Text>
              </View>
            )}

            {/* Skills */}
            {profile.skills.length > 0 && (
              <View style={[styles.section, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  Skills
                </Text>
                <View style={styles.skillsWrap}>
                  {profile.skills.map((skill) => (
                    <View
                      key={skill}
                      style={[
                        styles.skillChip,
                        { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" },
                      ]}
                    >
                      <Text style={[styles.skillText, { color: colors.primary }]}>
                        {skill}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Portfolio */}
            {sortedPortfolio.length > 0 && (
              <View style={[styles.section, { borderBottomColor: colors.border }]}>
                <View style={styles.portfolioHeader}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                    Portfolio
                  </Text>
                  <Text style={[styles.portfolioCount, { color: colors.mutedForeground }]}>
                    {sortedPortfolio.length} item
                    {sortedPortfolio.length !== 1 ? "s" : ""}
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
          </>
        )}
      </ScrollView>

      {/* Lightbox */}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 24,
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
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  profileHandle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  availableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  availableDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  availableText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#22c55e",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
  },
  statDivider: {
    width: 1,
    height: 32,
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
  section: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  bio: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  skillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  skillText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  portfolioHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
