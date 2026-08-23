// src/components/chatbot/configs/DelayNodeConfig.tsx
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

const QUICK_DELAYS = [
  { value: 1, label: "1 sec" },
  { value: 2, label: "2 sec" },
  { value: 5, label: "5 sec" },
  { value: 10, label: "10 sec" },
  { value: 30, label: "30 sec" },
  { value: 60, label: "1 min" },
];

export function DelayNodeConfig({ data, onChange }: Props) {
  const delay = data.delay || 2;

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={styles.label}>Delay Duration</Text>

        <View style={styles.delayDisplay}>
          <Ionicons name="time" size={32} color={Colors.warning} />
          <Text style={styles.delayValue}>{delay}s</Text>
        </View>

        <TextInput
          style={styles.input}
          value={String(delay)}
          onChangeText={(v) => {
            const num = parseInt(v) || 0;
            if (num >= 0 && num <= 300) {
              onChange({ ...data, delay: num });
            }
          }}
          keyboardType="number-pad"
          placeholder="Seconds"
          placeholderTextColor={Colors.textMuted}
        />
        <Text style={styles.hint}>Max 300 seconds (5 minutes)</Text>
      </View>

      {/* Quick Options */}
      <View style={styles.field}>
        <Text style={styles.label}>Quick Presets</Text>
        <View style={styles.quickGrid}>
          {QUICK_DELAYS.map((q) => (
            <TouchableOpacity
              key={q.value}
              style={[
                styles.quickBtn,
                delay === q.value && styles.quickBtnActive,
              ]}
              onPress={() => onChange({ ...data, delay: q.value })}
            >
              <Text
                style={[
                  styles.quickBtnText,
                  delay === q.value && styles.quickBtnTextActive,
                ]}
              >
                {q.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={16} color={Colors.info} />
        <Text style={styles.infoText}>
          Adds a pause before the next node. Useful for realistic conversation
          flow.
        </Text>
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

  delayDisplay: {
    alignItems: "center",
    padding: 24,
    backgroundColor: `${Colors.warning}10`,
    borderRadius: 16,
    gap: 8,
  },
  delayValue: {
    fontSize: 40,
    fontWeight: "800",
    color: Colors.warning,
    letterSpacing: -1,
  },

  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
  },
  quickBtnActive: {
    backgroundColor: Colors.warning,
    borderColor: Colors.warning,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  quickBtnTextActive: {
    color: "#fff",
  },

  infoCard: {
    flexDirection: "row",
    backgroundColor: `${Colors.info}10`,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
