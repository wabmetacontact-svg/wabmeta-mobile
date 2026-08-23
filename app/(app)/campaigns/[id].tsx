// app/(app)/campaigns/[id].tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { campaigns as campaignsApi } from "../../../src/services/api";
import { useCampaignRealtime } from "../../../src/hooks/useCampaignRealtime";
import { Colors } from "../../../src/constants/colors";
import {
  Campaign,
  CampaignContact,
  DetailedStats,
} from "../../../src/types/campaign";

// ═══════════════════════════════════

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  PENDING: { label: "Pending", color: Colors.warning, icon: "time" },
  QUEUED: { label: "Queued", color: "#F97316", icon: "hourglass" },
  SENT: { label: "Sent", color: Colors.info, icon: "send" },
  DELIVERED: {
    label: "Delivered",
    color: Colors.success,
    icon: "checkmark-done",
  },
  READ: { label: "Read", color: "#10B981", icon: "eye" },
  FAILED: { label: "Failed", color: Colors.error, icon: "close-circle" },
};

const timeAgo = (date?: string): string => {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const cleanPhone = (p: string) => (p || "").replace(/^\+/, "");

const getDisplayName = (c: CampaignContact): string => {
  const n = c.name || "";
  if (n && n !== "Unknown" && n.trim()) return n;
  return cleanPhone(c.phone);
};

// ═══════════════════════════════════

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [contacts, setContacts] = useState<CampaignContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<
    "overview" | "recipients" | "failures"
  >("overview");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecipients, setTotalRecipients] = useState(0);

  const [actionLoading, setActionLoading] = useState(false);

  const lastStatsRef = useRef<number>(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    progress,
    isProcessing,
    completedStats,
    contactStatusMap,
    isConnected,
    resetStats,
  } = useCampaignRealtime(id || null);

  // ═══════════════════════════════════
  // MERGED LIVE STATS
  // ═══════════════════════════════════

  const liveStats = useMemo((): DetailedStats | null => {
    if (!stats) return null;
    if (!progress || !isProcessing) return stats;

    const total = Math.max(progress.total, stats.totalContacts, 1);
    const sent = Math.min(progress.sent, total);
    const failed = Math.min(progress.failed, Math.max(0, total - sent));
    const delivered = Math.min(progress.delivered, sent);
    const read = Math.min(progress.read, delivered);
    const pending = Math.max(0, total - sent - failed);

    return {
      ...stats,
      totalContacts: total,
      sent,
      failed,
      delivered,
      read,
      pending,
      queued: 0,
    };
  }, [stats, progress, isProcessing]);

  // Live contacts with real-time updates
  const liveContacts = useMemo(() => {
    if (contactStatusMap.size === 0) return contacts;
    return contacts.map((c) => {
      const upd = contactStatusMap.get(c.contactId);
      if (!upd) return c;
      return {
        ...c,
        status: upd.status,
        sentAt: upd.sentAt || c.sentAt,
        deliveredAt: upd.deliveredAt || c.deliveredAt,
        readAt: upd.readAt || c.readAt,
        failedAt: upd.failedAt || c.failedAt,
        failureReason: upd.error || c.failureReason,
      };
    });
  }, [contacts, contactStatusMap]);

  // ═══════════════════════════════════
  // FETCH
  // ═══════════════════════════════════

  const fetchCampaign = useCallback(async () => {
    if (!id || id === "[id]") return;
    try {
      const res = await campaignsApi.getById(id);
      if (res?.data?.success !== false && (res?.data?.data || res?.data)) {
        const campaignData = (res.data?.data as any)?.campaign || res.data?.data || res.data;
        setCampaign(campaignData as Campaign);
      }
    } catch (err) {
      console.error("Fetch campaign error:", err);
    }
  }, [id]);

  const fetchStats = useCallback(async () => {
    if (!id || id === "[id]") return;
    try {
      const res = await campaignsApi.getDetailedStats(id);
      if (res?.data?.success !== false && (res?.data?.data || res?.data)) {
        setStats((res.data?.data || res.data) as DetailedStats);
        lastStatsRef.current = Date.now();
      }
    } catch (err) {
      console.error("Fetch stats error:", err);
    }
  }, [id]);

  const fetchContacts = useCallback(
    async (pageNum = 1, silent = false) => {
      if (!id || id === "[id]") return;
      try {
        if (!silent) setContactsLoading(true);
        const params: any = { page: pageNum, limit: 30 };
        if (filterStatus !== "all") params.status = filterStatus;
        if (search.trim()) params.search = search.trim();

        const res = await campaignsApi.getContacts(id, params);
        if (res?.data?.success !== false && (res?.data?.data || Array.isArray(res?.data))) {
          const data = res.data?.data ?? res.data;
          const list = Array.isArray(data)
            ? data
            : data?.contacts || data?.recipients || [];
          setContacts(list);
          const meta = (res.data as any)?.meta || (data as any)?.meta || {};
          setTotalPages(meta.totalPages || 1);
          setTotalRecipients(meta.total || list.length);
        }
      } catch (err) {
        console.error("Contacts error:", err);
      } finally {
        setContactsLoading(false);
      }
    },
    [id, filterStatus, search]
  );

  // Initial load
  useEffect(() => {
    const init = async () => {
      if (!id || id === "[id]") {
        setLoading(false);
        return;
      }
      setLoading(true);
      resetStats();
      await Promise.all([fetchCampaign(), fetchStats()]);
      setLoading(false);
    };
    init();
  }, [id]);

  // Fetch contacts when tab/filter changes
  useEffect(() => {
    if (activeTab === "recipients" || activeTab === "failures") {
      const statusOverride = activeTab === "failures" ? "FAILED" : filterStatus;
      if (statusOverride !== filterStatus && activeTab === "failures") {
        setFilterStatus("FAILED");
      }
      fetchContacts(1);
      setPage(1);
    }
  }, [activeTab, filterStatus]);

  // Debounced search
  useEffect(() => {
    if (activeTab === "overview") return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchContacts(1);
      setPage(1);
    }, 400);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // Smart refresh during RUNNING
  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      if (Date.now() - lastStatsRef.current > 15_000) {
        fetchStats();
      }
    }, 5_000);
    return () => clearInterval(interval);
  }, [isProcessing, fetchStats]);

  // Handle completion
  useEffect(() => {
    if (!completedStats) return;
    Alert.alert(
      "Campaign Completed!",
      `${completedStats.sentCount} sent, ${completedStats.failedCount} failed`
    );
    setTimeout(() => {
      fetchCampaign();
      fetchStats();
    }, 1000);
  }, [completedStats]);

  // ═══════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchCampaign(), fetchStats()]);
    if (activeTab !== "overview") {
      await fetchContacts(page);
    }
    setRefreshing(false);
  };

  const handleAction = async (
    action: "start" | "pause" | "resume" | "cancel"
  ) => {
    if (!id || !campaign) return;
    try {
      setActionLoading(true);
      if (action === "start") await campaignsApi.start(id);
      if (action === "pause") await campaignsApi.pause(id);
      if (action === "resume") await campaignsApi.resume(id);
      if (action === "cancel") await campaignsApi.cancel(id);

      Alert.alert("Success", `Campaign ${action}d successfully`);
      await fetchCampaign();
      await fetchStats();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || `Failed to ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!id) return;
    Alert.alert(
      "Retry Failed",
      "Retry sending to all failed contacts?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Retry",
          onPress: async () => {
            try {
              setActionLoading(true);
              await campaignsApi.retry(id, { retryFailed: true });
              Alert.alert("Success", "Retrying failed messages...");
              await fetchCampaign();
              await fetchStats();
              await fetchContacts(page);
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || "Failed");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDuplicate = () => {
    if (!campaign) return;
    Alert.alert(
      "Duplicate Campaign",
      `Duplicate "${campaign.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Duplicate",
          onPress: async () => {
            try {
              const res = await campaignsApi.duplicate(campaign.id, `${campaign.name} (Copy)`);
              if (res?.data?.data?.id) {
                Alert.alert("Success", "Campaign duplicated!");
                router.replace(`/(app)/campaigns/${res.data.data.id}` as never);
              }
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || "Failed");
            }
          },
        },
      ]
    );
  };

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!campaign) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyWrap}>
          <Ionicons name="megaphone-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.errorTitle}>Campaign Not Found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayStats = liveStats || stats;
  const total = displayStats?.totalContacts || 0;
  const sent = displayStats?.sent || 0;
  const delivered = displayStats?.delivered || 0;
  const read = displayStats?.read || 0;
  const failed = displayStats?.failed || 0;
  const pending = displayStats?.pending || 0;

  const progressPercent =
    total > 0 ? Math.min(100, Math.round(((sent + failed) / total) * 100)) : 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {campaign.name}
          </Text>
          <View style={styles.headerStatusRow}>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: `${
                    STATUS_CONFIG[campaign.status]?.color || Colors.textMuted
                  }15`,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  {
                    color:
                      STATUS_CONFIG[campaign.status]?.color ||
                      Colors.textMuted,
                  },
                ]}
              >
                {campaign.status}
              </Text>
            </View>
            {campaign.status === "RUNNING" && (
              <View style={styles.liveBadge}>
                <View
                  style={[
                    styles.liveDot,
                    { backgroundColor: isConnected ? Colors.success : Colors.warning },
                  ]}
                />
                <Text
                  style={[
                    styles.liveText,
                    { color: isConnected ? Colors.success : Colors.warning },
                  ]}
                >
                  {isConnected ? "LIVE" : "SYNC"}
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={handleDuplicate}
          style={styles.iconBtn}
        >
          <Ionicons name="copy-outline" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

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
        {/* Progress Hero Card */}
        <View style={styles.heroCardWrap}>
          <LinearGradient
            colors={
              campaign.status === "COMPLETED"
                ? ["#8B5CF6", "#7C3AED"]
                : campaign.status === "FAILED"
                ? [Colors.error, "#DC2626"]
                : campaign.status === "PAUSED"
                ? [Colors.warning, "#D97706"]
                : [Colors.primary, "#0A7061"]
            }
            style={styles.heroCard}
          >
            <View style={styles.heroCircle1} />
            <View style={styles.heroCircle2} />

            <View style={styles.heroContent}>
              <Text style={styles.heroLabel}>Progress</Text>
              <Text style={styles.heroPercent}>{progressPercent}%</Text>

              <View style={styles.heroProgressBar}>
                <View
                  style={[
                    styles.heroProgressFill,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>

              <View style={styles.heroMetrics}>
                <View style={styles.heroMetric}>
                  <Text style={styles.heroMetricValue}>
                    {(sent + failed).toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.heroMetricLabel}>Processed</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroMetric}>
                  <Text style={styles.heroMetricValue}>
                    {total.toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.heroMetricLabel}>Total</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          {(campaign.status === "DRAFT" ||
            campaign.status === "SCHEDULED") && (
            <ActionButton
              icon="play"
              label="Start"
              color={Colors.success}
              onPress={() => handleAction("start")}
              loading={actionLoading}
            />
          )}

          {campaign.status === "RUNNING" && (
            <ActionButton
              icon="pause"
              label="Pause"
              color={Colors.warning}
              onPress={() => handleAction("pause")}
              loading={actionLoading}
            />
          )}

          {campaign.status === "PAUSED" && (
            <ActionButton
              icon="play"
              label="Resume"
              color={Colors.success}
              onPress={() => handleAction("resume")}
              loading={actionLoading}
            />
          )}

          {failed > 0 && (
            <ActionButton
              icon="refresh"
              label={`Retry ${failed}`}
              color={Colors.error}
              onPress={handleRetryFailed}
              loading={actionLoading}
            />
          )}

          {(campaign.status === "RUNNING" ||
            campaign.status === "PAUSED") && (
            <ActionButton
              icon="close"
              label="Cancel"
              color={Colors.textMuted}
              onPress={() =>
                Alert.alert("Cancel", "Cancel this campaign?", [
                  { text: "No" },
                  {
                    text: "Yes",
                    onPress: () => handleAction("cancel"),
                  },
                ])
              }
              loading={actionLoading}
            />
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {[
            { id: "overview" as const, label: "Overview", icon: "grid" as const },
            {
              id: "recipients" as const,
              label: "Recipients",
              icon: "people" as const,
            },
            {
              id: "failures" as const,
              label: `Failures${failed > 0 ? ` (${failed})` : ""}`,
              icon: "alert-circle" as const,
            },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabBtn,
                activeTab === tab.id && styles.tabBtnActive,
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={activeTab === tab.id ? Colors.primary : Colors.textMuted}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === "overview" && (
            <OverviewTab
              stats={displayStats}
              campaign={campaign}
              isProcessing={isProcessing}
            />
          )}

          {(activeTab === "recipients" || activeTab === "failures") && (
            <RecipientsTab
              contacts={liveContacts}
              loading={contactsLoading}
              search={search}
              onSearchChange={setSearch}
              filterStatus={activeTab === "failures" ? "FAILED" : filterStatus}
              onFilterChange={setFilterStatus}
              showFilters={activeTab === "recipients"}
              totalRecipients={totalRecipients}
              page={page}
              totalPages={totalPages}
              onPageChange={(newPage: number) => {
                setPage(newPage);
                fetchContacts(newPage);
              }}
              contactStatusMap={contactStatusMap}
            />
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════

function OverviewTab({
  stats,
  campaign,
  isProcessing,
}: {
  stats: DetailedStats | null;
  campaign: Campaign;
  isProcessing: boolean;
}) {
  if (!stats) return null;

  return (
    <View>
      {/* Stats Grid */}
      <View style={styles.overviewGrid}>
        <OverviewStat
          label="Recipients"
          value={stats.totalContacts}
          icon="people"
          color={Colors.info}
        />
        <OverviewStat
          label="Pending"
          value={stats.pending + stats.queued}
          icon="time"
          color={Colors.warning}
          pulse={isProcessing && stats.pending > 0}
        />
      </View>

      <View style={styles.overviewGrid}>
        <OverviewStat
          label="Sent"
          value={stats.sent}
          icon="send"
          color="#8B5CF6"
        />
        <OverviewStat
          label="Delivered"
          value={stats.delivered}
          icon="checkmark-done"
          color={Colors.success}
        />
      </View>

      <View style={styles.overviewGrid}>
        <OverviewStat
          label="Read"
          value={stats.read}
          icon="eye"
          color="#10B981"
        />
        <OverviewStat
          label="Failed"
          value={stats.failed}
          icon="close-circle"
          color={Colors.error}
        />
      </View>

      {/* Rates */}
      <View style={styles.ratesCard}>
        <Text style={styles.ratesTitle}>Performance</Text>
        <View style={styles.rateRow}>
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>Success Rate</Text>
            <Text style={[styles.rateValue, { color: Colors.success }]}>
              {stats.successRate}%
            </Text>
          </View>
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>Delivery Rate</Text>
            <Text style={[styles.rateValue, { color: Colors.info }]}>
              {stats.deliveryRate}%
            </Text>
          </View>
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>Read Rate</Text>
            <Text style={[styles.rateValue, { color: "#10B981" }]}>
              {stats.readRate}%
            </Text>
          </View>
        </View>
      </View>

      {/* Failure Reasons */}
      {stats.failureReasons && stats.failureReasons.length > 0 && (
        <View style={styles.failuresCard}>
          <View style={styles.failuresHeader}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.failuresTitle}>Failure Analysis</Text>
          </View>
          {stats.failureReasons.slice(0, 5).map((fr, i) => (
            <View key={i} style={styles.failureItem}>
              <Text style={styles.failureReason} numberOfLines={2}>
                {fr.reason}
              </Text>
              <View style={styles.failureCountBadge}>
                <Text style={styles.failureCount}>{fr.count}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Template Info */}
      {campaign.templateName && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Campaign Details</Text>
          <InfoRow icon="document-text" label="Template" value={campaign.templateName} />
          {campaign.whatsappAccountPhone && (
            <InfoRow
              icon="logo-whatsapp"
              label="WhatsApp"
              value={campaign.whatsappAccountPhone}
            />
          )}
          <InfoRow
            icon="calendar"
            label="Created"
            value={new Date(campaign.createdAt).toLocaleString("en-IN")}
          />
          {campaign.scheduledAt && (
            <InfoRow
              icon="time"
              label="Scheduled"
              value={new Date(campaign.scheduledAt).toLocaleString("en-IN")}
            />
          )}
          {campaign.completedAt && (
            <InfoRow
              icon="checkmark-circle"
              label="Completed"
              value={new Date(campaign.completedAt).toLocaleString("en-IN")}
            />
          )}
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════
// RECIPIENTS TAB
// ═══════════════════════════════════

function RecipientsTab({
  contacts,
  loading,
  search,
  onSearchChange,
  filterStatus,
  onFilterChange,
  showFilters,
  totalRecipients,
  page,
  totalPages,
  onPageChange,
  contactStatusMap,
}: any) {
  return (
    <View>
      {/* Search */}
      <View style={styles.recipientSearch}>
        <View style={styles.recipientSearchBox}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.recipientSearchInput}
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search by phone or name..."
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      {/* Filters */}
      {showFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recipientFilters}
        >
          {["all", "SENT", "DELIVERED", "READ", "FAILED", "PENDING"].map(
            (s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.filterChipSmall,
                  filterStatus === s && styles.filterChipSmallActive,
                ]}
                onPress={() => onFilterChange(s)}
              >
                <Text
                  style={[
                    styles.filterChipSmallText,
                    filterStatus === s && styles.filterChipSmallTextActive,
                  ]}
                >
                  {s === "all" ? "All" : STATUS_CONFIG[s]?.label || s}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      )}

      {/* Total */}
      <View style={styles.recipientsCount}>
        <Text style={styles.recipientsCountText}>
          {totalRecipients.toLocaleString("en-IN")} recipient
          {totalRecipients !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.recipientsLoading}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.recipientsEmpty}>
          <Ionicons
            name="people-outline"
            size={40}
            color={Colors.textMuted}
          />
          <Text style={styles.recipientsEmptyText}>No recipients found</Text>
        </View>
      ) : (
        <View style={styles.recipientsList}>
          {contacts.map((contact: CampaignContact) => {
            const config = STATUS_CONFIG[contact.status] || STATUS_CONFIG.PENDING;
            const name = getDisplayName(contact);
            const phone = cleanPhone(contact.phone);
            const isLive = contactStatusMap.has(contact.contactId);

            return (
              <View
                key={contact.id}
                style={[
                  styles.recipientItem,
                  isLive && styles.recipientItemLive,
                ]}
              >
                <View
                  style={[
                    styles.recipientIcon,
                    { backgroundColor: `${config.color}15` },
                  ]}
                >
                  <Ionicons name={config.icon} size={16} color={config.color} />
                </View>

                <View style={styles.recipientContent}>
                  <View style={styles.recipientHeader}>
                    <Text style={styles.recipientName} numberOfLines={1}>
                      {name}
                    </Text>
                    <View
                      style={[
                        styles.recipientStatusBadge,
                        { backgroundColor: `${config.color}15` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.recipientStatusText,
                          { color: config.color },
                        ]}
                      >
                        {config.label}
                      </Text>
                    </View>
                  </View>

                  {name !== phone && (
                    <Text style={styles.recipientPhone}>+{phone}</Text>
                  )}

                  {/* Timeline */}
                  <View style={styles.recipientTimeline}>
                    {contact.sentAt && (
                      <Text style={styles.recipientTime}>
                        Sent {timeAgo(contact.sentAt)}
                      </Text>
                    )}
                    {contact.deliveredAt && (
                      <>
                        <Text style={styles.recipientDot}>•</Text>
                        <Text style={styles.recipientTime}>
                          Delivered {timeAgo(contact.deliveredAt)}
                        </Text>
                      </>
                    )}
                    {contact.readAt && (
                      <>
                        <Text style={styles.recipientDot}>•</Text>
                        <Text style={styles.recipientTime}>
                          Read {timeAgo(contact.readAt)}
                        </Text>
                      </>
                    )}
                  </View>

                  {/* Failure reason */}
                  {contact.failureReason && (
                    <View style={styles.recipientError}>
                      <Text
                        style={styles.recipientErrorText}
                        numberOfLines={2}
                      >
                        ⚠ {contact.failureReason}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[
              styles.pageBtn,
              page === 1 && styles.pageBtnDisabled,
            ]}
            onPress={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <Ionicons name="chevron-back" size={16} color={Colors.textPrimary} />
            <Text style={styles.pageBtnText}>Prev</Text>
          </TouchableOpacity>

          <Text style={styles.pageText}>
            Page <Text style={styles.pageNumber}>{page}</Text> of {totalPages}
          </Text>

          <TouchableOpacity
            style={[
              styles.pageBtn,
              page === totalPages && styles.pageBtnDisabled,
            ]}
            onPress={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            <Text style={styles.pageBtnText}>Next</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════

function ActionButton({
  icon,
  label,
  color,
  onPress,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: `${color}15` }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        <>
          <Ionicons name={icon} size={16} color={color} />
          <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function OverviewStat({
  label,
  value,
  icon,
  color,
  pulse,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  pulse?: boolean;
}) {
  return (
    <View style={styles.overviewStat}>
      <View style={[styles.overviewIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.overviewValue}>
        {value.toLocaleString("en-IN")}
      </Text>
      <Text style={styles.overviewLabel}>{label}</Text>
    </View>
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
      <Ionicons name={icon} size={16} color={Colors.textMuted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════
// STYLES
// ═══════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
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
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
    maxWidth: 200,
  },
  headerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Hero Card
  heroCardWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  heroCard: {
    padding: 24,
    position: "relative",
    overflow: "hidden",
  },
  heroCircle1: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -50,
    right: -30,
  },
  heroCircle2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -30,
    left: -20,
  },
  heroContent: { alignItems: "center" },
  heroLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    marginBottom: 4,
  },
  heroPercent: {
    fontSize: 56,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -2,
    marginBottom: 16,
  },
  heroProgressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 20,
  },
  heroProgressFill: {
    height: "100%",
    backgroundColor: "#fff",
  },
  heroMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  heroMetric: { alignItems: "center" },
  heroMetricValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  heroMetricLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  // Actions
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Tabs
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: `${Colors.primary}15`,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
  },

  tabContent: {
    padding: 16,
  },

  // Overview
  overviewGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  overviewStat: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  overviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  overviewLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: "600",
  },

  ratesCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: 6,
  },
  ratesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rateRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  rateItem: { alignItems: "center" },
  rateLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: "600",
  },
  rateValue: {
    fontSize: 22,
    fontWeight: "800",
  },

  failuresCard: {
    backgroundColor: `${Colors.error}08`,
    borderWidth: 1,
    borderColor: `${Colors.error}20`,
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
  },
  failuresHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  failuresTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.error,
  },
  failureItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  failureReason: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: "500",
    lineHeight: 16,
  },
  failureCountBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 30,
    alignItems: "center",
  },
  failureCount: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },

  infoCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: 12,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
    width: 90,
  },
  infoValue: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: "600",
  },

  // Recipients
  recipientSearch: {
    marginBottom: 12,
  },
  recipientSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  recipientSearchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    padding: 0,
  },

  recipientFilters: {
    gap: 8,
    paddingBottom: 12,
  },
  filterChipSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipSmallActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipSmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  filterChipSmallTextActive: {
    color: "#fff",
  },

  recipientsCount: {
    marginBottom: 10,
  },
  recipientsCountText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "600",
  },

  recipientsLoading: {
    padding: 40,
    alignItems: "center",
  },
  recipientsEmpty: {
    padding: 40,
    alignItems: "center",
    gap: 10,
  },
  recipientsEmptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },

  recipientsList: {
    gap: 8,
  },
  recipientItem: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  recipientItemLive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  recipientIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  recipientContent: { flex: 1 },
  recipientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  recipientStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recipientStatusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  recipientPhone: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  recipientTimeline: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
  },
  recipientTime: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  recipientDot: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  recipientError: {
    marginTop: 6,
    padding: 6,
    backgroundColor: `${Colors.error}10`,
    borderRadius: 6,
  },
  recipientErrorText: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: "600",
  },

  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  pageText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  pageNumber: {
    fontWeight: "700",
    color: Colors.textPrimary,
  },
});
