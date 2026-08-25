// app/(app)/templates/index.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { templates as templatesApi, whatsapp as whatsappApi } from "../../../src/services/api";
import { Colors } from "../../../src/constants/colors";
import { cacheGet, cacheSet } from "../../../src/hooks/useCachedFetch";
import {
  Template,
  TemplateStats,
  TemplateCategory,
} from "../../../src/types/template";

// ═══════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════

const STATUS_FILTERS: {
  value: string;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "all", label: "All", color: Colors.textPrimary, icon: "grid" },
  {
    value: "APPROVED",
    label: "Approved",
    color: Colors.success,
    icon: "checkmark-circle",
  },
  {
    value: "PENDING",
    label: "Pending",
    color: Colors.warning,
    icon: "time",
  },
  {
    value: "REJECTED",
    label: "Rejected",
    color: Colors.error,
    icon: "close-circle",
  },
  {
    value: "DRAFT",
    label: "Draft",
    color: Colors.textMuted,
    icon: "document",
  },
];

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  MARKETING: "#8B5CF6",
  UTILITY: "#3B82F6",
  AUTHENTICATION: "#F59E0B",
};

// ═══════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════

export default function TemplatesScreen() {
  const [templates, setTemplates] = useState<Template[]>(
    () => cacheGet<Template[]>("templates:list") ?? []
  );
  const [stats, setStats] = useState<TemplateStats | null>(null);

  const [loading, setLoading] = useState(
    () => !cacheGet<Template[]>("templates:list")
  );
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const [connectedAccount, setConnectedAccount] = useState<any>(null);

  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ═══════════════════════════════════
  // FETCH
  // ═══════════════════════════════════

  const fetchAccount = useCallback(async () => {
    try {
      const res = await whatsappApi.accounts();
      const data = res?.data?.data;
      let accounts: any[] = [];
      if (Array.isArray(data)) {
        accounts = data;
      } else if (Array.isArray((data as any)?.accounts)) {
        accounts = (data as any).accounts;
      } else if (Array.isArray((data as any)?.data)) {
        accounts = (data as any).data;
      }

      const connected = accounts.filter(
        (a: any) =>
          !a.status ||
          a.status.toUpperCase() === "CONNECTED" ||
          a.status.toUpperCase() === "ACTIVE" ||
          a.hasAccessToken
      );

      const validAccounts = connected.length > 0 ? connected : accounts;
      const defaultAcc =
        validAccounts.find((a: any) => a.isDefault) || validAccounts[0] || null;

      setConnectedAccount(defaultAcc);
    } catch (err) {
      console.error("Fetch account error:", err);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const params: any = { limit: 100 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;

      const res = await templatesApi.getAll(params);

      if (res?.data?.success) {
        const data = res.data.data as any;
        const list = Array.isArray(data) ? data : data?.templates || [];
        cacheSet("templates:list", list);
        setTemplates(list);
      }
    } catch (err: any) {
      console.error("Templates error:", err?.response?.data?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, categoryFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await templatesApi.stats();
      if (res?.data?.success) {
        setStats(res.data.data as TemplateStats);
      }
    } catch (err) {
      console.error("Stats error:", err);
    }
  }, []);

  useEffect(() => {
    fetchAccount();
    fetchStats();
  }, [fetchAccount, fetchStats]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchTemplates();
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search, fetchTemplates]);

  // ═══════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════

  const onRefresh = () => {
    setRefreshing(true);
    fetchTemplates();
    fetchStats();
    fetchAccount();
  };

  const handleSync = async () => {
    if (!connectedAccount) {
      Alert.alert(
        "No WhatsApp Account",
        "Please connect a WhatsApp account first in Settings"
      );
      return;
    }

    try {
      setSyncing(true);
      const res = await templatesApi.sync(connectedAccount.id);
      const data = res.data?.data as any;
      Alert.alert(
        "Sync Complete",
        data?.message || `Synced ${data?.synced || 0} templates`
      );
      fetchTemplates();
      fetchStats();
    } catch (err: any) {
      Alert.alert(
        "Sync Failed",
        err?.response?.data?.message || "Failed to sync from Meta"
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = (template: Template) => {
    Alert.alert(
      "Delete Template",
      `Delete "${template.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await templatesApi.delete(template.id);
              setTemplates((prev) => prev.filter((t) => t.id !== template.id));
              fetchStats();
              Alert.alert("Success", "Template deleted");
            } catch (err: any) {
              Alert.alert(
                "Error",
                err?.response?.data?.message || "Failed to delete"
              );
            }
          },
        },
      ]
    );
  };

  const duplicateAction = async (template: Template, newName: string) => {
    try {
      const res = await templatesApi.duplicate(
        template.id,
        newName,
        connectedAccount?.id
      );
      if (res?.data?.success) {
        Alert.alert("Success", "Template duplicated");
        fetchTemplates();
        fetchStats();
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to duplicate"
      );
    }
  };

  const handleDuplicate = async (template: Template) => {
    const defaultName = `${template.name}_copy`;
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Duplicate Template",
        "Enter new template name",
        async (newName) => {
          if (!newName) return;
          duplicateAction(template, newName);
        },
        "plain-text",
        defaultName
      );
    } else {
      Alert.alert(
        "Duplicate Template",
        `Create a duplicate named "${defaultName}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Duplicate",
            onPress: () => duplicateAction(template, defaultName),
          },
        ]
      );
    }
  };

  // ═══════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════

  const hasActiveFilters = statusFilter !== "all" || categoryFilter;

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      {!showSearch ? (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Templates</Text>
            {stats && (
              <Text style={styles.headerSubtitle}>
                {stats.total} total • {stats.approved} approved
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setShowSearch(true)}
            >
              <Ionicons name="search" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={handleSync}
              disabled={syncing}
            >
              <Ionicons
                name="sync"
                size={22}
                color={syncing ? Colors.textMuted : Colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
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
            placeholder="Search templates..."
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
        {/* Stats Cards */}
        {stats && !showSearch && (
          <View style={styles.statsWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}
            >
              <StatMini
                label="Total"
                value={stats.total}
                icon="document-text"
                color={Colors.info}
              />
              <StatMini
                label="Approved"
                value={stats.approved}
                icon="checkmark-circle"
                color={Colors.success}
              />
              <StatMini
                label="Pending"
                value={stats.pending}
                icon="time"
                color={Colors.warning}
              />
              <StatMini
                label="Rejected"
                value={stats.rejected}
                icon="close-circle"
                color={Colors.error}
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
            {STATUS_FILTERS.map((f) => {
              const isActive = statusFilter === f.value;
              return (
                <TouchableOpacity
                  key={f.value}
                  style={[
                    styles.filterChip,
                    isActive && {
                      backgroundColor: f.color,
                      borderColor: f.color,
                    },
                  ]}
                  onPress={() => setStatusFilter(f.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={f.icon}
                    size={13}
                    color={isActive ? "#fff" : f.color}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && styles.filterChipTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Category Filters */}
        <View style={styles.categoryFilters}>
          {(["MARKETING", "UTILITY", "AUTHENTICATION"] as TemplateCategory[]).map(
            (cat) => {
              const isActive = categoryFilter === cat;
              const color = CATEGORY_COLORS[cat];
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    isActive && {
                      backgroundColor: `${color}15`,
                      borderColor: color,
                    },
                  ]}
                  onPress={() =>
                    setCategoryFilter(isActive ? null : cat)
                  }
                >
                  <View
                    style={[styles.categoryDot, { backgroundColor: color }]}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      isActive && { color, fontWeight: "800" },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </View>

        {/* Templates List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : templates.length === 0 ? (
          <EmptyState
            hasFilters={!!hasActiveFilters || !!search}
            onCreate={() => router.push("/(app)/templates/create" as never)}
          />
        ) : (
          <View style={styles.templatesList}>
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPress={() =>
                  router.push(`/(app)/templates/${template.id}` as never)
                }
                onDuplicate={() => handleDuplicate(template)}
                onDelete={() => handleDelete(template)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(app)/templates/create" as never)}
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
// TEMPLATE CARD
// ═══════════════════════════════════

function TemplateCard({
  template,
  onPress,
  onDuplicate,
  onDelete,
}: {
  template: Template;
  onPress: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const statusConfig = {
    APPROVED: {
      color: Colors.success,
      bg: `${Colors.success}15`,
      icon: "checkmark-circle" as const,
      label: "Approved",
    },
    PENDING: {
      color: Colors.warning,
      bg: `${Colors.warning}15`,
      icon: "time" as const,
      label: "Pending",
    },
    REJECTED: {
      color: Colors.error,
      bg: `${Colors.error}15`,
      icon: "close-circle" as const,
      label: "Rejected",
    },
    DRAFT: {
      color: Colors.textMuted,
      bg: `${Colors.textMuted}15`,
      icon: "document" as const,
      label: "Draft",
    },
  }[template.status] || {
    color: Colors.textMuted,
    bg: Colors.surfaceSecondary,
    icon: "help" as const,
    label: template.status,
  };

  const categoryColor = CATEGORY_COLORS[template.category] || Colors.textMuted;

  const getHeaderIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (template.headerType?.toUpperCase()) {
      case "IMAGE":
        return "image";
      case "VIDEO":
        return "videocam";
      case "DOCUMENT":
        return "document";
      case "TEXT":
        return "text";
      default:
        return "chatbubble-ellipses";
    }
  };

  const bodyPreview =
    template.bodyText?.substring(0, 100) +
    (template.bodyText?.length > 100 ? "..." : "");

  const variableCount = template.variables?.length || 0;
  const buttonCount = template.buttons?.length || 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      onLongPress={() => {
        Alert.alert(template.name, "Choose an action", [
          { text: "Cancel", style: "cancel" },
          { text: "Duplicate", onPress: onDuplicate },
          { text: "Delete", style: "destructive", onPress: onDelete },
        ]);
      }}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.templateIcon}>
            <Ionicons
              name={getHeaderIcon()}
              size={20}
              color={Colors.primary}
            />
          </View>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {template.name}
            </Text>
            <View style={styles.cardMeta}>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: `${categoryColor}15` },
                ]}
              >
                <Text style={[styles.categoryLabel, { color: categoryColor }]}>
                  {template.category}
                </Text>
              </View>
              <Text style={styles.langText}>{template.language}</Text>
            </View>
          </View>
        </View>

        <View
          style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}
        >
          <Ionicons
            name={statusConfig.icon}
            size={11}
            color={statusConfig.color}
          />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Body Preview */}
      <Text style={styles.bodyPreview} numberOfLines={2}>
        {bodyPreview || "No body text"}
      </Text>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.cardFooterLeft}>
          {variableCount > 0 && (
            <View style={styles.footerBadge}>
              <Ionicons name="code" size={11} color={Colors.warning} />
              <Text style={styles.footerBadgeText}>
                {variableCount} var{variableCount !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
          {buttonCount > 0 && (
            <View style={styles.footerBadge}>
              <Ionicons name="apps" size={11} color={Colors.info} />
              <Text style={styles.footerBadgeText}>
                {buttonCount} btn{buttonCount !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
          {template.headerType && template.headerType !== "NONE" && (
            <View style={styles.footerBadge}>
              <Ionicons
                name={getHeaderIcon()}
                size={11}
                color={Colors.success}
              />
              <Text style={styles.footerBadgeText}>
                {template.headerType}
              </Text>
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>

      {/* Rejection Reason */}
      {template.status === "REJECTED" && template.rejectionReason && (
        <View style={styles.rejectionCard}>
          <Ionicons name="alert-circle" size={14} color={Colors.error} />
          <Text style={styles.rejectionText} numberOfLines={2}>
            {template.rejectionReason}
          </Text>
        </View>
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
      <Text style={styles.statMiniValue}>{value.toLocaleString("en-IN")}</Text>
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
          name={hasFilters ? "search" : "document-text-outline"}
          size={48}
          color={Colors.textMuted}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {hasFilters ? "No templates found" : "No templates yet"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {hasFilters
          ? "Try adjusting your filters"
          : "Create your first WhatsApp template to start"}
      </Text>
      {!hasFilters && (
        <TouchableOpacity style={styles.emptyBtn} onPress={onCreate}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.emptyBtnText}>Create Template</Text>
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
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
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
  headerActions: {
    flexDirection: "row",
    gap: 4,
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

  // Stats
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

  // Filters
  filtersWrap: {
    backgroundColor: Colors.surface,
    paddingVertical: 10,
  },
  filtersRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingRight: 30,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 5,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: "#fff",
  },

  categoryFilters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  categoryChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 6,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
  },

  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },

  templatesList: {
    padding: 16,
    gap: 12,
  },

  // Card
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
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  langText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  bodyPreview: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  cardFooterLeft: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
  },
  footerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  footerBadgeText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "700",
  },

  rejectionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${Colors.error}10`,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: `${Colors.error}20`,
  },
  rejectionText: {
    flex: 1,
    fontSize: 11,
    color: Colors.error,
    fontWeight: "600",
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
