// app/(app)/automation/create.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { automations as automationsApi, templates as templatesApi, contacts as contactsApi } from "../../../src/services/api";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Colors } from "../../../src/constants/colors";
import { inbox as inboxApi, handleApiError } from "../../../src/services/api";
import { AutomationAction, AutomationTrigger } from "../../../src/types/automation";

const TRIGGERS: { value: AutomationTrigger; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { value: "UNKNOWN_MESSAGE", label: "Unknown Contact", icon: "help-circle", desc: "When new number messages you" },
  { value: "KEYWORD", label: "Keyword Match", icon: "chatbubble-ellipses", desc: "When message has specific words" },
  { value: "NEW_CONTACT", label: "New Contact", icon: "person-add", desc: "When you save a new contact" },
  { value: "SCHEDULE", label: "Scheduled", icon: "time", desc: "Run at a specific time daily" },
  { value: "INACTIVITY", label: "Inactivity", icon: "moon", desc: "When user stops replying" },
];

const ACTIONS: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { value: "send_text", label: "Send Text", icon: "document-text", color: "#3B82F6" },
  { value: "send_template", label: "Send Template", icon: "send", color: "#10B981" },
  { value: "send_image", label: "Send Image", icon: "image", color: "#8B5CF6" },
  { value: "send_video", label: "Send Video", icon: "videocam", color: "#EC4899" },
  { value: "send_audio", label: "Send Audio", icon: "musical-notes", color: "#14B8A6" },
  { value: "send_document", label: "Send Doc", icon: "document", color: "#F97316" },
  { value: "delay", label: "Wait/Delay", icon: "hourglass", color: "#F59E0B" },
  { value: "add_tag", label: "Add Tag", icon: "pricetag", color: "#6366F1" },
];

// Backend (automation.engine actionSendMedia) config.imageUrl / videoUrl /
// audioUrl / documentUrl padhta hai, aur optional config.caption.
// Pehle yahan sirf ek URL text box tha - phone se file choose karna possible
// hi nahi tha, aur caption ka koi option nahi tha.
const MEDIA_ACTIONS: Record<
  string,
  { field: string; label: string; caption: boolean; maxMb: number; kind: "media" | "file" }
> = {
  send_image: { field: "imageUrl", label: "Image", caption: true, maxMb: 5, kind: "media" },
  send_video: { field: "videoUrl", label: "Video", caption: true, maxMb: 16, kind: "media" },
  // WhatsApp audio par caption support nahi karta
  send_audio: { field: "audioUrl", label: "Audio", caption: false, maxMb: 16, kind: "file" },
  send_document: { field: "documentUrl", label: "Document", caption: true, maxMb: 100, kind: "file" },
};

