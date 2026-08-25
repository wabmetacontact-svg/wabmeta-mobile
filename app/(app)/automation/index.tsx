// app/(app)/automation/index.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { automations as automationsApi } from "../../../src/services/api";
import { Colors } from "../../../src/constants/colors";
import { useAuth } from "../../../src/context/AuthContext";
import { useFeatureLock } from "../../../src/hooks/useFeatureLock";
import { LockedFeatureView } from "../../../src/components/common/LockedFeatureView";
import { cacheGet, cacheSet } from "../../../src/hooks/useCachedFetch";
import { Automation, AutomationStats, AutomationTrigger } from "../../../src/types/automation";

const TRIGGER_CONFIG: Record<AutomationTrigger, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
  NEW_CONTACT: { icon: "person-add", label: "New Contact", color: "#3B82F6" },
  KEYWORD: { icon: "chatbubble-ellipses", label: "Keyword Match", color: "#8B5CF6" },
  UNKNOWN_MESSAGE: { icon: "help-circle", label: "Unknown Contact", color: "#F59E0B" },
  SCHEDULE: { icon: "time", label: "Scheduled", color: "#10B981" },
  WEBHOOK: { icon: "code-slash", label: "Webhook", color: "#EC4899" },
  INACTIVITY: { icon: "moon", label: "Inactivity", color: "#6366F1" },
};

