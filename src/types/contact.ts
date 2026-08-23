// src/types/contact.ts
export interface Contact {
  id: string;
  phone: string;
  countryCode: string;
  fullPhone: string;
  firstName: string;
  lastName?: string;
  fullName: string;
  email?: string;
  avatar?: string;
  tags: string[];
  customFields?: any;
  status: "ACTIVE" | "BLOCKED" | "UNSUBSCRIBED" | "DELETED";
  source?: string;
  lastMessageAt?: string;
  messageCount?: number;
  whatsappProfileFetched?: boolean;
  whatsappProfileName?: string;
  whatsappProfilePicUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactWithGroups extends Contact {
  groups?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

export interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  contactCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactStats {
  total: number;
  active: number;
  blocked: number;
  unsubscribed: number;
  recentlyAdded: number;
  withMessages: number;
  whatsappVerified: number;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface Tag {
  id?: string;
  name?: string;
  tag?: string;
  count?: number;
}