function MediaActionConfig({
  actionType,
  config,
  onChange,
}: {
  actionType: string;
  config: any;
  onChange: (patch: any) => void;
}) {
  const spec = MEDIA_ACTIONS[actionType];
  const [uploading, setUploading] = useState(false);

  if (!spec) return null;

  const currentUrl = config[spec.field] || config.url || "";

  const upload = async (
    uri: string,
    mimeType: string,
    name: string,
    sizeBytes?: number
  ) => {
    if (sizeBytes && sizeBytes > spec.maxMb * 1024 * 1024) {
      Alert.alert("Too large", `${spec.label} must be under ${spec.maxMb} MB`);
      return;
    }

    setUploading(true);
    try {
      const res = await inboxApi.uploadMedia(uri, mimeType, name);
      const url = (res.data?.data as any)?.url;
      if (!url) throw new Error("Upload did not return a URL");

      onChange({ [spec.field]: url, filename: name });
    } catch (err: any) {
      Alert.alert("Upload failed", handleApiError(err, "Could not upload file"));
    } finally {
      setUploading(false);
    }
  };

  const pick = async () => {
    if (spec.kind === "media") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Media access is required to pick a file.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: actionType === "send_video" ? ["videos"] : ["images"],
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const a = result.assets[0];
      const isVideo = actionType === "send_video";
      await upload(
        a.uri,
        a.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
        a.fileName || (isVideo ? "upload.mp4" : "upload.jpg"),
        a.fileSize
      );
      return;
    }

    // Audio / document ke liye DocumentPicker
    const result = await DocumentPicker.getDocumentAsync({
      type: actionType === "send_audio" ? "audio/*" : "*/*",
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const a = result.assets[0];
    await upload(
      a.uri,
      a.mimeType || "application/octet-stream",
      a.name || "file",
      a.size ?? undefined
    );
  };

  return (
    <View style={{ gap: 10 }}>
      {currentUrl ? (
        <View style={mediaStyles.attached}>
          <Ionicons name="attach" size={16} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={mediaStyles.attachedName} numberOfLines={1}>
              {config.filename || `${spec.label} attached`}
            </Text>
            <Text style={mediaStyles.attachedUrl} numberOfLines={1}>
              {currentUrl}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onChange({ [spec.field]: "", url: "", filename: "" })}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={mediaStyles.uploadBtn}
          onPress={pick}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="cloud-upload-outline" size={18} color={Colors.primary} />
          )}
          <Text style={mediaStyles.uploadText}>
            {uploading ? "Uploading..." : `Upload ${spec.label.toLowerCase()}`}
          </Text>
        </TouchableOpacity>
      )}

      <TextInput
        style={styles.input}
        value={currentUrl}
        onChangeText={(v) => onChange({ [spec.field]: v })}
        placeholder="Or paste a public URL"
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
      />

      {spec.caption && (
        <TextInput
          style={styles.input}
          value={config.caption || ""}
          onChangeText={(v) => onChange({ caption: v })}
          placeholder="Caption (optional)"
          placeholderTextColor={Colors.textMuted}
        />
      )}
    </View>
  );
}

