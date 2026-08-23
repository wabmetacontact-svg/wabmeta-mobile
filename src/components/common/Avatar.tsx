import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";

interface AvatarProps {
  name: string;
  source?: string;
  size?: number;
  isOnline?: boolean;
}

export function Avatar({ name, source, size = 48, isOnline }: AvatarProps) {
  const getInitials = (text: string) => {
    if (!text) return "W";
    const parts = text.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return text.slice(0, 2).toUpperCase();
  };

  const getBackgroundColor = (text: string) => {
    const colors = ["#075E54", "#128C7E", "#25D366", "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B"];
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      {source ? (
        <Image
          source={{ uri: source }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: getBackgroundColor(name || "W"),
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{getInitials(name)}</Text>
        </View>
      )}
      {isOnline && <View style={styles.onlineBadge} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative" },
  image: { resizeMode: "cover" },
  placeholder: { justifyContent: "center", alignItems: "center" },
  initials: { color: "#FFF", fontWeight: "700" },
  onlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: "#FFF",
  },
});
