// src/components/chatbot/configs/ButtonNodeConfig.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constants/colors";

interface Props {
  data: any;
  onChange: (data: any) => void;
}

export function ButtonNodeConfig({ data, onChange }: Props) {
  const buttons = data.buttons || [];

  const addButton = () => {
    if (buttons.length >= 3) {
      Alert.alert("Limit Reached", "Maximum 3 buttons allowed");
      return;
    }
    const newBtn = {
      id: `btn-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      text: `Option ${buttons.length + 1}`,
    };
    onChange({ ...data, buttons: [...buttons, newBtn] });
  };

  const updateButton = (index: number, text: string) => {
    const newButtons = buttons.map((b: any, i: number) =>
      i === index ? { ...b, text } : b
    );
    onChange({ ...data, buttons: newButtons });
  };

  const removeButton = (index: number) => {
    if (buttons.length <= 1) {
      Alert.alert("Cannot Remove", "At least 1 button is required");
      return;
    }
    onChange({
      ...data,
      buttons: buttons.filter((_: any, i: number) => i !== index),
    });
  };

  return (
    <View style={styles.container}>
      {/* Question */}
      <View style={styles.field}>
        <Text style={styles.label}>Question / Message</Text>
        <TextInput
          style={styles.textArea}
          value={data.message || ""}
          onChangeText={(v) => onChange({ ...data, message: v })}
          placeholder="What can I help you with?"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Buttons */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            Buttons ({buttons.length}/3)
          </Text>
          {buttons.length < 3 && (
            <TouchableOpacity style={styles.addBtn} onPress={addButton}>
              <Ionicons name="add" size={14} color={Colors.primary} />
              <Text style={styles.addBtnText}>Add Button</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.buttonsList}>
          {buttons.map((btn: any, index: number) => (
            <View key={btn.id} style={styles.buttonItem}>
              <View style={styles.buttonNumber}>
                <Text style={styles.buttonNumberText}>{index + 1}</Text>
              </View>
              <TextInput
                style={styles.buttonInput}
                value={btn.text}
                onChangeText={(v) => updateButton(index, v)}
                placeholder="Button text"
                placeholderTextColor={Colors.textMuted}
                maxLength={20}
              />
              <TouchableOpacity
                onPress={() => removeButton(index)}
                style={styles.removeBtn}
              >
                <Ionicons name="close" size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Text style={styles.hint}>
          Buttons are quick reply options. Users tap to respond.
        </Text>
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={16} color={Colors.info} />
        <Text style={styles.infoText}>
          Each button can lead to a different flow. Connect them in the next
          nodes.
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
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },

  buttonsList: {
    gap: 8,
  },
  buttonItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonNumberText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
  },
  buttonInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.error}15`,
    justifyContent: "center",
    alignItems: "center",
  },

  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
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
