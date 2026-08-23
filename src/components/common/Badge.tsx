import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { Colors } from "../../constants/colors";

interface BadgeProps {
  label: string | number;
  variant?: "primary" | "success" | "warning" | "error" | "info" | "neutral";
  size?: "sm" | "md";
  style?: ViewStyle;
}

export function Badge({ label, variant = "primary", size = "sm", style }: BadgeProps) {
  const variantStyles: Record<string, ViewStyle> = {
    primary: { backgroundColor: Colors.primary + "15" },
    success: { backgroundColor: Colors.success + "15" },
    warning: { backgroundColor: Colors.warning + "15" },
    error: { backgroundColor: Colors.error + "15" },
    info: { backgroundColor: Colors.info + "15" },
    neutral: { backgroundColor: Colors.borderLight },
  };

  const textVariantStyles: Record<string, TextStyle> = {
    primary: { color: Colors.primary },
    success: { color: Colors.success },
    warning: { color: Colors.warning },
    error: { color: Colors.error },
    info: { color: Colors.info },
    neutral: { color: Colors.textSecondary },
  };

  const sizeStyles: Record<string, ViewStyle> = {
    sm: { paddingHorizontal: 6, paddingVertical: 2 },
    md: { paddingHorizontal: 10, paddingVertical: 4 },
  };

  const textSizeStyles: Record<string, TextStyle> = {
    sm: { fontSize: 11 },
    md: { fontSize: 13 },
  };

  return (
    <View style={[styles.badge, variantStyles[variant], sizeStyles[size], style]}>
      <Text style={[styles.text, textVariantStyles[variant], textSizeStyles[size]]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontWeight: "600" },
});
