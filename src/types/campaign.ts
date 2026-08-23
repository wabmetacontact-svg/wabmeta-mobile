// src/types/campaign.ts
export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  templateId: string;
  templateName?: string;
  whatsappAccountId: string;
  whatsappAccountPhone?: string;
  contactGroupId?: string;
  contactGroupName?: string;
  variableMapping?: Record<string, string>;
  status: CampaignStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  totalContacts: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  pendingCount: number;
  deliveryRate: number;
  readRate: number;
  createdAt: string;
  updatedAt: string;
  template?: {
    name: string;
    bodyText?: string;
    headerType?: string;
    headerContent?: string;
  };
  _internal?: {
    realSent: number;
    realDelivered: number;
    realFailed: number;
    mode: "honest" | "smart" | "emergency_honest";
  };
}

export interface CampaignStats {
  total: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalRecipients: number;
}

export interface CampaignContact {
  id: string;
  contactId: string;
  phone: string;
  name: string;
  status: string;
  waMessageId?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  failureReason?: string;
  retryCount?: number;
  updatedAt: string;
}

export interface DetailedStats {
  totalContacts: number;
  pending: number;
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  failureReasons: { reason: string; count: number }[];
  successRate: number;
  deliveryRate: number;
  readRate: number;
}

export interface WalletEstimate {
  hasWallet: boolean;
  walletActive: boolean;
  availableBalance: number;
  estimatedCost: number;
  canProceed: boolean;
  shortfall: number;
  currency: string;
  estimatedCostBreakdown?: {
    totalRecipients: number;
    ratePerMessage: number;
    category: string;
    countryBreakdown?: {
      country: string;
      count: number;
      rate: number;
      cost: number;
    }[];
  };
}

export interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  headerType: string;
  headerContent?: string;
  body: string;
  buttons: { text: string; type?: string }[];
  variables: string[];
  headerVariables: string[];
  status: string;
}

export interface CampaignFormData {
  name: string;
  description: string;
  templateId: string;
  audienceType: "all" | "tags" | "manual" | "group" | "csv";
  selectedTags: string[];
  selectedContacts: string[];
  selectedGroup: string;
  csvContacts: any[];
  variableMapping: Record<string, string>;
  scheduleType: "now" | "later";
  scheduledDate: string;
  scheduledTime: string;
}
