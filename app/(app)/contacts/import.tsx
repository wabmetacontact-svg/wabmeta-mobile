// app/(app)/contacts/import.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { contacts as contactsApi } from "../../../src/services/api";
import { Colors } from "../../../src/constants/colors";
import { ContactGroup } from "../../../src/types/contact";

export default function ImportContactsScreen() {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");

  // Groups list
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  // ─── File Upload State ─────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
    uri: string;
  } | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [parsedPreview, setParsedPreview] = useState<string[]>([]);
  const [parsedRowCount, setParsedRowCount] = useState(0);

  // ─── Bulk Paste State ──────────────────────────────────────
  const [pasteText, setPasteText] = useState("");

  const sampleNumbers = `+919876543210
+919876543211, Rahul Sharma
+919876543212, Pooja Patel
+919876543213`;

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await contactsApi.getGroups();
      const raw = res?.data?.data || res?.data;
      if (Array.isArray(raw)) {
        setGroups(raw);
      } else if (Array.isArray(raw?.groups)) {
        setGroups(raw.groups);
      }
    } catch (e) {
      console.warn("Failed to fetch groups:", e);
    }
  };

  // ─── File Picker Handler ───────────────────────────────────
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "text/plain", "*/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setSelectedFile({
        name: asset.name,
        size: asset.size || 0,
        uri: asset.uri,
      });

      // Read file text
      const content = await FileSystem.readAsStringAsync(asset.uri);
      setFileContent(content);

      // Parse lines for preview
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      setParsedRowCount(Math.max(0, lines.length - 1)); // excluding header
      setParsedPreview(lines.slice(0, 4));
    } catch (err: any) {
      Alert.alert("File Error", "Could not read the selected file");
    }
  };

  // ─── Number Count for Bulk Paste ───────────────────────────
  const getDetectedNumbersCount = () => {
    if (!pasteText.trim()) return 0;
    const preprocessed = pasteText
      .replace(/[ \t]*[\-\(\)\.][ \t]*/g, "")
      .replace(/(\d)[ \t]+(\d)/g, "$1$2")
      .replace(/(\+)[ \t]+(\d)/g, "$1$2");

    return preprocessed
      .split(/[\n,;\s]+/)
      .map((n) => n.trim())
      .filter((n) => n.length >= 7).length;
  };

  // ─── Submit Handler ────────────────────────────────────────
  const handleSubmit = async () => {
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setLoading(true);

    try {
      if (activeTab === "file") {
        if (!fileContent.trim()) {
          Alert.alert("Error", "Please select a CSV file first");
          setLoading(false);
          return;
        }

        const res = await contactsApi.import({
          csvData: fileContent.trim(),
          groupId: selectedGroupId || undefined,
          tags: tagList.length > 0 ? tagList : undefined,
        });

        if (res?.data?.success !== false) {
          const msg =
            (res?.data?.data as any)?.message ||
            (res?.data as any)?.message ||
            "Contacts imported successfully!";
          Alert.alert("Import Successful! 🎉", msg, [
            { text: "OK", onPress: () => router.back() },
          ]);
        } else {
          Alert.alert("Import Failed", (res?.data as any)?.message || "Failed to import");
        }
      } else {
        // Bulk Paste Tab
        const count = getDetectedNumbersCount();
        if (count === 0) {
          Alert.alert("Error", "Please enter at least one phone number");
          setLoading(false);
          return;
        }

        const res = await contactsApi.bulkPaste({
          phoneNumbers: pasteText.trim(),
          groupId: selectedGroupId || undefined,
          tags: tagList.length > 0 ? tagList : undefined,
        });

        if (res?.data?.success !== false) {
          const data = res?.data?.data as any;
          const msg =
            data?.message ||
            `Successfully processed ${data?.created || count} contact(s)!`;
          Alert.alert("Bulk Paste Successful! 🎉", msg, [
            { text: "OK", onPress: () => router.back() },
          ]);
        } else {
          Alert.alert("Failed", (res?.data as any)?.message || "Upload failed");
        }
      }
    } catch (err: any) {
      console.error("❌ Import error:", err?.response?.data || err.message);
      Alert.alert(
        "Import Error",
        err?.response?.data?.message || "Failed to process contacts"
      );
    } finally {
      setLoading(false);
    }
  };

  const detectedCount = getDetectedNumbersCount();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Import Contacts</Text>
          <Text style={styles.headerSubtitle}>
            {activeTab === "file" ? "Upload CSV spreadsheet" : "Paste numbers in bulk"}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "file" && styles.tabBtnActive]}
          onPress={() => setActiveTab("file")}
        >
          <Ionicons
            name="document-text"
            size={18}
            color={activeTab === "file" ? "#fff" : Colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "file" && styles.tabTextActive,
            ]}
          >
            Upload CSV File
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "paste" && styles.tabBtnActive]}
          onPress={() => setActiveTab("paste")}
        >
          <Ionicons
            name="clipboard"
            size={18}
            color={activeTab === "paste" ? "#fff" : Colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "paste" && styles.tabTextActive,
            ]}
          >
            Bulk Paste
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === "file" ? (
            /* ═════════════════════════════════════════
               TAB 1: CSV FILE UPLOAD
            ══════════════════════════════════════════ */
            <View>
              {/* File Dropzone / Picker */}
              <TouchableOpacity
                style={[
                  styles.dropzone,
                  selectedFile && styles.dropzoneSelected,
                ]}
                onPress={handlePickDocument}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.uploadIconBox,
                    selectedFile && { backgroundColor: `${Colors.primary}20` },
                  ]}
                >
                  <Ionicons
                    name={selectedFile ? "document-attach" : "cloud-upload"}
                    size={36}
                    color={Colors.primary}
                  />
                </View>

                {selectedFile ? (
                  <View style={styles.fileDetails}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {selectedFile.name}
                    </Text>
                    <Text style={styles.fileMeta}>
                      {(selectedFile.size / 1024).toFixed(1)} KB • ~{parsedRowCount} contacts found
                    </Text>
                    <View style={styles.reselectBadge}>
                      <Ionicons name="refresh" size={12} color={Colors.primary} />
                      <Text style={styles.reselectText}>Tap to choose different file</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadPrompt}>
                    <Text style={styles.uploadTitle}>Tap to select CSV File</Text>
                    <Text style={styles.uploadSub}>
                      Supports .csv or .txt files with header columns
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* CSV Preview */}
              {parsedPreview.length > 0 && (
                <View style={styles.previewBox}>
                  <View style={styles.previewHeader}>
                    <Ionicons name="eye-outline" size={16} color={Colors.primary} />
                    <Text style={styles.previewTitle}>File Preview</Text>
                  </View>
                  {parsedPreview.map((line, idx) => (
                    <Text
                      key={idx}
                      style={[styles.previewLine, idx === 0 && styles.previewHeaderLine]}
                      numberOfLines={1}
                    >
                      {idx === 0 ? "🔹 " : "  "}
                      {line}
                    </Text>
                  ))}
                </View>
              )}

              {/* Instructions */}
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Ionicons name="information-circle" size={18} color={Colors.primary} />
                  <Text style={styles.infoTitle}>CSV Header Format</Text>
                </View>
                <Text style={styles.infoText}>
                  Supported column names in first row:
                  {"\n"}• <Text style={styles.bold}>phone</Text> or <Text style={styles.bold}>mobile</Text> (Required with country code)
                  {"\n"}• <Text style={styles.bold}>firstName</Text>, <Text style={styles.bold}>lastName</Text>, <Text style={styles.bold}>email</Text> (Optional)
                </Text>
              </View>
            </View>
          ) : (
            /* ═════════════════════════════════════════
               TAB 2: BULK PASTE
            ══════════════════════════════════════════ */
            <View>
              <View style={styles.field}>
                <View style={styles.fieldHeader}>
                  <Text style={styles.label}>
                    Paste Phone Numbers <Text style={styles.required}>*</Text>
                  </Text>
                  {detectedCount > 0 && (
                    <View style={styles.countChip}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.countChipText}>
                        {detectedCount} numbers detected
                      </Text>
                    </View>
                  )}
                </View>

                <TextInput
                  style={styles.textArea}
                  value={pasteText}
                  onChangeText={setPasteText}
                  placeholder={`+919876543210\n+919876543211, Rahul\n+919876543212, Pooja`}
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={9}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={styles.sampleBtn}
                onPress={() => setPasteText(sampleNumbers)}
              >
                <Ionicons name="sparkles" size={14} color={Colors.primary} />
                <Text style={styles.sampleBtnText}>Load Sample Numbers</Text>
              </TouchableOpacity>

              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Ionicons name="bulb-outline" size={18} color={Colors.primary} />
                  <Text style={styles.infoTitle}>Paste Format Tips</Text>
                </View>
                <Text style={styles.infoText}>
                  • One number per line, or separated by commas.
                  {"\n"}• Include country code (e.g. <Text style={styles.bold}>+91 9876543210</Text>).
                  {"\n"}• Optionally add names: <Text style={styles.bold}>+919876543210, John Doe</Text>
                </Text>
              </View>
            </View>
          )}

          {/* ═════════════════════════════════════════
             COMMON OPTIONS (Group & Tags)
          ══════════════════════════════════════════ */}
          <View style={styles.optionsSection}>
            <Text style={styles.sectionHeaderTitle}>Organization (Optional)</Text>

            {/* Group Selector */}
            {groups.length > 0 && (
              <View style={styles.field}>
                <Text style={styles.label}>Assign to Group</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.groupChipsRow}
                >
                  <TouchableOpacity
                    style={[
                      styles.groupChip,
                      selectedGroupId === null && styles.groupChipActive,
                    ]}
                    onPress={() => setSelectedGroupId(null)}
                  >
                    <Text
                      style={[
                        styles.groupChipText,
                        selectedGroupId === null && styles.groupChipTextActive,
                      ]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                  {groups.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.groupChip,
                        selectedGroupId === g.id && styles.groupChipActive,
                      ]}
                      onPress={() =>
                        setSelectedGroupId(selectedGroupId === g.id ? null : g.id)
                      }
                    >
                      <View
                        style={[
                          styles.groupDot,
                          { backgroundColor: g.color || Colors.primary },
                        ]}
                      />
                      <Text
                        style={[
                          styles.groupChipText,
                          selectedGroupId === g.id && styles.groupChipTextActive,
                        ]}
                      >
                        {g.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Tags Input */}
            <View style={styles.field}>
              <Text style={styles.label}>Add Tags</Text>
              <TextInput
                style={styles.input}
                value={tags}
                onChangeText={setTags}
                placeholder="lead, new-import, august-campaign"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
              <Text style={styles.hint}>Separate tags with commas</Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (loading ||
                (activeTab === "file" && !fileContent) ||
                (activeTab === "paste" && detectedCount === 0)) &&
                styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={
              loading ||
              (activeTab === "file" && !fileContent) ||
              (activeTab === "paste" && detectedCount === 0)
            }
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={activeTab === "file" ? "cloud-upload" : "checkmark-done"}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.submitBtnText}>
                  {activeTab === "file"
                    ? `Import ${parsedRowCount > 0 ? parsedRowCount + " " : ""}Contacts`
                    : `Import ${detectedCount > 0 ? detectedCount + " " : ""}Numbers`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  headerSubtitle: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  // Tabs
  tabsContainer: {
    flexDirection: "row",
    padding: 8,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },

  content: { padding: 16, paddingBottom: 40 },

  // Dropzone
  dropzone: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: `${Colors.primary}40`,
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  dropzoneSelected: {
    borderColor: Colors.primary,
    borderStyle: "solid",
    backgroundColor: `${Colors.primary}05`,
  },
  uploadIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: `${Colors.primary}12`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  uploadPrompt: { alignItems: "center" },
  uploadTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4 },
  uploadSub: { fontSize: 12, color: Colors.textSecondary, textAlign: "center" },

  fileDetails: { alignItems: "center" },
  fileName: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4 },
  fileMeta: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  reselectBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  reselectText: { fontSize: 11, fontWeight: "600", color: Colors.primary },

  // Preview Box
  previewBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  previewTitle: { fontSize: 12, fontWeight: "700", color: Colors.textPrimary },
  previewLine: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    paddingVertical: 2,
  },
  previewHeaderLine: {
    color: Colors.primary,
    fontWeight: "700",
  },

  // Info Card
  infoCard: {
    backgroundColor: `${Colors.primary}08`,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${Colors.primary}20`,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  infoTitle: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  infoText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  bold: { fontWeight: "700", color: Colors.textPrimary },

  field: { marginBottom: 16 },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
  required: { color: Colors.error },
  countChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B98115",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  countChipText: { fontSize: 11, color: "#10B981", fontWeight: "700" },

  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  textArea: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    minHeight: 140,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sampleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sampleBtnText: { fontSize: 11, color: Colors.primary, fontWeight: "700" },
  hint: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },

  optionsSection: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  groupChipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  groupChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    gap: 6,
  },
  groupChipActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}12`,
  },
  groupChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  groupChipTextActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  groupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
