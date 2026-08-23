// app/(app)/(tabs)/campaigns.tsx - CLEAN FIXED VERSION
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { campaigns as campaignsApi } from "../../../src/services/api";
import { useSocket } from "../../../src/context/SocketContext";
import { Colors } from "../../../src/constants/colors";
import { useAuth } from "../../../src/context/AuthContext";
import { useFeatureLock } from "../../../src/hooks/useFeatureLock";
import { LockedFeatureView } from "../../../src/components/common/LockedFeatureView";
import {
  Campaign,
  CampaignStats,
  CampaignStatus,
} from "../../../src/types/campaign";
import { CampaignCard } from "../../../src/components/campaigns/CampaignCard";
import { WalletCostSheet } from "../../../src/components/campaigns/WalletCostSheet";

const STATUS_FILTERS = [
  { value: "all", label: "All", color: Colors.textPrimary },
  { value: "RUNNING", label: "Running", color: Colors.success },
  { value: "SCHEDULED", label: "Scheduled", color: Colors.info },
  { value: "COMPLETED", label: "Completed", color: "#8B5CF6" },
  { value: "DRAFT", label: "Draft", color: Colors.textMuted },
  { value: "PAUSED", label: "Paused", color: Colors.warning },
  { value: "FAILED", label: "Failed", color: Colors.error },
];

