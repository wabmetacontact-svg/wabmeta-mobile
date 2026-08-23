// src/components/chatbot/configs/EndNodeConfig.tsx
import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constants/colors";

interface Props {
  data: any;
  onChange: (data: any) => void;
}

export function EndNodeConfig({ data, onChange }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.infoCard}>
        <Ionicons name="checkmark-circle" size={32} color={Colors.error} />
        <Text style={styles.title}>End of Flow</Text>
        <Text style={styles.text}>
          This node closes the conversation. Optionally send a goodbye message.
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Goodbye Message (Optional)</Text>
        <TextInput
          style={styles.textArea}
          value={data.message || ""}
          onChangeText={(v) => onChange({ ...data, message: v })}
          placeholder="Thanks for chatting! Have a great day 👋"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  infoCard: {
    padding: 24,
    backgroundColor: `${Colors.error}10`,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${Colors.error}20`,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 10,
  },
  text: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
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
    minHeight: 80,
  },
});
