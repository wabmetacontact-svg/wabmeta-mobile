// src/hooks/useFeatureLock.ts
// Plan ke hisab se features lock hote hain. Ye flags admin panel se set hote
// hain aur login / organizations.getCurrent ke response mein organization ke
// saath aate hain.

import { useAuth } from "../context/AuthContext";

export type LockableFeature =
  | "inbox"
  | "campaigns"
  | "chatbot"
  | "automation"
  | "connection";

const FEATURE_LABEL: Record<LockableFeature, string> = {
  inbox: "Inbox",
  campaigns: "Campaigns",
  chatbot: "Chatbot",
  automation: "Automation",
  connection: "WhatsApp Connection",
};

const FEATURE_DESCRIPTION: Record<LockableFeature, string> = {
  inbox:
    "Live chat inbox is not included in your current plan. Upgrade to talk to your customers in real time.",
  campaigns:
    "Bulk campaigns are not included in your current plan. Upgrade to reach thousands of contacts at once.",
  chatbot:
    "The chatbot builder is not included in your current plan. Upgrade to automate your replies.",
  automation:
    "Automation workflows are not included in your current plan. Upgrade to run follow-ups automatically.",
  connection:
    "Connecting a WhatsApp account is not included in your current plan. Upgrade to add your number.",
};

export const featureLabel = (feature: LockableFeature) =>
  FEATURE_LABEL[feature];

export const featureDescription = (feature: LockableFeature) =>
  FEATURE_DESCRIPTION[feature];

export function useFeatureLock(feature: LockableFeature): boolean {
  const { organization } = useAuth();

  if (!organization) return false;

  switch (feature) {
    case "inbox":
      return organization.featureInboxLocked === true;
    case "campaigns":
      return organization.featureCampaignsLocked === true;
    case "chatbot":
      return organization.featureChatbotLocked === true;
    case "automation":
      return organization.featureAutomationLocked === true;
    case "connection":
      return organization.featureConnectionLocked === true;
    default:
      return false;
  }
}

// Ek saath saare locks chahiye ho (jaise tab bar ya dashboard cards ke liye)
export function useFeatureLocks() {
  const { organization } = useAuth();

  return {
    inbox: organization?.featureInboxLocked === true,
    campaigns: organization?.featureCampaignsLocked === true,
    chatbot: organization?.featureChatbotLocked === true,
    automation: organization?.featureAutomationLocked === true,
    connection: organization?.featureConnectionLocked === true,
  };
}
