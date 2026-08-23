// src/components/templates/TemplatePreview.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { Template } from "../../types/template";

interface Props {
  template: Partial<Template>;
  sampleVariables?: Record<string, string>;
}

export function TemplatePreview({
  template,
  sampleVariables = {},
}: Props) {
  const [imgError, setImgError] = useState(false);

  const replaceVars = (text?: string | null): string => {
    if (!text) return "";
    return text.replace(/\{\{(\d+)\}\}/g, (_, num) => {
      return sampleVariables[num] || `[${num}]`;
    });
  };

  const getMediaUrl = (): string | null => {
    if (!template.headerContent) return null;
    if (template.headerContent.startsWith("http")) return template.headerContent;
    return null;
  };

  const buttons = template.buttons || [];
  const mediaUrl = getMediaUrl();

  return (
    <View style={styles.container}>
      {/* Phone Frame */}
      <View style={styles.phoneFrame}>
        {/* WhatsApp Header */}
        <View style={styles.waHeader}>
          <View style={styles.waAvatar}>
            <Ionicons name="business" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.waName}>Your Business</Text>
            <Text style={styles.waStatus}>Online</Text>
          </View>
        </View>

        {/* Chat Background */}
        <View style={styles.chatBg}>
          {/* Message Bubble */}
          <View style={styles.bubble}>
            {/* Header */}
            {template.headerType && template.headerType !== "NONE" && (
              <View style={styles.headerWrap}>
                {template.headerType === "IMAGE" && mediaUrl && !imgError && (
                  <Image
                    source={{ uri: mediaUrl }}
                    style={styles.headerImage}
                    onError={() => setImgError(true)}
                  />
                )}
                {template.headerType === "IMAGE" && (!mediaUrl || imgError) && (
                  <View style={styles.headerPlaceholder}>
                    <Ionicons name="image" size={40} color="#999" />
                    <Text style={styles.placeholderText}>Image</Text>
                  </View>
                )}

                {template.headerType === "VIDEO" && (
                  <View style={styles.videoPlaceholder}>
                    <View style={styles.playButton}>
                      <Ionicons name="play" size={24} color="#fff" />
                    </View>
                    <Text style={styles.placeholderText}>Video</Text>
                  </View>
                )}

                {template.headerType === "DOCUMENT" && (
                  <View style={styles.docPreview}>
                    <View style={styles.docIcon}>
                      <Ionicons name="document" size={20} color={Colors.error} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docName}>Document</Text>
                      <Text style={styles.docType}>PDF</Text>
                    </View>
                  </View>
                )}

                {template.headerType === "TEXT" && template.headerContent && (
                  <View style={styles.textHeader}>
                    <Text style={styles.textHeaderText}>
                      {replaceVars(template.headerContent)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Body */}
            <View style={styles.bodyWrap}>
              <Text style={styles.bodyText}>
                {replaceVars(template.bodyText) ||
                  "Your message body will appear here..."}
              </Text>

              {template.footerText && (
                <Text style={styles.footerText}>{template.footerText}</Text>
              )}

              <View style={styles.timeRow}>
                <Text style={styles.timeText}>12:00 PM</Text>
                <Ionicons name="checkmark-done" size={14} color="#53BDEB" />
              </View>
            </View>

            {/* Buttons */}
            {buttons.length > 0 && (
              <View style={styles.buttonsWrap}>
                {buttons.map((btn, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.actionButton,
                      i < buttons.length - 1 && styles.buttonBorder,
                    ]}
                  >
                    {btn.type === "URL" && (
                      <Ionicons
                        name="open-outline"
                        size={14}
                        color="#00A884"
                      />
                    )}
                    {btn.type === "PHONE_NUMBER" && (
                      <Ionicons name="call" size={14} color="#00A884" />
                    )}
                    {btn.type === "QUICK_REPLY" && (
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={14}
                        color="#00A884"
                      />
                    )}
                    <Text style={styles.buttonLabel}>{btn.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  phoneFrame: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#0B141A",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 6,
    borderColor: "#0B141A",
  },
  waHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#1F2C34",
    gap: 10,
  },
  waAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6B7280",
    justifyContent: "center",
    alignItems: "center",
  },
  waName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  waStatus: {
    color: "#8696A0",
    fontSize: 11,
  },

  chatBg: {
    backgroundColor: "#0B141A",
    padding: 12,
    minHeight: 400,
  },

  bubble: {
    alignSelf: "flex-end",
    maxWidth: "90%",
    backgroundColor: "#005C4B",
    borderRadius: 8,
    overflow: "hidden",
  },

  // Header
  headerWrap: {
    padding: 3,
  },
  headerImage: {
    width: "100%",
    height: 150,
    borderRadius: 6,
  },
  headerPlaceholder: {
    height: 150,
    backgroundColor: "#0B141A",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  placeholderText: {
    color: "#8696A0",
    fontSize: 11,
    fontWeight: "600",
  },
  videoPlaceholder: {
    height: 150,
    backgroundColor: "#000",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  docPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#1F2C34",
    borderRadius: 6,
    gap: 10,
  },
  docIcon: {
    width: 36,
    height: 40,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  docName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  docType: {
    color: "#8696A0",
    fontSize: 10,
    marginTop: 2,
  },
  textHeader: {
    padding: 10,
    paddingBottom: 6,
  },
  textHeaderText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Body
  bodyWrap: {
    padding: 10,
    paddingTop: 6,
  },
  bodyText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 19,
  },
  footerText: {
    color: "#8696A0",
    fontSize: 12,
    marginTop: 6,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    color: "#8696A0",
    fontSize: 10,
  },

  // Buttons
  buttonsWrap: {
    backgroundColor: "#005C4B",
    borderTopWidth: 1,
    borderTopColor: "#0A3D33",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  buttonBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#0A3D33",
  },
  buttonLabel: {
    color: "#00A884",
    fontSize: 13,
    fontWeight: "700",
  },
});
