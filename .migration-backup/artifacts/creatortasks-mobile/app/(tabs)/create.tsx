import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";
import { Linking } from "react-native";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const WEB_URL = DOMAIN ? `https://${DOMAIN}` : "";

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const options = [
    { icon: "film" as const, label: "Post a Reel Task", desc: "Get creators to make short-form video content", color: colors.pink },
    { icon: "zap" as const, label: "Post a Hook Task", desc: "Viral hooks and captions for your brand", color: colors.amber },
    { icon: "image" as const, label: "Post a Thumbnail Task", desc: "Eye-catching thumbnails for YouTube", color: colors.cyan },
    { icon: "edit-3" as const, label: "Custom Task", desc: "Define your own AI content task", color: colors.purple },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Post a Task</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Choose what kind of content you need
      </Text>

      <View style={styles.list}>
        {options.map((opt, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (WEB_URL) Linking.openURL(`${WEB_URL}/create`);
            }}
          >
            <View style={[styles.iconWrap, { backgroundColor: opt.color + "18" }]}>
              <Feather name={opt.icon} size={22} color={opt.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{opt.label}</Text>
              <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{opt.desc}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
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
    marginBottom: 28,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
});
