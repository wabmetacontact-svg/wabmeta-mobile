// src/types/crm.ts
export interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages: PipelineStage[];
  _count?: {
    leads: number;
  };
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
  probability?: number;
  isWon?: boolean;
  isLost?: boolean;
}

export interface Lead {
  id: string;
  title: string;
  value?: number;
  status: "NEW" | "ACTIVE" | "WON" | "LOST";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  source?: string;
  score?: number;
  contactId?: string;
  stageId?: string;
  pipelineId?: string;
  expectedCloseDate?: string;
  createdAt: string;
  contact?: {
    id: string;
    firstName?: string;
    lastName?: string;
    phone: string;
    email?: string;
    avatar?: string;
    whatsappProfileName?: string;
  };
  stage?: PipelineStage;
  pipeline?: Pipeline;
  notes?: Array<{
    id: string;
    content: string;
    createdAt: string;
  }>;
  activities?: Array<{
    id: string;
    title: string;
    createdAt: string;
  }>;
  _count?: {
    activities: number;
    notes: number;
    tasks: number;
  };
}

export interface CRMStats {
  totalLeads: number;
  newLeads: number;
  wonLeads: number;
  lostLeads: number;
  chatbotLeads: number;
  adLeads: number;
  hotLeads: number;
  totalValue: number;
  wonValue: number;
  averageScore: number;
  winRate: number;
}
