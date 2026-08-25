// src/components/chatbot/configs/MessageNodeConfig.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Colors } from "../../../constants/colors";
import { inbox as inboxApi } from "../../../services/api";

interface Props {
  data: any;
  onChange: (data: any) => void;
}

const MESSAGE_TYPES = [
  { value: "text", label: "Text", icon: "chatbubble" as const },
  { value: "image", label: "Image", icon: "image" as const },
  { value: "video", label: "Video", icon: "videocam" as const },
  { value: "document", label: "Document", icon: "document" as const },
];

export function MessageNodeConfig({ data, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const messageType = data.messageType || "text";

  const pickMedia = async () => {
    try {
      if (messageType === "image" || messageType === "video") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permission needed", "Please allow media access");
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            messageType === "video"
              ? ["videos"]
              : ["images"],
          quality: 0.8,
        });

        if (result.canceled || !result.assets[0]) return;

        const asset = result.assets[0];
        await uploadMedia(
          asset.uri,
          asset.mimeType || (messageType === "video" ? "video/mp4" : "image/jpeg"),
          asset.fileName || `media-${Date.now()}`
        );
      } else if (messageType === "document") {
        const result = await DocumentPicker.getDocumentAsync({
          type: "*/*",
        });

        if (result.canceled || !result.assets[0]) return;

        const asset = result.assets[0];
        await uploadMedia(
          asset.uri,
          asset.mimeType || "application/pdf",
          asset.name
        );
      }
    } catch (err: any) {
      Alert.alert("Error", "Failed to pick file");
    }
  };

  const uploadMedia = async (uri: string, type: string, name: string) => {
    try {
      setUploading(true);
      const res = await inboxApi.uploadMedia(uri, type, name);
      const uploaded = res.data?.data as any;

      if (uploaded?.url) {
        onChange({ ...data, mediaUrl: uploaded.url });
      }
    } catch (err) {
      Alert.alert("Error", "Failed to upload media");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Message Type */}
      <View style={styles.field}>
        <Text style={styles.label}>Message Type</Text>
        <View style={styles.typesGrid}>
          {MESSAGE_TYPES.map((type) => {
            const isSelected = messageType === type.value;
            return (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeCard,
                  isSelected && styles.typeCardActive,
                ]}
                onPress={() =>
                  onChange({
                    ...data,
                    messageType: type.value,
                    mediaUrl: type.value === "text" ? undefined : data.mediaUrl,
                  })
                }
              >
                <Ionicons
                  name={type.icon}
                  size={18}
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

      {/* Media Upload */}
      {messageType !== "text" && (
        <View style={styles.field}>
          <Text style={styles.label}>
            Upload {messageType.charAt(0).toUpperCase() + messageType.slice(1)}
          </Text>
          {data.mediaUrl ? (
            <View style={styles.mediaPreview}>
              {messageType === "image" && (
                <Image
                  source={{ uri: data.mediaUrl }}
                  style={styles.mediaImage}
                />
              )}
              {(messageType === "video" || messageType === "document") && (
                <View style={styles.mediaPlaceholder}>
                  <Ionicons
                    name={
                      messageType === "video" ? "videocam" : "document"
                    }
                    size={40}
                    color={Colors.primary}
                  />
                </View>
              )}
              <View style={styles.mediaActions}>
                <TouchableOpacity
                  style={styles.mediaActionBtn}
                  onPress={pickMedia}
                >
                  <Ionicons name="refresh" size={14} color={Colors.info} />
                  <Text style={{ color: Colors.info, fontSize: 12, fontWeight: "700" }}>
                    Change
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mediaActionBtn}
                  onPress={() => onChange({ ...data, mediaUrl: undefined })}
                >
                  <Ionicons name="trash" size={14} color={Colors.error} />
                  <Text style={{ color: Colors.error, fontSize: 12, fontWeight: "700" }}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
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
                    size={28}
                    color={Colors.primary}
                  />
                  <Text style={styles.uploadText}>Tap to upload</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Message Text / Caption */}
      <View style={styles.field}>
        <Text style={styles.label}>
          {messageType === "text" ? "Message" : "Caption (Optional)"}
        </Text>
        <TextInput
          style={styles.textArea}
          value={data.message || ""}
          onChangeText={(v) => onChange({ ...data, message: v })}
          placeholder={
            messageType === "text"
              ? "Enter your message..."
              : "Add a caption for your media..."
          }
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <Text style={styles.hint}>
          Use *bold*, _italic_, or {"{{"}"variable"{"}}"} for personalization
        </Text>
      </View>

      {/* Formatting Guide */}
      <View style={styles.formatCard}>
        <Text style={styles.formatTitle}>💡 Formatting Tips</Text>
        <View style={styles.formatItems}>
          <FormatItem code="*bold*" desc="Bold" />
          <FormatItem code="_italic_" desc="Italic" />
          <FormatItem code="~strike~" desc="Strike" />
          <FormatItem code="`code`" desc="Monospace" />
        </View>
      </View>
    </View>
  );
}

function FormatItem({ code, desc }: { code: string; desc: string }) {
  return (
    <View style={styles.formatItem}>
      <Text style={styles.formatCode}>{code}</Text>
      <Text style={styles.formatDesc}>{desc}</Text>
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

  typesGrid: {
    flexDirection: "row",
    gap: 8,
  },
  typeCard: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 4,
  },
  typeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  typeLabelActive: {
    color: Colors.primary,
  },

  uploadBtn: {
    padding: 24,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    gap: 6,
  },
  uploadText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  mediaPreview: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  mediaImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  mediaPlaceholder: {
    width: "100%",
    height: 100,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  mediaActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    gap: 4,
  },

  textArea: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 100,
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  formatCard: {
    padding: 12,
    backgroundColor: `${Colors.info}08`,
    borderRadius: 10,
  },
  formatTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.info,
    marginBottom: 8,
  },
  formatItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  formatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  formatCode: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.info,
    fontFamily: "monospace",
  },
  formatDesc: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
});
