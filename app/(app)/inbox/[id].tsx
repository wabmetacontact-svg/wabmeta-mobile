// app/(app)/inbox/[id].tsx
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
  Keyboard,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { inbox as inboxApi, whatsapp as whatsappApi } from "../../../src/services/api";
import {
  useInboxSocket,
  InboundMessage,
  ConversationUpdate,
  MessageStatusUpdate,
} from "../../../src/hooks/useInboxSocket";
import { Colors } from "../../../src/constants/colors";
import { Message, Conversation } from "../../../src/types/inbox";
import {
  getContactName,
  getContactInitials,
  getAvatarColor,
  formatDateSeparator,
  shouldGroupMessages,
  shouldShowDateSeparator,
} from "../../../src/utils/inboxHelpers";
import { MessageBubble } from "../../../src/components/inbox/MessageBubble";
import { ChatInput } from "../../../src/components/inbox/ChatInput";
import { WindowStatusBar } from "../../../src/components/inbox/WindowStatusBar";
import { ReplyBar } from "../../../src/components/inbox/ReplyBar";
import { TemplateModal } from "../../../src/components/inbox/TemplateModal";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const [whatsappAccountId, setWhatsappAccountId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isContactTyping, setIsContactTyping] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const flatListRef = useRef<FlatList>(null);
  const sentIdsRef = useRef<Set<string>>(new Set());

  // ═══════════════════════════════════
  // FETCH
  // ═══════════════════════════════════

  const fetchConversation = useCallback(async () => {
    if (!id) return;
    try {
      const res = await inboxApi.getConversation(id);
      if (res?.data?.success !== false && (res?.data?.data || res?.data)) {
        setConversation((res.data?.data || res.data) as Conversation);
      }
    } catch (err) {
      console.error("Fetch conversation error:", err);
      Alert.alert("Error", "Failed to load conversation");
      router.back();
    }
  }, [id]);

  const fetchMessages = useCallback(
    async (pageNum = 1, append = false) => {
      if (!id) return;
      try {
        if (!append) setLoading(true);
        else setLoadingMore(true);

        const res = await inboxApi.getMessages(id, { page: pageNum, limit: 30 });

        if (res?.data?.success !== false && (res?.data?.data || Array.isArray(res?.data))) {
          const data = res.data?.data ?? res.data;
          let list: Message[] = Array.isArray(data)
            ? data
            : data?.messages || [];

          // Sort or ensure newest-first for inverted FlatList
          if (list.length >= 2) {
            const firstTime = new Date(list[0].createdAt || list[0].timestamp || 0).getTime();
            const lastTime = new Date(list[list.length - 1].createdAt || list[list.length - 1].timestamp || 0).getTime();
            if (firstTime < lastTime) {
              list = [...list].reverse();
            }
          }

          if (append) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const newOlder = list.filter((m) => !existingIds.has(m.id));
              return [...prev, ...newOlder];
            });
          } else {
            setMessages(list);
            list.forEach((m: any) => {
              if (m.waMessageId) sentIdsRef.current.add(m.waMessageId);
              if (m.wamId) sentIdsRef.current.add(m.wamId);
              sentIdsRef.current.add(m.id);
            });
          }

          setHasMore(list.length === 30);
          setPage(pageNum);

          // Mark as read
          if (!append) {
            inboxApi.markAsRead(id).catch(() => {});
          }
        }
      } catch (err) {
        console.error("Fetch messages error:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [id]
  );

  const fetchWhatsAppAccount = useCallback(async () => {
    try {
      const res = await whatsappApi.accounts();
      const accounts = res?.data?.data?.accounts || (Array.isArray(res?.data?.data) ? res?.data?.data : []);
      const connected = accounts.find(
        (a: any) => String(a.status || "").toUpperCase() === "CONNECTED"
      );
      if (connected) setWhatsappAccountId(connected.id);
    } catch (err) {
      console.error("Account fetch error:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversation();
    fetchMessages(1);
    fetchWhatsAppAccount();
  }, [id]);

  // ═══════════════════════════════════
  // SOCKET
  // ═══════════════════════════════════

  useInboxSocket(
    id || null,

    // New message
    useCallback(
      (newMsg: InboundMessage) => {
        if (newMsg.conversationId !== id) return;

        setMessages((prev) => {
          // Dedupe
          const isDup = prev.some(
            (m) =>
              m.id === newMsg.id ||
              (newMsg.waMessageId &&
                (m.waMessageId === newMsg.waMessageId ||
                  (m as any).wamId === newMsg.waMessageId))
          );
          if (isDup) return prev;

          // In inverted list, newest message goes at index 0 (bottom of screen)
          return [
            {
              ...(newMsg as any),
              createdAt: newMsg.createdAt || new Date().toISOString(),
            },
            ...prev,
          ];
        });

        // Mark as read if inbound
        if (newMsg.direction === "INBOUND") {
          inboxApi.markAsRead(id).catch(() => {});
          setIsContactTyping(false);
        }
      },
      [id]
    ),

    // Conversation updated
    useCallback(
      (update: ConversationUpdate) => {
        if (update.id !== id) return;
        setConversation((prev) => (prev ? { ...prev, ...update } : prev));
      },
      [id]
    ),

    // Message status
    useCallback((statusUpdate: MessageStatusUpdate) => {
      const newStatus = statusUpdate.status?.toUpperCase();
      if (!newStatus) return;

      setMessages((prev) =>
        prev.map((m) => {
          const isMatch =
            (statusUpdate.messageId && m.id === statusUpdate.messageId) ||
            (statusUpdate.tempId && m.id === statusUpdate.tempId) ||
            (statusUpdate.waMessageId &&
              (m.waMessageId === statusUpdate.waMessageId ||
                (m as any).wamId === statusUpdate.waMessageId));

          if (!isMatch) return m;

          return {
            ...m,
            status: newStatus,
            failureReason: statusUpdate.failureReason || m.failureReason,
          };
        })
      );
    }, [])
  );

  // ═══════════════════════════════════
  // SEND MESSAGE
  // ═══════════════════════════════════

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !conversation || !whatsappAccountId) return;

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // Build reply info
      let replyToData: Message["replyTo"] | undefined;
      if (replyTo) {
        replyToData = {
          id: replyTo.id,
          content: replyTo.content,
          direction: replyTo.direction,
          type: replyTo.type,
          senderName: getContactName(conversation.contact),
        };
      }

      const tempMessage: Message = {
        id: tempId,
        conversationId: conversation.id,
        content: text,
        type: "TEXT",
        direction: "OUTBOUND",
        status: "PENDING",
        createdAt: now,
        timestamp: now,
        replyTo: replyToData,
      };

      // Optimistic update (index 0 = bottom)
      sentIdsRef.current.add(tempId);
      setMessages((prev) => [tempMessage, ...prev]);
      setReplyTo(null);

      try {
        const response = await whatsappApi.sendText({
          whatsappAccountId,
          to: conversation.contact.phone,
          message: text,
          tempId,
        });

        if (response.data?.success) {
          const realMsg = response.data.data as any;
          const realId = realMsg?.id || realMsg?.waMessageId;
          const realWamId = realMsg?.waMessageId || realMsg?.wamId;

          if (realId) sentIdsRef.current.add(realId);
          if (realWamId) sentIdsRef.current.add(realWamId);

          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== tempId) return m;
              return {
                ...m,
                ...realMsg,
                id: realId || tempId,
                status: "SENT",
                createdAt: realMsg.createdAt || now,
                timestamp: realMsg.timestamp || now,
                replyTo: replyToData,
              };
            })
          );
        }
      } catch (err: any) {
        console.error("Send error:", err);
        Alert.alert(
          "Failed to send",
          err?.response?.data?.message || err?.message || "Please try again"
        );

        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: "FAILED" } : m))
        );
      }
    },
    [conversation, whatsappAccountId, replyTo]
  );

  // ═══════════════════════════════════
  // SEND MEDIA
  // ═══════════════════════════════════

  const handleSendMedia = useCallback(
    async (uri: string, mimeType: string, fileName: string) => {
      if (!conversation) return;

      const tempId = `temp-media-${Date.now()}`;
      const now = new Date().toISOString();

      const mediaType: Message["type"] = mimeType.startsWith("image/")
        ? "IMAGE"
        : mimeType.startsWith("video/")
        ? "VIDEO"
        : mimeType.startsWith("audio/")
        ? "AUDIO"
        : "DOCUMENT";

      const tempMsg: Message = {
        id: tempId,
        conversationId: conversation.id,
        content: fileName,
        type: mediaType,
        direction: "OUTBOUND",
        status: "PENDING",
        createdAt: now,
        timestamp: now,
        mediaUrl: mimeType.startsWith("image/") ? uri : undefined,
        mediaMimeType: mimeType,
        fileName,
      };

      sentIdsRef.current.add(tempId);
      setMessages((prev) => [tempMsg, ...prev]);

      try {
        // Upload
        const uploadRes = await inboxApi.uploadMedia(uri, mimeType, fileName);
        const uploaded = uploadRes.data?.data as any;

        if (!uploaded?.url) throw new Error("Upload failed");

        // Send
        const sendRes = await inboxApi.sendMediaMessage(conversation.id, {
          mediaType: mediaType.toLowerCase() as any,
          mediaUrl: uploaded.url,
          tempId,
        });

        const realMsg = sendRes.data?.data as any;
        const message = realMsg?.message || realMsg;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...(message || m),
                  id: message?.id || m.id,
                  status: "SENT",
                  mediaUrl: uploaded.url,
                }
              : m
          )
        );
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Failed to send media");
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: "FAILED" } : m))
        );
      }
    },
    [conversation]
  );

  // ═══════════════════════════════════
  // MESSAGE ACTIONS
  // ═══════════════════════════════════

  const handleReply = (msg: Message) => {
    setReplyTo(msg);
  };

  const handleDeleteMessage = async (msg: Message) => {
    if (!conversation) return;
    Alert.alert("Delete Message", "Delete this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await inboxApi.deleteMessage(conversation.id, msg.id);
            setMessages((prev) => prev.filter((m) => m.id !== msg.id));
          } catch {
            Alert.alert("Error", "Failed to delete");
          }
        },
      },
    ]);
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await Clipboard.setStringAsync(content);
      Alert.alert("Copied", "Message copied to clipboard");
    } catch {
      Alert.alert("Copied", content);
    }
  };

  const name = conversation ? getContactName(conversation.contact) : "";
  const initials = conversation ? getContactInitials(conversation.contact) : "";
  const avatarColor = getAvatarColor(name);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const renderMessageItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      // In inverted list, messages[index + 1] is the older message sent before item
      const olderMsg = index < messages.length - 1 ? messages[index + 1] : null;
      const showDate = shouldShowDateSeparator(item, olderMsg);
      const isGrouped = shouldGroupMessages(item, olderMsg);

      return (
        <View key={item.id}>
          {showDate && (
            <DateSeparator
              date={item.createdAt || item.timestamp || ""}
            />
          )}
          <MessageBubble
            message={item}
            conversationId={conversation?.id || ""}
            contactName={name}
            isGrouped={isGrouped}
            onReply={handleReply}
            onDelete={handleDeleteMessage}
            onCopy={handleCopyMessage}
          />
        </View>
      );
    },
    [messages, conversation?.id, name, handleReply, handleDeleteMessage]
  );

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  if (loading && messages.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!conversation) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Conversation not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => {
            router.push(
              `/(app)/inbox/contact-info/${conversation.id}` as never
            );
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.headerAvatar, { backgroundColor: avatarColor }]}>
            {conversation.contact.whatsappProfilePicUrl ? (
              <Image
                source={{ uri: conversation.contact.whatsappProfilePicUrl }}
                style={styles.headerAvatarImg}
              />
            ) : (
              <Text style={styles.headerAvatarText}>{initials}</Text>
            )}
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.headerStatus} numberOfLines={1}>
              {isContactTyping
                ? "typing..."
                : conversation.contact.phone}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              if (conversation.contact.phone) {
                router.push(`/(app)/inbox/contact-info/${conversation.id}` as never);
              }
            }}
          >
            <Ionicons name="call" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              router.push(`/(app)/inbox/contact-info/${conversation.id}` as never);
            }}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Window Status */}
      <WindowStatusBar
        isWindowOpen={conversation.isWindowOpen}
        windowExpiresAt={conversation.windowExpiresAt}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* MESSAGES */}
        <View style={styles.messagesWrap}>
          {/* Chat background */}
          <View style={styles.chatBg} />

          <FlatList
            ref={flatListRef}
            data={messages}
            inverted
            keyExtractor={keyExtractor}
            renderItem={renderMessageItem}
            initialNumToRender={20}
            maxToRenderPerBatch={15}
            windowSize={7}
            removeClippedSubviews={Platform.OS === "android"}
            updateCellsBatchingPeriod={50}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onEndReachedThreshold={0.2}
            onEndReached={() => {
              if (hasMore && !loadingMore && !loading) {
                fetchMessages(page + 1, true);
              }
            }}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadMoreBox}>
                  <ActivityIndicator color={Colors.primary} size="small" />
                </View>
              ) : null
            }
          />
        </View>

        {/* Reply Bar */}
        {replyTo && (
          <ReplyBar
            message={replyTo}
            contactName={name}
            onCancel={() => setReplyTo(null)}
          />
        )}

        {/* INPUT */}
        <View
          style={{
            paddingBottom: isKeyboardVisible
              ? 2
              : insets.bottom > 0
              ? insets.bottom
              : 4,
          }}
        >
          <ChatInput
            isWindowOpen={conversation.isWindowOpen}
            onSendMessage={handleSendMessage}
            onSendMedia={handleSendMedia}
            onOpenTemplate={() => setShowTemplateModal(true)}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Template Modal */}
      {showTemplateModal && whatsappAccountId && (
        <TemplateModal
          visible={showTemplateModal}
          conversationId={conversation.id}
          contactPhone={conversation.contact.phone}
          contactName={name}
          whatsappAccountId={whatsappAccountId}
          onClose={() => setShowTemplateModal(false)}
          onSuccess={() => {
            setShowTemplateModal(false);
            fetchMessages(1);
            fetchConversation();
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════
// DATE SEPARATOR
// ═══════════════════════════════════

function DateSeparator({ date }: { date: string }) {
  return (
    <View style={styles.dateSeparator}>
      <View style={styles.dateBadge}>
        <Text style={styles.dateBadgeText}>{formatDateSeparator(date)}</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════
// STYLES
// ═══════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E5DDD5" },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    textAlign: "center",
    padding: 40,
    color: Colors.error,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    gap: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  headerAvatarImg: {
    width: "100%",
    height: "100%",
  },
  headerAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  headerStatus: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  // Chat
  chatContainer: {
    flex: 1,
    backgroundColor: "#E5DDD5",
  },
  messagesWrap: {
    flex: 1,
    position: "relative",
  },
  chatBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#E5DDD5",
    opacity: 0.6,
  },
  messagesList: {
    paddingVertical: 12,
    paddingBottom: 4,
  },

  // Date separator
  dateSeparator: {
    alignItems: "center",
    marginVertical: 12,
  },
  dateBadge: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  dateBadgeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  loadMoreBox: {
    padding: 12,
    alignItems: "center",
  },
});
