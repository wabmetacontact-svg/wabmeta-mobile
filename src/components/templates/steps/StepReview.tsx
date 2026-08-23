// src/components/templates/steps/StepReview.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constants/colors";
import { TemplateFormData } from "../../../types/template";
import { TemplatePreview } from "../TemplatePreview";

interface Props {
  formData: TemplateFormData;
  bodyVariables: string[];
  headerVariables: string[];
}

export function StepReview({
  formData,
  bodyVariables,
  headerVariables,
}: Props) {
  const categoryColor = {
    MARKETING: "#8B5CF6",
    UTILITY: "#3B82F6",
    AUTHENTICATION: "#F59E0B",
  }[formData.category] || Colors.textPrimary;

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Review & Submit</Text>
        <Text style={styles.sectionSubtitle}>
          Preview your template before submitting to Meta
        </Text>
      </View>

      {/* WhatsApp Preview */}
      <View style={styles.previewCard}>
        <Text style={styles.previewLabel}>WhatsApp Preview</Text>
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
      </View>

      {/* Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Template Summary</Text>

        <SummaryRow
          icon="text"
          label="Name"
          value={formData.name}
        />

        <SummaryRow
          icon="pricetag"
          label="Category"
          value={formData.category}
          valueColor={categoryColor}
        />

        <SummaryRow
          icon="language"
          label="Language"
          value={formData.language}
        />

        {formData.headerType !== "NONE" && (
          <SummaryRow
            icon="document"
            label="Header"
            value={formData.headerType}
          />
        )}

        <SummaryRow
          icon="chatbubble"
          label="Body Length"
          value={`${formData.bodyText.length} chars`}
        />

        {bodyVariables.length > 0 && (
          <SummaryRow
            icon="code"
            label="Variables"
            value={`${bodyVariables.length}`}
          />
        )}

        {formData.footerText ? (
          <SummaryRow
            icon="text"
            label="Footer"
            value="Yes"
          />
        ) : null}

        {formData.buttons && formData.buttons.length > 0 ? (
          <SummaryRow
            icon="apps"
            label="Buttons"
            value={`${formData.buttons.length}`}
          />
        ) : null}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Ionicons name="time" size={20} color={Colors.warning} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Approval Process</Text>
          <Text style={styles.infoText}>
            After submitting, Meta reviews your template within 24-48 hours.
            You'll be notified once approved or if changes are needed.
          </Text>
        </View>
      </View>

      {/* Guidelines */}
      <View style={styles.guidelinesCard}>
        <Text style={styles.guidelinesTitle}>Before You Submit</Text>
        {[
          "Ensure content follows WhatsApp Business Policy",
          "Variables must be sequential ({{1}}, {{2}}, etc.)",
          "Provide accurate sample values for variables",
          "Category should match the actual use case",
          "No promotional content in UTILITY templates",
        ].map((item, i) => (
          <View key={i} style={styles.guidelineItem}>
            <Ionicons
              name="checkmark-circle"
              size={14}
              color={Colors.success}
            />
            <Text style={styles.guidelineText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon} size={14} color={Colors.textMuted} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text
        style={[styles.summaryValue, valueColor ? { color: valueColor } : undefined]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  previewCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    width: 100,
    fontWeight: "600",
  },
  summaryValue: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: "700",
  },

  infoCard: {
    flexDirection: "row",
    backgroundColor: `${Colors.warning}10`,
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${Colors.warning}20`,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Colors.warning}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: { flex: 1 },
  infoTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.warning,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  guidelinesCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  guidelinesTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  guidelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 6,
    gap: 8,
  },
  guidelineText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
