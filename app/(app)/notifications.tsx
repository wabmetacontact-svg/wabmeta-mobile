// app/(app)/notifications.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useNotifications, AppNotification } from "../../src/context/NotificationsContext";
import { Colors } from "../../src/constants/colors";
import { timeAgo } from "../../src/utils/timeAgo";

const TYPE_FILTERS = [
  { value: "all", label: "All Alerts", icon: "grid-outline" },
  { value: "campaign", label: "Campaigns", icon: "megaphone-outline" },
  { value: "whatsapp", label: "WhatsApp", icon: "logo-whatsapp" },
  { value: "billing", label: "Payments", icon: "card-outline" },
  { value: "system", label: "System", icon: "settings-outline" },
];

const TYPE_CONFIG: Record<
  string,
  { color: string; bg: string; label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  campaign: { color: "#3B82F6", bg: "#EFF6FF", label: "CAMPAIGN", icon: "megaphone" },
  whatsapp: { color: "#10B981", bg: "#ECFDF5", label: "WHATSAPP", icon: "logo-whatsapp" },
  billing: { color: "#F59E0B", bg: "#FFFBEB", label: "BILLING", icon: "card" },
  alert: { color: "#EF4444", bg: "#FEF2F2", label: "ALERT", icon: "alert-circle" },
  message: { color: Colors.primary, bg: `${Colors.primary}12`, label: "MESSAGE", icon: "chatbubble-ellipses" },
  system: { color: "#8B5CF6", bg: "#F5F3FF", label: "SYSTEM", icon: "settings" },
};

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    fetchNotifications,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    clearAll,
    pushStatus,
    pushError,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === "unread" && notif.read) return false;
    if (selectedType !== "all" && notif.type !== selectedType) return false;
    return true;
  });

  const onRefresh = () => {
    fetchNotifications(activeTab, selectedType);
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Alerts",
      "Are you sure you want to delete all notification logs permanently?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear All", style: "destructive", onPress: clearAll },
      ]
    );
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.system;
    const timeText = timeAgo(item.createdAt) || "Just now";

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.card, !item.read && styles.cardUnread]}
        onPress={() => {
          if (!item.read) markAsRead(item.id);
          if (item.actionUrl) router.push(item.actionUrl as any);
        }}
      >
        {/* Left Color Indicator Bar */}
        <View style={[styles.cardAccentBar, { backgroundColor: config.color }]} />

        <View style={styles.cardInner}>
          {/* Header Row */}
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
              {item.type === "whatsapp" ? (
                <MaterialCommunityIcons name="whatsapp" size={18} color={config.color} />
              ) : (
                <Ionicons name={config.icon} size={18} color={config.color} />
              )}
            </View>

            <View style={styles.cardHeaderInfo}>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: config.bg }]}>
                  <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
                <Text style={styles.timeText}>{timeText}</Text>
              </View>
              <Text style={[styles.title, !item.read && styles.titleBold]} numberOfLines={2}>
                {item.title}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.deleteIconBtn}
              onPress={() => deleteNotification(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {/* Description */}
          {item.description ? (
            <Text style={styles.description} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}

          {/* Action Row */}
          {!item.read && (
            <View style={styles.cardFooter}>
              <TouchableOpacity style={styles.markReadBtn} onPress={() => markAsRead(item.id)}>
                <Ionicons name="checkmark-circle-outline" size={15} color={Colors.primary} />
                <Text style={styles.markReadText}>Mark as read</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}` : "All caught up! 🎉"}
          </Text>
        </View>

        {notifications.length > 0 ? (
          <TouchableOpacity onPress={markAllAsRead} style={styles.rightActionBtn} activeOpacity={0.7}>
            <Ionicons name="checkmark-done" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Push kaam nahi kar raha to chup mat raho - wajah dikhao.
          Pehle ye sirf console.warn me jata tha, isliye user ko bas itna
          dikhta tha ki notifications aa hi nahi rahe. */}
      {pushStatus !== "idle" && pushStatus !== "registered" && (
        <View style={styles.pushWarn}>
          <Ionicons
            name="notifications-off-outline"
            size={18}
            color={Colors.warning}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.pushWarnTitle}>
              Push notifications are off
            </Text>
            <Text style={styles.pushWarnText}>
              {pushError || "This device cannot receive push notifications yet."}
            </Text>
            {pushStatus === "denied" && (
              <TouchableOpacity
                onPress={() => Linking.openSettings()}
                style={styles.pushWarnBtn}
              >
                <Text style={styles.pushWarnBtnText}>Open Settings</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Segmented Tabs (All Alerts vs Unread) */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "all" && styles.tabBtnActive]}
            onPress={() => setActiveTab("all")}
          >
            <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>
              All Alerts ({notifications.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "unread" && styles.tabBtnActive]}
            onPress={() => setActiveTab("unread")}
          >
            <Text style={[styles.tabText, activeTab === "unread" && styles.tabTextActive]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Chips Scroll */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {TYPE_FILTERS.map((f) => {
            const isSelected = selectedType === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                onPress={() => setSelectedType(f.value)}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content List */}
      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <Ionicons name="notifications" size={36} color={Colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="notifications-off-outline" size={44} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            {activeTab === "unread" ? "No unread alerts" : "No notifications yet"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === "unread"
              ? "You have reviewed all your alerts. Great job!"
              : "System updates, campaign results, and incoming alerts will appear here."}
          </Text>
          {notifications.length > 0 && activeTab === "unread" ? (
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setActiveTab("all")}>
              <Text style={styles.emptyBtnText}>View All Alerts</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.emptyBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Refresh</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            notifications.length > 0 ? (
              <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll} activeOpacity={0.7}>
                <Ionicons name="trash-bin-outline" size={16} color="#EF4444" />
                <Text style={styles.clearAllText}>Clear All Notifications</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pushWarn: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 13,
    borderRadius: 12,
    backgroundColor: Colors.warning + "15",
    borderWidth: 1,
    borderColor: Colors.warning + "35",
  },
  pushWarnTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  pushWarnText: { fontSize: 12.5, color: Colors.textSecondary, lineHeight: 17 },
  pushWarnBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.warning,
  },
  pushWarnBtnText: { fontSize: 12.5, fontWeight: "700", color: "#fff" },
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA", // Clean standard light background
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9EDEF",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#667781",
    marginTop: 2,
    fontWeight: "500",
  },
  rightActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  /* Segmented Tabs */
  tabsWrapper: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#F0F2F5",
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#667781",
  },
  tabTextActive: {
    color: "#1A1A1A",
    fontWeight: "800",
  },

  /* Filters */
  filtersWrapper: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E9EDEF",
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9EDEF",
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#667781",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  /* List & Cards */
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E9EDEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardUnread: {
    borderColor: `${Colors.primary}40`,
    backgroundColor: "#FCFDFD",
  },
  cardAccentBar: {
    width: 5,
  },
  cardInner: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cardHeaderInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  timeText: {
    fontSize: 11,
    color: "#8696A0",
    marginLeft: "auto",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    lineHeight: 20,
  },
  titleBold: {
    fontWeight: "800",
  },
  deleteIconBtn: {
    padding: 4,
  },
  description: {
    fontSize: 13,
    color: "#667781",
    lineHeight: 18,
    marginTop: 6,
    paddingLeft: 46,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F5",
  },
  markReadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },

  /* Empty State */
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    marginTop: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.primary}12`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#667781",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  /* Loading State */
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingTop: 80,
  },
  loadingText: {
    fontSize: 14,
    color: "#667781",
    fontWeight: "600",
  },

  /* Clear All */
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EF4444",
  },
});
