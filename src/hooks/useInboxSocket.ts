// src/hooks/useInboxSocket.ts
import { useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";

export interface InboundMessage {
  id: string;
  conversationId: string;
  waMessageId?: string;
  wamId?: string;
  content: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  createdAt: string;
  timestamp?: string;
  type: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  metadata?: any;
}

export interface ConversationUpdate {
  id: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount?: number;
  isWindowOpen?: boolean;
  windowExpiresAt?: string;
  contact?: any;
  isPinned?: boolean;
  labels?: string[];
  isArchived?: boolean;
  isRead?: boolean;
}

export interface MessageStatusUpdate {
  messageId?: string;
  waMessageId?: string;
  wamId?: string;
  conversationId: string;
  status: string;
  timestamp: string;
  tempId?: string;
  failureReason?: string;
}

type NewMessageCallback = (message: InboundMessage) => void;
type ConversationUpdateCallback = (update: ConversationUpdate) => void;
type MessageStatusCallback = (status: MessageStatusUpdate) => void;

export function useInboxSocket(
  selectedConversationId: string | null,
  onNewMessage?: NewMessageCallback,
  onConversationUpdate?: ConversationUpdateCallback,
  onMessageStatus?: MessageStatusCallback
) {
  const { socket, isConnected, joinConversation, leaveConversation } =
    useSocket();

  const onNewMessageRef = useRef(onNewMessage);
  const onConversationUpdateRef = useRef(onConversationUpdate);
  const onMessageStatusRef = useRef(onMessageStatus);
  const prevConvIdRef = useRef<string | null>(null);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onConversationUpdateRef.current = onConversationUpdate;
    onMessageStatusRef.current = onMessageStatus;
  });

  // Join/leave conversation rooms
  useEffect(() => {
    if (!isConnected) return;

    const prev = prevConvIdRef.current;
    const curr = selectedConversationId;

    if (prev && prev !== curr) {
      leaveConversation(prev);
    }

    if (curr) {
      joinConversation(curr);
      prevConvIdRef.current = curr;
    }

    return () => {
      if (curr) {
        leaveConversation(curr);
        prevConvIdRef.current = null;
      }
    };
  }, [isConnected, selectedConversationId, joinConversation, leaveConversation]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: any) => {
      try {
        const raw = data?.message || data;
        const convId = raw?.conversationId || data?.conversationId;

        if (!raw || !convId) return;

        const msg: InboundMessage = {
          ...raw,
          conversationId: convId,
          createdAt: raw.createdAt || new Date().toISOString(),
        };

        onNewMessageRef.current?.(msg);
      } catch (e) {
        console.error("handleNewMessage error:", e);
      }
    };

    const handleConversationUpdate = (data: any) => {
      try {
        const update: ConversationUpdate = data?.conversation || data;
        if (!update?.id) return;
        onConversationUpdateRef.current?.(update);
      } catch (e) {
        console.error("handleConversationUpdate error:", e);
      }
    };

    const handleMessageStatus = (data: any) => {
      try {
        if (!data?.status) return;
        onMessageStatusRef.current?.({
          messageId: data.messageId,
          waMessageId: data.waMessageId,
          wamId: data.wamId,
          conversationId: data.conversationId || "",
          status: data.status,
          timestamp: data.timestamp || new Date().toISOString(),
          tempId: data.tempId,
          failureReason: data.failureReason,
        });
      } catch (e) {
        console.error("handleMessageStatus error:", e);
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("conversation:updated", handleConversationUpdate);
    socket.on("message:status", handleMessageStatus);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("conversation:updated", handleConversationUpdate);
      socket.off("message:status", handleMessageStatus);
    };
  }, [socket]);

  return { isConnected };
}
