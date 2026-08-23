// src/components/templates/steps/StepBody.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constants/colors";
import { TemplateFormData } from "../../../types/template";

interface Props {
  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
  bodyVariables: string[];
}

export function StepBody({
  formData,
  setFormData,
  bodyVariables,
}: Props) {
  const insertVariable = () => {
    const nextIndex = bodyVariables.length + 1;
    const newText = `${formData.bodyText}{{${nextIndex}}}`;
    setFormData((f) => ({ ...f, bodyText: newText }));
  };

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Message Body</Text>
        <Text style={styles.sectionSubtitle}>
          Write your message. Use {"{{1}}"}, {"{{2}}"} for variables
        </Text>
      </View>

      {/* Body Input */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            Message Text <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity onPress={insertVariable} style={styles.varBtn}>
            <Ionicons name="add-circle" size={14} color={Colors.warning} />
            <Text style={styles.varBtnText}>Add Variable</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.textArea}
          value={formData.bodyText}
          onChangeText={(v) => setFormData((f) => ({ ...f, bodyText: v }))}
          placeholder={`Hi {{1}},\n\nYour order {{2}} has been confirmed.\nAmount: {{3}}\n\nThank you!`}
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={8}
          maxLength={1024}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>
          {formData.bodyText.length}/1024
        </Text>
      </View>

      {/* Variables */}
      {bodyVariables.length > 0 && (
        <View style={styles.field}>
          <Text style={styles.label}>
            Variable Samples ({bodyVariables.length})
          </Text>
          <Text style={styles.hint}>
            Provide sample values for each variable
          </Text>

          <View style={styles.varsList}>
            {bodyVariables.map((varKey) => (
              <View key={varKey} style={styles.varItem}>
                <View style={styles.varBadge}>
                  <Text style={styles.varBadgeText}>{`{{${varKey}}}`}</Text>
                </View>
                <TextInput
                  style={styles.varInput}
                  value={formData.bodyVariables?.[varKey] || ""}
                  onChangeText={(v) =>
                    setFormData((f) => ({
                      ...f,
                      bodyVariables: {
                        ...(f.bodyVariables || {}),
                        [varKey]: v,
                      },
                    }))
                  }
                  placeholder={`Sample for {{${varKey}}}`}
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Formatting Hints */}
      <View style={styles.formattingHints}>
        <Text style={styles.hintsTitle}>Text Formatting</Text>
        <View style={styles.hintsGrid}>
          <FormattingHint icon="text" text="*bold*" desc="Bold text" />
          <FormattingHint icon="text" text="_italic_" desc="Italic" />
          <FormattingHint icon="text" text="~strike~" desc="Strikethrough" />
          <FormattingHint icon="code" text="`code`" desc="Monospace" />
        </View>
      </View>

      <View style={styles.tip}>
        <Ionicons name="bulb" size={16} color={Colors.warning} />
        <Text style={styles.tipText}>
          Variables must be sequential ({"{{1}}"}, {"{{2}}"}, {"{{3}}"}...).
          Skipping numbers will be rejected by Meta.
        </Text>
      </View>
    </View>
  );
}

function FormattingHint({
  icon,
  text,
  desc,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  desc: string;
}) {
  return (
    <View style={styles.hintItem}>
      <Ionicons name={icon} size={12} color={Colors.textMuted} />
      <Text style={styles.hintText}>{text}</Text>
      <Text style={styles.hintDesc}>{desc}</Text>
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

  field: { marginBottom: 20 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  required: { color: Colors.error },

  varBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: `${Colors.warning}10`,
    borderRadius: 8,
    gap: 4,
  },
  varBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.warning,
  },

  textArea: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 150,
  },
  charCount: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "right",
    marginTop: 4,
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 10,
  },

  varsList: { gap: 10 },
  varItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  varBadge: {
    backgroundColor: `${Colors.warning}15`,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
  },
  varBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.warning,
    fontFamily: "monospace",
  },
  varInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: Colors.textPrimary,
  },

  formattingHints: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  hintsTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hintsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hintItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  hintText: {
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  hintDesc: {
    fontSize: 10,
    color: Colors.textMuted,
  },

  tip: {
    flexDirection: "row",
    backgroundColor: `${Colors.warning}10`,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    alignItems: "flex-start",
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
