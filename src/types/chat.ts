export type MessageType = "text" | "image" | "video" | "audio" | "document" | "template" | "interactive";
export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";

export interface Message {
  id: string;
  conversationId: string;
  sender: "user" | "contact" | "system" | "bot";
  type: MessageType;
  content: string;
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: number;
  status: MessageStatus;
  timestamp: string;
  replyTo?: {
    id: string;
    content: string;
    senderName?: string;
  };
}

export interface Conversation {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactAvatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageType?: MessageType;
  unreadCount: number;
  tags?: string[];
  assignedTo?: string;
  status: "open" | "pending" | "resolved";
  isOnline?: boolean;
}
