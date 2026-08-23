// app/(app)/chatbot/index.tsx
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
import { chatbots as chatbotsApi } from "../../../src/services/api";
import { Colors } from "../../../src/constants/colors";
import { useAuth } from "../../../src/context/AuthContext";
import { useFeatureLock } from "../../../src/hooks/useFeatureLock";
import { LockedFeatureView } from "../../../src/components/common/LockedFeatureView";
import { Chatbot, ChatbotStatus } from "../../../src/types/chatbot";

const STATUS_FILTERS: {
  value: string;
  label: string;
  color: string;
}[] = [
  { value: "all", label: "All", color: Colors.textPrimary },
  { value: "ACTIVE", label: "Active", color: Colors.success },
  { value: "PAUSED", label: "Paused", color: Colors.warning },
  { value: "DRAFT", label: "Draft", color: Colors.textMuted },
];

export default function ChatbotListScreen() {
  const pathname = usePathname();
  const { organization } = useAuth();
  const chatbotLocked = useFeatureLock("chatbot");
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showSearch, setShowSearch] = useState(false);

  // ═══════════════════════════════════
  // FETCH
  // ═══════════════════════════════════

  const fetchChatbots = useCallback(async () => {
    // Locked plan par API 403 deti hai - call karne ka koi matlab nahi.
    // (Hooks early return se pehle chalte hain, isliye guard yahan chahiye.)
    if (chatbotLocked) return;
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await chatbotsApi.getAll(params);
      if (res?.data?.success) {
        const data = res.data.data as any;
        const list = Array.isArray(data) ? data : data?.chatbots || [];
        setChatbots(list);
      }
    } catch (err: any) {
      console.error("Chatbots error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, chatbotLocked]);

  useEffect(() => {
    fetchChatbots();
  }, [statusFilter, pathname]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchChatbots();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ═══════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════

  const onRefresh = () => {
    setRefreshing(true);
    fetchChatbots();
  };

  const handleToggleStatus = async (bot: Chatbot) => {
    try {
      // Optimistic update
      setChatbots((prev) =>
        prev.map((c) =>
          c.id === bot.id
            ? {
                ...c,
                status: (c.status === "ACTIVE" ? "PAUSED" : "ACTIVE") as ChatbotStatus,
              }
            : c
        )
      );

      if (bot.status === "ACTIVE") {
        await chatbotsApi.deactivate(bot.id);
      } else {
        await chatbotsApi.activate(bot.id);
      }

      Alert.alert(
        "Success",
        bot.status === "ACTIVE" ? "Chatbot paused" : "Chatbot activated 🚀"
      );
      fetchChatbots();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to update status"
      );
      fetchChatbots();
    }
  };

  const handleDuplicate = (bot: Chatbot) => {
    Alert.prompt(
      "Duplicate Chatbot",
      "Enter name for duplicated chatbot",
      async (newName) => {
        if (!newName?.trim()) return;
        try {
          await chatbotsApi.duplicate(bot.id, newName);
          Alert.alert("Success", "Chatbot duplicated");
          fetchChatbots();
        } catch (err) {
          Alert.alert("Error", "Failed to duplicate");
        }
      },
      "plain-text",
      `${bot.name} (Copy)`
    );
  };

  const handleDelete = (bot: Chatbot) => {
    Alert.alert(
      "Delete Chatbot",
      `Delete "${bot.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await chatbotsApi.delete(bot.id);
              setChatbots((prev) => prev.filter((c) => c.id !== bot.id));
              Alert.alert("Success", "Chatbot deleted");
            } catch (err) {
              Alert.alert("Error", "Failed to delete");
              fetchChatbots();
            }
          },
        },
      ]
    );
  };

  const showActions = (bot: Chatbot) => {
    Alert.alert(bot.name, "Choose an action", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Edit Flow",
        onPress: () => router.push(`/(app)/chatbot/${bot.id}` as never),
      },
      {
        text: bot.status === "ACTIVE" ? "Pause" : "Activate",
        onPress: () => handleToggleStatus(bot),
      },
      { text: "Duplicate", onPress: () => handleDuplicate(bot) },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDelete(bot),
      },
    ]);
  };

  // ═══════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════

  const stats = {
    total: chatbots.length,
    active: chatbots.filter((c) => c.status === "ACTIVE").length,
    paused: chatbots.filter((c) => c.status === "PAUSED").length,
    draft: chatbots.filter((c) => c.status === "DRAFT").length,
  };

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  if (chatbotLocked) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <LockedFeatureView feature="chatbot" planType={organization?.planType} />
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
            <Text style={styles.headerTitle}>Chatbots</Text>
            <Text style={styles.headerSubtitle}>
              {stats.total} total • {stats.active} active
            </Text>
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
            placeholder="Search chatbots..."
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
        {/* Guide Card */}
        {!showSearch && chatbots.length === 0 && !loading && (
          <View style={styles.guideCard}>
            <Text style={styles.guideTitle}>🚀 How to Build a Chatbot</Text>
            <View style={styles.guideSteps}>
              {[
                { num: "1", text: "Create a new chatbot" },
                { num: "2", text: "Add nodes step-by-step" },
                { num: "3", text: "Set trigger keywords" },
                { num: "4", text: "Test & Activate" },
              ].map((step) => (
                <View key={step.num} style={styles.guideStep}>
                  <View style={styles.guideStepNum}>
                    <Text style={styles.guideStepNumText}>{step.num}</Text>
                  </View>
                  <Text style={styles.guideStepText}>{step.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Stats */}
        {chatbots.length > 0 && (
          <View style={styles.statsWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}
            >
              <StatMini
                label="Total"
                value={stats.total}
                icon="hardware-chip"
                color={Colors.info}
              />
              <StatMini
                label="Active"
                value={stats.active}
                icon="checkmark-circle"
                color={Colors.success}
              />
              <StatMini
                label="Paused"
                value={stats.paused}
                icon="pause-circle"
                color={Colors.warning}
              />
              <StatMini
                label="Draft"
                value={stats.draft}
                icon="document"
                color={Colors.textMuted}
              />
            </ScrollView>
          </View>
        )}

        {/* Status Filters */}
        <View style={styles.filtersWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[
                  styles.filterChip,
                  statusFilter === f.value && {
                    backgroundColor: f.color,
                    borderColor: f.color,
                  },
                ]}
                onPress={() => setStatusFilter(f.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === f.value && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Chatbots List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : chatbots.length === 0 ? (
          <EmptyState
            hasFilters={statusFilter !== "all" || !!search}
            onCreate={() => router.push("/(app)/chatbot/new" as never)}
          />
        ) : (
          <View style={styles.chatbotsList}>
            {chatbots.map((bot) => (
              <ChatbotCard
                key={bot.id}
                chatbot={bot}
                onPress={() =>
                  router.push(`/(app)/chatbot/${bot.id}` as never)
                }
                onLongPress={() => showActions(bot)}
                onToggleStatus={() => handleToggleStatus(bot)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(app)/chatbot/new" as never)}
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

// ═══════════════════════════════════
// CHATBOT CARD
// ═══════════════════════════════════

function ChatbotCard({
  chatbot,
  onPress,
  onLongPress,
  onToggleStatus,
}: {
  chatbot: Chatbot;
  onPress: () => void;
  onLongPress: () => void;
  onToggleStatus: () => void;
}) {
  const statusConfig = {
    ACTIVE: {
      color: Colors.success,
      bg: `${Colors.success}15`,
      label: "Active",
      icon: "checkmark-circle" as const,
    },
    PAUSED: {
      color: Colors.warning,
      bg: `${Colors.warning}15`,
      label: "Paused",
      icon: "pause-circle" as const,
    },
    DRAFT: {
      color: Colors.textMuted,
      bg: `${Colors.textMuted}15`,
      label: "Draft",
      icon: "document" as const,
    },
  }[chatbot.status] || {
    color: Colors.textMuted,
    bg: `${Colors.textMuted}15`,
    label: "Draft",
    icon: "document" as const,
  };

  const nodesCount = chatbot.flowData?.nodes?.length || 0;
  const keywordsCount = chatbot.triggerKeywords?.length || 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardIconBox}>
          <Ionicons name="hardware-chip" size={22} color={Colors.primary} />
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {chatbot.name}
            </Text>
            {chatbot.isDefault && (
              <View style={styles.defaultBadge}>
                <Ionicons name="star" size={10} color={Colors.warning} />
              </View>
            )}
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}
          >
            <Ionicons
              name={statusConfig.icon}
              size={10}
              color={statusConfig.color}
            />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={onLongPress} style={styles.moreBtn}>
          <Ionicons
            name="ellipsis-vertical"
            size={18}
            color={Colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Description */}
      {chatbot.description && (
        <Text style={styles.cardDesc} numberOfLines={2}>
          {chatbot.description}
        </Text>
      )}

      {/* Meta Info */}
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="git-branch" size={12} color={Colors.textMuted} />
          <Text style={styles.metaText}>{nodesCount} nodes</Text>
        </View>
        {keywordsCount > 0 && (
          <View style={styles.metaItem}>
            <Ionicons name="pricetags" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>
              {keywordsCount} keyword{keywordsCount !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
        {chatbot.isDefault && (
          <View style={styles.metaItem}>
            <Ionicons name="flash" size={12} color={Colors.warning} />
            <Text style={[styles.metaText, { color: Colors.warning }]}>
              Default
            </Text>
          </View>
        )}
      </View>

      {/* Keywords */}
      {chatbot.triggerKeywords && chatbot.triggerKeywords.length > 0 && (
        <View style={styles.keywordsRow}>
          {chatbot.triggerKeywords.slice(0, 3).map((kw, i) => (
            <View key={i} style={styles.keywordChip}>
              <Text style={styles.keywordText}>{kw}</Text>
            </View>
          ))}
          {chatbot.triggerKeywords.length > 3 && (
            <View style={styles.keywordChip}>
              <Text style={styles.keywordText}>
                +{chatbot.triggerKeywords.length - 3}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Draft warning */}
      {chatbot.status === "DRAFT" && (
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={14} color={Colors.warning} />
          <Text style={styles.warningText}>
            Build flow → Set keywords → Activate
          </Text>
        </View>
      )}

      {/* Toggle Status Button */}
      {chatbot.status !== "DRAFT" && nodesCount > 1 && (
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={onToggleStatus}
          activeOpacity={0.7}
        >
          <Ionicons
            name={chatbot.status === "ACTIVE" ? "pause" : "play"}
            size={14}
            color={
              chatbot.status === "ACTIVE" ? Colors.warning : Colors.success
            }
          />
          <Text
            style={[
              styles.toggleText,
              {
                color:
                  chatbot.status === "ACTIVE"
                    ? Colors.warning
                    : Colors.success,
              },
            ]}
          >
            {chatbot.status === "ACTIVE" ? "Pause" : "Activate"}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════
// STAT MINI
// ═══════════════════════════════════

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
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statMiniValue}>{value}</Text>
      <Text style={styles.statMiniLabel}>{label}</Text>
    </View>
  );
}

// ═══════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════

function EmptyState({
  hasFilters,
  onCreate,
}: {
  hasFilters: boolean;
  onCreate: () => void;
}) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBox}>
        <Ionicons
          name={hasFilters ? "search" : "hardware-chip"}
          size={48}
          color={Colors.textMuted}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {hasFilters ? "No chatbots found" : "No chatbots yet"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {hasFilters
          ? "Try adjusting your filters"
          : "Create your first chatbot to automate conversations"}
      </Text>
      {!hasFilters && (
        <TouchableOpacity style={styles.emptyBtn} onPress={onCreate}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.emptyBtnText}>Create Chatbot</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ═══════════════════════════════════
// STYLES
// ═══════════════════════════════════

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

  guideCard: {
    backgroundColor: `${Colors.info}08`,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${Colors.info}20`,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.info,
    marginBottom: 12,
  },
  guideSteps: { gap: 8 },
  guideStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  guideStepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.info,
    justifyContent: "center",
    alignItems: "center",
  },
  guideStepNumText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  guideStepText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: "500",
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
    minWidth: 100,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statMiniIcon: {
    width: 32,
    height: 32,
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

  filtersWrap: {
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filtersRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingRight: 30,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: "#fff",
  },

  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },

  chatbotsList: {
    padding: 16,
    gap: 12,
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
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
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: { flex: 1 },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
  },
  defaultBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: `${Colors.warning}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  cardDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },

  cardMeta: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },

  keywordsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  keywordChip: {
    backgroundColor: `${Colors.info}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  keywordText: {
    fontSize: 10,
    color: Colors.info,
    fontWeight: "700",
  },

  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.warning}10`,
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: `${Colors.warning}20`,
  },
  warningText: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: "600",
    flex: 1,
  },

  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    gap: 6,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Empty
  emptyContainer: {
    padding: 40,
    alignItems: "center",
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

  // FAB
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
