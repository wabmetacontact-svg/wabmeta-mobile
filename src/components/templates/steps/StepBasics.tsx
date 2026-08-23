// src/components/templates/steps/StepBasics.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constants/colors";
import { TemplateFormData, TemplateCategory } from "../../../types/template";

interface Props {
  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
  whatsappAccounts: any[];
}

const CATEGORIES: {
  value: TemplateCategory;
  label: string;
  desc: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: "UTILITY",
    label: "Utility",
    desc: "Order updates, account alerts, notifications",
    color: "#3B82F6",
    icon: "settings",
  },
  {
    value: "MARKETING",
    label: "Marketing",
    desc: "Promotions, offers, product announcements",
    color: "#8B5CF6",
    icon: "megaphone",
  },
  {
    value: "AUTHENTICATION",
    label: "Authentication",
    desc: "OTPs, verification codes",
    color: "#F59E0B",
    icon: "shield-checkmark",
  },
];

const LANGUAGES = [
  { code: "en_US", label: "English (US)" },
  { code: "en_GB", label: "English (UK)" },
  { code: "hi", label: "Hindi" },
  { code: "es_ES", label: "Spanish" },
  { code: "pt_BR", label: "Portuguese" },
  { code: "fr_FR", label: "French" },
  { code: "de_DE", label: "German" },
  { code: "it_IT", label: "Italian" },
  { code: "ar", label: "Arabic" },
  { code: "zh_CN", label: "Chinese" },
];

const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_");
};

export function StepBasics({
  formData,
  setFormData,
  whatsappAccounts,
}: Props) {
  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Template Basics</Text>
        <Text style={styles.sectionSubtitle}>
          Give your template a name and configure basics
        </Text>
      </View>

      {/* Name */}
      <View style={styles.field}>
        <Text style={styles.label}>
          Template Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(v) => setFormData((f) => ({ ...f, name: v }))}
          placeholder="e.g., order_confirmation"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          maxLength={100}
        />
        {formData.name ? (
          <View style={styles.previewNameBox}>
            <Ionicons
              name="information-circle"
              size={12}
              color={Colors.info}
            />
            <Text style={styles.previewName}>
              Will be saved as:{" "}
              <Text style={styles.previewNameBold}>
                {normalizeName(formData.name)}
              </Text>
            </Text>
          </View>
        ) : null}
        <Text style={styles.hint}>
          Lowercase letters, numbers and underscores only
        </Text>
      </View>

      {/* Category */}
      <View style={styles.field}>
        <Text style={styles.label}>
          Category <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.categoriesList}>
          {CATEGORIES.map((cat) => {
            const isSelected = formData.category === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryCard,
                  isSelected && styles.categoryCardActive,
                ]}
                onPress={() =>
                  setFormData((f) => ({ ...f, category: cat.value }))
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: `${cat.color}15` },
                  ]}
                >
                  <Ionicons name={cat.icon} size={22} color={cat.color} />
                </View>
                <View style={styles.categoryContent}>
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                  <Text style={styles.categoryDesc}>{cat.desc}</Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    isSelected && styles.radioActive,
                  ]}
                >
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Language */}
      <View style={styles.field}>
        <Text style={styles.label}>Language</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.langsRow}
        >
          {LANGUAGES.map((lang) => {
            const isSelected = formData.language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langChip,
                  isSelected && styles.langChipActive,
                ]}
                onPress={() =>
                  setFormData((f) => ({ ...f, language: lang.code }))
                }
              >
                <Text
                  style={[
                    styles.langText,
                    isSelected && styles.langTextActive,
                  ]}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* WhatsApp Account */}
      <View style={styles.field}>
        <Text style={styles.label}>
          WhatsApp Account <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.accountsList}>
          {whatsappAccounts.map((account) => {
            const isSelected = formData.whatsappAccountId === account.id;
            return (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountCard,
                  isSelected && styles.accountCardActive,
                ]}
                onPress={() =>
                  setFormData((f) => ({
                    ...f,
                    whatsappAccountId: account.id,
                  }))
                }
                activeOpacity={0.7}
              >
                <View style={styles.accountIcon}>
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountName}>
                    {account.phoneNumber ||
                      account.displayPhoneNumber ||
                      account.phone_number ||
                      account.displayName ||
                      account.name ||
                      "WhatsApp Account"}
                  </Text>
                  <Text style={styles.accountDetail}>
                    {account.verifiedName ||
                      account.displayName ||
                      account.name ||
                      (account.wabaId ? `WABA: ${account.wabaId}` : "")}
                  </Text>
                </View>
                {account.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>DEFAULT</Text>
                  </View>
                )}
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.tip}>
        <Ionicons name="bulb" size={16} color={Colors.info} />
        <Text style={styles.tipText}>
          Choose the right category. Meta will reject templates that don't
          match their intended use.
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

  field: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  required: { color: Colors.error },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  previewNameBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    padding: 8,
    backgroundColor: `${Colors.info}10`,
    borderRadius: 8,
    gap: 6,
  },
  previewName: {
    fontSize: 11,
    color: Colors.textSecondary,
    flex: 1,
  },
  previewNameBold: {
    fontFamily: "monospace",
    fontWeight: "700",
    color: Colors.info,
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },

  categoriesList: {
    gap: 8,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  categoryCardActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryContent: { flex: 1 },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  categoryDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },

  langsRow: {
    gap: 8,
    paddingRight: 20,
  },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  langChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  langText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  langTextActive: {
    color: "#fff",
  },

  accountsList: { gap: 8 },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  accountCardActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#25D36615",
    justifyContent: "center",
    alignItems: "center",
  },
  accountName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    fontFamily: "monospace",
  },
  accountDetail: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: `${Colors.warning}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.warning,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  tip: {
    flexDirection: "row",
    backgroundColor: `${Colors.info}10`,
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
