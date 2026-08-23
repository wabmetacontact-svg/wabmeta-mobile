// app/(app)/templates/[id].tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { templates as templatesApi } from "../../../src/services/api";
import { Colors } from "../../../src/constants/colors";
import { Template } from "../../../src/types/template";
import { TemplatePreview } from "../../../src/components/templates/TemplatePreview";

export default function TemplateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTemplate = useCallback(async () => {
    if (!id) return;
    try {
      const res = await templatesApi.getById(id);
      if (res?.data?.success) {
        setTemplate(res.data.data as Template);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load template");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const handleDelete = () => {
    if (!template) return;
    Alert.alert(
      "Delete Template",
      `Delete "${template.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await templatesApi.delete(template.id);
              Alert.alert("Success", "Template deleted");
              router.back();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err?.response?.data?.message || "Failed to delete"
              );
            }
          },
        },
      ]
    );
  };

  const duplicateAction = async (newName: string) => {
    if (!template) return;
    try {
      const res = await templatesApi.duplicate(template.id, newName);
      if (res?.data?.success) {
        Alert.alert("Success", "Template duplicated!");
        router.back();
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to duplicate"
      );
    }
  };

  const handleDuplicate = () => {
    if (!template) return;
    const defaultName = `${template.name}_copy`;
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Duplicate Template",
        "Enter new template name",
        async (newName) => {
          if (!newName) return;
          duplicateAction(newName);
        },
        "plain-text",
        defaultName
      );
    } else {
      Alert.alert(
        "Duplicate Template",
        `Create a duplicate named "${defaultName}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Duplicate",
            onPress: () => duplicateAction(defaultName),
          },
        ]
      );
    }
  };

  const handleSubmit = async () => {
    if (!template) return;
    try {
      setActionLoading(true);
      const res = await templatesApi.submit(template.id);
      Alert.alert(
        "Submitted",
        (res.data?.data as any)?.message || "Template submitted to Meta for approval"
      );
      fetchTemplate();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to submit");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!template) return null;

  const statusConfig = {
    APPROVED: { color: Colors.success, label: "Approved", icon: "checkmark-circle" as const },
    PENDING: { color: Colors.warning, label: "Pending Review", icon: "time" as const },
    REJECTED: { color: Colors.error, label: "Rejected", icon: "close-circle" as const },
    DRAFT: { color: Colors.textMuted, label: "Draft", icon: "document" as const },
  }[template.status] || {
    color: Colors.textMuted,
    label: template.status,
    icon: "help" as const,
  };

  const categoryColor = {
    MARKETING: "#8B5CF6",
    UTILITY: "#3B82F6",
    AUTHENTICATION: "#F59E0B",
  }[template.category] || Colors.textMuted;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {template.name}
          </Text>
          <Text style={styles.headerSubtitle}>{template.language}</Text>
        </View>
        <TouchableOpacity
          onPress={handleDuplicate}
          style={styles.iconBtn}
        >
          <Ionicons name="copy-outline" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status Hero */}
        <LinearGradient
          colors={[statusConfig.color, `${statusConfig.color}CC`]}
          style={styles.statusHero}
        >
          <Ionicons name={statusConfig.icon} size={32} color="#fff" />
          <Text style={styles.statusHeroText}>{statusConfig.label}</Text>
          {template.status === "REJECTED" && template.rejectionReason && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionText}>
                {template.rejectionReason}
              </Text>
            </View>
          )}
          {template.status === "DRAFT" && (
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={statusConfig.color} />
              ) : (
                <>
                  <Ionicons name="send" size={16} color={statusConfig.color} />
                  <Text
                    style={[styles.submitBtnText, { color: statusConfig.color }]}
                  >
                    Submit to Meta
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* WhatsApp Preview */}
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>WhatsApp Preview</Text>
          <TemplatePreview template={template} />
        </View>

        {/* Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Details</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons name="pricetag" size={14} color={Colors.textMuted} />
              <Text style={styles.detailLabelText}>Category</Text>
            </View>
            <View
              style={[
                styles.detailValue,
                { backgroundColor: `${categoryColor}15` },
              ]}
            >
              <Text style={[styles.detailValueText, { color: categoryColor }]}>
                {template.category}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons name="language" size={14} color={Colors.textMuted} />
              <Text style={styles.detailLabelText}>Language</Text>
            </View>
            <Text style={styles.detailValueText}>{template.language}</Text>
          </View>

          {template.headerType && template.headerType !== "NONE" && (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <Ionicons name="document" size={14} color={Colors.textMuted} />
                <Text style={styles.detailLabelText}>Header Type</Text>
              </View>
              <Text style={styles.detailValueText}>{template.headerType}</Text>
            </View>
          )}

          {template.variables && template.variables.length > 0 && (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <Ionicons name="code" size={14} color={Colors.textMuted} />
                <Text style={styles.detailLabelText}>Variables</Text>
              </View>
              <Text style={styles.detailValueText}>
                {template.variables.length}
              </Text>
            </View>
          )}

          {template.buttons && template.buttons.length > 0 && (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <Ionicons name="apps" size={14} color={Colors.textMuted} />
                <Text style={styles.detailLabelText}>Buttons</Text>
              </View>
              <Text style={styles.detailValueText}>
                {template.buttons.length}
              </Text>
            </View>
          )}

          {template.metaTemplateId && (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <Ionicons name="link" size={14} color={Colors.textMuted} />
                <Text style={styles.detailLabelText}>Meta ID</Text>
              </View>
              <Text
                style={[styles.detailValueText, { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" }]}
                numberOfLines={1}
              >
                {template.metaTemplateId}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons name="calendar" size={14} color={Colors.textMuted} />
              <Text style={styles.detailLabelText}>Created</Text>
            </View>
            <Text style={styles.detailValueText}>
              {new Date(template.createdAt).toLocaleDateString("en-IN")}
            </Text>
          </View>
        </View>

        {/* Body Text */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Message Body</Text>
          <Text style={styles.bodyText}>{template.bodyText}</Text>
        </View>

        {/* Buttons */}
        {template.buttons && template.buttons.length > 0 && (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Buttons</Text>
            {template.buttons.map((btn, i) => (
              <View key={i} style={styles.buttonRow}>
                <View style={styles.buttonIconBox}>
                  <Ionicons
                    name={
                      btn.type === "URL"
                        ? "open-outline"
                        : btn.type === "PHONE_NUMBER"
                        ? "call"
                        : "chatbubble-ellipses"
                    }
                    size={16}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>{btn.text}</Text>
                  <Text style={styles.buttonMeta}>
                    {btn.type.replace("_", " ")}
                    {btn.url && ` • ${btn.url}`}
                    {(btn.phone_number || btn.phoneNumber) &&
                      ` • ${btn.phone_number || btn.phoneNumber}`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleDuplicate}
          >
            <Ionicons name="copy" size={18} color={Colors.info} />
            <Text style={[styles.actionText, { color: Colors.info }]}>
              Duplicate
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleDelete}
          >
            <Ionicons name="trash" size={18} color={Colors.error} />
            <Text style={[styles.actionText, { color: Colors.error }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
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
  },

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
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
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

  statusHero: {
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  statusHeroText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
  },
  rejectionBox: {
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    maxWidth: "90%",
  },
  rejectionText: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    marginTop: 10,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },

  previewSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  detailsCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabelText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  detailValue: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailValueText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: "700",
    maxWidth: 200,
  },

  bodyText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },

  buttonRow: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    marginBottom: 8,
    gap: 12,
  },
  buttonIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonContent: { flex: 1 },
  buttonText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  buttonMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },

  actionsContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
