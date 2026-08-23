// app/(app)/inbox/contact-info/[id].tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { inbox as inboxApi } from "../../../../src/services/api";
import { Colors } from "../../../../src/constants/colors";
import { Conversation } from "../../../../src/types/inbox";
import {
  getContactName,
  getContactInitials,
  getAvatarColor,
} from "../../../../src/utils/inboxHelpers";

export default function ContactInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchConversation();
  }, [id]);

  const fetchConversation = async () => {
    try {
      const res = await inboxApi.getConversation(id!);
      if (res?.data?.success) {
        setConversation(res.data.data as Conversation);
      }
    } catch (err) {
      console.error("Fetch contact info error:", err);
      Alert.alert("Error", "Failed to load contact");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (conversation?.contact.phone) {
      Linking.openURL(`tel:${conversation.contact.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (conversation?.contact.phone) {
      const phone = conversation.contact.phone.replace(/[^0-9]/g, "");
      Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() => {
        Alert.alert("Error", "WhatsApp not installed");
      });
    }
  };

  const handleArchive = async () => {
    if (!conversation) return;
    try {
      if (conversation.isArchived) {
        await inboxApi.unarchiveConversation(conversation.id);
      } else {
        await inboxApi.archiveConversation(conversation.id);
      }
      Alert.alert("Success", conversation.isArchived ? "Unarchived" : "Archived");
      router.back();
    } catch {
      Alert.alert("Error", "Failed to archive");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Chat", "This will delete all messages", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await inboxApi.deleteConversation(id!);
            router.push("/(app)/(tabs)/inbox" as never);
          } catch {
            Alert.alert("Error", "Failed to delete");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!conversation) return null;

  const name = getContactName(conversation.contact);
  const initials = getContactInitials(conversation.contact);
  const avatarColor = getAvatarColor(name);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Info</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView>
        {/* Profile */}
        <LinearGradient
          colors={[Colors.primary, "#0A7061"]}
          style={styles.profileHeader}
        >
          <View style={[styles.avatarLarge, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profilePhone}>{conversation.contact.phone}</Text>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <ActionBtn
            icon="chatbubble"
            label="Chat"
            onPress={() => router.back()}
          />
          <ActionBtn
            icon="call"
            label="Call"
            onPress={handleCall}
          />
          <ActionBtn
            icon="logo-whatsapp"
            label="WhatsApp"
            onPress={handleWhatsApp}
          />
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Info</Text>
          <InfoRow icon="call" label="Phone" value={conversation.contact.phone} />
          {conversation.contact.email && (
            <InfoRow
              icon="mail"
              label="Email"
              value={conversation.contact.email}
            />
          )}
          {conversation.contact.whatsappProfileName && (
            <InfoRow
              icon="logo-whatsapp"
              label="WhatsApp Name"
              value={conversation.contact.whatsappProfileName}
            />
          )}
        </View>

        {/* Labels */}
        {conversation.labels && conversation.labels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Labels</Text>
            <View style={styles.labelsRow}>
              {conversation.labels.map((label, i) => (
                <View key={i} style={styles.labelChip}>
                  <View style={styles.labelDot} />
                  <Text style={styles.labelText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <TouchableOpacity style={styles.actionItem} onPress={handleArchive}>
            <Ionicons
              name={conversation.isArchived ? "archive" : "archive-outline"}
              size={20}
              color={Colors.textPrimary}
            />
            <Text style={styles.actionText}>
              {conversation.isArchived ? "Unarchive Chat" : "Archive Chat"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              Alert.alert(
                conversation.isMuted ? "Unmute" : "Mute",
                "This will mute notifications"
              );
            }}
          >
            <Ionicons
              name={conversation.isMuted ? "volume-mute" : "volume-high"}
              size={20}
              color={Colors.textPrimary}
            />
            <Text style={styles.actionText}>
              {conversation.isMuted ? "Unmute" : "Mute Notifications"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleDelete}>
            <Ionicons name="trash" size={20} color={Colors.error} />
            <Text style={[styles.actionText, { color: Colors.error }]}>
              Delete Chat
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color={Colors.primary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Ionicons name={icon} size={16} color={Colors.textMuted} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  profileHeader: {
    padding: 30,
    alignItems: "center",
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },
  profilePhone: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtn: {
    alignItems: "center",
    gap: 6,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textPrimary,
  },

  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "600",
  },

  labelsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  labelChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.info}15`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.info,
  },
  labelText: {
    fontSize: 12,
    color: Colors.info,
    fontWeight: "700",
  },

  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  actionText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
});
