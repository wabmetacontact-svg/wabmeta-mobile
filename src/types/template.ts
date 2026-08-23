// src/types/template.ts
export type TemplateStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
export type HeaderType = "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
export type ButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER";

export interface TemplateButton {
  type: ButtonType;
  text: string;
  url?: string;
  phoneNumber?: string;
  phone_number?: string;
}

export interface TemplateVariable {
  index: number;
  type: "header" | "body" | "button";
  buttonIndex?: number;
  placeholder?: string;
  example?: string;
}

export interface Template {
  id: string;
  metaTemplateId?: string | null;
  name: string;
  language: string;
  category: TemplateCategory;
  status: TemplateStatus;
  headerType?: HeaderType | null;
  headerContent?: string | null;
  headerMediaId?: string | null;
  bodyText: string;
  footerText?: string | null;
  buttons?: TemplateButton[];
  variables?: TemplateVariable[];
  rejectionReason?: string | null;
  qualityScore?: string | null;
  wabaId?: string | null;
  whatsappAccountId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  draft: number;
  byCategory: {
    marketing: number;
    utility: number;
    authentication: number;
  };
}

export interface TemplateFormData {
  name: string;
  language: string;
  category: TemplateCategory;
  headerType: HeaderType;
  headerText?: string;
  headerMediaId?: string;
  headerCloudinaryUrl?: string;
  headerFileName?: string;
  headerVariables?: Record<string, string>;
  bodyText: string;
  bodyVariables?: Record<string, string>;
  footerText?: string;
  buttons?: TemplateButton[];
  whatsappAccountId?: string;
}
