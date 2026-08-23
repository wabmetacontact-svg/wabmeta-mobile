// src/components/templates/steps/StepFooterButtons.tsx
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
import {
  TemplateFormData,
  TemplateButton,
  ButtonType,
} from "../../../types/template";

interface Props {
  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
}

const BUTTON_TYPES: {
  value: ButtonType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  {
    value: "QUICK_REPLY",
    label: "Quick Reply",
    icon: "chatbubble-ellipses",
    color: "#3B82F6",
  },
  {
    value: "URL",
    label: "Visit Website",
    icon: "open-outline",
    color: "#8B5CF6",
  },
  {
    value: "PHONE_NUMBER",
    label: "Call Phone",
    icon: "call",
    color: "#10B981",
  },
];

export function StepFooterButtons({ formData, setFormData }: Props) {
  const buttons = formData.buttons || [];

  const addButton = (type: ButtonType) => {
    if (buttons.length >= 3) {
      Alert.alert("Limit Reached", "Maximum 3 buttons allowed");
      return;
    }

    const newBtn: TemplateButton = {
      type,
      text: "",
      ...(type === "URL" ? { url: "" } : {}),
      ...(type === "PHONE_NUMBER" ? { phoneNumber: "" } : {}),
    };

    setFormData((f) => ({
      ...f,
      buttons: [...(f.buttons || []), newBtn],
    }));
  };

  const updateButton = (index: number, updates: Partial<TemplateButton>) => {
    setFormData((f) => ({
      ...f,
      buttons: (f.buttons || []).map((btn, i) =>
        i === index ? { ...btn, ...updates } : btn
      ),
    }));
  };

  const removeButton = (index: number) => {
    setFormData((f) => ({
      ...f,
      buttons: (f.buttons || []).filter((_, i) => i !== index),
    }));
  };

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Footer & Buttons</Text>
        <Text style={styles.sectionSubtitle}>
          Add optional footer text and interactive buttons
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.field}>
        <Text style={styles.label}>Footer Text (Optional)</Text>
        <TextInput
          style={styles.input}
          value={formData.footerText || ""}
          onChangeText={(v) => setFormData((f) => ({ ...f, footerText: v }))}
          placeholder="e.g., Thanks for choosing us"
          placeholderTextColor={Colors.textMuted}
          maxLength={60}
        />
        <Text style={styles.charCount}>
          {(formData.footerText || "").length}/60
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.field}>
        <Text style={styles.label}>Buttons (Optional)</Text>
        <Text style={styles.hint}>Add up to 3 interactive buttons</Text>

        {/* Existing Buttons */}
        {buttons.length > 0 && (
          <View style={styles.buttonsList}>
            {buttons.map((btn, i) => (
              <ButtonEditor
                key={i}
                button={btn}
                index={i}
                onUpdate={(updates) => updateButton(i, updates)}
                onRemove={() => removeButton(i)}
              />
            ))}
          </View>
        )}

        {/* Add Button */}
        {buttons.length < 3 && (
          <View style={styles.addButtonsSection}>
            <Text style={styles.addButtonsLabel}>Add Button:</Text>
            <View style={styles.addButtonsRow}>
              {BUTTON_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={styles.addBtn}
                  onPress={() => addButton(type.value)}
                >
                  <View
                    style={[
                      styles.addBtnIcon,
                      { backgroundColor: `${type.color}15` },
                    ]}
                  >
                    <Ionicons
                      name={type.icon}
                      size={18}
                      color={type.color}
                    />
                  </View>
                  <Text style={styles.addBtnLabel}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={styles.tip}>
        <Ionicons name="information-circle" size={16} color={Colors.info} />
        <Text style={styles.tipText}>
          Quick Reply buttons are perfect for chatbots. URL/Phone buttons open
          links or dial numbers.
        </Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════
// BUTTON EDITOR
// ═══════════════════════════════════

function ButtonEditor({
  button,
  index,
  onUpdate,
  onRemove,
}: {
  button: TemplateButton;
  index: number;
  onUpdate: (updates: Partial<TemplateButton>) => void;
  onRemove: () => void;
}) {
  const typeConfig = {
    QUICK_REPLY: { icon: "chatbubble-ellipses" as const, color: "#3B82F6" },
    URL: { icon: "open-outline" as const, color: "#8B5CF6" },
    PHONE_NUMBER: { icon: "call" as const, color: "#10B981" },
  }[button.type];

  return (
    <View style={styles.buttonCard}>
      <View style={styles.buttonHeader}>
        <View style={styles.buttonHeaderLeft}>
          <View
            style={[
              styles.buttonTypeIcon,
              { backgroundColor: `${typeConfig.color}15` },
            ]}
          >
            <Ionicons name={typeConfig.icon} size={14} color={typeConfig.color} />
          </View>
          <Text style={styles.buttonTypeLabel}>
            Button {index + 1} • {button.type.replace("_", " ")}
          </Text>
        </View>
        <TouchableOpacity onPress={onRemove} style={styles.buttonRemoveBtn}>
          <Ionicons name="close" size={16} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.buttonInput}
        value={button.text}
        onChangeText={(v) => onUpdate({ text: v })}
        placeholder="Button text (e.g., Learn More)"
        placeholderTextColor={Colors.textMuted}
        maxLength={25}
      />
      <Text style={styles.charCount}>{button.text.length}/25</Text>

      {button.type === "URL" && (
        <>
          <TextInput
            style={styles.buttonInput}
            value={button.url || ""}
            onChangeText={(v) => onUpdate({ url: v })}
            placeholder="https://example.com"
            placeholderTextColor={Colors.textMuted}
            keyboardType="url"
            autoCapitalize="none"
          />
          <Text style={styles.subhint}>
            Use {"{{1}}"} for dynamic URL parameters
          </Text>
        </>
      )}

      {button.type === "PHONE_NUMBER" && (
        <TextInput
          style={styles.buttonInput}
          value={button.phoneNumber || button.phone_number || ""}
          onChangeText={(v) =>
            onUpdate({ phoneNumber: v, phone_number: v })
          }
          placeholder="+91 9876543210"
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
        />
      )}
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
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  subhint: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    fontStyle: "italic",
  },

  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  charCount: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "right",
    marginTop: 4,
  },

  buttonsList: {
    gap: 10,
    marginBottom: 16,
  },
  buttonCard: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  buttonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  buttonHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonTypeIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonTypeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  buttonRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${Colors.error}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 4,
  },

  addButtonsSection: {
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
  },
  addButtonsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  addButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  addBtn: {
    flex: 1,
    alignItems: "center",
    padding: 10,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    gap: 6,
  },
  addBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
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
