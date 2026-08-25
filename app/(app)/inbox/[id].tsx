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
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import {
  inbox as inboxApi,
  whatsapp as whatsappApi,
  handleApiError,
} from "../../../src/services/api";
import {
  useInboxSocket,
  InboundMessage,
  ConversationUpdate,
  MessageStatusUpdate,
} from "../../../src/hooks/useInboxSocket";
import { Colors } from "../../../src/constants/colors";
import { cacheGet, cacheSet } from "../../../src/hooks/useCachedFetch";
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

// Connected WhatsApp account poore app ke liye ek hi hota hai. Isliye
// module level par cache - har chat open par network call na jaye.
let cachedAccountId: string | null = null;
let accountFetchPromise: Promise<string | null> | null = null;

export default function ChatScreen() {
  const {
    id,
    name: paramName,
    phone: paramPhone,
  } = useLocalSearchParams<{ id: string; name?: string; phone?: string }>();
  const insets = useSafeAreaInsets();

  const [conversation, setConversation] = useState<Conversation | null>(
    () => cacheGet<Conversation>(`conv:${id}`) ?? null
  );

  // Fetch poora hua ya nahi - "not found" sirf tab dikhana hai jab server ne
  // sach mein kuch na diya ho, sirf isliye nahi ki abhi load ho raha hai
  const [convChecked, setConvChecked] = useState(
    () => !!cacheGet<Conversation>(`conv:${id}`)
  );
  // Pichhli baar ke messages turant dikha do, fresh background mein aayenge
  // Forward - kaunsa message, aur picker ki state
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [forwardList, setForwardList] = useState<any[]>([]);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardingTo, setForwardingTo] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>(
    () => cacheGet<Message[]>(`chat:${id}`) ?? []
  );
  const [loading, setLoading] = useState(
    () => !cacheGet<Message[]>(`chat:${id}`)
  );
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
        const conv = (res.data?.data || res.data) as Conversation;
        cacheSet(`conv:${id}`, conv);
        setConversation(conv);
      }
    } catch (err) {
      console.error("Fetch conversation error:", err);
      Alert.alert("Error", "Failed to load conversation");
      router.back();
    } finally {
      setConvChecked(true);
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
            // Chat dobara kholne par purane messages turant dikh jayein
            cacheSet(`chat:${id}`, list);
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
    // Connected account har chat ke liye same hota hai, par ye har chat open
    // par /meta/accounts call kar raha tha - jo ab usage counts bhi compute
    // karta hai. Isliye process-level cache: ek baar laao, phir reuse.
    if (cachedAccountId) {
      setWhatsappAccountId(cachedAccountId);
      return;
    }

    if (!accountFetchPromise) {
      accountFetchPromise = (async () => {
        try {
          const res = await whatsappApi.accounts();
          const accounts =
            res?.data?.data?.accounts ||
            (Array.isArray(res?.data?.data) ? res?.data?.data : []);
          const connected = accounts.find(
            (a: any) => String(a.status || "").toUpperCase() === "CONNECTED"
          );
          return connected?.id || null;
        } catch (err) {
          console.error("Account fetch error:", err);
          return null;
        } finally {
          // Fail hone par agli baar dobara try ho sake
          accountFetchPromise = null;
        }
      })();
    }

    const id = await accountFetchPromise;
    if (id) {
      cachedAccountId = id;
      setWhatsappAccountId(id);
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
          conversationId: conversation.id,
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

  // ═══════════════════════════════════
  // FORWARD
  // ═══════════════════════════════════

  const openForward = useCallback(async (msg: Message) => {
    setForwardMsg(msg);
    setForwardSearch("");
    setForwardLoading(true);

    try {
      const res = await inboxApi.getConversations({ limit: 100 });
      const data = res.data?.data ?? res.data;
      const list = Array.isArray(data) ? data : (data as any)?.conversations || [];

      // Isi chat mein forward karne ka matlab nahi
      setForwardList(list.filter((c: any) => c?.id && c.id !== id));
    } catch (err: any) {
      Alert.alert("Error", handleApiError(err, "Could not load chats"));
      setForwardMsg(null);
    } finally {
      setForwardLoading(false);
    }
  }, [id]);

  const doForward = async (target: any) => {
    if (!forwardMsg || !whatsappAccountId) return;

    const type = (forwardMsg.type || "text").toLowerCase();
    setForwardingTo(target.id);

    try {
      if (type === "text") {
        await whatsappApi.sendText({
          whatsappAccountId,
          to: target.contact?.phone,
          message: forwardMsg.content || "",
          conversationId: target.id,
        });
      } else {
        // Media forward - wahi mediaUrl dobara bhej do, naya upload nahi
        const mediaUrl = forwardMsg.mediaUrl;
        if (!mediaUrl) throw new Error("This media is no longer available to forward");

        await inboxApi.sendMediaMessage(target.id, {
          mediaType: type as "image" | "video" | "audio" | "document",
          mediaUrl,
          caption: forwardMsg.content || undefined,
        });
      }

      setForwardMsg(null);
      Alert.alert(
        "Forwarded",
        `Message sent to ${target.contact?.name || target.contact?.phone || "chat"}`
      );
    } catch (err: any) {
      Alert.alert("Could not forward", handleApiError(err, "Forward failed"));
    } finally {
      setForwardingTo(null);
    }
  };

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

  // Conversation load hone se pehle bhi header bhara dikhe - list se aaya
  // naam/phone use karo, taaki screen blank na lage
  const name = conversation
    ? getContactName(conversation.contact)
    : paramName || "";
  const phone = conversation?.contact.phone || paramPhone || "";
  const initials = conversation
    ? getContactInitials(conversation.contact)
    : (name.trim()[0] || "?").toUpperCase();
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
            onForward={openForward}
          />
        </View>
      );
    },
    [messages, conversation?.id, name, handleReply, handleDeleteMessage, openForward]
  );

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  // Pehle yahan poori screen ka loader tha - chat khulte hi sab blank.
  // Ab header aur input turant render hote hain, spinner sirf message
  // area mein aata hai. "Not found" tabhi jab fetch pura ho chuka ho.
  const notFound = convChecked && !conversation;
  const showMessagesLoader =
    !notFound && messages.length === 0 && (loading || !conversation);

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
            if (!conversation) return;
            router.push(
              `/(app)/inbox/contact-info/${conversation.id}` as never
            );
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.headerAvatar, { backgroundColor: avatarColor }]}>
            {conversation?.contact.whatsappProfilePicUrl ? (
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
              {isContactTyping ? "typing..." : phone}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              if (conversation?.contact.phone) {
                router.push(`/(app)/inbox/contact-info/${conversation.id}` as never);
              }
            }}
          >
            <Ionicons name="call" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              if (!conversation) return;
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

      {/* Window Status - asli data aane par hi, warna galat banner dikhega */}
      {!!conversation && (
        <WindowStatusBar
          isWindowOpen={conversation.isWindowOpen}
          windowExpiresAt={conversation.windowExpiresAt}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* MESSAGES */}
        <View style={styles.messagesWrap}>
          {/* Chat background */}
          <View style={styles.chatBg} />

          {showMessagesLoader && (
            <View style={styles.messagesCenter} pointerEvents="none">
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}

          {notFound && (
            <View style={styles.messagesCenter}>
              <Ionicons
                name="alert-circle-outline"
                size={44}
                color={Colors.textMuted}
              />
              <Text style={styles.errorText}>Conversation not found</Text>
            </View>
          )}

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
          {conversation ? (
            <ChatInput
              isWindowOpen={conversation.isWindowOpen}
              onSendMessage={handleSendMessage}
              onSendMedia={handleSendMedia}
              onOpenTemplate={() => setShowTemplateModal(true)}
            />
          ) : (
            // Asli input tab tak nahi, jab tak window ka status na pata ho
            <View style={styles.inputSkeleton} />
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Template Modal */}
      {showTemplateModal && whatsappAccountId && conversation && (
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

      {/* Forward - chat picker */}
      <Modal
        visible={!!forwardMsg}
        transparent
        animationType="slide"
        onRequestClose={() => setForwardMsg(null)}
      >
        <View style={fwdStyles.overlay}>
          <View style={fwdStyles.sheet}>
            <View style={fwdStyles.header}>
              <Text style={fwdStyles.title}>Forward to</Text>
              <TouchableOpacity onPress={() => setForwardMsg(null)} hitSlop={8}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={fwdStyles.searchRow}>
              <Ionicons name="search" size={16} color={Colors.textMuted} />
              <TextInput
                style={fwdStyles.searchInput}
                placeholder="Search chats"
                placeholderTextColor={Colors.textMuted}
                value={forwardSearch}
                onChangeText={setForwardSearch}
                autoCorrect={false}
              />
            </View>

            {forwardLoading ? (
              <View style={fwdStyles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <FlatList
                data={forwardList.filter((c) => {
                  const q = forwardSearch.trim().toLowerCase();
                  if (!q) return true;
                  const n = (c.contact?.name || "").toLowerCase();
                  const p = (c.contact?.phone || "").toLowerCase();
                  return n.includes(q) || p.includes(q);
                })}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={fwdStyles.centered}>
                    <Text style={fwdStyles.emptyText}>No other chats</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const label =
                    item.contact?.name || item.contact?.phone || "Unknown";
                  const busy = forwardingTo === item.id;

                  return (
                    <TouchableOpacity
                      style={fwdStyles.row}
                      onPress={() => doForward(item)}
                      disabled={!!forwardingTo}
                    >
                      <View style={fwdStyles.avatar}>
                        <Text style={fwdStyles.avatarText}>
                          {label.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={fwdStyles.rowName} numberOfLines={1}>
                          {label}
                        </Text>
                        {!!item.contact?.phone && (
                          <Text style={fwdStyles.rowPhone} numberOfLines={1}>
                            {item.contact.phone}
                          </Text>
                        )}
                      </View>
                      {busy ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <Ionicons name="send" size={16} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
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
  messagesCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  inputSkeleton: {
    height: 58,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
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

const fwdStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: { fontSize: 17, fontWeight: "800", color: Colors.textPrimary },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 14,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  centered: { padding: 32, alignItems: "center" },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  rowName: { fontSize: 15, fontWeight: "600", color: Colors.textPrimary },
  rowPhone: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 1 },
});