const mediaStyles = StyleSheet.create({
  attached: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}10`,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  attachedName: { fontSize: 13.5, fontWeight: "600", color: Colors.textPrimary },
  attachedUrl: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  uploadText: { fontSize: 14, fontWeight: "600", color: Colors.primary },
});

export default function CreateAutomationScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = Boolean(id && id !== "new");

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);

  const [templates, setTemplates] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  const [showActionsList, setShowActionsList] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger: "UNKNOWN_MESSAGE" as AutomationTrigger,
    triggerConfig: {} as any,
    isActive: true,
    targetGroupIds: [] as string[],
    excludeExisting: true,
  });

  const [actions, setActions] = useState<AutomationAction[]>([]);

  // ═══════════════════════════════════
  // FETCH
  // ═══════════════════════════════════

  useEffect(() => {
    loadData();
    if (isEditMode && id) loadAutomation();
  }, [id]);

  const loadData = async () => {
    try {
      const [tplRes, grpRes] = await Promise.all([
        templatesApi.getApproved({}),
        contactsApi.getGroups(),
      ]);
      if (tplRes?.data?.success) {
        const tdata = tplRes.data.data as any;
        setTemplates(Array.isArray(tdata) ? tdata : tdata.templates || []);
      }
      if (grpRes?.data?.success) setGroups(grpRes.data.data || []);
    } catch (err) {
      console.warn("Failed to load templates/groups");
    }
  };

  const loadAutomation = async () => {
    try {
      const res = await automationsApi.getById(id!);
      if (res?.data?.success) {
        const data = res.data.data as any;
        setFormData({
          name: data.name || "",
          description: data.description || "",
          trigger: data.trigger || "UNKNOWN_MESSAGE",
          triggerConfig: data.triggerConfig || {},
          isActive: data.isActive,
          targetGroupIds: data.targetGroupIds || [],
          excludeExisting: data.excludeExisting ?? true,
        });
        setActions(data.actions || []);
      }
    } catch (err: any) {
      Alert.alert("Error", "Failed to load automation");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════

  const addAction = (type: string) => {
    const newAction: AutomationAction = {
      id: `action-${Date.now()}`,
      type,
      config: type === "delay" ? { value: 1, unit: "minutes" } : {},
    };
    setActions([...actions, newAction]);
    setShowActionsList(false);
  };

  const updateActionConfig = (actionId: string, configUpdates: any) => {
    setActions(actions.map((a) =>
      a.id === actionId ? { ...a, config: { ...a.config, ...configUpdates } } : a
    ));
  };

  const removeAction = (actionId: string) => {
    setActions(actions.filter((a) => a.id !== actionId));
  };

  const toggleGroup = (groupId: string) => {
    setFormData((prev) => ({
      ...prev,
      targetGroupIds: prev.targetGroupIds.includes(groupId)
        ? prev.targetGroupIds.filter((gid) => gid !== groupId)
        : [...prev.targetGroupIds, groupId],
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Automation name is required");
      return;
    }

    if (actions.length === 0) {
      Alert.alert("Error", "Please add at least one action");
      return;
    }

    // Trigger specific validations
    if (
      formData.trigger === "KEYWORD" &&
      (!formData.triggerConfig.keywords || formData.triggerConfig.keywords.length === 0)
    ) {
      Alert.alert("Error", "Please add trigger keywords");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...formData, actions };

      if (isEditMode && id) {
        await automationsApi.update(id, payload);
      } else {
        await automationsApi.create(payload);
      }

      Alert.alert(
        "Success",
        `Automation ${isEditMode ? "updated" : "created"} successfully!`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════

  const renderActionConfig = (action: AutomationAction, index: number) => {
    const opt = ACTIONS.find((a) => a.value === action.type);
    if (!opt) return null;

    return (
      <View key={action.id} style={styles.actionCard}>
        {/* Connection line if not first */}
        {index > 0 && <View style={styles.connectorLine} />}

        <View style={styles.actionHeader}>
          <View style={styles.actionHeaderLeft}>
            <View style={styles.actionNumberBox}>
              <Text style={styles.actionNumber}>{index + 1}</Text>
            </View>
            <View style={[styles.actionIconSmall, { backgroundColor: `${opt.color}15` }]}>
              <Ionicons name={opt.icon} size={14} color={opt.color} />
            </View>
            <Text style={styles.actionTitle}>{opt.label}</Text>
          </View>
          <TouchableOpacity onPress={() => removeAction(action.id)} style={styles.removeActionBtn}>
            <Ionicons name="trash" size={16} color={Colors.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.actionContent}>
          {action.type === "send_text" && (
            <TextInput
              style={styles.textArea}
              value={action.config.text || ""}
              onChangeText={(v) => updateActionConfig(action.id, { text: v })}
              placeholder="Type your message..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
          )}

          {action.type === "send_template" && (
            <View style={styles.selectContainer}>
              <Ionicons name="document-text" size={16} color={Colors.textMuted} style={styles.selectIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.selectLabel}>Select Template</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {templates.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.templateChip,
                        action.config.templateId === t.id && styles.templateChipActive,
                      ]}
                      onPress={() => updateActionConfig(action.id, { templateId: t.id })}
                    >
                      <Text
                        style={[
                          styles.templateChipText,
                          action.config.templateId === t.id && styles.templateChipTextActive,
                        ]}
                      >
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {templates.length === 0 && (
                    <Text style={styles.hint}>No approved templates found</Text>
                  )}
                </ScrollView>
              </View>
            </View>
          )}

          {MEDIA_ACTIONS[action.type] && (
            <MediaActionConfig
              actionType={action.type}
              config={action.config}
              onChange={(patch) => updateActionConfig(action.id, patch)}
            />
          )}

          {action.type === "delay" && (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.input}
                  value={String(action.config.value || "")}
                  onChangeText={(v) => updateActionConfig(action.id, { value: parseInt(v) || 1 })}
                  keyboardType="number-pad"
                  placeholder="Value"
                />
              </View>
              <View style={{ flex: 1, flexDirection: "row", gap: 4 }}>
                {["minutes", "hours"].map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitChip,
                      action.config.unit === unit && styles.unitChipActive,
                    ]}
                    onPress={() => updateActionConfig(action.id, { unit })}
                  >
                    <Text
                      style={[
                        styles.unitChipText,
                        action.config.unit === unit && styles.unitChipTextActive,
                      ]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {action.type === "add_tag" && (
            <TextInput
              style={styles.input}
              value={action.config.tagName || action.config.tag || ""}
              onChangeText={(v) => updateActionConfig(action.id, { tagName: v })}
              placeholder="Enter tag name (e.g. lead)"
              placeholderTextColor={Colors.textMuted}
            />
          )}
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  // Header turant, spinner sirf form wale area mein
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isEditMode ? "Edit Automation" : "New Automation"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || loading}
          style={styles.saveBtnTop}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnTextTop}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* General Settings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings" size={18} color={Colors.textMuted} />
              <Text style={styles.sectionTitle}>General Settings</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(v) => setFormData({ ...formData, name: v })}
                placeholder="e.g. Welcome Sequence"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                value={formData.description}
                onChangeText={(v) => setFormData({ ...formData, description: v })}
                placeholder="What does this do?"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setFormData({ ...formData, isActive: !formData.isActive })}
            >
              <Text style={styles.label}>Status: {formData.isActive ? "Active" : "Paused"}</Text>
              <Switch
                value={formData.isActive}
                onValueChange={(v) => setFormData({ ...formData, isActive: v })}
                trackColor={{ false: Colors.border, true: Colors.success }}
              />
            </TouchableOpacity>
          </View>

          {/* Trigger */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={18} color={Colors.warning} />
              <Text style={styles.sectionTitle}>When should this run? (Trigger)</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={styles.triggersRow}>
                {TRIGGERS.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.triggerCard,
                      formData.trigger === t.value && styles.triggerCardActive,
                    ]}
                    onPress={() => setFormData({ ...formData, trigger: t.value })}
                  >
                    <Ionicons
                      name={t.icon}
                      size={20}
                      color={formData.trigger === t.value ? Colors.primary : Colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.triggerLabel,
                        formData.trigger === t.value && styles.triggerLabelActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Trigger Configs */}
            {formData.trigger === "KEYWORD" && (
              <View style={styles.triggerConfigBox}>
                <Text style={styles.label}>Trigger Keywords</Text>
                <TextInput
                  style={styles.input}
                  value={formData.triggerConfig?.keywords?.join(", ") || ""}
                  onChangeText={(v) =>
                    setFormData({
                      ...formData,
                      triggerConfig: {
                        ...formData.triggerConfig,
                        keywords: v.split(",").map((k) => k.trim()).filter(Boolean),
                      },
                    })
                  }
                  placeholder="e.g. pricing, demo, help"
                  placeholderTextColor={Colors.textMuted}
                />
                <Text style={styles.hint}>Comma separated</Text>
              </View>
            )}

            {formData.trigger === "SCHEDULE" && (
              <View style={styles.triggerConfigBox}>
                <Text style={styles.label}>Time (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.triggerConfig?.time || "09:00"}
                  onChangeText={(v) =>
                    setFormData({
                      ...formData,
                      triggerConfig: { ...formData.triggerConfig, time: v },
                    })
                  }
                  placeholder="09:00"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            )}

            {formData.trigger === "UNKNOWN_MESSAGE" && (
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setFormData({ ...formData, excludeExisting: !formData.excludeExisting })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Skip existing contacts</Text>
                  <Text style={styles.hint}>Only trigger for genuinely new numbers</Text>
                </View>
                <Switch
                  value={formData.excludeExisting}
                  onValueChange={(v) => setFormData({ ...formData, excludeExisting: v })}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Targeting */}
          {groups.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people" size={18} color={Colors.info} />
                <Text style={styles.sectionTitle}>Target Audience (Optional)</Text>
              </View>
              <Text style={styles.hint}>Only trigger for contacts in these groups:</Text>

              <View style={styles.groupsWrap}>
                {groups.map((g) => {
                  const isSelected = formData.targetGroupIds.includes(g.id);
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.groupChip, isSelected && styles.groupChipActive]}
                      onPress={() => toggleGroup(g.id)}
                    >
                      <Text style={[styles.groupChipText, isSelected && styles.groupChipTextActive]}>
                        {g.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="play-forward" size={18} color={Colors.success} />
              <Text style={styles.sectionTitle}>Then do this (Actions)</Text>
            </View>

            {actions.length === 0 ? (
              <View style={styles.emptyActions}>
                <Ionicons name="add-circle-outline" size={40} color={Colors.border} />
                <Text style={styles.emptyActionsText}>No actions added yet</Text>
              </View>
            ) : (
              <View style={styles.actionsList}>
                {actions.map((action, index) => renderActionConfig(action, index))}
              </View>
            )}

            {!showActionsList ? (
              <TouchableOpacity
                style={styles.addActionBtn}
                onPress={() => setShowActionsList(true)}
              >
                <Ionicons name="add" size={18} color={Colors.primary} />
                <Text style={styles.addActionText}>Add Action</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.actionPickerBox}>
                <View style={styles.actionPickerHeader}>
                  <Text style={styles.actionPickerTitle}>Select Action</Text>
                  <TouchableOpacity onPress={() => setShowActionsList(false)}>
                    <Ionicons name="close" size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <View style={styles.actionPickerGrid}>
                  {ACTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={styles.actionPickerOpt}
                      onPress={() => addAction(opt.value)}
                    >
                      <View style={[styles.actionPickerIcon, { backgroundColor: `${opt.color}15` }]}>
                        <Ionicons name={opt.icon} size={18} color={opt.color} />
                      </View>
                      <Text style={styles.actionPickerLabel}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  saveBtnTop: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  saveBtnTextTop: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  content: { padding: 16, gap: 16 },

  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  field: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  required: { color: Colors.error },
  hint: { fontSize: 11, color: Colors.textMuted, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  textArea: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: "top",
  },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },

  triggersRow: {
    flexDirection: "row",
    gap: 8,
  },
  triggerCard: {
    width: 100,
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    gap: 8,
  },
  triggerCardActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  triggerLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  triggerLabelActive: {
    color: Colors.primary,
    fontWeight: "700",
  },

  triggerConfigBox: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },

  groupsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  groupChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  groupChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  groupChipTextActive: {
    color: "#fff",
  },

  emptyActions: {
    padding: 30,
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: "dashed",
    marginBottom: 16,
  },
  emptyActionsText: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: "500",
  },

  actionsList: {
    marginBottom: 16,
  },
  actionCard: {
    marginBottom: 16,
  },
  connectorLine: {
    position: "absolute",
    top: -16,
    left: 18,
    width: 2,
    height: 16,
    backgroundColor: Colors.border,
  },
  actionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  actionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionNumberBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  actionNumber: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  actionIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  removeActionBtn: {
    padding: 4,
  },
  actionContent: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 12,
    borderRadius: 12,
    marginLeft: 10,
  },

  row: {
    flexDirection: "row",
    gap: 8,
  },
  unitChip: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  unitChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  unitChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  unitChipTextActive: {
    color: "#fff",
  },

  selectContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  selectIcon: {
    marginTop: 2,
  },
  selectLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  templateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  templateChipActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  templateChipText: {
    fontSize: 11,
    color: Colors.textPrimary,
  },
  templateChipTextActive: {
    color: Colors.primary,
    fontWeight: "700",
  },

  addActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    backgroundColor: `${Colors.primary}10`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    borderStyle: "dashed",
    gap: 8,
  },
  addActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },

  actionPickerBox: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  actionPickerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  actionPickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionPickerOpt: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  actionPickerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  actionPickerLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textPrimary,
    flex: 1,
  },
});
