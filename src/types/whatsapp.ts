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

  // Meta ka health_status. Yahi ek jagah hai jahan wo saaf batata hai ki
  // number business-initiated messages (templates/campaigns) bhej sakta hai
  // ya nahi - aur na bhej sakne par asli wajah kya hai (payment method,
  // banned WABA, business verification, OTP pending).
  healthCanSend?: "AVAILABLE" | "LIMITED" | "BLOCKED" | "UNKNOWN" | null;
  healthBlockedReason?: string | null;
  healthCheckedAt?: string | null;
  dailyMessageLimit?: number;
  dailyMessagesUsed?: number;
  // Backend se aate hain (meta.service getMessagingUsage).
  // Meta ki limit unique customers par hai jinse 24h ke rolling window mein
  // conversation start ki - raw message count par nahi.
  // null limit = unlimited tier.
  messagingLimitPerDay?: number | null;
  messagingUsed24h?: number;
  messagingRemaining?: number | null;
  // ASSIGNED = Meta ne tier de diya | PENDING = sync ho chuka par Meta ne
  // abhi tier assign nahi kiya (naye number par normal hai) | SYNCING = is
  // account ka sync abhi chala hi nahi
  messagingTierStatus?: "ASSIGNED" | "PENDING" | "SYNCING";
  hasAccessToken: boolean;
  createdAt: string;
  updatedAt: string;
}
