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
  hasAccessToken: boolean;
  createdAt: string;
  updatedAt: string;
}
