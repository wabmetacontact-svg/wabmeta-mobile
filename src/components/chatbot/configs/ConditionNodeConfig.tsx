// src/components/chatbot/configs/ConditionNodeConfig.tsx
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

interface Props {
  data: any;
  onChange: (data: any) => void;
}

const CONDITION_TYPES = [
  { value: "keyword", label: "Contains Keyword", icon: "search" as const },
  { value: "exact", label: "Exact Match", icon: "checkmark-circle" as const },
  { value: "contains", label: "Contains Text", icon: "text" as const },
  { value: "regex", label: "Regex Pattern", icon: "code" as const },
];

export function ConditionNodeConfig({ data, onChange }: Props) {
  const condition = data.condition || { type: "keyword", value: "" };

  return (
    <View style={styles.container}>
      {/* Condition Type */}
      <View style={styles.field}>
        <Text style={styles.label}>Condition Type</Text>
        <View style={styles.typesList}>
          {CONDITION_TYPES.map((type) => {
            const isSelected = condition.type === type.value;
            return (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeOption,
                  isSelected && styles.typeOptionActive,
                ]}
                onPress={() =>
                  onChange({
                    ...data,
                    condition: { ...condition, type: type.value },
                  })
                }
              >
                <View
                  style={[
                    styles.typeIcon,
                    isSelected && { backgroundColor: `${Colors.primary}15` },
                  ]}
                >
                  <Ionicons
                    name={type.icon}
                    size={16}
                    color={isSelected ? Colors.primary : Colors.textMuted}
                  />
                </View>
                <Text
                  style={[
                    styles.typeText,
                    isSelected && styles.typeTextActive,
                  ]}
                >
                  {type.label}
                </Text>
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

      {/* Value */}
      <View style={styles.field}>
        <Text style={styles.label}>
          {condition.type === "regex" ? "Regex Pattern" : "Value"}
        </Text>
        <TextInput
          style={styles.input}
          value={condition.value || ""}
          onChangeText={(v) =>
            onChange({
              ...data,
              condition: { ...condition, value: v },
            })
          }
          placeholder={
            condition.type === "keyword"
              ? "e.g., yes, price, buy"
              : condition.type === "exact"
              ? "e.g., Yes"
              : condition.type === "contains"
              ? "e.g., help"
              : "e.g., ^[0-9]+$"
          }
          placeholderTextColor={Colors.textMuted}
        />
        <Text style={styles.hint}>
          {condition.type === "keyword" &&
            "Multiple keywords separated by comma"}
          {condition.type === "exact" &&
            "User message must match exactly (case-insensitive)"}
          {condition.type === "contains" &&
            "Check if user message contains this text"}
          {condition.type === "regex" &&
            "Advanced pattern matching using regex"}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="git-branch" size={16} color={Colors.info} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            If condition matches → follow "Yes" path{"\n"}
            If not → follow "No" path
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  field: { gap: 8 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  typesList: {
    gap: 8,
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 10,
  },
  typeOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  typeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  typeTextActive: {
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
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

  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  infoCard: {
    flexDirection: "row",
    backgroundColor: `${Colors.info}10`,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    alignItems: "flex-start",
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.info,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
