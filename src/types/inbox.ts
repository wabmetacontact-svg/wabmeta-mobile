// src/types/inbox.ts
export interface Conversation {
  id: string;
  contactId: string;
  organizationId: string;
  whatsappAccountId?: string;
  phoneNumberId?: string;
  contact: {
    id: string;
    phone: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
    tags?: string[];
    whatsappProfileName?: string;
    whatsappProfilePicUrl?: string;
  };
  lastMessageAt?: string;
  lastMessagePreview?: string;
  lastMessageType?: string;
  lastMessageDirection?: "INBOUND" | "OUTBOUND";
  lastMessageStatus?: string;
  lastCustomerMessageAt?: string | null;
  unreadCount: number;
  isRead: boolean;
  isArchived: boolean;
  isPinned: boolean;
  isMuted?: boolean;
  isWindowOpen: boolean;
  windowExpiresAt?: string | null;
  labels?: string[];
  assignedTo?: string | null;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  whatsappAccountId?: string;
  waMessageId?: string;
  wamId?: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  content: string;
  status?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  failureReason?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaMimeType?: string | null;
  mediaId?: string | null;
  fileName?: string | null;
  metadata?: any;
  isStarred?: boolean;
  edited?: boolean;
  reactions?: Array<{ emoji: string; userId: string }>;
  replyTo?: {
    id: string;
    content: string;
    direction: "INBOUND" | "OUTBOUND";
    type?: string;
    senderName?: string;
  };
  timestamp?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Label {
  label: string;
  color?: string;
  count: number;
}

export interface InboxStats {
  total: number;
  open: number;
  unread: number;
  archived: number;
}

export type FilterTab = "all" | "unread" | "archived" | string;