export default function CampaignsScreen() {
  const { socket, isConnected } = useSocket();
  const { organization } = useAuth();
  const campaignsLocked = useFeatureLock("campaigns");

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showCostSheet, setShowCostSheet] = useState(false);
  const [costEstimate, setCostEstimate] = useState<any>(null);
  const [costLoading, setCostLoading] = useState(false);
  const [pendingCampaign, setPendingCampaign] = useState<Campaign | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ═══════════════════════════════════
  // FETCH
  // ═══════════════════════════════════

  const fetchCampaigns = useCallback(async () => {
    try {
      const params: any = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await campaignsApi.getAll(params);

      if (res?.data?.success !== false && (res?.data?.data || Array.isArray(res?.data))) {
        const data = res.data?.data ?? res.data;
        const list = Array.isArray(data)
          ? data
          : data?.campaigns || data?.items || [];
        setCampaigns(list);
      }
    } catch (err: any) {
      console.error("Campaigns error:", err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await campaignsApi.stats();
      if (res?.data?.success !== false && (res?.data?.data || res?.data)) {
        setStats((res.data?.data || res.data) as CampaignStats);
      }
    } catch (err) {
      console.error("Stats error:", err);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchCampaigns();
    }, 400);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // ═══════════════════════════════════
  // SOCKET
  // ═══════════════════════════════════

  useEffect(() => {
    if (!socket || !isConnected) return;

    const onUpdate = (data: any) => {
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === data.campaignId
            ? {
                ...c,
                status: data.status ?? c.status,
                totalContacts: data.totalContacts ?? c.totalContacts,
                sentCount: data.sentCount ?? c.sentCount,
                deliveredCount: data.deliveredCount ?? c.deliveredCount,
                readCount: data.readCount ?? c.readCount,
                failedCount: data.failedCount ?? c.failedCount,
              }
            : c
        )
      );
    };

    const onProgress = (data: any) => {
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === data.campaignId
            ? {
                ...c,
                sentCount: data.sent,
                failedCount: data.failed,
                deliveredCount: data.delivered,
                readCount: data.read,
                totalContacts: data.total ?? c.totalContacts,
                status: (data.status || c.status) as CampaignStatus,
              }
            : c
        )
      );
    };

    const onCompleted = (data: any) => {
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === data.campaignId
            ? {
                ...c,
                status: "COMPLETED",
                sentCount: data.sentCount,
                failedCount: data.failedCount,
                deliveredCount: data.deliveredCount,
              }
            : c
        )
      );
      fetchStats();
    };

    socket.on("campaign:update", onUpdate);
    socket.on("campaign:progress", onProgress);
    socket.on("campaign:completed", onCompleted);

    return () => {
      socket.off("campaign:update", onUpdate);
      socket.off("campaign:progress", onProgress);
      socket.off("campaign:completed", onCompleted);
    };
  }, [socket, isConnected, fetchStats]);

  // ═══════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════

  const onRefresh = () => {
    setRefreshing(true);
    fetchCampaigns();
    fetchStats();
  };

  const handleStart = async (campaign: Campaign) => {
    setPendingCampaign(campaign);
    setCostEstimate(null);
    setCostLoading(true);
    setShowCostSheet(true);

    try {
      const res = await campaignsApi.estimateCost(campaign.id);
      setCostEstimate(res.data?.data);
    } catch (e: any) {
      console.warn("Cost estimate failed:", e.message);
    } finally {
      setCostLoading(false);
    }
  };

  const confirmStart = async () => {
    if (!pendingCampaign) return;
    setShowCostSheet(false);

    try {
      setActionLoading(pendingCampaign.id);
      await campaignsApi.start(pendingCampaign.id);
      Alert.alert("Success", "Campaign started!");
      fetchCampaigns();
      fetchStats();
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Failed to start";
      if (msg.includes("WALLET_")) {
        Alert.alert(
          "Wallet Balance Low",
          "Please top up your wallet to continue.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Go to Wallet",
              onPress: () => router.push("/(app)/wallet" as never),
            },
          ]
        );
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setActionLoading(null);
      setPendingCampaign(null);
    }
  };

  const handleAction = async (
    action: "pause" | "resume" | "cancel",
    id: string
  ) => {
    try {
      setActionLoading(id);
      if (action === "pause") await campaignsApi.pause(id);
      if (action === "resume") await campaignsApi.resume(id);
      if (action === "cancel") await campaignsApi.cancel(id);
      Alert.alert("Success", `Campaign ${action}d`);
      fetchCampaigns();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = (campaign: Campaign) => {
    if (campaign.status === "RUNNING") {
      Alert.alert("Cannot Delete", "Pause the campaign before deleting");
      return;
    }

    Alert.alert("Delete Campaign", `Delete "${campaign.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await campaignsApi.delete(campaign.id);
            Alert.alert("Success", "Campaign deleted");
            fetchCampaigns();
            fetchStats();
          } catch {
            Alert.alert("Error", "Failed to delete");
          }
        },
      },
    ]);
  };

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  if (campaignsLocked) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <LockedFeatureView
          feature="campaigns"
          planType={organization?.planType}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Campaigns</Text>
          {stats && (
            <Text style={styles.headerSubtitle}>
              {stats.total} total • {(stats.totalSent || 0).toLocaleString()} sent
            </Text>
          )}
        </View>
      </View>

      {/* Stats Cards */}
      {stats && (
        <View style={styles.statsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsRow}
          >
            <StatMini
              label="Total"
              value={stats.total}
              icon="megaphone"
              color={Colors.info}
            />
            <StatMini
              label="Sent"
              value={stats.totalSent || 0}
              icon="send"
              color="#8B5CF6"
            />
            <StatMini
              label="Delivered"
              value={stats.totalDelivered || 0}
              icon="checkmark-done"
              color={Colors.success}
            />
            <StatMini
              label="Read"
              value={stats.totalRead || 0}
              icon="eye"
              color="#10B981"
            />
          </ScrollView>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search campaigns..."
            placeholderTextColor={Colors.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
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

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : campaigns.length === 0 ? (
        <EmptyState onCreate={() => router.push("/(app)/campaigns/create" as never)} />
      ) : (
        <FlatList
          data={campaigns}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CampaignCard
              campaign={item}
              actionLoading={actionLoading === item.id}
              onPress={() =>
                router.push(`/(app)/campaigns/${item.id}` as never)
              }
              onStart={() => handleStart(item)}
              onPause={() => handleAction("pause", item.id)}
              onResume={() => handleAction("resume", item.id)}
              onCancel={() => handleAction("cancel", item.id)}
              onDelete={() => handleDelete(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(app)/campaigns/create" as never)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[Colors.primary, "#0A7061"]}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Wallet Cost Sheet */}
      <WalletCostSheet
        visible={showCostSheet}
        estimate={costEstimate}
        loading={costLoading}
        campaignName={pendingCampaign?.name || ""}
        onConfirm={confirmStart}
        onClose={() => {
          setShowCostSheet(false);
          setPendingCampaign(null);
        }}
      />
    </SafeAreaView>
  );
}

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
  const formatValue = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return (v || 0).toString();
  };

  return (
    <View style={styles.statMini}>
      <View style={[styles.statMiniIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statMiniValue}>{formatValue(value)}</Text>
      <Text style={styles.statMiniLabel}>{label}</Text>
    </View>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="megaphone-outline" size={48} color={Colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>No campaigns yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first campaign to start sending bulk messages
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onCreate}>
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.emptyBtnText}>Create Campaign</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Better stats
  statsWrap: {
    backgroundColor: Colors.surface,
    paddingBottom: 8,
  },
  statsRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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

  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: Colors.surface,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    height: 42,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    padding: 0,
  },

  // Filters
  filtersContainer: {
    backgroundColor: Colors.surface,
    paddingBottom: 12,
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
    minWidth: 70,
    alignItems: "center",
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  listContent: {
    padding: 16,
    paddingBottom: 100,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
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

  fab: {
    position: "absolute",
    right: 20,
    bottom: 95,
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
