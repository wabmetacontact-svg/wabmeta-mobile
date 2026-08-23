// src/components/chatbot/configs/StartNodeConfig.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constants/colors";

interface Props {
  data: any;
  onChange: (data: any) => void;
}

export function StartNodeConfig({ data }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.infoCard}>
        <Ionicons name="flash" size={32} color={Colors.success} />
        <Text style={styles.title}>Start Node</Text>
        <Text style={styles.text}>
          This is where your chatbot flow begins. Configure trigger keywords in
          the settings to control when this bot activates.
        </Text>
      </View>

      <View style={styles.tipCard}>
        <Ionicons name="bulb" size={16} color={Colors.warning} />
        <Text style={styles.tipText}>
          The bot will trigger when users send any of the configured keywords.
          You can also set this as the default bot for new conversations.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  infoCard: {
    padding: 24,
    backgroundColor: `${Colors.success}10`,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${Colors.success}20`,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 10,
  },
  text: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  tipCard: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: `${Colors.warning}10`,
    borderRadius: 12,
    gap: 8,
    alignItems: "flex-start",
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
