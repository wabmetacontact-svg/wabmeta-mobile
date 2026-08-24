// src/types/whatsapp.ts
export interface WhatsAppAccount {
  id: string;
  organizationId: string;
  phoneNumber: string;
  phoneNumberId: string;
  wabaId: string;
  displayName: string;
  verifiedName: string;
  qualityRating: string | null;
  messagingLimit: string | null;
  status: "CONNECTED" | "DISCONNECTED" | "PENDING";
  connectionType: "CLOUD_API" | "WHATSAPP_BUSINESS_APP";
  isDefault: boolean;
  codeVerificationStatus: string | null;
  nameStatus?: string | null;
  dailyMessageLimit?: number;
  dailyMessagesUsed?: number;
  // Backend se aate hain (meta.service getMessagingUsage).
  // Meta ki limit unique customers par hai jinse 24h ke rolling window mein
  // conversation start ki - raw message count par nahi.
  // null limit = unlimited tier.
  messagingLimitPerDay?: number | null;
  messagingUsed24h?: number;
  messagingRemaining?: number | null;
  hasAccessToken: boolean;
  createdAt: string;
  updatedAt: string;
}
