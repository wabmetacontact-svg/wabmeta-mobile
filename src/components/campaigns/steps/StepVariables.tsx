// src/components/campaigns/steps/StepVariables.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constants/colors";
import { Template } from "../../../types/campaign";

interface Props {
  template: Template;
  variableMapping: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
}

const QUICK_INSERT = [
  { label: "First Name", value: "{{contact.firstName}}", icon: "person" as const },
  { label: "Last Name", value: "{{contact.lastName}}", icon: "person-outline" as const },
  { label: "Full Name", value: "{{contact.fullName}}", icon: "id-card" as const },
  { label: "Phone", value: "{{contact.phone}}", icon: "call" as const },
  { label: "Email", value: "{{contact.email}}", icon: "mail" as const },
];

export function StepVariables({
  template,
  variableMapping,
  onChange,
}: Props) {
  const allVars = [
    ...(template.variables || []),
    ...(template.headerVariables || []),
  ];

  if (allVars.length === 0) {
    return (
      <View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>No Variables Needed</Text>
          <Text style={styles.sectionSubtitle}>
            This template doesn't require any variables
          </Text>
        </View>

        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={30} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Ready to Continue</Text>
          <Text style={styles.successText}>
            Your template will send the same content to all recipients
          </Text>
        </View>
      </View>
    );
  }

  const handleQuickInsert = (varKey: string, value: string) => {
    onChange({
      ...variableMapping,
      [varKey]: value,
    });
  };

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Map Variables</Text>
        <Text style={styles.sectionSubtitle}>
          Fill in the variables to personalize your message
        </Text>
      </View>

      {/* Template Preview */}
      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <Ionicons name="eye" size={14} color={Colors.textSecondary} />
          <Text style={styles.previewTitle}>Template Preview</Text>
        </View>
        <Text style={styles.previewBody}>{template.body}</Text>
      </View>

      {/* Variables */}
      <View style={styles.varsContainer}>
        {allVars.map((varKey) => {
          const isHeaderVar = (template.headerVariables || []).includes(varKey);
          return (
            <View key={varKey} style={styles.varItem}>
              <View style={styles.varHeader}>
                <View style={styles.varBadge}>
                  <Text style={styles.varBadgeText}>{`{{${varKey}}}`}</Text>
                </View>
                {isHeaderVar && (
                  <View style={styles.headerLabel}>
                    <Text style={styles.headerLabelText}>HEADER</Text>
                  </View>
                )}
              </View>

              <TextInput
                style={styles.varInput}
                value={variableMapping[varKey] || ""}
                onChangeText={(v) =>
                  onChange({ ...variableMapping, [varKey]: v })
                }
                placeholder="Enter value or use quick insert below"
                placeholderTextColor={Colors.textMuted}
              />

              {/* Quick Insert */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickRow}
              >
                {QUICK_INSERT.map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={styles.quickChip}
                    onPress={() => handleQuickInsert(varKey, item.value)}
                  >
                    <Ionicons name={item.icon} size={12} color={Colors.info} />
                    <Text style={styles.quickText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </View>

      <View style={styles.tip}>
        <Ionicons name="bulb" size={16} color={Colors.warning} />
        <Text style={styles.tipText}>
          Use quick insert buttons for dynamic values, or type static text
        </Text>
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

  successCard: {
    padding: 24,
    alignItems: "center",
    backgroundColor: `${Colors.success}10`,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${Colors.success}20`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.success,
    marginBottom: 4,
  },
  successText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  previewCard: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewBody: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 20,
  },

  varsContainer: { gap: 16 },
  varItem: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  varHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  varBadge: {
    backgroundColor: `${Colors.warning}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  varBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.warning,
    fontFamily: "monospace",
  },
  headerLabel: {
    backgroundColor: `${Colors.info}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  headerLabelText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.info,
  },
  varInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  quickRow: {
    gap: 6,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: `${Colors.info}10`,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: `${Colors.info}30`,
  },
  quickText: {
    fontSize: 10,
    color: Colors.info,
    fontWeight: "700",
  },

  tip: {
    flexDirection: "row",
    backgroundColor: `${Colors.warning}10`,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    alignItems: "flex-start",
    marginTop: 16,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
