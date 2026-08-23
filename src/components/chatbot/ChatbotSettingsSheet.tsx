// src/components/chatbot/ChatbotSettingsSheet.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";

interface Props {
  visible: boolean;
  chatbot: any;
  onUpdate: (data: any) => void;
  onClose: () => void;
}

export function ChatbotSettingsSheet({
  visible,
  chatbot,
  onUpdate,
  onClose,
}: Props) {
  const [newKeyword, setNewKeyword] = useState("");

  const keywords = chatbot.triggerKeywords || [];

  const addKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (!kw) return;

    if (keywords.includes(kw)) {
      Alert.alert("Duplicate", "Keyword already exists");
      return;
    }
    if (keywords.length >= 20) {
      Alert.alert("Limit", "Maximum 20 keywords");
      return;
    }

    onUpdate({ triggerKeywords: [...keywords, kw] });
    setNewKeyword("");
  };

  const removeKeyword = (index: number) => {
    onUpdate({
      triggerKeywords: keywords.filter((_: any, i: number) => i !== index),
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="settings" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Chatbot Settings</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={chatbot.name || ""}
                onChangeText={(v) => onUpdate({ name: v })}
                placeholder="Chatbot name"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.textArea}
                value={chatbot.description || ""}
                onChangeText={(v) => onUpdate({ description: v })}
                placeholder="Optional description"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {/* Trigger Keywords */}
            <View style={styles.field}>
              <Text style={styles.label}>🎯 Trigger Keywords</Text>
              <Text style={styles.hint}>
                Bot starts when user sends any of these words
              </Text>

              <View style={styles.keywordInput}>
                <TextInput
                  style={styles.keywordField}
                  value={newKeyword}
                  onChangeText={setNewKeyword}
                  placeholder="e.g., hi, hello, start"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  onSubmitEditing={addKeyword}
                />
                <TouchableOpacity
                  style={styles.addKeywordBtn}
                  onPress={addKeyword}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {keywords.length > 0 ? (
                <View style={styles.keywordsList}>
                  {keywords.map((kw: string, i: number) => (
                    <View key={i} style={styles.keywordChip}>
                      <Text style={styles.keywordText}>{kw}</Text>
                      <TouchableOpacity onPress={() => removeKeyword(i)}>
                        <Ionicons
                          name="close-circle"
                          size={14}
                          color={Colors.error}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyKeywords}>
                  <Text style={styles.emptyKeywordsText}>
                    No keywords added yet
                  </Text>
                </View>
              )}
            </View>

            {/* Default Toggle */}
            <View style={styles.field}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => onUpdate({ isDefault: !chatbot.isDefault })}
              >
                <View style={styles.toggleContent}>
                  <View style={styles.toggleIconBox}>
                    <Ionicons name="flash" size={18} color={Colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>Default Chatbot</Text>
                    <Text style={styles.toggleDesc}>
                      Auto-trigger for new conversations
                    </Text>
                  </View>
                </View>
                <Switch
                  value={chatbot.isDefault || false}
                  onValueChange={(v) => onUpdate({ isDefault: v })}
                  trackColor={{
                    false: Colors.border,
                    true: Colors.success,
                  }}
                  thumbColor="#fff"
                />
              </TouchableOpacity>
            </View>

            {/* Welcome Message */}
            <View style={styles.field}>
              <Text style={styles.label}>👋 Welcome Message</Text>
              <Text style={styles.hint}>Sent before flow starts (optional)</Text>
              <TextInput
                style={styles.textArea}
                value={chatbot.welcomeMessage || ""}
                onChangeText={(v) => onUpdate({ welcomeMessage: v })}
                placeholder="Welcome! 👋 How can I help?"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {/* Fallback Message */}
            <View style={styles.field}>
              <Text style={styles.label}>🔄 Fallback Message</Text>
              <Text style={styles.hint}>Sent when bot can't understand</Text>
              <TextInput
                style={styles.textArea}
                value={chatbot.fallbackMessage || ""}
                onChangeText={(v) => onUpdate({ fallbackMessage: v })}
                placeholder="Sorry, I didn't understand. Please try again."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },

  field: {
    marginBottom: 16,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
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

  keywordInput: {
    flexDirection: "row",
    gap: 8,
  },
  keywordField: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  addKeywordBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  keywordsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  keywordChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.success}15`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
  },
  keywordText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: "700",
  },
  emptyKeywords: {
    padding: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    alignItems: "center",
  },
  emptyKeywordsText: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  toggleContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${Colors.warning}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  toggleDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
