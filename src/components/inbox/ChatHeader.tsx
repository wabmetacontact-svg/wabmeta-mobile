import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../common/Avatar";
import { Colors } from "../../constants/colors";

interface ChatHeaderProps {
  name: string;
  phone?: string;
  avatar?: string;
  isOnline?: boolean;
}

export function ChatHeader({ name, phone, avatar, isOnline }: ChatHeaderProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>
      <Avatar name={name} source={avatar} size={40} isOnline={isOnline} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.status}>{isOnline ? "Online" : phone || "Offline"}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="call-outline" size={22} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: { marginRight: 8, padding: 4 },
  info: { flex: 1, marginLeft: 10 },
  name: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  status: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  actions: { flexDirection: "row" },
  actionBtn: { padding: 6, marginLeft: 8 },
});
