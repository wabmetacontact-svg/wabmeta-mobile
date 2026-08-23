// src/hooks/useInbox.ts
// Mobile version matching backend socket & API architecture

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket, SOCKET_EVENTS } from "../context/SocketContext";
import { inbox as inboxApi } from "../services/api";

export interface Message {
  id: string;
  wamId?: string;
  direction?: "INBOUND" | "OUTBOUND";
  sender?: "user" | "contact" | "system" | "bot";
  type?: string;
  content: any;
  status: string;
  createdAt?: string;
  timestamp?: string;
  sentAt?: string;
  mediaUrl?: string;
}

export interface Conversation {
  id: string;
  contact?: {
    id: string;
    phone: string;
    name?: string;
    profileName?: string;
    profilePicture?: string;
  };
  contactName?: string;
  contactPhone?: string;
  contactAvatar?: string;
  lastMessageAt?: string;
  lastMessageText?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  status?: string;
  isWindowOpen?: boolean;
  windowExpiresAt?: string;
  isOnline?: boolean;
}

export interface UseInboxReturn {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  hasMore: boolean;
  error: string | null;
  loadConversations: () => Promise<void>;
  loadMore: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  markAsRead: () => Promise<void>;
  refetch?: () => Promise<void>;
  loading?: boolean;
}

export function useInbox(): UseInboxReturn {
  const { socket, isConnected, joinConversation, leaveConversation } =
    useSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const activeConvRef = useRef<string | null>(null);

  // Normalizer helper so both object shapes work seamlessly
  const normalizeConv = (c: any): Conversation => {
    const contactName = c.contactName || c.contact?.name || c.contact?.profileName || c.contact?.phone || "Contact";
    const contactPhone = c.contactPhone || c.contact?.phone || "";
    const contactAvatar = c.contactAvatar || c.contact?.profilePicture || undefined;
    const lastMessage = c.lastMessage || c.lastMessageText || "";
    const lastMessageTime = c.lastMessageTime || c.lastMessageAt || new Date().toISOString();

    return {
      ...c,
      contactName,
      contactPhone,
      contactAvatar,
      lastMessage,
      lastMessageTime,
      unreadCount: c.unreadCount || 0,
    };
  };

  // --- Load conversations --------------------------
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await inboxApi.getConversations({
        limit: 30,
        page: 1,
      });

      const data = response.data?.data;
      let convList: any[] = [];

      if (Array.isArray(data)) convList = data;
      else if (data?.conversations) convList = data.conversations;

      const normalized = convList.map(normalizeConv);
      setConversations(normalized);
      setPage(1);
      setHasMore(convList.length === 30);
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        setError(
          err?.response?.data?.message ||
          "Failed to load conversations"
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Load more (pagination) ----------------------
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    try {
      const nextPage = page + 1;
      const response = await inboxApi.getConversations({
        limit: 30,
        page: nextPage,
      });

      const data = response.data?.data;
      let newConvs: any[] = [];

      if (Array.isArray(data)) newConvs = data;
      else if (data?.conversations) newConvs = data.conversations;

      const normalized = newConvs.map(normalizeConv);
      setConversations((prev) => [...prev, ...normalized]);
      setPage(nextPage);
      setHasMore(newConvs.length === 30);
    } catch (err) {
      console.error("Load more error:", err);
    }
  }, [page, hasMore, isLoading]);

  // --- Select conversation -------------------------
  const selectConversation = useCallback(
    async (conversationId: string) => {
      if (activeConvRef.current) {
        leaveConversation(activeConvRef.current);
      }

      const conversation = conversations.find(
        (c) => c.id === conversationId
      );
      if (!conversation) return;

      setActiveConversation(conversation);
      activeConvRef.current = conversationId;
      setMessages([]);

      joinConversation(conversationId);

      try {
        const response = await inboxApi.getMessages(conversationId);
        const data = response.data?.data;

        if (Array.isArray(data)) setMessages(data);
        else if (data?.messages) setMessages(data.messages);

        if (conversation.unreadCount > 0) {
          await inboxApi.markAsRead(conversationId);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId ? { ...c, unreadCount: 0 } : c
            )
          );
        }
      } catch (err) {
        console.error("Load messages error:", err);
      }
    },
    [conversations, joinConversation, leaveConversation]
  );

  // --- Send message --------------------------------
  const sendMessage = useCallback(
    async (text: string) => {
      if (!activeConversation) return;

      setIsSending(true);
      try {
        const response = await inboxApi.sendMessage(
          activeConversation.id,
          { content: text, type: "text" }
        );

        const msg = response.data?.data;
        if (msg) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id
              ? {
                  ...c,
                  lastMessageAt: new Date().toISOString(),
                  lastMessageTime: new Date().toISOString(),
                  lastMessageText: text.substring(0, 100),
                  lastMessage: text.substring(0, 100),
                }
              : c
          )
        );
      } catch (err: any) {
        throw new Error(
          err?.response?.data?.message || "Failed to send"
        );
      } finally {
        setIsSending(false);
      }
    },
    [activeConversation]
  );

  const markAsRead = useCallback(async () => {
    if (!activeConversation) return;
    try {
      await inboxApi.markAsRead(activeConversation.id);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, unreadCount: 0 }
            : c
        )
      );
      setActiveConversation((prev) =>
        prev ? { ...prev, unreadCount: 0 } : null
      );
    } catch (err) {
      console.error("Mark as read error:", err);
    }
  }, [activeConversation]);

  // --- Socket events -------------------------------
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = (data: {
      conversationId: string;
      message: Message;
    }) => {
      if (data.conversationId === activeConvRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId
            ? {
                ...c,
                lastMessageAt: data.message.createdAt || new Date().toISOString(),
                lastMessageTime: data.message.createdAt || new Date().toISOString(),
                lastMessageText:
                  typeof data.message.content === "string"
                    ? data.message.content.substring(0, 100)
                    : data.message.content?.text?.substring(0, 100) || "New message",
                lastMessage:
                  typeof data.message.content === "string"
                    ? data.message.content.substring(0, 100)
                    : data.message.content?.text?.substring(0, 100) || "New message",
                unreadCount:
                  c.id === activeConvRef.current
                    ? 0
                    : c.unreadCount + 1,
              }
            : c
        )
      );
    };

    const handleStatus = (data: {
      messageId: string;
      wamId: string;
      status: string;
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId || m.wamId === data.wamId
            ? { ...m, status: data.status.toUpperCase() }
            : m
        )
      );
    };

    socket.on(SOCKET_EVENTS.MESSAGE_NEW, handleNewMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_STATUS, handleStatus);

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_NEW, handleNewMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_STATUS, handleStatus);
    };
  }, [socket, isConnected]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    activeConversation,
    messages,
    isLoading,
    isSending,
    hasMore,
    error,
    loadConversations,
    loadMore,
    selectConversation,
    sendMessage,
    markAsRead,
    refetch: loadConversations,
    loading: isLoading,
  };
}

export default useInbox;
