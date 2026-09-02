// app/(app)/templates/create.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  templates as templatesApi,
  whatsapp as whatsappApi,
} from "../../../src/services/api";
import { Colors } from "../../../src/constants/colors";
import {
  TemplateFormData,
} from "../../../src/types/template";

// Step Components
import { StepBasics } from "../../../src/components/templates/steps/StepBasics";
import { StepHeader } from "../../../src/components/templates/steps/StepHeader";
import { StepBody } from "../../../src/components/templates/steps/StepBody";
import { StepFooterButtons } from "../../../src/components/templates/steps/StepFooterButtons";
import { StepReview } from "../../../src/components/templates/steps/StepReview";
import { TemplatePreview } from "../../../src/components/templates/TemplatePreview";

// ═══════════════════════════════════
// HELPERS
// ═══════════════════════════════════

const extractVariables = (text: string): string[] => {
  if (!text) return [];
  const matches = text.match(/\{\{(\d+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))].sort(
    (a, b) => Number(a) - Number(b)
  );
};

const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_");
};

const STEPS = [
  { number: 1, title: "Basics", icon: "document-text" as const },
  { number: 2, title: "Header", icon: "image" as const },
  { number: 3, title: "Body", icon: "chatbubble" as const },
  { number: 4, title: "Extras", icon: "apps" as const },
  { number: 5, title: "Review", icon: "eye" as const },
];

// ═══════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════

