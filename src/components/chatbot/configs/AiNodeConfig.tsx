// src/components/chatbot/configs/AiNodeConfig.tsx
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

const PROMPT_TEMPLATES = [
  {
    label: "Customer Support",
    prompt:
      "You are a helpful customer support agent. Answer questions politely and professionally.",
  },
  {
    label: "Sales Assistant",
    prompt:
      "You are a friendly sales assistant. Help customers find the right product for their needs.",
  },
  {
    label: "FAQ Bot",
    prompt:
      "You answer frequently asked questions about our business. Be concise and clear.",
  },
];

export function AiNodeConfig({ data, onChange }: Props) {
  return (
    <View style={styles.container}>
      {/* System Prompt */}
      <View style={styles.field}>
        <Text style={styles.label}>System Prompt</Text>
        <TextInput
          style={styles.textArea}
          value={data.systemPrompt || ""}
          onChangeText={(v) => onChange({ ...data, systemPrompt: v })}
          placeholder="You are a helpful assistant..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        <Text style={styles.hint}>
          Instructions for the AI on how to respond to user messages
        </Text>
      </View>

      {/* Templates */}
      <View style={styles.field}>
        <Text style={styles.label}>Quick Templates</Text>
        <View style={styles.templates}>
          {PROMPT_TEMPLATES.map((tpl, i) => (
            <TouchableOpacity
              key={i}
              style={styles.template}
              onPress={() =>
                onChange({ ...data, systemPrompt: tpl.prompt })
              }
            >
              <Ionicons
                name="sparkles"
                size={14}
                color={Colors.primary}
              />
              <Text style={styles.templateText}>{tpl.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Ionicons name="bulb" size={16} color={Colors.warning} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>AI-Powered Responses</Text>
          <Text style={styles.infoText}>
            This node uses AI to generate contextual responses based on your
            system prompt. Users can ask any question and get intelligent
            replies.
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
  textArea: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 120,
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  templates: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  template: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.primary}10`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  templateText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },

  infoCard: {
    flexDirection: "row",
    backgroundColor: `${Colors.warning}10`,
    padding: 14,
    borderRadius: 12,
    gap: 10,
    alignItems: "flex-start",
  },
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
});
