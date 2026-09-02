// app/(app)/contacts/groups/[id].tsx
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { contacts as contactsApi } from "../../../../src/services/api";
import { Colors } from "../../../../src/constants/colors";
import { Contact } from "../../../../src/types/contact";
import { ContactItem } from "../../../../src/components/contacts/ContactItem";

export default function GroupContactsScreen() {
  const { id, name: initialName, color: initialColor } = useLocalSearchParams<{
    id: string;
    name?: string;
    color?: string;
  }>();

  const [groupName, setGroupName] = useState(initialName || "Group Contacts");
  const [groupColor, setGroupColor] = useState(initialColor || Colors.primary);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGroupContacts = useCallback(
    async (pageNum = 1, append = false) => {
      if (!id) return;
      try {
        if (!append) setLoading(true);
        else setLoadingMore(true);

        const params: any = {
          groupId: id,
          page: pageNum,
          limit: 30,
        };
        if (search.trim()) params.search = search.trim();

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
            setContacts(contactList);
          }

          const totalCount =
            meta.total ?? (Array.isArray(rawData) ? rawData.length : contactList.length);
          setTotal(totalCount);
          const totalPages =
            meta.totalPages ?? (totalCount > 0 ? Math.ceil(totalCount / 30) : 1);
          setHasMore(pageNum < totalPages);
          setPage(pageNum);
        }
      } catch (err: any) {
        console.error("❌ Group contacts error:", err?.response?.data || err.message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [id, search]
  );

  useEffect(() => {
    fetchGroupContacts(1, false);
  }, [fetchGroupContacts]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchGroupContacts(1, false);
    }, 400);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroupContacts(1, false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      fetchGroupContacts(page + 1, true);
    }
  };

  const handleRemoveContactFromGroup = (contact: Contact) => {
    Alert.alert(
      "Remove from Group",
      `Remove ${contact.fullName || contact.phone} from "${groupName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await contactsApi.removeContactsFromGroup(id!, [contact.id]);
              setContacts((prev) => prev.filter((c) => c.id !== contact.id));
              setTotal((prev) => Math.max(0, prev - 1));
            } catch (err: any) {
              Alert.alert(
                "Error",
                err?.response?.data?.message || "Failed to remove contact"
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.titleRow}>
            <View style={[styles.colorDot, { backgroundColor: groupColor }]} />
            <Text style={styles.headerTitle} numberOfLines={1}>
              {groupName}
            </Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {total} {total === 1 ? "contact" : "contacts"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(app)/contacts/import" as never)}
          style={[styles.iconBtn, styles.addBtn]}
        >
          <Ionicons name="person-add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search in this group..."
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Contact List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading group contacts...</Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>
            {search ? "No contacts found" : "No contacts in this group"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {search
              ? "Try searching for a different name or phone number."
              : "Add or import contacts into this group to start messaging."}
          </Text>
          {!search && (
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/(app)/contacts/import" as never)}
            >
              <Ionicons name="cloud-upload" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Import Contacts to Group</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ContactItem
              contact={item}
              onPress={() => router.push(`/(app)/contacts/${item.id}` as never)}
              rightAction={
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemoveContactFromGroup(item)}
                >
                  <Ionicons
                    name="remove-circle-outline"
                    size={22}
                    color={Colors.error}
                  />
                </TouchableOpacity>
              }
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
          contentContainerStyle={{ paddingBottom: 60 }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
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
  addBtn: {
    backgroundColor: Colors.primary,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "85%",
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },
  headerSubtitle: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchBox: {
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

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 13, color: Colors.textMuted },
  footerLoader: { paddingVertical: 20, alignItems: "center" },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIconBox: {
    width: 90,
    height: 90,
    borderRadius: 28,
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
  emptyBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 76,
  },
  removeBtn: {
    padding: 8,
  },
});