export default function CreateTemplateScreen() {
  const { id, duplicateFrom } = useLocalSearchParams<{
    id?: string;
    duplicateFrom?: string;
  }>();

  const isEditMode = !!id;

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [whatsappAccounts, setWhatsappAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [formData, setFormData] = useState<TemplateFormData>({
    name: "",
    language: "en_US",
    category: "UTILITY",
    headerType: "NONE",
    headerText: "",
    headerMediaId: "",
    headerCloudinaryUrl: "",
    headerFileName: "",
    headerVariables: {},
    bodyText: "",
    bodyVariables: {},
    footerText: "",
    buttons: [],
    whatsappAccountId: "",
  });

  // ═══════════════════════════════════
  // LOAD ACCOUNTS
  // ═══════════════════════════════════

  useEffect(() => {
    (async () => {
      try {
        setLoadingAccounts(true);
        const res = await whatsappApi.accounts();
        const data = res?.data?.data;
        let accounts: any[] = [];
        if (Array.isArray(data)) {
          accounts = data;
        } else if (Array.isArray((data as any)?.accounts)) {
          accounts = (data as any).accounts;
        } else if (Array.isArray((data as any)?.data)) {
          accounts = (data as any).data;
        }

        const connected = accounts.filter(
          (a: any) =>
            !a.status ||
            a.status.toUpperCase() === "CONNECTED" ||
            a.status.toUpperCase() === "ACTIVE" ||
            a.hasAccessToken
        );

        const validAccounts = connected.length > 0 ? connected : accounts;

        if (validAccounts.length === 0) {
          Alert.alert(
            "No WhatsApp Account",
            "Please connect a WhatsApp account first",
            [
              { text: "Cancel", onPress: () => router.back() },
              {
                text: "Settings",
                onPress: () => router.replace("/(app)/(tabs)/settings"),
              },
            ]
          );
          return;
        }

        setWhatsappAccounts(validAccounts);
        const defaultAcc =
          validAccounts.find((a: any) => a.isDefault) || validAccounts[0];

        setFormData((prev) => ({
          ...prev,
          whatsappAccountId: defaultAcc.id,
        }));
      } catch (err) {
        console.error("Load accounts error:", err);
        Alert.alert("Error", "Failed to load WhatsApp accounts");
      } finally {
        setLoadingAccounts(false);
      }
    })();
  }, []);

  // ═══════════════════════════════════
  // LOAD EXISTING TEMPLATE (EDIT/DUPLICATE)
  // ═══════════════════════════════════

  useEffect(() => {
    const templateId = id || duplicateFrom;
    if (!templateId) return;

    (async () => {
      try {
        const res = await templatesApi.getById(templateId);
        if (res?.data?.success) {
          const t = res.data.data as any;
          setFormData({
            name: duplicateFrom ? `${t.name}_copy` : t.name,
            language: t.language || "en_US",
            category: t.category || "UTILITY",
            headerType: t.headerType || "NONE",
            headerText: t.headerType === "TEXT" ? t.headerContent : "",
            headerMediaId: t.headerMediaId || "",
            headerCloudinaryUrl:
              t.headerType !== "TEXT" && t.headerType !== "NONE"
                ? t.headerContent
                : "",
            headerFileName: "",
            headerVariables: {},
            bodyText: t.bodyText || "",
            bodyVariables: {},
            footerText: t.footerText || "",
            buttons: t.buttons || [],
            whatsappAccountId: t.whatsappAccountId || "",
          });
        }
      } catch (err) {
        console.error("Load template error:", err);
      }
    })();
  }, [id, duplicateFrom]);

  // ═══════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════

  const bodyVariables = useMemo(
    () => extractVariables(formData.bodyText),
    [formData.bodyText]
  );

  const headerVariables = useMemo(
    () =>
      formData.headerType === "TEXT"
        ? extractVariables(formData.headerText || "")
        : [],
    [formData.headerType, formData.headerText]
  );

  // ═══════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════

  const validateStep = (step: number): { valid: boolean; error?: string } => {
    switch (step) {
      case 1:
        if (!formData.name.trim())
          return { valid: false, error: "Template name is required" };
        if (!/^[a-z0-9_]+$/.test(normalizeName(formData.name)))
          return {
            valid: false,
            error: "Name should only contain lowercase letters, numbers, and underscores",
          };
        if (!formData.whatsappAccountId)
          return { valid: false, error: "Please select a WhatsApp account" };
        return { valid: true };

      case 2:
        if (formData.headerType === "TEXT" && !formData.headerText?.trim())
          return { valid: false, error: "Header text is required" };
        if (formData.headerType === "TEXT" && formData.headerText!.length > 60)
          return {
            valid: false,
            error: "Header text must be less than 60 characters",
          };
        if (
          ["IMAGE", "VIDEO", "DOCUMENT"].includes(formData.headerType) &&
          !formData.headerMediaId
        )
          return { valid: false, error: "Please upload media file" };
        return { valid: true };

      case 3:
        if (!formData.bodyText.trim())
          return { valid: false, error: "Body text is required" };
        if (formData.bodyText.length > 1024)
          return {
            valid: false,
            error: "Body text must be less than 1024 characters",
          };
        // Check variables are sequential
        for (let i = 0; i < bodyVariables.length; i++) {
          if (bodyVariables[i] !== String(i + 1)) {
            return {
              valid: false,
              error: `Variables must be sequential ({{1}}, {{2}}, {{3}}...). Missing {{${i + 1}}}`,
            };
          }
        }
        return { valid: true };

      case 4:
        if (formData.footerText && formData.footerText.length > 60)
          return {
            valid: false,
            error: "Footer must be less than 60 characters",
          };
        if (formData.buttons && formData.buttons.length > 3)
          return { valid: false, error: "Maximum 3 buttons allowed" };
        for (const btn of formData.buttons || []) {
          if (!btn.text?.trim())
            return { valid: false, error: "All buttons must have text" };
          if (btn.type === "URL" && !btn.url?.trim())
            return { valid: false, error: "URL buttons require a URL" };
          if (
            btn.type === "PHONE_NUMBER" &&
            !(btn.phoneNumber || btn.phone_number)
          )
            return {
              valid: false,
              error: "Phone buttons require a phone number",
            };
        }
        return { valid: true };

      case 5:
        return { valid: true };

      default:
        return { valid: true };
    }
  };

  // ═══════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════

  const handleNext = () => {
    const validation = validateStep(currentStep);
    if (!validation.valid) {
      Alert.alert("Validation Error", validation.error);
      return;
    }
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ═══════════════════════════════════
  // SAVE TEMPLATE
  // ═══════════════════════════════════

  const handleSave = async () => {
    // Validate all steps
    for (let i = 1; i <= 4; i++) {
      const validation = validateStep(i);
      if (!validation.valid) {
        Alert.alert(`Step ${i} Error`, validation.error);
        setCurrentStep(i);
        return;
      }
    }

    setSaving(true);
    try {
      // Build variables array
      const variables = bodyVariables.map((v) => ({
        index: Number(v),
        type: "body" as const,
        example: formData.bodyVariables?.[v] || `Sample${v}`,
      }));

      const payload: any = {
        name: normalizeName(formData.name),
        language: formData.language,
        category: formData.category,
        bodyText: formData.bodyText.trim(),
        variables,
        whatsappAccountId: formData.whatsappAccountId,
      };

      // Header
      if (formData.headerType !== "NONE") {
        payload.headerType = formData.headerType;

        if (formData.headerType === "TEXT") {
          payload.headerContent = formData.headerText;
          if (headerVariables.length > 0) {
            payload.headerVariables = formData.headerVariables;
          }
        } else {
          payload.headerMediaId = formData.headerMediaId;
          payload.headerContent = formData.headerCloudinaryUrl;
          payload.cloudinaryUrl = formData.headerCloudinaryUrl;
        }
      }

      // Footer
      if (formData.footerText?.trim()) {
        payload.footerText = formData.footerText.trim();
      }

      // Buttons
      if (formData.buttons && formData.buttons.length > 0) {
        payload.buttons = formData.buttons;
      }


      let res;
      if (isEditMode) {
        res = await templatesApi.update(id!, payload);
      } else {
        res = await templatesApi.create(payload);
      }

      if (res?.data?.success) {
        Alert.alert(
          isEditMode ? "Template Updated" : "Template Created",
          "Your template has been submitted to Meta for approval",
          [
            {
              text: "OK",
              onPress: () => router.replace("/(app)/templates"),
            },
          ]
        );
      }
    } catch (err: any) {
      console.error("Save error:", err);
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to save template"
      );
    } finally {
      setSaving(false);
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
        <TouchableOpacity
          onPress={() => {
            Alert.alert("Discard Changes?", "Your template won't be saved", [
              { text: "Keep Editing", style: "cancel" },
              {
                text: "Discard",
                style: "destructive",
                onPress: () => router.back(),
              },
            ]);
          }}
          style={styles.iconBtn}
        >
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isEditMode ? "Edit Template" : "New Template"}
          </Text>
          <Text style={styles.headerSubtitle}>
            Step {currentStep} of {STEPS.length}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowPreview(true)}
          style={styles.iconBtn}
        >
          <Ionicons name="eye" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
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
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : (
                    <Ionicons
                      name={step.icon}
                      size={13}
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 && (
            <StepBasics
              formData={formData}
              setFormData={setFormData}
              whatsappAccounts={whatsappAccounts}
            />
          )}

          {currentStep === 2 && (
            <StepHeader formData={formData} setFormData={setFormData} />
          )}

          {currentStep === 3 && (
            <StepBody
              formData={formData}
              setFormData={setFormData}
              bodyVariables={bodyVariables}
            />
          )}

          {currentStep === 4 && (
            <StepFooterButtons
              formData={formData}
              setFormData={setFormData}
            />
          )}

          {currentStep === 5 && (
            <StepReview
              formData={formData}
              bodyVariables={bodyVariables}
              headerVariables={headerVariables}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            disabled={saving}
          >
            <Ionicons name="arrow-back" size={18} color={Colors.textPrimary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}

        {currentStep < STEPS.length ? (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.nextBtnText}>
                  {isEditMode ? "Update Template" : "Submit to Meta"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Preview Modal */}
      {showPreview && (
        <View style={styles.previewOverlay}>
          <View style={styles.previewModal}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Live Preview</Text>
              <TouchableOpacity
                onPress={() => setShowPreview(false)}
                style={styles.iconBtn}
              >
                <Ionicons name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <TemplatePreview
                template={{
                  name: formData.name,
                  category: formData.category,
                  language: formData.language,
                  headerType: formData.headerType,
                  headerContent:
                    formData.headerType === "TEXT"
                      ? formData.headerText
                      : formData.headerCloudinaryUrl,
                  bodyText: formData.bodyText,
                  footerText: formData.footerText,
                  buttons: formData.buttons,
                }}
                sampleVariables={{
                  ...formData.bodyVariables,
                  ...formData.headerVariables,
                }}
              />
            </ScrollView>
          </View>
        </View>
      )}
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
  loadingText: { fontSize: 13, color: Colors.textMuted },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
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
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  stepperContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  stepItem: {
    alignItems: "center",
    width: 48,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    fontSize: 10,
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
    marginTop: 14,
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
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.success,
    gap: 6,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  previewOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  previewModal: {
    backgroundColor: Colors.background,
    width: "95%",
    maxHeight: "90%",
    borderRadius: 20,
    overflow: "hidden",
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
});
