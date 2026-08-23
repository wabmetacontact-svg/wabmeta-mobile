// src/components/contacts/ContactItem.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Contact } from "../../types/contact";
import { Colors } from "../../constants/colors";
import { formatPhoneNumber } from "../../utils/formatters";

interface ContactItemProps {
  contact: Contact;
  selected?: boolean;
  selectionMode?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  rightAction?: React.ReactNode;
}

export function ContactItem({
  contact,
  selected = false,
  selectionMode = false,
  onPress,
  onLongPress,
  rightAction,
}: ContactItemProps) {
  const getDisplayName = () => {
    if (contact.fullName && contact.fullName !== "Unknown" && contact.fullName.trim()) {
      return contact.fullName.trim();
    }
    if (contact.firstName && contact.firstName !== "Unknown" && contact.firstName.trim()) {
      return `${contact.firstName} ${contact.lastName || ""}`.trim();
    }
    if (contact.whatsappProfileName && contact.whatsappProfileName.trim()) {
      return contact.whatsappProfileName.trim();
    }
    return contact.fullPhone || contact.phone || "Unknown";
  };

  const getInitials = () => {
    const name =
      (contact.fullName && contact.fullName !== "Unknown" ? contact.fullName : "") ||
      (contact.firstName && contact.firstName !== "Unknown" ? contact.firstName : "") ||
      contact.whatsappProfileName ||
      "";

    const clean = name.replace(/[^a-zA-Z0-9\s]/g, "").trim();
    if (clean) {
      const parts = clean.split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return clean[0].toUpperCase();
    }
    return "?";
  };

  const displayName = getDisplayName();
  const displayPhone = contact.fullPhone || contact.phone || "";

  return (
    <TouchableOpacity
      style={[styles.contactItem, selected && styles.contactItemSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Checkbox for Bulk Selection */}
      {selectionMode && (
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      )}

      {/* Avatar with Blue Color and WhatsApp Badge */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials()}</Text>
        {contact.whatsappProfileFetched && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="logo-whatsapp" size={10} color="#fff" />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.contactInfo}>
        <View style={styles.contactHeader}>
          <Text style={styles.contactName} numberOfLines={1}>
            {displayName}
          </Text>
          {contact.status === "BLOCKED" && (
            <View style={styles.statusDot}>
              <Ionicons name="ban" size={12} color={Colors.error} />
            </View>
          )}
        </View>

        <Text style={styles.contactPhone} numberOfLines={1}>
          {formatPhoneNumber(displayPhone)}
        </Text>

        {contact.tags && contact.tags.length > 0 && (
          <View style={styles.contactMeta}>
            {contact.tags.slice(0, 2).map((tag, i) => (
              <View key={i} style={styles.tagBadge}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {contact.tags.length > 2 && (
              <Text style={styles.moreTagsText}>+{contact.tags.length - 2}</Text>
            )}
          </View>
        )}
      </View>

      {/* Right Action */}
      {!selectionMode && (
        rightAction || (
          <View style={styles.contactAction}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.primary} />
          </View>
        )
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    gap: 12,
  },
  contactItemSelected: {
    backgroundColor: `${Colors.primary}10`,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#25D366",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  contactInfo: {
    flex: 1,
    justifyContent: "center",
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  contactName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
  },
  statusDot: {
    marginLeft: 4,
  },
  contactPhone: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  contactMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  tagBadge: {
    backgroundColor: `${Colors.info}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    color: Colors.info,
    fontWeight: "600",
  },
  moreTagsText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  contactAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${Colors.primary}10`,
    justifyContent: "center",
    alignItems: "center",
  },
});
