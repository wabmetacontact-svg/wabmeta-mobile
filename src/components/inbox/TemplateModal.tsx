// src/components/inbox/TemplateModal.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { templates as templatesApi, whatsapp as whatsappApi, inbox as inboxApi } from "../../services/api";
import { Colors } from "../../constants/colors";

interface Props {
  visible: boolean;
  conversationId: string;
  contactPhone: string;
  contactName: string;
  whatsappAccountId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  headerType: string;
  headerContent?: string;
  bodyText: string;
  variables: string[];
  headerVariables: string[];
  buttons?: any[];
}

const extractVars = (text: string): string[] => {
  if (!text) return [];
  const matches = text.match(/\{\{(\d+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))].sort(
    (a, b) => Number(a) - Number(b)
  );
};

export function TemplateModal({
  visible,
  conversationId,
  contactPhone,
  contactName,
  whatsappAccountId,
  onClose,
  onSuccess,
}: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [variables, setVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible && whatsappAccountId) {
      fetchTemplates();
    }
  }, [visible, whatsappAccountId]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await templatesApi.getApproved({
        whatsappAccountId,
      });

      if (res?.data?.success) {
        const list = (res.data.data as any) || [];
        const mapped: Template[] = (Array.isArray(list) ? list : []).map(
          (t: any) => ({
            id: t._id || t.id,
            name: t.name,
            category: (t.category || "UTILITY").toUpperCase(),
            language: t.language || "en_US",
            headerType: (t.headerType || "NONE").toUpperCase(),
            headerContent: t.headerContent,
            bodyText: t.bodyText || t.body || "",
            variables: extractVars(t.bodyText || ""),
            headerVariables: extractVars(t.headerContent || ""),
            buttons: t.buttons || [],
          })
        );
        setTemplates(mapped);
      }
    } catch (err: any) {
      console.error("Templates error:", err);
      Alert.alert("Error", "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setVariables({});
  };

  const handleSend = async () => {
    if (!selectedTemplate) return;

    // Validate variables
    const allVars = [
      ...selectedTemplate.variables,
      ...selectedTemplate.headerVariables,
    ];
    const missing = allVars.filter((v) => !variables[v]?.trim());

    if (missing.length > 0) {
      Alert.alert("Missing values", `Please fill: ${missing.join(", ")}`);
      return;
    }

    setSending(true);
    try {
      // Resolve template media first if needed
      let metaMediaId: string | null = null;

      if (["IMAGE", "VIDEO", "DOCUMENT"].includes(selectedTemplate.headerType)) {
        try {
          const resolveRes = await inboxApi.resolveTemplateMedia(
            selectedTemplate.id
          );
          if (resolveRes?.data?.success) {
            metaMediaId = resolveRes.data.data?.mediaId;
          }
        } catch (err) {
          console.warn("Template media resolve failed:", err);
        }
      }

      // Build components
      const components: any[] = [];

      // Header component
      if (
        selectedTemplate.headerType === "TEXT" &&
        selectedTemplate.headerVariables.length > 0
      ) {
        components.push({
          type: "header",
          parameters: selectedTemplate.headerVariables.map((v) => ({
            type: "text",
            text: variables[v] || "",
          })),
        });
      } else if (
        ["IMAGE", "VIDEO", "DOCUMENT"].includes(selectedTemplate.headerType) &&
        metaMediaId
      ) {
        const mediaType = selectedTemplate.headerType.toLowerCase();
        components.push({
          type: "header",
          parameters: [
            {
              type: mediaType,
              [mediaType]: { id: metaMediaId },
            },
          ],
        });
      }

      // Body component
      if (selectedTemplate.variables.length > 0) {
        components.push({
          type: "body",
          parameters: selectedTemplate.variables.map((v) => ({
            type: "text",
            text: variables[v] || "",
          })),
        });
      }

      // Send
      await whatsappApi.sendTemplate({
        whatsappAccountId,
        to: contactPhone,
        templateName: selectedTemplate.name,
        templateLanguage: selectedTemplate.language,
        components,
        conversationId,
      });

      Alert.alert("Success", "Template sent successfully");
      onSuccess();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to send template"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={selectedTemplate ? () => setSelectedTemplate(null) : onClose}
        />

        <View style={styles.modal}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            {selectedTemplate ? (
              <TouchableOpacity
                onPress={() => setSelectedTemplate(null)}
                style={styles.iconBtn}
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color={Colors.textPrimary}
                />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
            <View style={styles.headerCenter}>
              <Text style={styles.title}>
                {selectedTemplate ? "Fill Variables" : "Send Template"}
              </Text>
              <Text style={styles.subtitle}>To: {contactName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading templates...</Text>
            </View>
          ) : selectedTemplate ? (
            // Variable fill screen
            <ScrollView style={styles.content}>
              {/* Template preview */}
              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>Preview</Text>
                <Text style={styles.previewBody}>
                  {selectedTemplate.bodyText}
                </Text>
              </View>

              {/* Variables form */}
              {[
                ...selectedTemplate.variables,
                ...selectedTemplate.headerVariables,
              ].map((varKey) => {
                const isHeader =
                  selectedTemplate.headerVariables.includes(varKey);
                return (
                  <View key={varKey} style={styles.field}>
                    <View style={styles.fieldLabel}>
                      <View style={styles.varBadge}>
                        <Text style={styles.varBadgeText}>
                          {`{{${varKey}}}`}
                        </Text>
                      </View>
                      {isHeader && (
                        <View style={styles.headerBadge}>
                          <Text style={styles.headerBadgeText}>HEADER</Text>
                        </View>
                      )}
                    </View>
                    <TextInput
                      style={styles.input}
                      value={variables[varKey] || ""}
                      onChangeText={(v) =>
                        setVariables({ ...variables, [varKey]: v })
                      }
                      placeholder="Enter value"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                );
              })}

              {selectedTemplate.variables.length === 0 &&
                selectedTemplate.headerVariables.length === 0 && (
                  <View style={styles.noVarsCard}>
                    <Ionicons
                      name="checkmark-circle"
                      size={40}
                      color={Colors.success}
                    />
                    <Text style={styles.noVarsText}>
                      No variables needed. Ready to send!
                    </Text>
                  </View>
                )}
            </ScrollView>
          ) : templates.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name="document-outline"
                size={48}
                color={Colors.textMuted}
              />
              <Text style={styles.emptyTitle}>No approved templates</Text>
              <Text style={styles.emptyText}>
                Create and get templates approved to use them
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.content}>
              {templates.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateCard}
                  onPress={() => handleSelectTemplate(template)}
                  activeOpacity={0.7}
                >
                  <View style={styles.templateHeader}>
                    <Text style={styles.templateName} numberOfLines={1}>
                      {template.name}
                    </Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>
                        {template.category}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.templateBody} numberOfLines={3}>
                    {template.bodyText}
                  </Text>
                  {(template.variables.length > 0 ||
                    template.headerVariables.length > 0) && (
                    <View style={styles.varsInfo}>
                      <Ionicons name="code" size={12} color={Colors.warning} />
                      <Text style={styles.varsInfoText}>
                        {template.variables.length +
                          template.headerVariables.length}{" "}
                        variable
                        {template.variables.length +
                          template.headerVariables.length !==
                        1
                          ? "s"
                          : ""}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Send button */}
          {selectedTemplate && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#fff" />
                    <Text style={styles.sendBtnText}>Send Template</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    minHeight: "60%",
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  loadingBox: {
    padding: 60,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textMuted,
  },

  emptyBox: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  content: {
    flex: 1,
    padding: 16,
  },

  templateCard: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  templateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  templateName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  categoryBadge: {
    backgroundColor: `${Colors.info}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    color: Colors.info,
    fontWeight: "800",
  },
  templateBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  varsInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  varsInfoText: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: "600",
  },

  previewCard: {
    backgroundColor: `${Colors.primary}08`,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${Colors.primary}20`,
  },
  previewLabel: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  previewBody: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 20,
  },

  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  varBadge: {
    backgroundColor: `${Colors.warning}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  varBadgeText: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  headerBadge: {
    backgroundColor: `${Colors.info}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  headerBadgeText: {
    fontSize: 9,
    color: Colors.info,
    fontWeight: "800",
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },

  noVarsCard: {
    padding: 24,
    alignItems: "center",
    backgroundColor: `${Colors.success}10`,
    borderRadius: 12,
    gap: 8,
  },
  noVarsText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: "700",
    textAlign: "center",
  },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
