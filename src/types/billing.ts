// src/types/billing.ts

export interface PlanFeature {
  name: string;
  included: boolean;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxContacts: number;
  maxCampaigns: number;
  features: PlanFeature[];
  isPopular?: boolean;
}

export interface CurrentSubscription {
  id: string;
  status: "ACTIVE" | "CANCELED" | "PAST_DUE" | "UNPAID" | "TRIALING";
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: Plan;
  billingCycle: "monthly" | "yearly";
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: "PAID" | "OPEN" | "FAILED" | "VOID";
  createdAt: string;
  pdfUrl?: string;
}
