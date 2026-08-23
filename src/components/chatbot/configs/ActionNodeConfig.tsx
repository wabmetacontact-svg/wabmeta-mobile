// src/components/chatbot/configs/ActionNodeConfig.tsx
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

const ACTION_TYPES = [
  {
    value: "tag",
    label: "Add Tag",
    icon: "pricetag" as const,
    desc: "Add tag to contact",
    color: "#8B5CF6",
  },
  {
    value: "assign",
    label: "Assign Agent",
    icon: "person" as const,
    desc: "Assign to team member",
    color: "#3B82F6",
  },
  {
    value: "webhook",
    label: "Call Webhook",
    icon: "code" as const,
    desc: "Send data to URL",
    color: "#EC4899",
  },
  {
    value: "variable",
    label: "Set Variable",
    icon: "settings" as const,
    desc: "Store data",
    color: "#F59E0B",
  },
];

export function ActionNodeConfig({ data, onChange }: Props) {
  const action = data.action || { type: "tag", value: "" };

  return (
    <View style={styles.container}>
      {/* Action Type */}
      <View style={styles.field}>
        <Text style={styles.label}>Action Type</Text>
        <View style={styles.actionsGrid}>
          {ACTION_TYPES.map((type) => {
            const isSelected = action.type === type.value;
            return (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.actionCard,
                  isSelected && styles.actionCardActive,
                  isSelected && { borderColor: type.color },
                ]}
                onPress={() =>
                  onChange({
                    ...data,
                    action: { type: type.value, value: "" },
                  })
                }
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: `${type.color}15` },
                  ]}
                >
                  <Ionicons name={type.icon} size={20} color={type.color} />
                </View>
                <Text style={styles.actionLabel}>{type.label}</Text>
                <Text style={styles.actionDesc}>{type.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Action Value */}
      <View style={styles.field}>
        <Text style={styles.label}>
          {action.type === "tag" && "Tag Name"}
          {action.type === "assign" && "Agent Email/ID"}
          {action.type === "webhook" && "Webhook URL"}
          {action.type === "variable" && "Variable Name"}
        </Text>
        <TextInput
          style={styles.input}
          value={action.value || ""}
          onChangeText={(v) =>
            onChange({
              ...data,
              action: { ...action, value: v },
            })
          }
          placeholder={
            action.type === "tag"
              ? "e.g., interested"
              : action.type === "assign"
              ? "agent@company.com"
              : action.type === "webhook"
              ? "https://example.com/webhook"
              : "e.g., customer_type"
          }
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
        />
      </View>

      {/* Type-specific info */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={16} color={Colors.info} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>
            {action.type === "tag" && "Tag Contact"}
            {action.type === "assign" && "Human Handoff"}
            {action.type === "webhook" && "External Integration"}
            {action.type === "variable" && "Data Storage"}
          </Text>
          <Text style={styles.infoText}>
            {action.type === "tag" &&
              "Contact will be tagged for future filtering and campaigns."}
            {action.type === "assign" &&
              "Conversation will be assigned to specified agent for manual reply."}
            {action.type === "webhook" &&
              "POST request will be sent to URL with conversation data."}
            {action.type === "variable" &&
              "Value will be stored in session variables for later use."}
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

  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionCard: {
    flex: 1,
    minWidth: "45%",
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    alignItems: "center",
    gap: 6,
  },
  actionCardActive: {
    backgroundColor: Colors.surfaceSecondary,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  actionDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: "center",
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

  infoCard: {
    flexDirection: "row",
    backgroundColor: `${Colors.info}10`,
    padding: 14,
    borderRadius: 12,
    gap: 10,
    alignItems: "flex-start",
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.info,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
