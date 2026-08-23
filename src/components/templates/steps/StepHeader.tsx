// src/components/templates/steps/StepHeader.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Colors } from "../../../constants/colors";
import { TemplateFormData, HeaderType } from "../../../types/template";
import { templates as templatesApi } from "../../../services/api";

interface Props {
  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
}

const HEADER_TYPES: {
  value: HeaderType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  desc: string;
}[] = [
  {
    value: "NONE",
    label: "None",
    icon: "close-circle",
    desc: "No header",
  },
  {
    value: "TEXT",
    label: "Text",
    icon: "text",
    desc: "Short heading text",
  },
  {
    value: "IMAGE",
    label: "Image",
    icon: "image",
    desc: "JPG or PNG image",
  },
  {
    value: "VIDEO",
    label: "Video",
    icon: "videocam",
    desc: "MP4 video file",
  },
  {
    value: "DOCUMENT",
    label: "Document",
    icon: "document",
    desc: "PDF document",
  },
];

export function StepHeader({ formData, setFormData }: Props) {
  const [uploading, setUploading] = useState(false);

  const pickMedia = async () => {
    try {
      let result: any;

      if (formData.headerType === "IMAGE") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permission needed", "Please allow gallery access");
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.9,
          allowsEditing: false,
        });

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        await uploadMedia(
          asset.uri,
          asset.mimeType || "image/jpeg",
          asset.fileName || `image-${Date.now()}.jpg`
        );
      } else if (formData.headerType === "VIDEO") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["videos"],
          quality: 0.9,
          videoMaxDuration: 60,
        });

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        await uploadMedia(
          asset.uri,
          asset.mimeType || "video/mp4",
          asset.fileName || `video-${Date.now()}.mp4`
        );
      } else if (formData.headerType === "DOCUMENT") {
        result = await DocumentPicker.getDocumentAsync({
          type: ["application/pdf"],
          copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        await uploadMedia(
          asset.uri,
          asset.mimeType || "application/pdf",
          asset.name
        );
      }
    } catch (err: any) {
      console.error("Pick error:", err);
      Alert.alert("Error", "Failed to pick file");
    }
  };

  const uploadMedia = async (uri: string, type: string, name: string) => {
    if (!formData.whatsappAccountId) {
      Alert.alert("Error", "Please select WhatsApp account in Step 1");
      return;
    }

    try {
      setUploading(true);
      const res = await templatesApi.uploadMedia(
        uri,
        type,
        name,
        formData.whatsappAccountId
      );

      const data = res.data?.data as any;
      if (!data?.mediaHandle && !data?.mediaId) {
        throw new Error("No media handle received");
      }

      setFormData((f) => ({
        ...f,
        headerMediaId: data.mediaHandle || data.mediaId,
        headerCloudinaryUrl: data.cloudinaryUrl || data.url,
        headerFileName: name,
      }));

      Alert.alert("Success", "Media uploaded successfully");
    } catch (err: any) {
      console.error("Upload error:", err);
      Alert.alert(
        "Upload Failed",
        err?.response?.data?.message || "Failed to upload media"
      );
    } finally {
      setUploading(false);
    }
  };

  const clearMedia = () => {
    setFormData((f) => ({
      ...f,
      headerMediaId: "",
      headerCloudinaryUrl: "",
      headerFileName: "",
    }));
  };

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Header (Optional)</Text>
        <Text style={styles.sectionSubtitle}>
          Add a header to make your message stand out
        </Text>
      </View>

      {/* Type Selection */}
      <View style={styles.field}>
        <Text style={styles.label}>Header Type</Text>
        <View style={styles.typesGrid}>
          {HEADER_TYPES.map((type) => {
            const isSelected = formData.headerType === type.value;
            return (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeCard,
                  isSelected && styles.typeCardActive,
                ]}
                onPress={() => {
                  setFormData((f) => ({
                    ...f,
                    headerType: type.value,
                    headerText: type.value === "TEXT" ? f.headerText : "",
                    headerMediaId: "",
                    headerCloudinaryUrl: "",
                    headerFileName: "",
                  }));
                }}
              >
                <Ionicons
                  name={type.icon}
                  size={20}
                  color={isSelected ? Colors.primary : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    isSelected && styles.typeLabelActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Text Header */}
      {formData.headerType === "TEXT" && (
        <View style={styles.field}>
          <Text style={styles.label}>Header Text</Text>
          <TextInput
            style={styles.input}
            value={formData.headerText || ""}
            onChangeText={(v) => setFormData((f) => ({ ...f, headerText: v }))}
            placeholder="e.g., Order Confirmation"
            placeholderTextColor={Colors.textMuted}
            maxLength={60}
          />
          <Text style={styles.charCount}>
            {(formData.headerText || "").length}/60
          </Text>
        </View>
      )}

      {/* Media Header */}
      {["IMAGE", "VIDEO", "DOCUMENT"].includes(formData.headerType) && (
        <View style={styles.field}>
          <Text style={styles.label}>
            {formData.headerType === "IMAGE" && "Upload Image"}
            {formData.headerType === "VIDEO" && "Upload Video"}
            {formData.headerType === "DOCUMENT" && "Upload Document"}
          </Text>

          {formData.headerMediaId ? (
            <View style={styles.mediaPreview}>
              {formData.headerType === "IMAGE" &&
              formData.headerCloudinaryUrl ? (
                <Image
                  source={{ uri: formData.headerCloudinaryUrl }}
                  style={styles.mediaImage}
                />
              ) : (
                <View style={styles.mediaPlaceholder}>
                  <Ionicons
                    name={
                      formData.headerType === "VIDEO"
                        ? "videocam"
                        : "document"
                    }
                    size={40}
                    color={Colors.primary}
                  />
                </View>
              )}
              <View style={styles.mediaInfo}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={Colors.success}
                />
                <Text style={styles.mediaFileName} numberOfLines={1}>
                  {formData.headerFileName || "Media uploaded"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeMediaBtn}
                onPress={clearMedia}
              >
                <Ionicons name="trash" size={16} color={Colors.error} />
                <Text style={styles.removeMediaText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={pickMedia}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload"
                    size={32}
                    color={Colors.primary}
                  />
                  <Text style={styles.uploadText}>
                    Tap to upload{" "}
                    {formData.headerType?.toLowerCase()}
                  </Text>
                  <Text style={styles.uploadHint}>
                    {formData.headerType === "IMAGE" &&
                      "JPG, PNG (max 5 MB)"}
                    {formData.headerType === "VIDEO" &&
                      "MP4 (max 16 MB)"}
                    {formData.headerType === "DOCUMENT" &&
                      "PDF (max 100 MB)"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.tip}>
        <Ionicons name="information-circle" size={16} color={Colors.info} />
        <Text style={styles.tipText}>
          Headers make your template more engaging. Text headers support
          variables like {"{{"}"1"{"}}"}.
        </Text>
      </View>
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
    marginBottom: 10,
  },

  typesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeCard: {
    flex: 1,
    minWidth: 100,
    alignItems: "center",
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    gap: 6,
  },
  typeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  typeLabelActive: {
    color: Colors.primary,
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

  uploadBtn: {
    padding: 32,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 8,
  },
  uploadHint: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  mediaPreview: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  mediaImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
  },
  mediaPlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  mediaFileName: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  removeMediaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 8,
    backgroundColor: `${Colors.error}10`,
    marginTop: 10,
    gap: 6,
  },
  removeMediaText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: "700",
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
