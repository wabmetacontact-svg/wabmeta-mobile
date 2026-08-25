// app/(app)/(tabs)/inbox.tsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { inbox as inboxApi } from "../../../src/services/api";
import {
  useInboxSocket,
  InboundMessage,
  ConversationUpdate,
  MessageStatusUpdate,
} from "../../../src/hooks/useInboxSocket";
import { Colors } from "../../../src/constants/colors";
import { useAuth } from "../../../src/context/AuthContext";
import { useFeatureLock } from "../../../src/hooks/useFeatureLock";
import { LockedFeatureView } from "../../../src/components/common/LockedFeatureView";
import { cacheGet, cacheSet } from "../../../src/hooks/useCachedFetch";
import {
  Conversation,
  InboxStats,
  Label,
  FilterTab,
} from "../../../src/types/inbox";
import {
  sortConversations,
  getContactName,
  getContactInitials,
  getAvatarColor,
  formatChatTime,
  getMessagePreview,
} from "../../../src/utils/inboxHelpers";

export default function InboxScreen() {
  const { organization } = useAuth();
  const inboxLocked = useFeatureLock("inbox");

  // Pichhli baar ka data turant dikha do - spinner sirf pehli baar.
  // Fresh data background mein aa hi raha hai.
  const [conversations, setConversations] = useState<Conversation[]>(
    () => cacheGet<Conversation[]>("inbox:conversations") ?? []
  );
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);

  const [loading, setLoading] = useState(
    () => !cacheGet<Conversation[]>("inbox:conversations")
  );
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ═══════════════════════════════════
  // FETCH
  // ═══════════════════════════════════

  const fetchConversations = useCallback(async () => {
    // Locked plan par API 403 deti hai - call karne ka koi matlab nahi.
    // (Hooks early return se pehle chalte hain, isliye guard yahan chahiye.)
    if (inboxLocked) return;
    try {
      const params: any = { limit: 100 };

      if (search.trim()) params.search = search.trim();

      if (filter === "unread") {
        params.isRead = false;
        params.isArchived = false;
      } else if (filter === "archived") {
        params.isArchived = true;
      } else if (filter !== "all") {
        params.isArchived = false;
        params.labels = filter;
      } else {
        params.isArchived = false;
      }

      const res = await inboxApi.getConversations(params);

      if (res?.data?.success !== false && (res?.data?.data || Array.isArray(res?.data))) {
        const data = res.data?.data ?? res.data;
        let list: Conversation[] = [];
        if (Array.isArray(data)) list = data;
        else if ((data as any)?.conversations)
          list = (data as any).conversations;

        const clean = sortConversations(list.filter((c) => c?.id));
        cacheSet("inbox:conversations", clean);
        setConversations(clean);
      }
    } catch (err: any) {
      console.error("Fetch conversations error:", err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, filter, inboxLocked]);

  const fetchStats = useCallback(async () => {
    // Locked plan par API 403 deti hai - call karne ka koi matlab nahi.
    // (Hooks early return se pehle chalte hain, isliye guard yahan chahiye.)
    if (inboxLocked) return;
    try {
      const res = await inboxApi.stats();
      if (res?.data?.success !== false && (res?.data?.data || res?.data)) {
        setStats((res.data?.data || res.data) as InboxStats);
      }
    } catch (err) {
      console.error("Stats error:", err);
    }
  }, [inboxLocked]);

  const fetchLabels = useCallback(async () => {
    // Locked plan par API 403 deti hai - call karne ka koi matlab nahi.
    // (Hooks early return se pehle chalte hain, isliye guard yahan chahiye.)
    if (inboxLocked) return;
    try {
      const res = await inboxApi.getLabels();
      if (res?.data?.success !== false && (res?.data?.data || Array.isArray(res?.data))) {
        const data = res.data?.data ?? res.data;
        setLabels(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Labels error:", err);
    }
  }, [inboxLocked]);

  useEffect(() => {
    fetchConversations();
    fetchStats();
    fetchLabels();
  }, [filter]);

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchConversations();
    }, 400);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // ═══════════════════════════════════
  // SOCKET UPDATES
  // ═══════════════════════════════════

  useInboxSocket(
    null,
    // New message
    useCallback((newMsg: InboundMessage) => {
      const convId = newMsg.conversationId;
      if (!convId) return;

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === convId);
        if (idx === -1) return prev;

        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          lastMessagePreview: (newMsg.content || "New message").substring(
            0,
            60
          ),
          lastMessageAt: newMsg.createdAt || new Date().toISOString(),
          lastMessageType: newMsg.type,
          lastMessageDirection: newMsg.direction,
          unreadCount:
            newMsg.direction === "INBOUND"
              ? (updated[idx].unreadCount || 0) + 1
              : updated[idx].unreadCount,
        };
        return sortConversations(updated);
      });
    }, []),

    // Conversation update
    useCallback((update: ConversationUpdate) => {
      if (!update?.id) return;
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === update.id);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...update };
        return sortConversations(updated);
      });
    }, []),

    // Message status
    useCallback((statusUpdate: MessageStatusUpdate) => {
      if (!statusUpdate.conversationId) return;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === statusUpdate.conversationId
            ? { ...c, lastMessageStatus: statusUpdate.status }
            : c
        )
      );
    }, [])
  );

  // ═══════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
    fetchStats();
    fetchLabels();
  };

  const handleOpenConversation = (conv: Conversation) => {
    // Chat screen khulte hi server par read ho jati hai, par ye list wapas
    // aane par re-mount nahi hoti - isliye badge yahin turant clear kar do.
    // Server ka conversation:updated event bhi aayega; ye instant feedback
    // ke liye hai taki socket slow ya disconnected ho tab bhi sahi dikhe.
    if (conv.unreadCount > 0) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conv.id ? { ...c, unreadCount: 0, isRead: true } : c
        )
      );
    }

    // Naam/phone saath bhejo - chat screen ka header pehle hi frame mein
    // bhara dikhega, conversation fetch hone ka intezaar nahi karna padega
    router.push({
      pathname: "/(app)/inbox/[id]",
      params: {
        id: conv.id,
        name: getContactName(conv.contact),
        phone: conv.contact?.phone || "",
      },
    } as never);
  };

  const handleLongPress = (conv: Conversation) => {
    const options: any[] = [
      { text: "Cancel", style: "cancel" },
      {
        text: conv.isPinned ? "Unpin" : "Pin",
        onPress: () => togglePin(conv),
      },
      {
        text: conv.isArchived ? "Unarchive" : "Archive",
        onPress: () => toggleArchive(conv),
      },
      {
        text: "Mark as read",
        onPress: () => markAsRead(conv),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteConversation(conv),
      },
    ];

    Alert.alert(getContactName(conv.contact), "Choose an action", options);
  };

  const togglePin = async (conv: Conversation) => {
    try {
      await inboxApi.togglePin(conv.id, !conv.isPinned);
      setConversations((prev) =>
        sortConversations(
          prev.map((c) =>
            c.id === conv.id ? { ...c, isPinned: !c.isPinned } : c
          )
        )
      );
    } catch {
      Alert.alert("Error", "Failed to update pin");
    }
  };

  const toggleArchive = async (conv: Conversation) => {
    try {
      if (conv.isArchived) {
        await inboxApi.unarchiveConversation(conv.id);
      } else {
        await inboxApi.archiveConversation(conv.id);
      }
      fetchConversations();
    } catch {
      Alert.alert("Error", "Failed to archive");
    }
  };

  const markAsRead = async (conv: Conversation) => {
    try {
      await inboxApi.markAsRead(conv.id);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conv.id ? { ...c, unreadCount: 0, isRead: true } : c
        )
      );
    } catch {
      Alert.alert("Error", "Failed to mark as read");
    }
  };

  const deleteConversation = (conv: Conversation) => {
    Alert.alert(
      "Delete Chat",
      "This will delete all messages. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await inboxApi.deleteConversation(conv.id);
              fetchConversations();
              fetchStats();
            } catch {
              Alert.alert("Error", "Failed to delete");
            }
          },
        },
      ]
    );
  };

  // ═══════════════════════════════════
  // FILTER TABS
  // ═══════════════════════════════════

  const filterTabs = useMemo(() => {
    const base = [
      { value: "all", label: "All", count: stats?.total || 0 },
      { value: "unread", label: "Unread", count: stats?.unread || 0 },
      { value: "archived", label: "Archived", count: stats?.archived || 0 },
    ];
    const labelTabs = labels.slice(0, 5).map((l) => ({
      value: l.label,
      label: l.label,
      count: l.count,
    }));
    return [...base, ...labelTabs];
  }, [stats, labels]);

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  const keyExtractor = useCallback((item: Conversation) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: Conversation }) => (
      <ConversationItem
        conversation={item}
        onPress={() => handleOpenConversation(item)}
        onLongPress={() => handleLongPress(item)}
      />
    ),
    [handleOpenConversation, handleLongPress]
  );

  const renderSeparator = useCallback(() => <View style={styles.separator} />, []);

  if (inboxLocked) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <LockedFeatureView feature="inbox" planType={organization?.planType} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      {!showSearch ? (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Chats</Text>
            {stats && (
              <Text style={styles.headerSubtitle}>
                {stats.total} chats • {stats.unread} unread
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => setShowSearch(true)}
            >
              <Ionicons name="search" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => Alert.alert("Options", "Select action", [
                { text: "Cancel", style: "cancel" },
                { text: "Refresh", onPress: onRefresh },
              ])}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={22}
                color={Colors.textPrimary}
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
            style={styles.headerIcon}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search chats..."
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.tabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScrollView}
          contentContainerStyle={styles.tabsRow}
        >
          {filterTabs.map((tab) => (
            <TouchableOpacity
              key={tab.value}
              style={[
                styles.tabChip,
                filter === tab.value && styles.tabChipActive,
              ]}
              onPress={() => setFilter(tab.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabChipText,
                  filter === tab.value && styles.tabChipTextActive,
                ]}
              >
                {tab.label}
                {tab.count > 0 && ` ${tab.count}`}
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
      ) : conversations.length === 0 ? (
        <EmptyState hasFilters={filter !== "all" || !!search} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS === "android"}
          updateCellsBatchingPeriod={50}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          ItemSeparatorComponent={renderSeparator}
        />
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════
// CONVERSATION ITEM
// ═══════════════════════════════════

const ConversationItem = React.memo(function ConversationItem({
  conversation,
  onPress,
  onLongPress,
}: {
  conversation: Conversation;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const name = getContactName(conversation.contact);
  const initials = getContactInitials(conversation.contact);
  const avatarColor = getAvatarColor(name);
  const preview = getMessagePreview(
    conversation.lastMessagePreview,
    conversation.lastMessageType
  );
  const time = formatChatTime(conversation.lastMessageAt);

  const isUnread = conversation.unreadCount > 0;
  const hasLabel = conversation.labels && conversation.labels.length > 0;

  const renderStatusIcon = () => {
    if (conversation.lastMessageDirection !== "OUTBOUND") return null;
    const status = conversation.lastMessageStatus?.toUpperCase();
    switch (status) {
      case "SENT":
        return (
          <Ionicons name="checkmark" size={14} color={Colors.textMuted} />
        );
      case "DELIVERED":
        return (
          <Ionicons
            name="checkmark-done"
            size={14}
            color={Colors.textMuted}
          />
        );
      case "READ":
        return (
          <Ionicons name="checkmark-done" size={14} color={Colors.info} />
        );
      case "FAILED":
        return (
          <Ionicons name="alert-circle" size={14} color={Colors.error} />
        );
      default:
        return <Ionicons name="time" size={12} color={Colors.textMuted} />;
    }
  };

  return (
    <TouchableOpacity
      style={styles.convItem}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
        {isUnread && (
          <View style={styles.avatarDot}>
            <View style={styles.avatarDotInner} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.convContent}>
        <View style={styles.convHeader}>
          <View style={styles.convHeaderLeft}>
            {conversation.isPinned && (
              <Ionicons
                name="pin"
                size={12}
                color={Colors.textMuted}
                style={{ marginRight: 4 }}
              />
            )}
            <Text
              style={[styles.convName, isUnread && styles.convNameUnread]}
              numberOfLines={1}
            >
              {name}
            </Text>
          </View>
          <Text
            style={[styles.convTime, isUnread && styles.convTimeUnread]}
          >
            {time}
          </Text>
        </View>

        <View style={styles.convFooter}>
          <View style={styles.convFooterLeft}>
            {renderStatusIcon()}
            <Text
              style={[styles.convPreview, isUnread && styles.convPreviewUnread]}
              numberOfLines={1}
            >
              {preview || "No messages yet"}
            </Text>
          </View>

          <View style={styles.convFooterRight}>
            {conversation.isMuted && (
              <Ionicons
                name="volume-mute"
                size={14}
                color={Colors.textMuted}
              />
            )}
            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {conversation.unreadCount > 99
                    ? "99+"
                    : conversation.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Labels */}
        {hasLabel && (
          <View style={styles.labelsRow}>
            {conversation.labels!.slice(0, 2).map((label, i) => (
              <View key={i} style={styles.labelChip}>
                <View style={styles.labelDot} />
                <Text style={styles.labelText} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBox}>
        <Ionicons
          name={hasFilters ? "search" : "chatbubbles-outline"}
          size={48}
          color={Colors.textMuted}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {hasFilters ? "No chats found" : "No conversations yet"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {hasFilters
          ? "Try changing your search or filters"
          : "Your conversations will appear here"}
      </Text>
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
    gap: 4,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
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

  tabsWrap: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingVertical: 8,
  },
  tabsScrollView: {
    flexGrow: 0,
  },
  tabsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  tabChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  tabChipTextActive: {
    color: "#fff",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  },

  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 82,
  },

  // Conversation Item
  convItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    gap: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  avatarDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },

  convContent: {
    flex: 1,
    justifyContent: "center",
  },
  convHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  convHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  convName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  convNameUnread: {
    fontWeight: "700",
  },
  convTime: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "500",
    marginLeft: 8,
  },
  convTimeUnread: {
    color: Colors.primary,
    fontWeight: "700",
  },

  convFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  convFooterLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  convPreview: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "400",
  },
  convPreviewUnread: {
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  convFooterRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadCount: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },

  labelsRow: {
    flexDirection: "row",
    marginTop: 4,
    gap: 4,
  },
  labelChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.info}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
    maxWidth: 100,
  },
  labelDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.info,
  },
  labelText: {
    fontSize: 10,
    color: Colors.info,
    fontWeight: "600",
  },
});
