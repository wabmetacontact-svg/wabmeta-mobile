// app/(app)/crm/index.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { crm as crmApi } from "../../../src/services/api";
import { Colors } from "../../../src/constants/colors";
import { CRMStats, Pipeline, Lead } from "../../../src/types/crm";

export default function CRMScreen() {
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const pathname = usePathname();

  const loadData = useCallback(async () => {
    try {
      const [statsRes, pipesRes, leadsRes] = await Promise.allSettled([
        crmApi.getStats(),
        crmApi.getPipelines(),
        crmApi.getLeads({ limit: 5 }),
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value?.data?.success) {
        setStats(statsRes.value.data.data);
      } else {
        // No fabricated CRM numbers — show real zeros/empty state.
        setStats(null);
      }

      if (pipesRes.status === "fulfilled" && pipesRes.value?.data?.success) {
        const pList = Array.isArray(pipesRes.value.data.data) ? pipesRes.value.data.data : [];
        setPipelines(pList);
      } else {
        setPipelines([]);
      }

      if (leadsRes.status === "fulfilled" && leadsRes.value?.data?.success) {
        const lData = leadsRes.value.data.data;
        const lList = Array.isArray(lData) ? lData : lData?.leads || [];
        setRecentLeads(lList);
      }
    } catch (err) {
      console.error("CRM fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [pathname, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await crmApi.syncFromContacts();
      Alert.alert("Success", res.data?.message || "Contacts synced successfully");
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to sync");
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString("en-IN")}`;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>CRM</Text>
          <Text style={styles.headerSubtitle}>Manage leads & deals</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/(app)/crm/new" as any)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Lead</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Leads"
            value={stats?.totalLeads || 0}
            subtext={`${stats?.newLeads || 0} new this week`}
            icon="people"
            color="#3B82F6"
          />
          <StatCard
            label="Pipeline Value"
            value={formatCurrency(stats?.totalValue || 0)}
            subtext="Across all stages"
            icon="cash"
            color="#10B981"
          />
          <StatCard
            label="Won Deals"
            value={stats?.wonLeads || 0}
            subtext={`${formatCurrency(stats?.wonValue || 0)} value`}
            icon="trophy"
            color="#F59E0B"
          />
          <StatCard
            label="Win Rate"
            value={`${stats?.winRate || 0}%`}
            subtext={`${stats?.lostLeads || 0} lost deals`}
            icon="trending-up"
            color="#8B5CF6"
          />
        </View>

        {/* Pipelines */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pipelines</Text>
          </View>

          {pipelines.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pipesScroll}>
              {pipelines.map(p => (
                <TouchableOpacity 
                  key={p.id} 
                  style={styles.pipeCard}
                  onPress={() => router.push(`/(app)/crm/leads?pipelineId=${p.id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.pipeHeader}>
                    <Text style={styles.pipeName}>{p.name}</Text>
                    <Text style={styles.pipeCount}>{p._count?.leads || 0} leads</Text>
                  </View>
                  
                  <View style={styles.stagesBar}>
                    {p.stages?.map((stage) => (
                      <View 
                        key={stage.id} 
                        style={[styles.stageSegment, { backgroundColor: stage.color || Colors.primary }]} 
                      />
                    ))}
                  </View>
                  
                  <View style={styles.pipeFooter}>
                    <Text style={styles.stageLabel}>{p.stages?.[0]?.name}</Text>
                    <Text style={styles.stageLabel}>{p.stages?.[p.stages.length - 1]?.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>No pipelines found</Text>
          )}
        </View>

        {/* Recent Leads */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Leads</Text>
            <TouchableOpacity onPress={() => router.push("/(app)/crm/leads" as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.leadsList}>
            {recentLeads.length > 0 ? (
              recentLeads.map(lead => (
                <TouchableOpacity 
                  key={lead.id} 
                  style={styles.leadItem}
                  onPress={() => router.push(`/(app)/crm/lead/${lead.id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.leadContent}>
                    <Text style={styles.leadTitle} numberOfLines={1}>{lead.title}</Text>
                    <Text style={styles.leadContact}>
                      {lead.contact?.firstName || ""} {lead.contact?.lastName || (lead.contact ? "" : "No Contact Attached")}
                    </Text>
                    
                    <View style={styles.leadMeta}>
                      <View style={[styles.stageBadge, { backgroundColor: `${lead.stage?.color || Colors.primary}15` }]}>
                        <Text style={[styles.stageText, { color: lead.stage?.color || Colors.primary }]}>
                          {lead.stage?.name || "New"}
                        </Text>
                      </View>
                      {lead.value ? (
                        <Text style={styles.leadValue}>{formatCurrency(lead.value)}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyLeads}>
                <Ionicons name="people" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyLeadsTitle}>No leads yet</Text>
                <Text style={styles.emptyLeadsText}>You haven't added any leads to your pipeline.</Text>
                
                <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={syncing}>
                  <Ionicons name="sync" size={16} color={Colors.textPrimary} />
                  <Text style={styles.syncBtnText}>{syncing ? "Syncing..." : "Sync from Contacts"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, subtext, icon, color }: any) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtext}>{subtext}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: Colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statLabel: { fontSize: 11, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase" },
  statValue: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary, marginVertical: 4 },
  statSubtext: { fontSize: 11, color: Colors.textSecondary },

  section: { marginTop: 10 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: Colors.textPrimary },
  viewAllText: { fontSize: 13, fontWeight: "600", color: Colors.primary },

  pipesScroll: { paddingHorizontal: 16, gap: 12 },
  pipeCard: {
    width: 280,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pipeHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  pipeName: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  pipeCount: { fontSize: 12, color: Colors.textSecondary, fontFamily: "monospace" },
  stagesBar: { flexDirection: "row", gap: 2, height: 6, marginBottom: 8 },
  stageSegment: { flex: 1, borderRadius: 3 },
  pipeFooter: { flexDirection: "row", justifyContent: "space-between" },
  stageLabel: { fontSize: 10, color: Colors.textMuted },

  leadsList: { paddingHorizontal: 16, gap: 10 },
  leadItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  leadContent: { flex: 1 },
  leadTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: 2 },
  leadContact: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  leadMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  stageBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  stageText: { fontSize: 10, fontWeight: "800" },
  leadValue: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary },

  emptyText: { textAlign: "center", color: Colors.textMuted, padding: 20 },
  emptyLeads: {
    backgroundColor: Colors.surface,
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyLeadsTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginTop: 12 },
  emptyLeadsText: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", marginTop: 4, marginBottom: 16 },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    gap: 8,
  },
  syncBtnText: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
});
