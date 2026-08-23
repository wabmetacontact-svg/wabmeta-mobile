// src/types/analytics.ts
export interface AnalyticsOverview {
  contacts?: { total: number; growth?: number };
  messages?: { sent: number; received: number; growth?: number };
  campaigns?: { active: number; completed?: number };
  templates?: { approved: number; total: number };
  totals?: { sent: number; delivered: number; read: number; failed: number; received: number };
  rates?: { delivery: number; read: number; failure: number };
  totalMessagesSent?: number;
  totalDelivered?: number;
  totalRead?: number;
  totalFailed?: number;
  totalReceived?: number;
  deliveryRate?: number;
  readRate?: number;
  failureRate?: number;
  totalContacts?: number;
  activeCampaigns?: number;
}

export interface DailyStat {
  date: string;
  label?: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface TopCampaign {
  id: string;
  name: string;
  sentCount: number;
  deliveredCount: number;
  deliveryRate: number;
}
