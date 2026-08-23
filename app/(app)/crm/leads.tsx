// app/(app)/crm/leads.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { crm as crmApi } from "../../../src/services/api";
import { Colors } from "../../../src/constants/colors";
import { Lead } from "../../../src/types/crm";

export default function LeadsListScreen() {
  const params = useLocalSearchParams<{ pipelineId?: string }>();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchLeads = useCallback(async () => {
    try {
      const res = await crmApi.getLeads({
        pipelineId: params.pipelineId,
        search: search || undefined,
        limit: 50,
      });
      if (res?.data?.success) {
        const ldata = res.data.data;
        setLeads(Array.isArray(ldata) ? ldata : ldata?.leads || []);
      } else {
        setLeads([]);
      }
    } catch (err) {
      console.warn("Failed to fetch leads");
      setLeads([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.pipelineId, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeads();
  };

  const filteredLeads = search
    ? leads.filter((l) =>
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.contact?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        l.contact?.phone?.includes(search)
      )
    : leads;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Leads</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/(app)/crm/new" as any)}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search leads or contacts..."
          placeholderTextColor={Colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredLeads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people" size={44} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No leads found</Text>
              <Text style={styles.emptySubtitle}>Try a different search or add a new lead.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.leadCard}
              onPress={() => router.push(`/(app)/crm/lead/${item.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.leadContent}>
                <Text style={styles.leadTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.contact && (
                  <Text style={styles.leadContact}>
                    {item.contact.firstName} {item.contact.lastName} • {item.contact.phone}
                  </Text>
                )}

                <View style={styles.leadMeta}>
                  <View
                    style={[
                      styles.stageBadge,
                      { backgroundColor: `${item.stage?.color || Colors.primary}15` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stageText,
                        { color: item.stage?.color || Colors.primary },
                      ]}
                    >
                      {item.stage?.name || item.status}
                    </Text>
                  </View>
                  {item.value ? (
                    <Text style={styles.leadValue}>
                      ₹{item.value.toLocaleString("en-IN")}
                    </Text>
                  ) : null}
                  <Text style={styles.priorityBadge}>{item.priority}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: Colors.textPrimary },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },

  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  leadCard: {
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
  leadContact: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  leadMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  stageBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  stageText: { fontSize: 10, fontWeight: "800" },
  leadValue: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary },
  priorityBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textMuted,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  emptyContainer: { padding: 40, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
});
