// src/components/inbox/MessageBubble.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Colors } from "../../constants/colors";
import { Message } from "../../types/inbox";
import { formatMessageTime, formatFileSize } from "../../utils/inboxHelpers";

// SafeAudio / SafeVideo placeholders (expo-av removed for React Native New Architecture compatibility)
const SafeAudio: any = null;
const SafeVideo: any = null;
const SafeResizeMode: any = null;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://api.wabmeta.com/api";

interface Props {
  message: Message;
  conversationId: string;
  contactName?: string;
  isGrouped?: boolean;
  onReply?: (msg: Message) => void;
  onDelete?: (msg: Message) => void;
  onCopy?: (content: string) => void;
  onStar?: (msg: Message) => void;
}

export const MessageBubble = React.memo(function MessageBubble({
  message,
  contactName,
  isGrouped = false,
  onReply,
  onDelete,
  onCopy,
  onStar,
}: Props) {
  const [showFullImage, setShowFullImage] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState(false);

  const isOutbound = message.direction === "OUTBOUND";
  const msgType = (message.type || "").toLowerCase();
  const isDeleted =
    message.content === "[revoke]" || message.content === "[Revoke]";

  // Get media URL
  const getMediaSrc = (): string | null => {
    const url = message.mediaUrl;
    if (!url) return null;

    // Data URL
    if (url.startsWith("data:")) return url;

    // Cloudinary
    if (url.includes("cloudinary.com")) return url;

    // Other HTTPS (not Meta direct)
    if (
      url.startsWith("https://") &&
      !url.includes("lookaside.fbsbx.com") &&
      !url.includes("mmg.whatsapp.net") &&
      !url.includes("scontent")
    ) {
      return url;
    }

    // Media ID - proxy through backend
    if (message.mediaId && /^\d+$/.test(message.mediaId.trim())) {
      return `${API_BASE}/inbox/media/${message.mediaId.trim()}`;
    }

    return url;
  };

  // Status ticks
  const renderStatus = () => {
    if (!isOutbound) return null;
    const status = message.status?.toUpperCase();

    switch (status) {
      case "SENT":
        return (
          <Ionicons
            name="checkmark"
            size={14}
            color="rgba(0,0,0,0.5)"
          />
        );
      case "DELIVERED":
        return (
          <Ionicons
            name="checkmark-done"
            size={14}
            color="rgba(0,0,0,0.5)"
          />
        );
      case "READ":
        return (
          <Ionicons name="checkmark-done" size={14} color="#53BDEB" />
        );
      case "FAILED":
        return (
          <Ionicons name="alert-circle" size={14} color={Colors.error} />
        );
      default:
        return (
          <Ionicons name="time-outline" size={12} color="rgba(0,0,0,0.4)" />
        );
    }
  };

  const showActionSheet = () => {
    const options: any[] = [];

    if (onReply) {
      options.push({ text: "Reply", onPress: () => onReply(message) });
    }
    if (onCopy && message.content && msgType !== "template") {
      options.push({
        text: "Copy",
        onPress: () => onCopy(message.content),
      });
    }
    if (onStar) {
      options.push({
        text: message.isStarred ? "Unstar" : "Star",
        onPress: () => onStar(message),
      });
    }
    if (onDelete) {
      options.push({
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(message),
      });
    }
    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert("Message Options", "", options);
  };

  // Reply preview
  const renderReplyPreview = () => {
    if (!message.replyTo) return null;

    const getReplyPreview = () => {
      const type = message.replyTo!.type?.toLowerCase();
      if (type === "image") return "📷 Photo";
      if (type === "video") return "🎥 Video";
      if (type === "audio") return "🎵 Voice message";
      if (type === "document") return "📄 Document";
      return message.replyTo!.content || "Message";
    };

    return (
      <View
        style={[
          styles.replyPreview,
          isOutbound ? styles.replyPreviewOut : styles.replyPreviewIn,
        ]}
      >
        <View
          style={[
            styles.replyBar,
            {
              backgroundColor:
                message.replyTo.direction === "OUTBOUND"
                  ? "#25D366"
                  : Colors.info,
            },
          ]}
        />
        <View style={styles.replyContent}>
          <Text style={styles.replySender}>
            {message.replyTo.direction === "OUTBOUND"
              ? "You"
              : message.replyTo.senderName || contactName || "Contact"}
          </Text>
          <Text style={styles.replyText} numberOfLines={1}>
            {getReplyPreview()}
          </Text>
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════
  // RENDER MESSAGE TYPES
  // ═══════════════════════════════════

  const renderText = () => (
    <Text style={styles.textContent}>{message.content}</Text>
  );

  const renderImage = () => {
    const src = getMediaSrc();

    return (
      <View>
        <TouchableOpacity
          onPress={() => !imageError && setShowFullImage(true)}
          activeOpacity={0.9}
        >
          {imageLoading && !imageError && (
            <View style={styles.mediaPlaceholder}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          )}
          {imageError && (
            <View style={styles.mediaError}>
              <Ionicons name="image-outline" size={32} color="#999" />
              <Text style={styles.mediaErrorText}>Image unavailable</Text>
            </View>
          )}
          {src && !imageError && (
            <Image
              source={{ uri: src }}
              style={[
                styles.image,
                imageLoading ? { position: "absolute", opacity: 0 } : null,
              ]}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          )}
        </TouchableOpacity>

        {/* Full-screen image viewer */}
        <Modal
          visible={showFullImage}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFullImage(false)}
        >
          <View style={styles.fullscreenModal}>
            <TouchableOpacity
              style={styles.closeFullscreen}
              onPress={() => setShowFullImage(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            {src && (
              <Image
                source={{ uri: src }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
      </View>
    );
  };

  const renderVideo = () => {
    const src = getMediaSrc();

    const handleOpenVideo = () => {
      if (src) {
        Linking.openURL(src).catch(() => {
          Alert.alert("Error", "Cannot open video URL");
        });
      }
    };

    if (SafeVideo && src) {
      return (
        <View style={styles.videoContainer}>
          <SafeVideo
            source={{ uri: src }}
            style={styles.video}
            useNativeControls
            resizeMode={SafeResizeMode?.CONTAIN || "contain"}
            isLooping={false}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.videoFallback}
        onPress={handleOpenVideo}
        activeOpacity={0.8}
      >
        <View style={styles.videoPlayCircle}>
          <Ionicons name="play" size={28} color="#fff" />
        </View>
        <Text style={styles.videoFallbackText}>Tap to play video</Text>
      </TouchableOpacity>
    );
  };

  const renderAudio = () => {
    return <AudioPlayer message={message} isOutbound={isOutbound} />;
  };

  const renderDocument = () => {
    const src = getMediaSrc();
    const fileName = message.fileName || "Document.pdf";
    const ext = fileName.split(".").pop()?.toUpperCase() || "PDF";

    const handleDownloadDocument = async () => {
      if (!src) {
        Alert.alert("Error", "Document URL not available");
        return;
      }

      setDownloadingDoc(true);
      try {
        const cleanFileName = (
          message.fileName || `document-${Date.now()}.${ext.toLowerCase()}`
        ).replace(/[^a-zA-Z0-9._-]/g, "_");

        const targetDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
        const fileUri = `${targetDir}${cleanFileName}`;

        // Check if file is already downloaded
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        let localPath = fileUri;

        if (!fileInfo.exists) {
          const downloadRes = await FileSystem.downloadAsync(src, fileUri);
          localPath = downloadRes.uri;
        }

        // Open directly with Native Document / PDF viewer or Sharing Sheet
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(localPath, {
            mimeType:
              message.mediaMimeType ||
              (ext === "PDF"
                ? "application/pdf"
                : "application/octet-stream"),
            dialogTitle: fileName,
            UTI: ext === "PDF" ? "com.adobe.pdf" : undefined,
          });
        } else {
          Linking.openURL(src).catch(() => {
            Alert.alert("Error", "Cannot open document");
          });
        }
      } catch (err: any) {
        console.error("Document download/open error:", err);
        Linking.openURL(src).catch(() => {
          Alert.alert("Error", "Could not download document");
        });
      } finally {
        setDownloadingDoc(false);
      }
    };

    return (
      <TouchableOpacity
        style={styles.documentContainer}
        onPress={handleDownloadDocument}
        activeOpacity={0.7}
        disabled={downloadingDoc}
      >
        <View style={styles.docIcon}>
          <Ionicons name="document" size={24} color={Colors.primary} />
          {ext ? <Text style={styles.docExt}>{ext.slice(0, 4)}</Text> : null}
        </View>
        <View style={styles.docInfo}>
          <Text style={styles.docName} numberOfLines={2}>
            {fileName}
          </Text>
          <Text style={styles.docMeta}>
            {ext} Document {message.metadata?.size ? `• ${formatFileSize(message.metadata.size)}` : ""}
          </Text>
        </View>
        {downloadingDoc ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons name="download-outline" size={20} color={Colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderLocation = () => {
    let lat = 0;
    let lng = 0;
    let name = "Location";
    let address = "";

    try {
      if (message.mediaUrl?.startsWith("{")) {
        const loc = JSON.parse(message.mediaUrl);
        lat = loc.latitude || 0;
        lng = loc.longitude || 0;
        name = loc.name || "Location";
        address = loc.address || "";
      }
    } catch {
      // ignore
    }

    return (
      <TouchableOpacity
        style={styles.locationContainer}
        onPress={() => {
          const url = `https://www.google.com/maps?q=${lat},${lng}`;
          Linking.openURL(url);
        }}
      >
        <View style={styles.locationMap}>
          <Ionicons name="location" size={32} color={Colors.error} />
        </View>
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{name}</Text>
          {address ? (
            <Text style={styles.locationAddress} numberOfLines={2}>
              {address}
            </Text>
          ) : null}
          <Text style={styles.locationCoords}>
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTemplate = () => {
    let templateName = "";
    let bodyText = message.content;
    let buttons: any[] = [];

    // Try to parse
    if (message.content?.startsWith("Campaign:") || message.content?.startsWith("Template:")) {
      const lines = message.content.split("\n");
      const tplLine = lines.find((l) => l.startsWith("Template:"));
      templateName = tplLine?.replace("Template:", "").trim() || "Template";
      bodyText = message.metadata?.bodyText || bodyText;
      buttons = message.metadata?.buttons || [];
    } else if (message.content?.startsWith("{")) {
      try {
        const p = JSON.parse(message.content);
        templateName = p.templateName || "Template";
        bodyText = p.bodyText || p.body || bodyText;
        buttons = p.buttons || [];
      } catch {
        // ignore
      }
    }

    return (
      <View style={styles.templateContainer}>
        <View style={styles.templateHeader}>
          <Ionicons name="document-text" size={12} color={Colors.primary} />
          <Text style={styles.templateLabel}>
            {templateName.replace(/_/g, " ").toUpperCase()}
          </Text>
        </View>
        <Text style={styles.textContent}>{bodyText}</Text>
        {buttons.length > 0 && (
          <View style={styles.templateButtons}>
            {buttons.map((btn: any, i: number) => (
              <View key={i} style={styles.templateBtn}>
                <Ionicons
                  name={
                    btn.type === "URL"
                      ? "open-outline"
                      : btn.type === "PHONE_NUMBER"
                      ? "call"
                      : "chatbubble-outline"
                  }
                  size={13}
                  color={Colors.primary}
                />
                <Text style={styles.templateBtnText}>{btn.text}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderContent = () => {
    if (isDeleted) {
      return (
        <View style={styles.deletedContainer}>
          <Ionicons
            name="ban"
            size={14}
            color={isOutbound ? "rgba(0,0,0,0.5)" : Colors.textMuted}
          />
          <Text
            style={[
              styles.deletedText,
              isOutbound && { color: "rgba(0,0,0,0.5)" },
            ]}
          >
            This message was deleted
          </Text>
        </View>
      );
    }

    switch (msgType) {
      case "image":
      case "sticker":
        return renderImage();
      case "video":
        return renderVideo();
      case "audio":
      case "voice":
      case "ptt":
        return renderAudio();
      case "document":
        return renderDocument();
      case "location":
        return renderLocation();
      case "template":
        return renderTemplate();
      default:
        return renderText();
    }
  };

  const time = formatMessageTime(message.createdAt || message.timestamp);
  const hasMedia = ["image", "video", "sticker"].includes(msgType);

  return (
    <TouchableOpacity
      onLongPress={showActionSheet}
      activeOpacity={1}
      delayLongPress={300}
      style={[
        styles.wrapper,
        isOutbound ? styles.wrapperRight : styles.wrapperLeft,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isOutbound ? styles.bubbleOutbound : styles.bubbleInbound,
          isGrouped &&
            (isOutbound ? styles.bubbleGroupedRight : styles.bubbleGroupedLeft),
          hasMedia && styles.bubbleMedia,
        ]}
      >
        {renderReplyPreview()}

        {renderContent()}

        {/* Time + Status */}
        {!isDeleted && (
          <View
            style={[
              styles.timeContainer,
              hasMedia && styles.timeContainerMedia,
            ]}
          >
            {message.edited && (
              <Text
                style={[
                  styles.editedText,
                  hasMedia && styles.timeMediaText,
                ]}
              >
                edited
              </Text>
            )}
            {message.isStarred && (
              <Ionicons
                name="star"
                size={11}
                color={hasMedia ? "#fff" : Colors.warning}
              />
            )}
            <Text
              style={[
                styles.timeText,
                isOutbound && !hasMedia
                  ? { color: "rgba(0,0,0,0.5)" }
                  : hasMedia
                  ? { color: "#fff" }
                  : { color: Colors.textMuted },
              ]}
            >
              {time}
            </Text>
            {renderStatus()}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════
// AUDIO PLAYER
// ═══════════════════════════════════

function AudioPlayer({
  message,
  isOutbound,
}: {
  message: Message;
  isOutbound: boolean;
}) {
  const [sound, setSound] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  const getMediaSrc = (): string | null => {
    const url = message.mediaUrl;
    if (!url) return null;
    if (url.includes("cloudinary.com")) return url;
    if (message.mediaId && /^\d+$/.test(message.mediaId.trim())) {
      return `${API_BASE}/inbox/media/${message.mediaId.trim()}`;
    }
    return url;
  };

  const playPause = async () => {
    const src = getMediaSrc();
    if (!src) return;

    if (!SafeAudio) {
      // Fallback if native Audio module not linked in runtime
      Linking.openURL(src).catch(() => {
        Alert.alert("Audio", "Cannot play audio on this device");
      });
      return;
    }

    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }
        setIsPlaying(!isPlaying);
      } else {
        const { sound: newSound } = await SafeAudio.Sound.createAsync(
          { uri: src },
          { shouldPlay: true },
          (status: any) => {
            if (status.isLoaded) {
              setDuration(status.durationMillis || 0);
              setPosition(status.positionMillis || 0);
              setIsPlaying(status.isPlaying);
              if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
              }
            }
          }
        );
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn("Audio play error:", err);
      // Fallback
      Linking.openURL(src).catch(() => {});
    }
  };

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [sound]);

  const format = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <View style={audioStyles.container}>
      <TouchableOpacity
        onPress={playPause}
        style={[
          audioStyles.playBtn,
          { backgroundColor: isOutbound ? "#0A6B5C" : Colors.primary },
        ]}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={18}
          color="#fff"
        />
      </TouchableOpacity>

      <View style={audioStyles.waveform}>
        <View style={audioStyles.waveContainer}>
          {Array.from({ length: 18 }).map((_, i) => {
            const isActive =
              duration > 0 &&
              i / 18 <= position / duration;
            return (
              <View
                key={i}
                style={[
                  audioStyles.waveBar,
                  {
                    height: 6 + Math.abs(Math.sin(i * 0.5)) * 12,
                    backgroundColor: isActive
                      ? isOutbound
                        ? "#0A6B5C"
                        : Colors.primary
                      : isOutbound
                      ? "rgba(0,0,0,0.3)"
                      : Colors.textMuted,
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={audioStyles.timeRow}>
          <Ionicons
            name="mic"
            size={11}
            color={isOutbound ? "rgba(0,0,0,0.5)" : Colors.textMuted}
          />
          <Text
            style={[
              audioStyles.duration,
              {
                color: isOutbound
                  ? "rgba(0,0,0,0.6)"
                  : Colors.textSecondary,
              },
            ]}
          >
            {duration > 0
              ? format(isPlaying ? position : duration)
              : "0:00"}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════
// STYLES
// ═══════════════════════════════════

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 10,
    marginVertical: 2,
    maxWidth: "85%",
  },
  wrapperLeft: {
    alignSelf: "flex-start",
  },
  wrapperRight: {
    alignSelf: "flex-end",
  },

  bubble: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 80,
  },
  bubbleOutbound: {
    backgroundColor: "#DCF8C6",
    borderTopRightRadius: 2,
  },
  bubbleInbound: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 2,
  },
  bubbleGroupedRight: {
    borderTopRightRadius: 12,
    marginTop: 1,
  },
  bubbleGroupedLeft: {
    borderTopLeftRadius: 12,
    marginTop: 1,
  },
  bubbleMedia: {
    padding: 3,
  },

  // Text
  textContent: {
    fontSize: 15,
    color: "#000",
    lineHeight: 20,
    paddingHorizontal: 4,
  },

  // Time
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  timeContainerMedia: {
    position: "absolute",
    bottom: 8,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 0,
  },
  timeText: {
    fontSize: 10,
    fontWeight: "400",
  },
  timeMediaText: {
    color: "#fff",
  },
  editedText: {
    fontSize: 10,
    fontStyle: "italic",
    color: Colors.textMuted,
    marginRight: 2,
  },

  // Deleted
  deletedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  deletedText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: "italic",
  },

  // Reply preview
  replyPreview: {
    flexDirection: "row",
    borderRadius: 6,
    marginBottom: 4,
    overflow: "hidden",
    padding: 6,
    gap: 6,
  },
  replyPreviewOut: {
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  replyPreviewIn: {
    backgroundColor: "#F5F5F5",
  },
  replyBar: {
    width: 3,
    borderRadius: 2,
  },
  replyContent: {
    flex: 1,
  },
  replySender: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 1,
  },
  replyText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Image
  image: {
    width: SCREEN_W * 0.6,
    height: SCREEN_W * 0.6,
    maxWidth: 250,
    maxHeight: 250,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  mediaPlaceholder: {
    width: SCREEN_W * 0.6,
    height: SCREEN_W * 0.6,
    maxWidth: 250,
    maxHeight: 250,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  mediaError: {
    width: 200,
    height: 150,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    gap: 6,
  },
  mediaErrorText: {
    fontSize: 12,
    color: "#666",
  },

  // Fullscreen
  fullscreenModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeFullscreen: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: SCREEN_W,
    height: SCREEN_H,
  },

  // Video
  videoContainer: {
    width: SCREEN_W * 0.6,
    maxWidth: 250,
    height: SCREEN_W * 0.45,
    maxHeight: 180,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  videoFallback: {
    width: SCREEN_W * 0.6,
    maxWidth: 240,
    height: 140,
    backgroundColor: "#1F2937",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  videoPlayCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 4,
  },
  videoFallbackText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  // Document
  documentContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    minWidth: 240,
    gap: 10,
  },
  docIcon: {
    width: 44,
    height: 48,
    borderRadius: 8,
    backgroundColor: "rgba(37,211,102,0.1)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  docExt: {
    position: "absolute",
    bottom: 4,
    fontSize: 8,
    fontWeight: "800",
    color: Colors.primary,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  docMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  // Location
  locationContainer: {
    width: 220,
  },
  locationMap: {
    height: 120,
    backgroundColor: "#E5F5E9",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  locationInfo: {
    padding: 4,
  },
  locationName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000",
  },
  locationAddress: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  locationCoords: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  // Template
  templateContainer: {
    minWidth: 250,
  },
  templateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  templateLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  templateButtons: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    paddingTop: 6,
  },
  templateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    gap: 6,
    borderRadius: 6,
  },
  templateBtnText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
  },
});

const audioStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 6,
    minWidth: 220,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  waveform: {
    flex: 1,
  },
  waveContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 24,
    gap: 2,
  },
  waveBar: {
    width: 2,
    borderRadius: 1,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  duration: {
    fontSize: 10,
  },
});
