// src/types/chatbot.ts
export type ChatbotStatus = "ACTIVE" | "PAUSED" | "DRAFT";

export type NodeType =
  | "start"
  | "message"
  | "button"
  | "list"
  | "ai"
  | "condition"
  | "delay"
  | "action"
  | "end";

export interface NodeButton {
  id: string;
  text: string;
  type?: "reply" | "url" | "phone";
  value?: string;
  nextNodeId?: string;
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
  nextNodeId?: string;
}

export interface ListSection {
  title?: string;
  rows: ListRow[];
}

export interface FlowNode {
  id: string;
  type: NodeType;
  position?: { x: number; y: number };
  data: {
    label?: string;
    message?: string;
    messageType?: "text" | "image" | "video" | "document" | "audio";
    mediaUrl?: string;
    systemPrompt?: string;
    buttons?: NodeButton[];
    listButtonText?: string;
    listSections?: ListSection[];
    condition?: {
      variable?: string;
      operator?: "equals" | "contains" | "starts_with" | "regex";
      value?: string;
      type?: "keyword" | "contains" | "exact" | "regex";
    };
    delay?: number;
    action?: {
      type: "assign" | "tag" | "webhook" | "variable";
      value?: string;
      params?: any;
    };
    nextNodeId?: string;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface Chatbot {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  status: ChatbotStatus;
  triggerKeywords: string[];
  isDefault: boolean;
  welcomeMessage?: string | null;
  fallbackMessage?: string | null;
  flowData: FlowData;
  createdAt: string;
  updatedAt: string;
}

export interface ChatbotStats {
  totalConversations: number;
  activeSessions: number;
  completedFlows: number;
}

// Node type config for UI
export interface NodeTypeConfig {
  type: NodeType;
  label: string;
  description: string;
  icon: string;
  color: string;
  category: "trigger" | "message" | "logic" | "action";
}

export const NODE_TYPE_CONFIGS: NodeTypeConfig[] = [
  {
    type: "start",
    label: "Start",
    description: "Trigger point of flow",
    icon: "flash",
    color: "#10B981",
    category: "trigger",
  },
  {
    type: "message",
    label: "Send Message",
    description: "Text or media message",
    icon: "chatbubble",
    color: "#3B82F6",
    category: "message",
  },
  {
    type: "button",
    label: "Quick Reply",
    description: "Up to 3 buttons",
    icon: "apps",
    color: "#8B5CF6",
    category: "message",
  },
  {
    type: "list",
    label: "List Menu",
    description: "Up to 10 options",
    icon: "list",
    color: "#6366F1",
    category: "message",
  },
  {
    type: "ai",
    label: "AI Response",
    description: "GPT-powered reply",
    icon: "sparkles",
    color: "#EC4899",
    category: "message",
  },
  {
    type: "condition",
    label: "Condition",
    description: "If/else branching",
    icon: "git-branch",
    color: "#F59E0B",
    category: "logic",
  },
  {
    type: "delay",
    label: "Delay",
    description: "Wait before next",
    icon: "time",
    color: "#F97316",
    category: "logic",
  },
  {
    type: "action",
    label: "Action",
    description: "Tag, webhook, assign",
    icon: "hardware-chip",
    color: "#EC4899",
    category: "action",
  },
  {
    type: "end",
    label: "End Flow",
    description: "Close conversation",
    icon: "checkmark-circle",
    color: "#EF4444",
    category: "action",
  },
];