export default function AutomationsScreen() {
  const { organization } = useAuth();
  const automationLocked = useFeatureLock("automation");

  const [automations, setAutomations] = useState<Automation[]>(
    () => cacheGet<Automation[]>("automations:list") ?? []
  );
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [loading, setLoading] = useState(
    () => !cacheGet<Automation[]>("automations:list")
  );
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const pathname = usePathname();

  // ═══════════════════════════════════
  // FETCH
  // ═══════════════════════════════════

  const fetchData = useCallback(async () => {
    // Locked plan par API 403 deti hai - call karne ka koi matlab nahi.
    // (Hooks early return se pehle chalte hain, isliye guard yahan chahiye.)
    if (automationLocked) return;
    try {
      const [listRes, statsRes] = await Promise.allSettled([
        automationsApi.getAll(),
        automationsApi.stats?.() || Promise.reject("Stats API not implemented"),
      ]);

      if (listRes.status === "fulfilled" && listRes.value?.data?.success) {
        const list = Array.isArray(listRes.value.data.data) ? listRes.value.data.data : [];
        cacheSet("automations:list", list);
        setAutomations(list);
        
        if (statsRes.status === "fulfilled" && statsRes.value?.data?.success) {
          setStats(statsRes.value.data.data);
        } else {
          setStats({
            total: list.length,
            active: list.filter((a: Automation) => a.isActive).length,
            inactive: list.filter((a: Automation) => !a.isActive).length,
            totalExecutions: list.reduce((sum: number, a: Automation) => sum + (a.executionCount || 0), 0),
          });
        }
      } else {
        // No fabricated data: if the list request failed, show a true empty state.
        setAutomations([]);
        setStats({ total: 0, active: 0, inactive: 0, totalExecutions: 0 });
      }
    } catch (err: any) {
      console.error("Automations fetch error:", err);
      setAutomations([]);
      setStats({ total: 0, active: 0, inactive: 0, totalExecutions: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [automationLocked]);

  useEffect(() => {
    fetchData();
  }, [pathname]);

  const filteredAutomations = search
    ? automations.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase())
      )
    : automations;

  // ═══════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleToggle = async (automation: Automation) => {
    try {
      // Optimistic
      setAutomations((prev) =>
        prev.map((a) =>
          a.id === automation.id ? { ...a, isActive: !a.isActive } : a
        )
      );

      await automationsApi.toggle(automation.id);
      Alert.alert(
        "Success",
        automation.isActive ? "Automation paused" : "Automation activated"
      );
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to update");
      fetchData(); // Rollback
    }
  };

  const handleDelete = (automation: Automation) => {
    Alert.alert(
      "Delete Automation",
      `Are you sure you want to delete "${automation.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setAutomations((prev) => prev.filter((a) => a.id !== automation.id));
              await automationsApi.delete(automation.id);
              Alert.alert("Success", "Automation deleted");
            } catch (err) {
              Alert.alert("Error", "Failed to delete");
              fetchData();
            }
          },
        },
      ]
    );
  };

  const showOptions = (automation: Automation) => {
    Alert.alert(automation.name, "Choose an action", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Edit",
        onPress: () => router.push(`/(app)/automation/create?id=${automation.id}` as any),
      },
      {
        text: automation.isActive ? "Pause" : "Activate",
        onPress: () => handleToggle(automation),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDelete(automation),
      },
    ]);
  };

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  if (automationLocked) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <LockedFeatureView
          feature="automation"
          planType={organization?.planType}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      {!showSearch ? (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Automations</Text>
            {stats && (
              <Text style={styles.headerSubtitle}>
                {stats.active} active • {stats.totalExecutions} total runs
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowSearch(true)}
          >
            <Ionicons name="search" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.searchHeader}>
          <TouchableOpacity
            onPress={() => {
              setShowSearch(false);
              setSearch("");
            }}
            style={styles.iconBtn}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search automations..."
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        {stats && !showSearch && (
          <View style={styles.statsWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}
            >
              <StatMini
                label="Active"
                value={stats.active}
                icon="flash"
                color={Colors.success}
              />
              <StatMini
                label="Executions"
                value={stats.totalExecutions}
                icon="play-circle"
                color={Colors.info}
              />
              <StatMini
                label="Total"
                value={stats.total}
                icon="layers"
                color="#8B5CF6"
              />
            </ScrollView>
          </View>
        )}

        {/* List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : filteredAutomations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="flash" size={48} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>
              {search ? "No automations found" : "No automations yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? "Try a different search term"
                : "Create workflows to save time and automate replies"}
            </Text>
            {!search && (
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push("/(app)/automation/create" as any)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Create Automation</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.list}>
            {filteredAutomations.map((item) => {
              const triggerInfo = TRIGGER_CONFIG[item.trigger] || TRIGGER_CONFIG.UNKNOWN_MESSAGE;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  onPress={() => router.push(`/(app)/automation/create?id=${item.id}` as any)}
                  onLongPress={() => showOptions(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}>
                      <Ionicons name="flash" size={22} color={Colors.primary} />
                    </View>
                    <View style={styles.cardHeaderInfo}>
                      <View style={styles.titleRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: item.isActive
                                ? `${Colors.success}15`
                                : Colors.surfaceSecondary,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              {
                                backgroundColor: item.isActive
                                  ? Colors.success
                                  : Colors.textMuted,
                              },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color: item.isActive
                                  ? Colors.success
                                  : Colors.textSecondary,
                              },
                            ]}
                          >
                            {item.isActive ? "Active" : "Paused"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.triggerInfo}>
                        <Ionicons name={triggerInfo.icon} size={12} color={triggerInfo.color} />
                        <Text style={[styles.triggerText, { color: triggerInfo.color }]}>
                          {triggerInfo.label}
                        </Text>
                        <Text style={styles.dotSeparator}>•</Text>
                        <Text style={styles.actionCountText}>
                          {item.actions?.length || 0} action(s)
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.executionInfo}>
                      <Ionicons name="play-circle" size={14} color={Colors.textMuted} />
                      <Text style={styles.executionText}>
                        Ran {item.executionCount} times
                      </Text>
                    </View>

                    <View style={styles.actionBtns}>
                      <TouchableOpacity
                        style={styles.toggleBtn}
                        onPress={() => handleToggle(item)}
                      >
                        <Ionicons
                          name={item.isActive ? "pause" : "play"}
                          size={16}
                          color={item.isActive ? Colors.warning : Colors.success}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.moreBtn}
                        onPress={() => showOptions(item)}
                      >
                        <Ionicons name="ellipsis-vertical" size={16} color={Colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(app)/automation/create" as any)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[Colors.primary, "#0A7061"]}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function StatMini({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={styles.statMini}>
      <View style={[styles.statMiniIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statMiniValue}>
        {value >= 1000 ? (value / 1000).toFixed(1) + "k" : value}
      </Text>
      <Text style={styles.statMiniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    padding: 0,
  },

  statsWrap: {
    backgroundColor: Colors.surface,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  statsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    paddingRight: 30,
  },
  statMini: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 14,
    borderRadius: 14,
    minWidth: 110,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statMiniIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statMiniValue: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  statMiniLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: "600",
  },

  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },

  emptyContainer: {
    padding: 40,
    alignItems: "center",
    marginTop: 20,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
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

  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  cardHeaderInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  triggerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  triggerText: {
    fontSize: 11,
    fontWeight: "600",
  },
  dotSeparator: {
    fontSize: 11,
    color: Colors.textMuted,
    marginHorizontal: 2,
  },
  actionCountText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  executionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  executionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  actionBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    borderRadius: 30,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
});
