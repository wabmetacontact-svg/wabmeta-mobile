// src/components/chatbot/FlowNodeItem.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { FlowNode, NODE_TYPE_CONFIGS } from "../../types/chatbot";

interface Props {
  node: FlowNode;
  onPress: () => void;
  onDelete?: () => void;
}

export function FlowNodeItem({ node, onPress, onDelete }: Props) {
  const config = NODE_TYPE_CONFIGS.find((c) => c.type === node.type);
  if (!config) return null;

  const renderPreview = () => {
    switch (node.type) {
      case "start":
        return (
          <Text style={styles.previewText}>
            Bot starts here
          </Text>
        );
      case "message":
        return (
          <Text style={styles.previewText} numberOfLines={2}>
            {node.data.message || "No message set"}
          </Text>
        );
      case "button":
        return (
          <View>
            <Text style={styles.previewText} numberOfLines={1}>
              {node.data.message || "No question"}
            </Text>
            <View style={styles.buttonsPreview}>
              {(node.data.buttons || []).slice(0, 3).map((btn, i) => (
                <View key={i} style={styles.btnPreview}>
                  <Text style={styles.btnPreviewText} numberOfLines={1}>
                    {btn.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      case "list":
        const totalRows =
          node.data.listSections?.reduce(
            (sum, s) => sum + (s.rows?.length || 0),
            0
          ) || 0;
        return (
          <View>
            <Text style={styles.previewText} numberOfLines={1}>
              {node.data.message || "List menu"}
            </Text>
            <Text style={styles.previewSubtext}>{totalRows} options</Text>
          </View>
        );
      case "ai":
        return (
          <Text style={styles.previewText} numberOfLines={2}>
            {node.data.systemPrompt || "AI-powered response"}
          </Text>
        );
      case "condition":
        return (
          <Text style={styles.previewText}>
            {node.data.condition?.type === "keyword" &&
              `Keyword: "${node.data.condition.value || "..."}"`}
            {node.data.condition?.type === "exact" &&
              `Exact: "${node.data.condition.value || "..."}"`}
            {node.data.condition?.type === "contains" &&
              `Contains: "${node.data.condition.value || "..."}"`}
          </Text>
        );
      case "delay":
        return (
          <Text style={styles.previewText}>
            Wait {node.data.delay || 0} seconds
          </Text>
        );
      case "action":
        return (
          <Text style={styles.previewText}>
            {node.data.action?.type === "tag" && "Add tag"}
            {node.data.action?.type === "assign" && "Assign to agent"}
            {node.data.action?.type === "webhook" && "Call webhook"}
            {node.data.action?.type === "variable" && "Set variable"}
          </Text>
        );
      case "end":
        return (
          <Text style={styles.previewText}>Close conversation</Text>
        );
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View style={[styles.iconBox, { backgroundColor: `${config.color}15` }]}>
        <Ionicons
          name={config.icon as any}
          size={20}
          color={config.color}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{config.label}</Text>
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
              <Ionicons name="close" size={14} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>
        {renderPreview()}
      </View>

      {/* Chevron */}
      <Ionicons
        name="chevron-forward"
        size={18}
        color={Colors.textMuted}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    minWidth: 300,
    maxWidth: 400,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${Colors.error}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  previewText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  previewSubtext: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  buttonsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  btnPreview: {
    backgroundColor: `${Colors.primary}10`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 100,
  },
  btnPreviewText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: "600",
  },
});
