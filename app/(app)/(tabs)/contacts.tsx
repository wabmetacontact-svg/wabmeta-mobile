// app/(app)/(tabs)/contacts.tsx
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
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { contacts as contactsApi } from "../../../src/services/api";
import { Colors } from "../../../src/constants/colors";
import { Contact, ContactStats, TagCount } from "../../../src/types/contact";
import { ContactItem } from "../../../src/components/contacts/ContactItem";
import { AddContactModal } from "../../../src/components/contacts/AddContactModal";
import { ContactActionsSheet } from "../../../src/components/contacts/ContactActionsSheet";
import { BulkActionsBar } from "../../../src/components/contacts/BulkActionsBar";
import { cacheGet, cacheSet } from "../../../src/hooks/useCachedFetch";

export default function ContactsScreen() {
  // Cache se seed - tab wapas aane par spinner na dikhe
  const [contacts, setContacts] = useState<Contact[]>(
    () => cacheGet<Contact[]>("contacts:list") ?? []
  );
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [tags, setTags] = useState<TagCount[]>([]);

  const [loading, setLoading] = useState(
    () => !cacheGet<Contact[]>("contacts:list")
  );
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalContacts, setTotalContacts] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showFABMenu, setShowFABMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Bulk selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ═══════════════════════════════════
  // FETCH FUNCTIONS
  // ═══════════════════════════════════

  const fetchContacts = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        if (!append) setLoading(true);
        else setLoadingMore(true);

        const params: any = {
          page: pageNum,
          limit: 30,
          sortBy: "createdAt",
          sortOrder: "desc",
        };

        if (search.trim()) params.search = search.trim();
        if (selectedTag) params.tags = [selectedTag];
        if (selectedStatus) params.status = selectedStatus;

        const res = await contactsApi.getAll(params);

        if (res?.data?.success !== false && (res?.data?.data || Array.isArray(res?.data))) {
          const rawData = res.data?.data ?? res.data;
          const contactList: Contact[] = Array.isArray(rawData)
            ? rawData
            : (rawData?.contacts || (res.data as any)?.contacts || []);
          const meta = (res.data as any)?.meta || (rawData as any)?.meta || {};

          if (append) {
            setContacts((prev) => {
              const existingIds = new Set(prev.map((c) => c.id));
              const newItems = contactList.filter((c: Contact) => !existingIds.has(c.id));
              return [...prev, ...newItems];
            });
          } else {
            cacheSet("contacts:list", contactList);
            setContacts(contactList);
          }

          const total = meta.total ?? (Array.isArray(rawData) ? rawData.length : contactList.length);
          setTotalContacts(total);
          const totalPages = meta.totalPages ?? (total > 0 ? Math.ceil(total / 30) : 1);
          setHasMore(pageNum < totalPages);
          setPage(pageNum);
        }
      } catch (err: any) {
        console.error("❌ Contacts error:", err?.response?.data?.message || err.message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [search, selectedTag, selectedStatus]
  );

  const fetchStats = useCallback(async () => {
    try {
      const res = await contactsApi.stats();
      if (res?.data?.success !== false && (res?.data?.data || res?.data)) {
        setStats((res.data?.data || res.data) as ContactStats);
      }
    } catch (err) {
      console.error("Stats error:", err);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const res = await contactsApi.getTags();
      const raw = res?.data?.data || res?.data;
      if (Array.isArray(raw)) {
        setTags(raw as TagCount[]);
      } else if (Array.isArray(raw?.tags)) {
        setTags(raw.tags as TagCount[]);
      }
    } catch (err) {
      console.error("Tags error:", err);
    }
  }, []);

  // ═══════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════

  useEffect(() => {
    fetchContacts(1, false);
    fetchStats();
    fetchTags();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchContacts(1, false);
    }, 400);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search, selectedTag, selectedStatus]);

  // ═══════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════

  const onRefresh = () => {
    setRefreshing(true);
    fetchContacts(1, false);
    fetchStats();
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      fetchContacts(page + 1, true);
    }
  };

  const handleContactPress = (contact: Contact) => {
    if (selectionMode) {
      toggleSelection(contact.id);
    } else {
      router.push(`/(app)/contacts/${contact.id}` as never);
    }
  };

  const handleContactLongPress = (contact: Contact) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedIds(new Set([contact.id]));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const selectAll = () => {
    setSelectedIds(new Set(contacts.map((c) => c.id)));
  };

  const handleBulkDelete = async () => {
    Alert.alert(
      "Delete Contacts",
      `Are you sure you want to delete ${selectedIds.size} contact(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await contactsApi.bulkDelete(Array.from(selectedIds));
              Alert.alert("Success", "Contacts deleted successfully");
              cancelSelection();
              fetchContacts(1, false);
              fetchStats();
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

  const clearFilters = () => {
    setSearch("");
    setSelectedTag(null);
    setSelectedStatus(null);
  };

  const hasActiveFilters = search || selectedTag || selectedStatus;

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      {selectionMode ? (
        <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={cancelSelection} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.selectionCount}>{selectedIds.size} selected</Text>
          <TouchableOpacity onPress={selectAll} style={styles.headerBtn}>
            <Text style={styles.selectAllText}>Select All</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Contacts</Text>
            <Text style={styles.headerSubtitle}>
              {totalContacts.toLocaleString("en-IN")} total
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push("/(app)/contacts/groups" as never)}
              style={styles.headerIconBtn}
            >
              <Ionicons
                name="folder-outline"
                size={22}
                color={Colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search Bar */}
      {!selectionMode && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, phone, email..."
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              returnKeyType="search"
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

          <TouchableOpacity
            style={[
              styles.filterBtn,
              hasActiveFilters && styles.filterBtnActive,
            ]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons
              name="filter"
              size={18}
              color={hasActiveFilters ? "#fff" : Colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Chips */}
      {!selectionMode && (selectedTag || selectedStatus) && (
        <View style={styles.chipsContainer}>
          {selectedTag && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>Tag: {selectedTag}</Text>
              <TouchableOpacity onPress={() => setSelectedTag(null)}>
                <Ionicons name="close" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
          {selectedStatus && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>Status: {selectedStatus}</Text>
              <TouchableOpacity onPress={() => setSelectedStatus(null)}>
                <Ionicons name="close" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            style={styles.clearAllBtn}
            onPress={clearFilters}
          >
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Contact List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : contacts.length === 0 ? (
        <EmptyState
          hasFilters={!!hasActiveFilters}
          onClearFilters={clearFilters}
          onAdd={() => setShowAddModal(true)}
        />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ContactItem
              contact={item}
              selected={selectedIds.has(item.id)}
              selectionMode={selectionMode}
              onPress={() => handleContactPress(item)}
              onLongPress={() => handleContactLongPress(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Bulk Actions Bar */}
      {selectionMode && selectedIds.size > 0 && (
        <BulkActionsBar
          count={selectedIds.size}
          onDelete={handleBulkDelete}
          onCancel={cancelSelection}
        />
      )}

      {/* FAB */}
      {!selectionMode && (
        <View style={styles.fabContainer}>
          {showFABMenu && (
            <>
              <TouchableOpacity
                style={styles.fabMenuItem}
                onPress={() => {
                  setShowFABMenu(false);
                  router.push("/(app)/contacts/sync-phone" as never);
                }}
              >
                <View
                  style={[
                    styles.fabMenuIcon,
                    { backgroundColor: Colors.primary },
                  ]}
                >
                  <Ionicons name="phone-portrait" size={18} color="#fff" />
                </View>
                <Text style={styles.fabMenuLabel}>Sync Phone Contacts</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fabMenuItem}
                onPress={() => {
                  setShowFABMenu(false);
                  router.push("/(app)/contacts/import" as never);
                }}
              >
                <View
                  style={[styles.fabMenuIcon, { backgroundColor: Colors.info }]}
                >
                  <Ionicons name="cloud-upload" size={18} color="#fff" />
                </View>
                <Text style={styles.fabMenuLabel}>Import CSV</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fabMenuItem}
                onPress={() => {
                  setShowFABMenu(false);
                  setShowAddModal(true);
                }}
              >
                <View
                  style={[
                    styles.fabMenuIcon,
                    { backgroundColor: Colors.success },
                  ]}
                >
                  <Ionicons name="person-add" size={18} color="#fff" />
                </View>
                <Text style={styles.fabMenuLabel}>Add Contact</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.fab}
            onPress={() => setShowFABMenu(!showFABMenu)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={showFABMenu ? "close" : "add"}
              size={26}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Modals */}
      <AddContactModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          fetchContacts(1, false);
          fetchStats();
        }}
      />

      <FiltersModal
        visible={showFilters}
        selectedTag={selectedTag}
        selectedStatus={selectedStatus}
        tags={tags}
        onApply={(tag, status) => {
          setSelectedTag(tag);
          setSelectedStatus(status);
          setShowFilters(false);
        }}
        onClose={() => setShowFilters(false)}
        onClear={() => {
          setSelectedTag(null);
          setSelectedStatus(null);
          setShowFilters(false);
        }}
      />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════

function EmptyState({
  hasFilters,
  onClearFilters,
  onAdd,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
  onAdd: () => void;
}) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBox}>
        <Ionicons
          name={hasFilters ? "search" : "people"}
          size={48}
          color={Colors.textMuted}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {hasFilters ? "No contacts found" : "No contacts yet"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {hasFilters
          ? "Try changing your search or filters"
          : "Add your first contact to start messaging"}
      </Text>
      {hasFilters ? (
        <TouchableOpacity style={styles.emptyBtn} onPress={onClearFilters}>
          <Text style={styles.emptyBtnText}>Clear Filters</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.emptyBtn} onPress={onAdd}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.emptyBtnText}>Add Contact</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ═══════════════════════════════════
// FILTERS MODAL
// ═══════════════════════════════════

interface FiltersModalProps {
  visible: boolean;
  selectedTag: string | null;
  selectedStatus: string | null;
  tags: TagCount[];
  onApply: (tag: string | null, status: string | null) => void;
  onClose: () => void;
  onClear: () => void;
}

function FiltersModal({
  visible,
  selectedTag,
  selectedStatus,
  tags,
  onApply,
  onClose,
  onClear,
}: FiltersModalProps) {
  const [tempTag, setTempTag] = useState(selectedTag);
  const [tempStatus, setTempStatus] = useState(selectedStatus);

  useEffect(() => {
    setTempTag(selectedTag);
    setTempStatus(selectedStatus);
  }, [selectedTag, selectedStatus, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.filtersModal}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterChipsRow}>
              {["ACTIVE", "BLOCKED", "UNSUBSCRIBED"].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    tempStatus === status && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    setTempStatus(tempStatus === status ? null : status)
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      tempStatus === status && styles.filterChipTextActive,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tags Filter */}
          {tags.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Tags</Text>
              <View style={styles.filterChipsRow}>
                {tags.slice(0, 20).map((t) => (
                  <TouchableOpacity
                    key={t.tag}
                    style={[
                      styles.filterChip,
                      tempTag === t.tag && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      setTempTag(tempTag === t.tag ? null : t.tag)
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        tempTag === t.tag && styles.filterChipTextActive,
                      ]}
                    >
                      {t.tag} ({t.count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => onApply(tempTag, tempStatus)}
            >
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════
// STYLES
// ═══════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
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
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  headerBtn: {
    padding: 8,
  },

  // Selection Header
  selectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
  },
  selectionCount: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  selectAllText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    padding: 0,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  // Chips
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  chipText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600",
  },
  clearAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearAllText: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: "600",
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },

  // Empty State
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

  // Contact Item
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
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 76,
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

  // FAB
  fabContainer: {
    position: "absolute",
    right: 20,
    bottom: 95,
    alignItems: "flex-end",
    gap: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  fabMenuIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  fabMenuLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  filtersModal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "80%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: "#fff",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
