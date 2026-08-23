// src/components/campaigns/steps/StepDetails.tsx
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
import { CampaignFormData } from "../../../types/campaign";

interface Props {
  formData: CampaignFormData;
  setFormData: React.Dispatch<React.SetStateAction<CampaignFormData>>;
  whatsappAccounts: any[];
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
}

export function StepDetails({
  formData,
  setFormData,
  whatsappAccounts,
  selectedAccountId,
  setSelectedAccountId,
}: Props) {
  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Campaign Details</Text>
        <Text style={styles.sectionSubtitle}>
          Give your campaign a memorable name
        </Text>
      </View>

      {/* Name */}
      <View style={styles.field}>
        <Text style={styles.label}>
          Campaign Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(v) => setFormData((f) => ({ ...f, name: v }))}
          placeholder="e.g., Diwali Sale 2024"
          placeholderTextColor={Colors.textMuted}
          maxLength={100}
        />
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(v) => setFormData((f) => ({ ...f, description: v }))}
          placeholder="Brief notes about this campaign..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={500}
        />
      </View>

      {/* WhatsApp Account */}
      <View style={styles.field}>
        <Text style={styles.label}>
          WhatsApp Account <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.accountsList}>
          {whatsappAccounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              style={[
                styles.accountItem,
                selectedAccountId === account.id && styles.accountItemActive,
              ]}
              onPress={() => setSelectedAccountId(account.id)}
              activeOpacity={0.7}
            >
              <View style={styles.accountIcon}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              </View>
              <View style={styles.accountContent}>
                <Text style={styles.accountName}>
                  {account.displayName || account.phoneNumber || "WhatsApp"}
                </Text>
                <Text style={styles.accountPhone}>{account.phoneNumber}</Text>
              </View>
              {selectedAccountId === account.id && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
              {account.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.tip}>
        <Ionicons name="bulb" size={16} color={Colors.info} />
        <Text style={styles.tipText}>
          Choose a clear, descriptive name to easily identify this campaign later
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
  textArea: {
    minHeight: 80,
  },
  accountsList: {
    gap: 8,
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  accountItemActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#25D36622",
    justifyContent: "center",
    alignItems: "center",
  },
  accountContent: { flex: 1 },
  accountName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  accountPhone: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  defaultBadge: {
    backgroundColor: `${Colors.info}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  defaultText: {
    fontSize: 10,
    color: Colors.info,
    fontWeight: "700",
  },
  tip: {
    flexDirection: "row",
    backgroundColor: `${Colors.info}10`,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    alignItems: "flex-start",
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
