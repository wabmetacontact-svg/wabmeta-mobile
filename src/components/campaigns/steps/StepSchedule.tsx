// src/components/campaigns/steps/StepSchedule.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constants/colors";
import { CampaignFormData, Template } from "../../../types/campaign";

interface Props {
  formData: CampaignFormData;
  setFormData: React.Dispatch<React.SetStateAction<CampaignFormData>>;
  totalRecipients: number;
  selectedTemplate?: Template;
}

export function StepSchedule({
  formData,
  setFormData,
  totalRecipients,
  selectedTemplate,
}: Props) {
  const isPastTime =
    formData.scheduleType === "later" &&
    formData.scheduledDate &&
    formData.scheduledTime &&
    new Date(`${formData.scheduledDate}T${formData.scheduledTime}:00`) <=
      new Date();

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule Campaign</Text>
        <Text style={styles.sectionSubtitle}>
          Choose when to send your campaign
        </Text>
      </View>

      {/* Options */}
      <View style={styles.optionsGrid}>
        <TouchableOpacity
          style={[
            styles.optionCard,
            formData.scheduleType === "now" && styles.optionCardActive,
          ]}
          onPress={() => setFormData((f) => ({ ...f, scheduleType: "now" }))}
        >
          <View
            style={[
              styles.optionIcon,
              {
                backgroundColor:
                  formData.scheduleType === "now"
                    ? Colors.primary
                    : `${Colors.primary}15`,
              },
            ]}
          >
            <Ionicons
              name="flash"
              size={24}
              color={formData.scheduleType === "now" ? "#fff" : Colors.primary}
            />
          </View>
          <Text style={styles.optionTitle}>Send Now</Text>
          <Text style={styles.optionDesc}>
            Start sending immediately
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            formData.scheduleType === "later" && styles.optionCardActive,
          ]}
          onPress={() => setFormData((f) => ({ ...f, scheduleType: "later" }))}
        >
          <View
            style={[
              styles.optionIcon,
              {
                backgroundColor:
                  formData.scheduleType === "later"
                    ? Colors.primary
                    : `${Colors.primary}15`,
              },
            ]}
          >
            <Ionicons
              name="calendar"
              size={24}
              color={
                formData.scheduleType === "later" ? "#fff" : Colors.primary
              }
            />
          </View>
          <Text style={styles.optionTitle}>Schedule</Text>
          <Text style={styles.optionDesc}>Send at specific time</Text>
        </TouchableOpacity>
      </View>

      {/* Schedule Fields */}
      {formData.scheduleType === "later" && (
        <View style={styles.dateTimeContainer}>
          <View style={styles.fieldsRow}>
            <View style={styles.field}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.dateInput}
                value={formData.scheduledDate}
                onChangeText={(v) =>
                  setFormData((f) => ({ ...f, scheduledDate: v }))
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Time</Text>
              <TextInput
                style={styles.dateInput}
                value={formData.scheduledTime}
                onChangeText={(v) =>
                  setFormData((f) => ({ ...f, scheduledTime: v }))
                }
                placeholder="HH:MM"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          {isPastTime && (
            <View style={styles.warningCard}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.warningText}>
                Scheduled time is in the past. Please select a future time.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Campaign Summary</Text>
        <SummaryRow
          icon="text"
          label="Name"
          value={formData.name || "Untitled"}
        />
        <SummaryRow
          icon="document-text"
          label="Template"
          value={selectedTemplate?.name || "Not selected"}
        />
        <SummaryRow
          icon="people"
          label="Recipients"
          value={`${totalRecipients.toLocaleString("en-IN")} contacts`}
        />
        <SummaryRow
          icon="time"
          label="Timing"
          value={
            formData.scheduleType === "now"
              ? "Send immediately"
              : `${formData.scheduledDate} at ${formData.scheduledTime}`
          }
        />
      </View>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon} size={14} color={Colors.textMuted} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1}>
        {value}
      </Text>
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

  optionsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  optionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    alignItems: "center",
  },
  optionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  dateTimeContainer: {
    marginBottom: 20,
  },
  fieldsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  field: { flex: 1 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  dateInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },

  warningCard: {
    flexDirection: "row",
    backgroundColor: `${Colors.error}10`,
    padding: 10,
    borderRadius: 8,
    gap: 6,
    alignItems: "flex-start",
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: Colors.error,
    fontWeight: "600",
  },

  summaryCard: {
    backgroundColor: `${Colors.primary}08`,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${Colors.primary}20`,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    width: 80,
    fontWeight: "600",
  },
  summaryValue: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
});
