// src/components/navigation/CustomTabBar.tsx
import React, { useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Colors } from "../../constants/colors";

export interface CustomTabBarProps {
  state: {
    index: number;
    routes: Array<{
      key: string;
      name: string;
      params?: any;
    }>;
  };
  descriptors: Record<
    string,
    {
      options: {
        tabBarLabel?: string;
        title?: string;
        [key: string]: any;
      };
    }
  >;
  navigation: {
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault?: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: any) => void;
  };
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TAB_BAR_WIDTH = SCREEN_WIDTH - 32; // 16px margin on each side
const TAB_BAR_HEIGHT = 70;
const CIRCLE_SIZE = 56;

// Tab configuration
interface TabConfig {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
}

const TABS_CONFIG: Record<string, TabConfig> = {
  index: {
    name: "index",
    label: "Home",
    icon: "home",
    iconOutline: "home-outline",
  },
  inbox: {
    name: "inbox",
    label: "Inbox",
    icon: "chatbubbles",
    iconOutline: "chatbubbles-outline",
  },
  campaigns: {
    name: "campaigns",
    label: "Campaigns",
    icon: "megaphone",
    iconOutline: "megaphone-outline",
  },
  contacts: {
    name: "contacts",
    label: "Contacts",
    icon: "people",
    iconOutline: "people-outline",
  },
  settings: {
    name: "settings",
    label: "Settings",
    icon: "settings",
    iconOutline: "settings-outline",
  },
};

// ═══════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: CustomTabBarProps) {

  // ✅ FIX: Filter out hidden routes injected by Expo Router
  const visibleRoutes = state.routes.filter(route => TABS_CONFIG[route.name]);

  const tabCount = visibleRoutes.length;
  const tabWidth = TAB_BAR_WIDTH / tabCount;

  // ✅ FIX: Get the visual index (ignoring hidden routes)
  const activeRouteName = state.routes[state.index]?.name;
  const activeVisualIndex = visibleRoutes.findIndex(r => r.name === activeRouteName);

  // Animated value for circle position
  const activePosition = useSharedValue(0);

  // Update position when active index changes
  useEffect(() => {
    if (activeVisualIndex !== -1) {
      activePosition.value = withSpring(
        tabWidth * activeVisualIndex + tabWidth / 2 - CIRCLE_SIZE / 2,
        {
          damping: 15,
          stiffness: 120,
          mass: 0.8,
        }
      );
    }
  }, [activeVisualIndex, tabWidth]);

  // Animated style for floating circle
  const circleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: activePosition.value }],
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.tabBarWrapper}>
        {/* Background Dock */}
        <View style={styles.tabBarBackground} />

        {/* Floating Active Circle */}
        <Animated.View style={[styles.floatingCircle, circleStyle]}>
          <View style={styles.circleInner}>
            {(() => {
              const config = TABS_CONFIG[activeRouteName] || TABS_CONFIG["index"];
              return (
                <Ionicons
                  name={config.icon as any}
                  size={26}
                  color={Colors.primary}
                />
              );
            })()}
          </View>
        </Animated.View>

        {/* Tab Buttons */}
        <View style={styles.tabsRow}>
          {/* ✅ FIX: Map over visibleRoutes instead of state.routes */}
          {visibleRoutes.map((route) => {
            const isFocused = activeRouteName === route.name;
            const config = TABS_CONFIG[route.name];

            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                  ? options.title
                  : config.label;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            return (
              <TabButton
                key={route.key}
                label={typeof label === "string" ? label : config.label}
                icon={config.icon}
                iconOutline={config.iconOutline}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════
// TAB BUTTON COMPONENT
// ═══════════════════════════════════

interface TabButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function TabButton({
  label,
  icon,
  iconOutline,
  isFocused,
  onPress,
  onLongPress,
}: TabButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isFocused ? 0 : 1);
  const labelOpacity = useSharedValue(isFocused ? 1 : 0.7);
  const labelWeight = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(isFocused ? 0 : 1, { duration: 200 });
    labelOpacity.value = withTiming(isFocused ? 1 : 0.6, { duration: 300 });
    labelWeight.value = withTiming(isFocused ? 1 : 0, { duration: 300 });
  }, [isFocused]);

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 10, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  };

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [
      {
        translateY: interpolate(
          labelWeight.value,
          [0, 1],
          [0, -2],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
      activeOpacity={0.7}
    >
      <Animated.View style={iconStyle}>
        <Ionicons
          name={isFocused ? icon : iconOutline}
          size={22}
          color={isFocused ? "transparent" : Colors.textMuted}
        />
      </Animated.View>

      <Animated.Text
        style={[
          styles.tabLabel,
          isFocused && styles.tabLabelActive,
          labelStyle,
        ]}
      >
        {label}
      </Animated.Text>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════
// STYLES
// ═══════════════════════════════════

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 20 : 12,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  tabBarWrapper: {
    width: TAB_BAR_WIDTH,
    height: TAB_BAR_HEIGHT,
    position: "relative",
  },

  tabBarBackground: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },

  floatingCircle: {
    position: "absolute",
    top: -CIRCLE_SIZE / 2,
    left: 0,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },

  circleInner: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  tabsRow: {
    flexDirection: "row",
    height: TAB_BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
  },

  tabButton: {
    flex: 1, // ✅ Flex 1 ensures buttons distribute evenly across the bar
    height: TAB_BAR_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },

  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textMuted,
    marginTop: 2,
  },

  tabLabelActive: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
});