// src/components/dashboard/ActivityItem.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";

interface ActivityItemProps {
  type: "campaign" | "message" | "contact" | "template";
  title: string;
  description: string;
  time: string;
  status?: "success" | "warning" | "error" | "info";
}

const typeConfig = {
  campaign: { icon: "megaphone" as const, color: "#8B5CF6" },
  message: { icon: "chatbubble-ellipses" as const, color: "#10B981" },
  contact: { icon: "person-add" as const, color: "#3B82F6" },
  template: { icon: "document-text" as const, color: "#F59E0B" },
};

export function ActivityItem({
  type,
  title,
  description,
  time,
  status,
}: ActivityItemProps) {
  const config = typeConfig[type];

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
        <Ionicons name={config.icon} size={18} color={config.color} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
