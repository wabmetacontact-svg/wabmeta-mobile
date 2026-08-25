// app/(app)/contacts/[id].tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { contacts as contactsApi } from "../../../src/services/api";
import { Colors } from "../../../src/constants/colors";
import { ContactWithGroups } from "../../../src/types/contact";
import { cacheGet, cacheSet, cacheInvalidate } from "../../../src/hooks/useCachedFetch";

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Cache se seed - back karke dobara khole to turant khule
  const [contact, setContact] = useState<ContactWithGroups | null>(
    () => cacheGet<ContactWithGroups>(`contact:${id}`) ?? null
  );
  const [loading, setLoading] = useState(
    () => !cacheGet<ContactWithGroups>(`contact:${id}`)
  );

  useEffect(() => {
    if (id && id !== "[id]" && id !== "undefined") {
      fetchContact();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchContact = async () => {
    if (!id || id === "[id]" || id === "undefined") {
      setLoading(false);
      return;
    }

    try {
      const res = await contactsApi.getById(id);
      if (res?.data?.success && res?.data?.data) {
        const contactData = (res.data.data as any)?.contact || res.data.data;
        setContact(contactData as ContactWithGroups);
        cacheSet(`contact:${id}`, contactData);
      }
    } catch (err: any) {
      console.warn("Contact detail not found for id:", id);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Contact", "Are you sure you want to delete this contact?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await contactsApi.delete(id!);
            // Cache saaf karo, warna delete kiya hua contact dobara dikhega
            cacheInvalidate(`contact:${id}`);
            cacheInvalidate("contacts:list");
            router.back();
          } catch {
            Alert.alert("Error", "Failed to delete contact");
          }
        },
      },
    ]);
  };

  const handleWhatsApp = () => {
    if (!contact) return;
    const phone = (contact.fullPhone || contact.phone || "").replace(/[^0-9]/g, "");
    Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() => {
      Alert.alert("Error", "WhatsApp not installed");
    });
  };

  const handleCall = () => {
    if (!contact) return;
    const phone = contact.fullPhone || contact.phone || "";
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = () => {
    if (!contact?.email) return;
    Linking.openURL(`mailto:${contact.email}`);
  };

  const getInitials = () => {
    if (!contact) return "?";
    if (contact.firstName && contact.firstName !== "Unknown") {
      const first = contact.firstName.charAt(0).toUpperCase();
      const last = contact.lastName?.charAt(0).toUpperCase() || "";
      return first + last;
    }
    return "?";
  };

  // Header turant, spinner sirf body mein
  if (!contact) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Contact Not Found</Text>
          <Text style={styles.emptySubtitle}>
            This contact may have been deleted or does not exist.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="create" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
          <Ionicons name="trash" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Profile Header */}
      <LinearGradient
        colors={[Colors.primary, "#0A7061"]}
        style={styles.profileHeader}
      >
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{getInitials()}</Text>
          {contact.whatsappProfileFetched && (
            <View style={styles.verifiedBadgeLarge}>
              <Ionicons name="logo-whatsapp" size={14} color="#fff" />
            </View>
          )}
        </View>

        <Text style={styles.profileName}>
          {contact.fullName || contact.phone}
        </Text>
        <Text style={styles.profilePhone}>
          {contact.fullPhone || contact.phone}
        </Text>

        {contact.status !== "ACTIVE" && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{contact.status}</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <ActionButton
            icon="logo-whatsapp"
            label="WhatsApp"
            color="#25D366"
            onPress={handleWhatsApp}
          />
          <ActionButton
            icon="call"
            label="Call"
            color={Colors.info}
            onPress={handleCall}
          />
          {contact.email && (
            <ActionButton
              icon="mail"
              label="Email"
              color={Colors.warning}
              onPress={handleEmail}
            />
          )}
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Info</Text>

          <InfoRow icon="call" label="Phone" value={contact.fullPhone || contact.phone} />
          {contact.email && (
            <InfoRow icon="mail" label="Email" value={contact.email} />
          )}
          {contact.countryCode && (
            <InfoRow icon="flag" label="Country" value={contact.countryCode} />
          )}
          <InfoRow
            icon="calendar"
            label="Added"
            value={new Date(contact.createdAt).toLocaleDateString("en-IN")}
          />
        </View>

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsRow}>
              {contact.tags.map((tag, i) => (
                <View key={i} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Groups */}
        {contact.groups && contact.groups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Groups</Text>
            {contact.groups.map((g) => (
              <View key={g.id} style={styles.groupRow}>
                <View
                  style={[
                    styles.groupDot,
                    { backgroundColor: g.color },
                  ]}
                />
                <Text style={styles.groupName}>{g.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* WhatsApp Info */}
        {contact.whatsappProfileFetched && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WhatsApp Info</Text>
            {contact.whatsappProfileName && (
              <InfoRow
                icon="logo-whatsapp"
                label="Profile Name"
                value={contact.whatsappProfileName}
              />
            )}
            <InfoRow
              icon="chatbubbles"
              label="Messages"
              value={String(contact.messageCount || 0)}
            />
            {contact.lastMessageAt && (
              <InfoRow
                icon="time"
                label="Last Message"
                value={new Date(contact.lastMessageAt).toLocaleDateString(
                  "en-IN"
                )}
              />
            )}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
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
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: Colors.primary,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  profileHeader: {
    padding: 24,
    alignItems: "center",
    paddingBottom: 32,
  },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarLargeText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
  },
  verifiedBadgeLarge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#25D366",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginTop: 16,
  },
  profilePhone: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  statusBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "700",
  },

  content: {
    flex: 1,
    marginTop: -20,
  },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
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
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textPrimary,
  },

  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
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

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagBadge: {
    backgroundColor: `${Colors.info}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    color: Colors.info,
    fontWeight: "600",
  },

  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  groupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  groupName: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "600",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
