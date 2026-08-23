import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
}

export function Toast({ message, type = "info" }: ToastProps) {
  const iconMap = {
    success: "checkmark-circle" as const,
    error: "alert-circle" as const,
    info: "information-circle" as const,
  };

  const colorMap = {
    success: Colors.success,
    error: Colors.error,
    info: Colors.info,
  };

  return (
    <View style={styles.container}>
      <Ionicons name={iconMap[type]} size={20} color={colorMap[type]} style={styles.icon} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: "#202C33",
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 6,
  },
  icon: { marginRight: 10 },
  message: { color: "#FFF", fontSize: 14, fontWeight: "500", flex: 1 },
});
