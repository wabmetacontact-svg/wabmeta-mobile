// src/utils/inboxHelpers.ts
import { Conversation } from "../types/inbox";

export interface ContactLike {
  id?: string;
  phone: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  whatsappProfileName?: string;
  whatsappProfilePicUrl?: string;
  avatar?: string;
}

// Get display name
export const getContactName = (contact?: ContactLike): string => {
  if (!contact) return "Unknown";
  if (contact.whatsappProfileName) return contact.whatsappProfileName;
  if (contact.name) return contact.name;
  if (contact.firstName || contact.lastName) {
    return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  }
  return contact.phone || "Unknown";
};

// Get initials
export const getContactInitials = (contact?: ContactLike): string => {
  const name = getContactName(contact);
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.charAt(0) || "?").toUpperCase();
};

// Avatar colors (WhatsApp-like)
const AVATAR_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#F59E0B", // amber
  "#10B981", // emerald
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F43F5E", // rose
];

export const getAvatarColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// Sort conversations - pinned first, then by last message
export const sortConversations = <T extends Conversation>(convs: T[]): T[] => {
  return [...convs].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (
      new Date(b.lastMessageAt || 0).getTime() -
      new Date(a.lastMessageAt || 0).getTime()
    );
  });
};

// Format chat list time (WhatsApp style)
export const formatChatTime = (dateStr?: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (isToday) {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  if (isYesterday) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString("en-IN", { weekday: "short" });
  }
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

// Format message time
export const formatMessageTime = (dateStr?: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// Format date separator
export const formatDateSeparator = (dateStr?: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";

  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 7) {
    return date.toLocaleDateString("en-IN", { weekday: "long" });
  }
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// Get message preview text
export const getMessagePreview = (raw?: string, type?: string): string => {
  if (!raw) return "";

  if (raw === "[revoke]" || raw === "[Revoke]") {
    return "🚫 This message was deleted";
  }

  if (type === "interactive" || raw === "[button]") {
    return "🔘 Interactive message";
  }

  // Template
  if (raw.startsWith("Campaign:") || raw.startsWith("Template:")) {
    const tplLine = raw.split("\n").find((l) => l.startsWith("Template:"));
    const name = tplLine?.replace("Template:", "").trim() || "Template";
    return `📋 ${name.replace(/_/g, " ")}`;
  }

  if (raw.startsWith("{") && raw.includes("templateName")) {
    try {
      const p = JSON.parse(raw);
      return `📋 ${(p.body || p.templateName || "Template").substring(0, 50)}`;
    } catch {
      // ignore
    }
  }

  // Media
  const mediaMap: Record<string, string> = {
    "[image]": "📷 Photo",
    "[Image]": "📷 Photo",
    "[video]": "🎥 Video",
    "[Video]": "🎥 Video",
    "[audio]": "🎵 Voice message",
    "[Audio]": "🎵 Voice message",
    "[document]": "📄 Document",
    "[Document]": "📄 Document",
    "[sticker]": "🎭 Sticker",
    "[location]": "📍 Location",
    "[contact]": "👤 Contact",
  };
  if (mediaMap[raw]) return mediaMap[raw];

  return raw.substring(0, 60);
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

// Format duration
export const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// Check if messages should be grouped (same sender, within 2 min)
export const shouldGroupMessages = (
  current: any,
  previous: any | null
): boolean => {
  if (!previous) return false;
  if (current.direction !== previous.direction) return false;

  const currentTime = new Date(
    current.createdAt || current.timestamp
  ).getTime();
  const prevTime = new Date(
    previous.createdAt || previous.timestamp
  ).getTime();

  return currentTime - prevTime < 2 * 60 * 1000; // 2 minutes
};

// Should show date separator
export const shouldShowDateSeparator = (
  current: any,
  previous: any | null
): boolean => {
  if (!previous) return true;
  const currentDate = new Date(
    current.createdAt || current.timestamp
  ).toDateString();
  const prevDate = new Date(
    previous.createdAt || previous.timestamp
  ).toDateString();
  return currentDate !== prevDate;
};
