import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { Feather } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type TabBarProps = NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]> extends (
  props: infer P
) => unknown
  ? P
  : never;

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TAB_ITEMS = [
  { name: "index", label: "Feed", icon: "home" as const },
  { name: "dashboard", label: "Dash", icon: "briefcase" as const },
  { name: "create", label: "Create", icon: "plus" as const, isCreate: true },
  { name: "messages", label: "Chat", icon: "message-circle" as const },
  { name: "profile", label: "Me", icon: "user" as const },
] as const;

// ─── Single tab item ──────────────────────────────────────────────────────────

function TabItem({
  item,
  isActive,
  onPress,
  colors,
}: {
  item: (typeof TAB_ITEMS)[number];
  isActive: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.82, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    onPress();
  }

  const iconColor = isActive ? colors.primary : colors.mutedForeground;

  return (
    <Pressable
      onPress={handlePress}
      style={styles.tabItemWrapper}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View style={[styles.tabItem, { transform: [{ scale }] }]}>
        {/* Active pill background */}
        {isActive && (
          <View style={[styles.activePill, { backgroundColor: `${colors.primary}18` }]} />
        )}
        <Feather name={item.icon} size={20} color={iconColor} />
        <Text
          style={[
            styles.tabLabel,
            {
              color: iconColor,
              fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
            },
          ]}
        >
          {item.label}
        </Text>
      </Animated.View>
      {/* Active dot */}
      {isActive && (
        <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
      )}
    </Pressable>
  );
}

// ─── Create button ─────────────────────────────────────────────────────────────

function CreateButton({
  onPress,
  colors,
}: {
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    onPress();
  }

  return (
    <View style={styles.createWrapper}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="Create"
      >
        <Animated.View
          style={[
            styles.createBtn,
            {
              backgroundColor: colors.primary,
              transform: [{ scale }],
              shadowColor: colors.primary,
            },
          ]}
        >
          <Feather name="plus" size={22} color="#fff" />
        </Animated.View>
      </Pressable>
    </View>
  );
}

// ─── Custom floating tab bar ───────────────────────────────────────────────────

function FloatingTabBar({ state, descriptors, navigation }: TabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const bottomOffset = isWeb ? 16 : insets.bottom + 12;

  // Build an index map: route name → route index
  const routeMap = Object.fromEntries(
    state.routes.map((r: { key: string; name: string }, i: number) => [r.name, i] as const)
  );

  function navigate(routeName: string) {
    const idx = routeMap[routeName];
    if (idx === undefined) return;
    const isFocused = state.index === idx;
    const event = navigation.emit({
      type: "tabPress",
      target: state.routes[idx].key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(state.routes[idx].name);
    }
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.barOuter, { bottom: bottomOffset }]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {TAB_ITEMS.map((item) => {
          if ("isCreate" in item && item.isCreate) {
            return (
              <CreateButton
                key="create"
                onPress={() => navigate("create")}
                colors={colors}
              />
            );
          }
          const routeIdx = routeMap[item.name];
          const isActive = state.index === routeIdx;
          return (
            <TabItem
              key={item.name}
              item={item}
              isActive={isActive}
              onPress={() => navigate(item.name)}
              colors={colors}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Native tab layout (Liquid Glass – iOS 26+) ────────────────────────────────

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Feed</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="dashboard">
        <Icon sf={{ default: "briefcase", selected: "briefcase.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="create">
        <Icon sf={{ default: "plus.circle", selected: "plus.circle.fill" }} />
        <Label>Create</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <Icon sf={{ default: "message", selected: "message.fill" }} />
        <Label>Messages</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ─── Classic tab layout ────────────────────────────────────────────────────────

function ClassicTabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="tasks" options={{ href: null }} />
    </Tabs>
  );
}

// ─── Root export ───────────────────────────────────────────────────────────────

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  barOuter: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  bar: {
    width: "100%",
    height: 66,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 14,
  },
  tabItemWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 48,
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  tabLabel: {
    fontSize: 9.5,
    letterSpacing: 0.2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  createWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtn: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
});
