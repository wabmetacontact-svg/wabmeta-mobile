// src/components/inbox/ChatInput.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Platform,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Colors } from "../../constants/colors";
import { formatDuration } from "../../utils/inboxHelpers";
import { EmojiPicker } from "./EmojiPicker";

// SafeAudio placeholder (expo-av removed for React Native New Architecture compatibility)
const SafeAudio: any = null;

interface Props {
  isWindowOpen: boolean;
  onSendMessage: (text: string) => void;
  onSendMedia: (uri: string, mimeType: string, fileName: string) => void;
  onOpenTemplate: () => void;
  onTyping?: () => void;
}

export function ChatInput({
  isWindowOpen,
  onSendMessage,
  onSendMedia,
  onOpenTemplate,
  onTyping,
}: Props) {
  const [text, setText] = useState("");
  const [showAttachments, setShowAttachments] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recording, setRecording] = useState<any>(null);

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // ═══════════════════════════════════
  // SEND MESSAGE
  // ═══════════════════════════════════

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText("");
  };

  const handleTextChange = (val: string) => {
    setText(val);
    if (onTyping) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onTyping();
      }, 500);
    }
  };

  // ═══════════════════════════════════
  // EMOJI INSERT
  // ═══════════════════════════════════

  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji);
  };

  const toggleEmoji = () => {
    setShowEmoji(!showEmoji);
    setShowAttachments(false);
  };

  // ═══════════════════════════════════
  // ATTACHMENT PICKERS
  // ═══════════════════════════════════

  const pickImage = async () => {
    setShowAttachments(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow access to your photos");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `image-${Date.now()}.jpg`;
        onSendMedia(asset.uri, asset.mimeType || "image/jpeg", fileName);
      }
    } catch (err) {
      console.error("Image picker error:", err);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const takePhoto = async () => {
    setShowAttachments(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow camera access");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = `photo-${Date.now()}.jpg`;
        onSendMedia(asset.uri, "image/jpeg", fileName);
      }
    } catch (err) {
      console.error("Camera error:", err);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const pickVideo = async () => {
    setShowAttachments(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow access to your videos");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `video-${Date.now()}.mp4`;
        onSendMedia(asset.uri, asset.mimeType || "video/mp4", fileName);
      }
    } catch (err) {
      console.error("Video picker error:", err);
      Alert.alert("Error", "Failed to pick video");
    }
  };

  const pickDocument = async () => {
    setShowAttachments(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        onSendMedia(
          asset.uri,
          asset.mimeType || "application/octet-stream",
          asset.name
        );
      }
    } catch (err) {
      console.error("Document picker error:", err);
      Alert.alert("Error", "Failed to pick document");
    }
  };

  // ═══════════════════════════════════
  // VOICE RECORDING
  // ═══════════════════════════════════

  const startRecording = async () => {
    if (!SafeAudio) {
      Alert.alert("Voice Recording", "Audio recording is not supported on this device client");
      return;
    }

    try {
      const permission = await SafeAudio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow microphone access");
        return;
      }

      await SafeAudio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await SafeAudio.Recording.createAsync(
        SafeAudio.RecordingOptionsPresets?.HIGH_QUALITY || {}
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      durationTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Recording error:", err);
      Alert.alert("Error", "Failed to start recording");
    }
  };

  const stopRecording = async (send: boolean = true) => {
    if (!recording) return;

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setRecording(null);
      setIsRecording(false);
      const duration = recordingDuration;
      setRecordingDuration(0);

      if (send && uri && duration >= 1) {
        const fileName = `voice-${Date.now()}.m4a`;
        onSendMedia(uri, "audio/mp4", fileName);
      } else if (uri && duration < 1) {
        Alert.alert("Too short", "Voice message must be at least 1 second");
      }
    } catch (err) {
      console.error("Stop recording error:", err);
    }
  };

  const cancelRecording = async () => {
    await stopRecording(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (recording) recording.stopAndUnloadAsync().catch(() => {});
    };
  }, [recording]);

  // ═══════════════════════════════════
  // WINDOW CLOSED - TEMPLATE ONLY
  // ═══════════════════════════════════

  if (!isWindowOpen) {
    return (
      <View style={styles.closedContainer}>
        <View style={styles.closedInfo}>
          <Ionicons name="lock-closed" size={16} color={Colors.warning} />
          <Text style={styles.closedText}>
            24-hour messaging window closed
          </Text>
        </View>
        <TouchableOpacity
          style={styles.templateBtn}
          onPress={onOpenTemplate}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text" size={20} color="#fff" />
          <Text style={styles.templateBtnText}>Send Template Message</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  // ═══════════════════════════════════
  // RECORDING UI
  // ═══════════════════════════════════

  if (isRecording) {
    return (
      <View style={styles.recordingContainer}>
        <TouchableOpacity
          style={styles.recordCancelBtn}
          onPress={cancelRecording}
        >
          <Ionicons name="trash" size={22} color={Colors.error} />
        </TouchableOpacity>

        <View style={styles.recordingContent}>
          <View style={styles.recordingPulse}>
            <View style={styles.recordingDot} />
          </View>
          <Text style={styles.recordingText}>Recording...</Text>
          <Text style={styles.recordingDuration}>
            {formatDuration(recordingDuration)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.recordSendBtn}
          onPress={() => stopRecording(true)}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  // ═══════════════════════════════════
  // MAIN INPUT
  // ═══════════════════════════════════

  return (
    <>
      <View style={styles.container}>
        <View style={styles.inputWrap}>
          <TouchableOpacity style={styles.iconBtn} onPress={toggleEmoji}>
            <Ionicons
              name={showEmoji ? "close-circle" : "happy-outline"}
              size={24}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={handleTextChange}
            placeholder="Message"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={4096}
            onFocus={() => setShowEmoji(false)}
          />

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              setShowAttachments(true);
              setShowEmoji(false);
            }}
          >
            <Ionicons
              name="attach"
              size={22}
              color={Colors.textMuted}
              style={{ transform: [{ rotate: "45deg" }] }}
            />
          </TouchableOpacity>

          {!text.trim() && (
            <TouchableOpacity style={styles.iconBtn} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {text.trim() ? (
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleSend}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={startRecording}
            activeOpacity={0.7}
          >
            <Ionicons name="mic" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Emoji Picker */}
      {showEmoji && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmoji(false)}
        />
      )}

      {/* Attachment Sheet */}
      <AttachmentSheet
        visible={showAttachments}
        onClose={() => setShowAttachments(false)}
        onPickImage={pickImage}
        onTakePhoto={takePhoto}
        onPickVideo={pickVideo}
        onPickDocument={pickDocument}
      />
    </>
  );
}

// ═══════════════════════════════════
// ATTACHMENT SHEET
// ═══════════════════════════════════

interface AttachmentSheetProps {
  visible: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onTakePhoto: () => void;
  onPickVideo: () => void;
  onPickDocument: () => void;
}

function AttachmentSheet({
  visible,
  onClose,
  onPickImage,
  onTakePhoto,
  onPickVideo,
  onPickDocument,
}: AttachmentSheetProps) {
  const options = [
    {
      id: "camera",
      icon: "camera" as const,
      label: "Camera",
      color: "#EF4444",
      onPress: onTakePhoto,
    },
    {
      id: "gallery",
      icon: "images" as const,
      label: "Gallery",
      color: "#8B5CF6",
      onPress: onPickImage,
    },
    {
      id: "video",
      icon: "videocam" as const,
      label: "Video",
      color: "#EC4899",
      onPress: onPickVideo,
    },
    {
      id: "document",
      icon: "document" as const,
      label: "Document",
      color: "#3B82F6",
      onPress: onPickDocument,
    },
    {
      id: "location",
      icon: "location" as const,
      label: "Location",
      color: "#10B981",
      onPress: () => {
        onClose();
        Alert.alert("Location", "Coming soon");
      },
    },
    {
      id: "contact",
      icon: "person" as const,
      label: "Contact",
      color: "#F59E0B",
      onPress: () => {
        onClose();
        Alert.alert("Contact", "Coming soon");
      },
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={sheetStyles.overlay}>
        <TouchableOpacity
          style={sheetStyles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handle} />

          <Text style={sheetStyles.title}>Share Content</Text>

          <View style={sheetStyles.grid}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={sheetStyles.option}
                onPress={opt.onPress}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    sheetStyles.optionIcon,
                    { backgroundColor: opt.color },
                  ]}
                >
                  <Ionicons name={opt.icon} size={26} color="#fff" />
                </View>
                <Text style={sheetStyles.optionLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════
// STYLES
// ═══════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 5,
    backgroundColor: "transparent",
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 4,
    minHeight: 48,
    maxHeight: 130,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    maxHeight: 110,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },

  // Closed
  closedContainer: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 10,
  },
  closedInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  closedText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  templateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 24,
    gap: 10,
  },
  templateBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Recording
  recordingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  recordCancelBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.error}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  recordingContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recordingPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: `${Colors.error}30`,
    justifyContent: "center",
    alignItems: "center",
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  recordingText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  recordingDuration: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  recordSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
});

const sheetStyles = StyleSheet.create({
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
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 20,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    gap: 20,
  },
  option: {
    alignItems: "center",
    gap: 8,
    width: 80,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  optionLabel: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
});
