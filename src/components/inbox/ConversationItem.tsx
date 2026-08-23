import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Conversation } from "../../types/chat";
import { Avatar } from "../common/Avatar";
import { Colors } from "../../constants/colors";
import { timeAgo } from "../../utils/timeAgo";

interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
}

export function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Avatar name={conversation.contactName} source={conversation.contactAvatar} size={50} isOnline={conversation.isOnline} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{conversation.contactName || conversation.contactPhone}</Text>
          <Text style={[styles.time, conversation.unreadCount > 0 && styles.timeActive]}>
            {timeAgo(conversation.lastMessageTime)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={[styles.lastMessage, conversation.unreadCount > 0 && styles.unreadMessage]} numberOfLines={1}>
            {conversation.lastMessage || "No messages yet"}
          </Text>
          {conversation.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  content: { flex: 1, marginLeft: 12 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "600", color: Colors.textPrimary, flex: 1 },
  time: { fontSize: 12, color: Colors.textMuted },
  timeActive: { color: Colors.accent, fontWeight: "600" },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  lastMessage: { fontSize: 14, color: Colors.textSecondary, flex: 1, marginRight: 8 },
  unreadMessage: { color: Colors.textPrimary, fontWeight: "600" },
  badge: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
});
