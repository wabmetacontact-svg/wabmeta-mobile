// src/components/inbox/ReplyBar.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { Message } from "../../types/inbox";

interface Props {
  message: Message;
  contactName: string;
  onCancel: () => void;
}

export function ReplyBar({ message, contactName, onCancel }: Props) {
  const isOwn = message.direction === "OUTBOUND";
  const sender = isOwn ? "You" : contactName;

  const getPreview = () => {
    const type = message.type?.toLowerCase();
    if (type === "image") return "📷 Photo";
    if (type === "video") return "🎥 Video";
    if (type === "audio") return "🎵 Voice message";
    if (type === "document") return "📄 " + (message.fileName || "Document");
    if (type === "location") return "📍 Location";
    return message.content || "Message";
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftBar} />

      <View style={styles.content}>
        <Text style={styles.sender}>{sender}</Text>
        <Text style={styles.preview} numberOfLines={1}>
          {getPreview()}
        </Text>
      </View>

      <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
        <Ionicons name="close" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 10,
  },
  leftBar: {
    width: 3,
    height: 40,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  sender: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 2,
  },
  preview: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
});
