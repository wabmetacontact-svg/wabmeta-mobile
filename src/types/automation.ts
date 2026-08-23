// src/types/automation.ts
export type AutomationTrigger =
  | "NEW_CONTACT"
  | "KEYWORD"
  | "UNKNOWN_MESSAGE"
  | "SCHEDULE"
  | "WEBHOOK"
  | "INACTIVITY";

export interface AutomationAction {
  id: string;
  type: string;
  config: any;
}

export interface Automation {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  trigger: AutomationTrigger;
  triggerConfig: any;
  actions: AutomationAction[];
  isActive: boolean;
  targetGroupIds: string[];
  excludeExisting: boolean;
  executionCount: number;
  lastExecutedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationStats {
  total: number;
  active: number;
  inactive: number;
  totalExecutions: number;
}
