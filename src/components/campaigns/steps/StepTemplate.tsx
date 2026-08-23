// src/components/campaigns/steps/StepTemplate.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constants/colors";
import { Template } from "../../../types/campaign";

interface Props {
  templates: Template[];
  selectedTemplateId: string;
  onSelect: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  marketing: "#8B5CF6",
  utility: "#3B82F6",
  authentication: "#F59E0B",
  service: "#10B981",
};

export function StepTemplate({
  templates,
  selectedTemplateId,
  onSelect,
}: Props) {
  if (templates.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="document-outline" size={40} color={Colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No approved templates</Text>
        <Text style={styles.emptySubtitle}>
          Create and get a template approved to send campaigns
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Template</Text>
        <Text style={styles.sectionSubtitle}>
          Choose an approved template for your campaign
        </Text>
      </View>

      <View style={styles.templatesList}>
        {templates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          const categoryColor =
            CATEGORY_COLORS[template.category] || Colors.textMuted;

          return (
            <TouchableOpacity
              key={template.id}
              style={[
                styles.templateCard,
                isSelected && styles.templateCardActive,
              ]}
              onPress={() => onSelect(template.id)}
              activeOpacity={0.7}
            >
              {/* Header */}
              <View style={styles.templateHeader}>
                <View style={styles.templateHeaderLeft}>
                  <Text style={styles.templateName} numberOfLines={1}>
                    {template.name}
                  </Text>
                  <View style={styles.templateMeta}>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: `${categoryColor}15` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          { color: categoryColor },
                        ]}
                      >
                        {template.category.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.templateLang}>{template.language}</Text>
                  </View>
                </View>

                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </View>

              {/* Media preview */}
              {template.headerType !== "none" && (
                <View style={styles.mediaPreview}>
                  <Ionicons
                    name={
                      template.headerType === "image"
                        ? "image"
                        : template.headerType === "video"
                        ? "videocam"
                        : template.headerType === "document"
                        ? "document"
                        : "text"
                    }
                    size={14}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.mediaText}>
                    {template.headerType.toUpperCase()} header
                  </Text>
                </View>
              )}

              {/* Body preview */}
              <Text style={styles.templateBody} numberOfLines={3}>
                {template.body}
              </Text>

              {/* Buttons */}
              {template.buttons && template.buttons.length > 0 && (
                <View style={styles.buttonsPreview}>
                  {template.buttons.slice(0, 3).map((btn, i) => (
                    <View key={i} style={styles.buttonPreview}>
                      <Text style={styles.buttonText} numberOfLines={1}>
                        {btn.text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Variables indicator */}
              {((template.variables && template.variables.length > 0) ||
                (template.headerVariables && template.headerVariables.length > 0)) && (
                <View style={styles.varsIndicator}>
                  <Ionicons name="code" size={12} color={Colors.warning} />
                  <Text style={styles.varsText}>
                    {(template.variables?.length || 0) +
                      (template.headerVariables?.length || 0)}{" "}
                    variable
                    {(template.variables?.length || 0) +
                      (template.headerVariables?.length || 0) !==
                    1
                      ? "s"
                      : ""}{" "}
                    to fill
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
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

  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  templatesList: {
    gap: 12,
  },
  templateCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  templateCardActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  templateHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  templateHeaderLeft: { flex: 1 },
  templateName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  templateMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  templateLang: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  selectedBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  mediaPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  mediaText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  templateBody: {
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 18,
    marginBottom: 10,
  },
  buttonsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  buttonPreview: {
    backgroundColor: `${Colors.primary}10`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  buttonText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600",
    maxWidth: 100,
  },
  varsIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${Colors.warning}10`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  varsText: {
    fontSize: 10,
    color: Colors.warning,
    fontWeight: "700",
  },
});
