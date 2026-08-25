// app/(app)/campaigns/create.tsx
import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  templates as templatesApi,
  contacts as contactsApi,
  campaigns as campaignsApi,
  whatsapp as whatsappApi,
  handleApiError,
} from "../../../src/services/api";
import { Colors } from "../../../src/constants/colors";
import { CampaignFormData, Template } from "../../../src/types/campaign";

// Step Components
import { StepDetails } from "../../../src/components/campaigns/steps/StepDetails";
import { StepTemplate } from "../../../src/components/campaigns/steps/StepTemplate";
import { StepAudience } from "../../../src/components/campaigns/steps/StepAudience";
import { StepVariables } from "../../../src/components/campaigns/steps/StepVariables";
import { StepSchedule } from "../../../src/components/campaigns/steps/StepSchedule";
import { StepReview } from "../../../src/components/campaigns/steps/StepReview";

// ═══════════════════════════════════
// HELPERS
// ═══════════════════════════════════

const extractVars = (text: string): string[] => {
  if (!text) return [];
  const matches = text.match(/\{\{(\d+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))].sort(
    (a, b) => Number(a) - Number(b)
  );
};

const parseApiArray = <T,>(resp: any, keys: string[] = []): T[] => {
  const data = resp?.data ?? resp;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (data?.data && typeof data.data === "object") {
    for (const k of keys) {
      if (Array.isArray(data.data[k])) return data.data[k];
    }
  }
  for (const k of keys) {
    if (Array.isArray(data?.[k])) return data[k];
  }
  return [];
};

const STEPS = [
  { number: 1, title: "Details", icon: "document-text" as const },
  { number: 2, title: "Template", icon: "chatbox-ellipses" as const },
  { number: 3, title: "Audience", icon: "people" as const },
  { number: 4, title: "Variables", icon: "code" as const },
  { number: 5, title: "Schedule", icon: "time" as const },
  { number: 6, title: "Review", icon: "eye" as const },
];

// ═══════════════════════════════════

export default function CreateCampaignScreen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [sending, setSending] = useState(false);

  // Data
  const [whatsappAccounts, setWhatsappAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // Counts
  const [totalAllContacts, setTotalAllContacts] = useState(0);
  const [tagsAudienceCount, setTagsAudienceCount] = useState(0);
  const [groupMemberCount, setGroupMemberCount] = useState(0);

  // Created campaign for start
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  const [walletEstimate, setWalletEstimate] = useState<any>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  // Form
  const [formData, setFormData] = useState<CampaignFormData>({
    name: "",
    description: "",
    templateId: "",
    audienceType: "all",
    selectedTags: [],
    selectedContacts: [],
    selectedGroup: "",
    csvContacts: [],
    variableMapping: {},
    scheduleType: "now",
    scheduledDate: "",
    scheduledTime: "",
  });

  // ═══════════════════════════════════
  // LOAD ACCOUNTS
  // ═══════════════════════════════════

  useEffect(() => {
    (async () => {
      try {
        setLoadingAccounts(true);
        const res = await whatsappApi.accounts();
        const arr = parseApiArray<any>(res, ["accounts", "items", "data"]);
        const connected = arr.filter(
          (a) => String(a.status || "").toUpperCase() === "CONNECTED"
        );

        if (connected.length === 0) {
          Alert.alert(
            "No WhatsApp Account",
            "Please connect a WhatsApp account in Settings first.",
            [
              { text: "Cancel", onPress: () => router.back() },
              {
                text: "Go to Settings",
                onPress: () => router.replace("/(app)/(tabs)/settings" as never),
              },
            ]
          );
          return;
        }

        setWhatsappAccounts(connected);
        const def = connected.find((a) => a.isDefault) || connected[0];
        setSelectedAccountId(def.id);
      } catch {
        Alert.alert("Error", "Failed to load WhatsApp accounts");
        router.back();
      } finally {
        setLoadingAccounts(false);
      }
    })();
  }, []);

  // ═══════════════════════════════════
  // LOAD DATA
  // ═══════════════════════════════════

  useEffect(() => {
    if (!selectedAccountId) return;

    (async () => {
      setLoadingData(true);
      try {
        const [tplRes, cntRes, tagsRes, groupsRes, allCountRes] =
          await Promise.all([
            templatesApi.getAll({
              whatsappAccountId: selectedAccountId,
              status: "APPROVED",
              limit: 200,
            }),
            contactsApi.getAll({ limit: 500, status: "ACTIVE" }),
            contactsApi.getTags(),
            contactsApi.getGroups(),
            contactsApi.stats(),
          ]);

        // Templates
        const tplArr = parseApiArray<any>(tplRes, ["templates", "data"]);
        const mapped: Template[] = tplArr
          .filter((t) => String(t.status || "").toLowerCase() === "approved")
          .map((t) => ({
            id: t._id || t.id,
            name: t.name || "Untitled",
            category: (t.category || "UTILITY").toLowerCase(),
            language: t.language || "en_US",
            headerType: (t.headerType || "NONE").toLowerCase(),
            headerContent: t.headerContent || undefined,
            body: t.bodyText || t.body || "",
            buttons: (Array.isArray(t.buttons) ? t.buttons : []).map(
              (b: any) => ({
                text: b.text || "",
                type: b.type || "",
              })
            ),
            variables: extractVars(t.bodyText || t.body || ""),
            headerVariables: extractVars(t.headerContent || ""),
            status: String(t.status || "PENDING").toLowerCase(),
          }));
        setTemplates(mapped);

        // Contacts
        const cntArr = parseApiArray<any>(cntRes, ["contacts", "data"]);
        setContacts(
          cntArr.map((c: any) => ({
            id: c._id || c.id,
            name:
              `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
              c.phone ||
              "Unknown",
            phone: c.phone || "",
            tags: c.tags || [],
          }))
        );

        // Tags
        const tagsData = tagsRes?.data?.data;
        if (Array.isArray(tagsData)) {
          setAvailableTags(tagsData.map((t: any) => t.tag || t));
        }

        // Groups
        const groupsData = groupsRes?.data?.data;
        if (Array.isArray(groupsData)) {
          setGroups(groupsData);
        }

        // Total count for the "All contacts" audience. The backend targets only
        // ACTIVE contacts for an all-audience campaign, so count active (not the
        // non-deleted `total`) to match what actually gets messaged.
        const statsData = allCountRes?.data?.data;
        if (statsData?.active !== undefined) {
          setTotalAllContacts(statsData.active);
        } else if (statsData?.total !== undefined) {
          setTotalAllContacts(statsData.total);
        }
      } catch (err: any) {
        console.error("Load data error:", err);
        Alert.alert("Error", "Failed to load data");
      } finally {
        setLoadingData(false);
      }
    })();
  }, [selectedAccountId]);

  // ═══════════════════════════════════
  // AUDIENCE COUNT
  // ═══════════════════════════════════

  useEffect(() => {
    if (formData.selectedTags.length === 0) {
      setTagsAudienceCount(0);
      return;
    }

    (async () => {
      try {
        const res = await contactsApi.getAll({
          tags: formData.selectedTags,
          limit: 1,
        });
        // Backend shape is { success, data: [...], meta: { total } } — total is on
        // the top-level meta, not data.meta.
        setTagsAudienceCount(res.data?.meta?.total ?? res.data?.data?.meta?.total ?? 0);
      } catch {
        setTagsAudienceCount(0);
      }
    })();
  }, [formData.selectedTags]);

  useEffect(() => {
    if (!formData.selectedGroup) {
      setGroupMemberCount(0);
      return;
    }
    const group = groups.find((g) => g.id === formData.selectedGroup);
    setGroupMemberCount(group?.contactCount || 0);
  }, [formData.selectedGroup, groups]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === formData.templateId),
    [formData.templateId, templates]
  );

  const totalRecipients = useMemo(() => {
    switch (formData.audienceType) {
      case "all":
        return totalAllContacts;
      case "tags":
        return tagsAudienceCount;
      case "manual":
        return formData.selectedContacts.length;
      case "group":
        return groupMemberCount;
      case "csv":
        return formData.csvContacts?.length || 0;
      default:
        return 0;
    }
  }, [
    formData.audienceType,
    formData.selectedContacts,
    formData.csvContacts,
    totalAllContacts,
    tagsAudienceCount,
    groupMemberCount,
  ]);

  // ═══════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.name.trim() && !!selectedAccountId;
      case 2:
        return !!formData.templateId;
      case 3:
        if (formData.audienceType === "group")
          return !!formData.selectedGroup && totalRecipients > 0;
        if (formData.audienceType === "manual")
          return formData.selectedContacts.length > 0;
        if (formData.audienceType === "tags")
          return formData.selectedTags.length > 0 && totalRecipients > 0;
        return totalRecipients > 0;
      case 4:
        if (!selectedTemplate) return true;
        const allVars = [
          ...(selectedTemplate.variables || []),
          ...(selectedTemplate.headerVariables || []),
        ];
        return allVars.every((v) => formData.variableMapping[v]?.trim());
      case 5:
        if (formData.scheduleType === "later") {
          if (!formData.scheduledDate || !formData.scheduledTime) return false;
          const scheduled = new Date(
            `${formData.scheduledDate}T${formData.scheduledTime}:00`
          );
          return scheduled > new Date();
        }
        return true;
      case 6:
        return true;
      default:
        return true;
    }
  };

  // ═══════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    // On step 5 → 6: Create campaign and fetch estimate
    if (currentStep === 5) {
      await handleCreateCampaign();
    } else if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 6) {
      // Going back from review - clear created campaign
      setCreatedCampaignId(null);
      setWalletEstimate(null);
      setCurrentStep(5);
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ═══════════════════════════════════
  // CREATE CAMPAIGN
  // ═══════════════════════════════════

  // Android ka hardware back / swipe-back screen ko turant chhod deta tha
  // aur poora bhara hua campaign form gayab ho jata tha. Header ke X par
  // confirm tha, par back par kuch nahi. Ab dono ek hi jagah se guzarte hain.
  const confirmDiscard = useCallback(() => {
    // Campaign ban chuka hai to kuch "kho" nahi raha - seedha jaane do
    if (createdCampaignId) {
      router.back();
      return;
    }

    Alert.alert("Discard Changes?", "Your campaign will not be saved", [
      { text: "Keep Editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  }, [createdCampaignId]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      // Pehle step par ho to normal back, warna pichhle step par jao
      if (currentStep > 1 && !createdCampaignId) {
        setCurrentStep((prev) => prev - 1);
        return true;
      }

      confirmDiscard();
      return true; // default back rok do
    });

    return () => sub.remove();
  }, [currentStep, createdCampaignId, confirmDiscard]);

  const handleCreateCampaign = async () => {
    // Campaign step 5 ke "Next" par ban jata hai, "Confirm & Send" se pehle.
    // Agar start fail ho aur user peeche jaakar dobara Next dabaye, to pehle
    // yahan naya create chalta tha - aur backend "campaign already exists"
    // de deta tha. Ab pehle se bana hua campaign reuse karte hain.
    if (createdCampaignId) {
      setCurrentStep(6);

      // Estimate refresh kar lo - audience badli ho sakti hai
      if (formData.scheduleType === "now") {
        try {
          setLoadingEstimate(true);
          const estRes = await campaignsApi.estimateCost(createdCampaignId);
          setWalletEstimate(estRes.data?.data);
        } catch {
          // estimate optional hai
        } finally {
          setLoadingEstimate(false);
        }
      }
      return;
    }

    setSending(true);
    try {
      const account = whatsappAccounts.find((a) => a.id === selectedAccountId);
      if (!account) throw new Error("Invalid WhatsApp account");

      // Build audience
      let contactIds: string[] | undefined;
      let contactGroupId: string | undefined;
      let audienceFilter: any;
      let csvContactsPayload: any[] | undefined;

      switch (formData.audienceType) {
        case "all":
          audienceFilter = { all: true };
          break;
        case "tags":
          audienceFilter = { tags: formData.selectedTags };
          break;
        case "manual":
          contactIds = formData.selectedContacts;
          break;
        case "group":
          contactGroupId = formData.selectedGroup;
          break;
        case "csv":
          csvContactsPayload = formData.csvContacts;
          break;
      }

      // Build variable mapping
      const variableMapping: Record<string, string> = {};
      Object.entries(formData.variableMapping).forEach(([key, value]) => {
        const trimmed = String(value || "").trim();
        if (trimmed) variableMapping[key] = trimmed;
      });

      const scheduledAt =
        formData.scheduleType === "later"
          ? new Date(
              `${formData.scheduledDate}T${formData.scheduledTime}:00`
            ).toISOString()
          : undefined;

      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        templateId: formData.templateId,
        whatsappAccountId: account.id,
        contactIds,
        contactGroupId,
        audienceFilter,
        csvContacts: csvContactsPayload,
        variableMapping:
          Object.keys(variableMapping).length > 0 ? variableMapping : undefined,
        scheduledAt,
      };

      console.log("📤 Creating campaign:", payload);

      const res = await campaignsApi.create(payload);
      const campaignId = res.data?.data?.id;

      if (!campaignId) throw new Error("Campaign creation failed");

      setCreatedCampaignId(campaignId);

      // Fetch wallet estimate
      if (formData.scheduleType === "now") {
        try {
          setLoadingEstimate(true);
          const estRes = await campaignsApi.estimateCost(campaignId);
          setWalletEstimate(estRes.data?.data);
        } catch (e) {
          console.warn("Estimate failed:", e);
        } finally {
          setLoadingEstimate(false);
        }
        setCurrentStep(6);
      } else {
        // Scheduled - navigate back
        Alert.alert(
          "Campaign Scheduled!",
          `Your campaign will start at ${new Date(scheduledAt!).toLocaleString(
            "en-IN"
          )}`,
          [
            {
              text: "OK",
              onPress: () => router.replace("/(app)/(tabs)/campaigns" as never),
            },
          ]
        );
      }
    } catch (err: any) {
      console.error("Create error:", err);
      const msg = err?.response?.data?.message || err.message;

      if (msg && typeof msg === "string" && msg.includes("WALLET_")) {
        Alert.alert(
          "Wallet Balance Low",
          "Please top up your wallet to continue.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Go to Wallet",
              onPress: () => router.push("/(app)/wallet" as never),
            },
          ]
        );
      } else {
        Alert.alert("Error", msg || "Failed to create campaign");
      }
    } finally {
      setSending(false);
    }
  };

  // ═══════════════════════════════════
  // START CAMPAIGN
  // ═══════════════════════════════════

  const handleStartCampaign = async () => {
    if (!createdCampaignId) return;
    setSending(true);
    try {
      await campaignsApi.start(createdCampaignId);
      Alert.alert("Success", "Campaign started successfully!", [
        {
          text: "View Campaign",
          onPress: () =>
            router.replace(`/(app)/campaigns/${createdCampaignId}` as never),
        },
      ]);
    } catch (err: any) {
      // handleApiError use karo, sirf response.data.message nahi. Interceptor
      // network/timeout errors ko plain object bana kar reject karta hai
      // (jisme .response hota hi nahi), to asli wajah - 'Request timed out.'
      // ya 'No internet connection.' - yahan gayab ho jati thi aur user ko
      // sirf bemtlab ka 'Failed to start' dikhta tha.
      const msg = handleApiError(err, "Failed to start");
      if (msg && typeof msg === "string" && msg.includes("WALLET_")) {
        Alert.alert("Wallet Balance Low", "Please top up your wallet", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Go to Wallet",
            onPress: () => router.push("/(app)/wallet" as never),
          },
        ]);
      } else {
        // Campaign already ban chuka hai - user ko batao ki wo gaya nahi,
        // warna wo dobara poora flow chalata hai aur "already exists" milta hai
        Alert.alert(
          "Could not start campaign",
          msg +
            "\n\nYour campaign has been saved as a draft. You can start it again from the Campaigns list - no need to create it again.",
          [
            { text: "Try Again", onPress: handleStartCampaign },
            {
              text: "View Campaign",
              onPress: () =>
                router.replace(
                  `/(app)/campaigns/${createdCampaignId}` as never
                ),
            },
          ]
        );
      }
    } finally {
      setSending(false);
    }
  };

  // ═══════════════════════════════════
  // LOADING
  // ═══════════════════════════════════

  if (loadingAccounts) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading accounts...</Text>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={confirmDiscard} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Create Campaign</Text>
          <Text style={styles.headerSubtitle}>
            Step {currentStep} of {STEPS.length}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Connected Steps Indicator */}
      <View style={styles.stepperContainer}>
        {STEPS.map((step, index) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          const isLast = index === STEPS.length - 1;

          return (
            <React.Fragment key={step.number}>
              <TouchableOpacity
                style={styles.stepItem}
                onPress={() => {
                  if (step.number < currentStep) {
                    setCurrentStep(step.number);
                  }
                }}
                activeOpacity={step.number < currentStep ? 0.7 : 1}
              >
                <View
                  style={[
                    styles.stepCircle,
                    isActive && styles.stepCircleActive,
                    isCompleted && styles.stepCircleCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  ) : (
                    <Ionicons
                      name={step.icon}
                      size={12}
                      color={isActive ? "#fff" : Colors.textMuted}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isCompleted && styles.stepLabelCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {step.title}
                </Text>
              </TouchableOpacity>

              {!isLast && (
                <View
                  style={[
                    styles.stepConnector,
                    isCompleted && styles.stepConnectorActive,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {loadingData ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <>
            {currentStep === 1 && (
              <StepDetails
                formData={formData}
                setFormData={setFormData}
                whatsappAccounts={whatsappAccounts}
                selectedAccountId={selectedAccountId}
                setSelectedAccountId={setSelectedAccountId}
              />
            )}

            {currentStep === 2 && (
              <StepTemplate
                templates={templates}
                selectedTemplateId={formData.templateId}
                onSelect={(id) =>
                  setFormData((f) => ({ ...f, templateId: id }))
                }
              />
            )}

            {currentStep === 3 && (
              <StepAudience
                formData={formData}
                setFormData={setFormData}
                contacts={contacts}
                availableTags={availableTags}
                groups={groups}
                totalAllContacts={totalAllContacts}
                totalRecipients={totalRecipients}
              />
            )}

            {currentStep === 4 && selectedTemplate && (
              <StepVariables
                template={selectedTemplate}
                variableMapping={formData.variableMapping}
                onChange={(mapping) =>
                  setFormData((f) => ({ ...f, variableMapping: mapping }))
                }
              />
            )}

            {currentStep === 5 && (
              <StepSchedule
                formData={formData}
                setFormData={setFormData}
                totalRecipients={totalRecipients}
                selectedTemplate={selectedTemplate}
              />
            )}

            {currentStep === 6 && (
              <StepReview
                formData={formData}
                selectedTemplate={selectedTemplate}
                totalRecipients={totalRecipients}
                walletEstimate={walletEstimate}
                loadingEstimate={loadingEstimate}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            disabled={sending}
          >
            <Ionicons name="arrow-back" size={18} color={Colors.textPrimary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}

        {currentStep < 6 ? (
          <TouchableOpacity
            style={[
              styles.nextBtn,
              !validateStep(currentStep) && styles.nextBtnDisabled,
            ]}
            onPress={handleNext}
            disabled={!validateStep(currentStep) || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>
                  {currentStep === 5
                    ? formData.scheduleType === "now"
                      ? "Review & Send"
                      : "Schedule"
                    : "Continue"}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (sending ||
                loadingEstimate ||
                (walletEstimate?.hasWallet &&
                  walletEstimate?.walletActive &&
                  !walletEstimate?.canProceed)) &&
                styles.nextBtnDisabled,
            ]}
            onPress={handleStartCampaign}
            disabled={
              sending ||
              loadingEstimate ||
              (walletEstimate?.hasWallet &&
                walletEstimate?.walletActive &&
                !walletEstimate?.canProceed)
            }
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.nextBtnText}>Confirm & Send</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingBox: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textMuted,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: "600",
  },

  stepperContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  stepItem: {
    alignItems: "center",
    width: 44,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  stepCircleCompleted: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  stepLabel: {
    fontSize: 9.5,
    color: Colors.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },
  stepLabelActive: {
    color: Colors.primary,
    fontWeight: "800",
  },
  stepLabelCompleted: {
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.borderLight,
    marginTop: 13,
    marginHorizontal: 1,
  },
  stepConnectorActive: {
    backgroundColor: "#10B981",
  },

  content: { flex: 1 },
  contentInner: { padding: 16 },

  bottomBar: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    gap: 6,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    gap: 6,
  },
  sendBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.success,
    gap: 6,
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
