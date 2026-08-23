// src/components/chatbot/configs/ListNodeConfig.tsx
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

export function ListNodeConfig({ data, onChange }: Props) {
  const sections = data.listSections || [];

  const addRow = (sectionIndex: number) => {
    const totalRows = sections.reduce(
      (sum: number, s: any) => sum + (s.rows?.length || 0),
      0
    );
    if (totalRows >= 10) {
      Alert.alert("Limit Reached", "Maximum 10 options total");
      return;
    }

    const newSections = [...sections];
    newSections[sectionIndex].rows = [
      ...(newSections[sectionIndex].rows || []),
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title: `Option ${(newSections[sectionIndex].rows?.length || 0) + 1}`,
        description: "",
      },
    ];
    onChange({ ...data, listSections: newSections });
  };

  const updateRow = (
    sectionIndex: number,
    rowIndex: number,
    updates: any
  ) => {
    const newSections = [...sections];
    newSections[sectionIndex].rows[rowIndex] = {
      ...newSections[sectionIndex].rows[rowIndex],
      ...updates,
    };
    onChange({ ...data, listSections: newSections });
  };

  const removeRow = (sectionIndex: number, rowIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].rows = newSections[sectionIndex].rows.filter(
      (_: any, i: number) => i !== rowIndex
    );
    onChange({ ...data, listSections: newSections });
  };

  const updateSectionTitle = (sectionIndex: number, title: string) => {
    const newSections = [...sections];
    newSections[sectionIndex].title = title;
    onChange({ ...data, listSections: newSections });
  };

  return (
    <View style={styles.container}>
      {/* Message */}
      <View style={styles.field}>
        <Text style={styles.label}>Message</Text>
        <TextInput
          style={styles.textArea}
          value={data.message || ""}
          onChangeText={(v) => onChange({ ...data, message: v })}
          placeholder="Please choose from menu"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />
      </View>

      {/* List Button Text */}
      <View style={styles.field}>
        <Text style={styles.label}>List Button Text</Text>
        <TextInput
          style={styles.input}
          value={data.listButtonText || "View Options"}
          onChangeText={(v) => onChange({ ...data, listButtonText: v })}
          placeholder="View Options"
          placeholderTextColor={Colors.textMuted}
          maxLength={20}
        />
      </View>

      {/* Sections */}
      {sections.map((section: any, sIndex: number) => (
        <View key={sIndex} style={styles.section}>
          <TextInput
            style={styles.sectionTitleInput}
            value={section.title || ""}
            onChangeText={(v) => updateSectionTitle(sIndex, v)}
            placeholder="Section Title (optional)"
            placeholderTextColor={Colors.textMuted}
            maxLength={24}
          />

          {section.rows?.map((row: any, rIndex: number) => (
            <View key={row.id} style={styles.rowItem}>
              <View style={styles.rowContent}>
                <TextInput
                  style={styles.rowTitleInput}
                  value={row.title || ""}
                  onChangeText={(v) =>
                    updateRow(sIndex, rIndex, { title: v })
                  }
                  placeholder="Option title"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={24}
                />
                <TextInput
                  style={styles.rowDescInput}
                  value={row.description || ""}
                  onChangeText={(v) =>
                    updateRow(sIndex, rIndex, { description: v })
                  }
                  placeholder="Description (optional)"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={72}
                />
              </View>
              <TouchableOpacity
                onPress={() => removeRow(sIndex, rIndex)}
                style={styles.removeRowBtn}
              >
                <Ionicons name="close" size={14} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addRowBtn}
            onPress={() => addRow(sIndex)}
          >
            <Ionicons name="add" size={14} color={Colors.primary} />
            <Text style={styles.addRowBtnText}>Add Option</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={16} color={Colors.info} />
        <Text style={styles.infoText}>
          Lists support up to 10 options total. Users select one from the menu.
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

  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
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
    minHeight: 60,
  },

  section: {
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    gap: 8,
  },
  sectionTitleInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  rowItem: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  rowContent: {
    flex: 1,
    gap: 6,
  },
  rowTitleInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  rowDescInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    padding: 8,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  removeRowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${Colors.error}15`,
    justifyContent: "center",
    alignItems: "center",
  },

  addRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: "dashed",
  },
  addRowBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
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
