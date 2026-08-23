// src/components/chatbot/NodeConfigSheet.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { FlowNode, NODE_TYPE_CONFIGS } from "../../types/chatbot";

// Node-specific config editors
import { MessageNodeConfig } from "./configs/MessageNodeConfig";
import { ButtonNodeConfig } from "./configs/ButtonNodeConfig";
import { ListNodeConfig } from "./configs/ListNodeConfig";
import { AiNodeConfig } from "./configs/AiNodeConfig";
import { ConditionNodeConfig } from "./configs/ConditionNodeConfig";
import { DelayNodeConfig } from "./configs/DelayNodeConfig";
import { ActionNodeConfig } from "./configs/ActionNodeConfig";
import { StartNodeConfig } from "./configs/StartNodeConfig";
import { EndNodeConfig } from "./configs/EndNodeConfig";

interface Props {
  visible: boolean;
  node: FlowNode;
  onUpdate: (data: any) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function NodeConfigSheet({
  visible,
  node,
  onUpdate,
  onDelete,
  onClose,
}: Props) {
  const [localData, setLocalData] = useState(node.data);

  useEffect(() => {
    setLocalData(node.data);
  }, [node.id, node.data]);

  const config = NODE_TYPE_CONFIGS.find((c) => c.type === node.type);
  if (!config) return null;

  const handleUpdate = (newData: any) => {
    setLocalData(newData);
    onUpdate(newData);
  };

  const renderNodeConfig = () => {
    switch (node.type) {
      case "start":
        return <StartNodeConfig data={localData} onChange={handleUpdate} />;
      case "message":
        return <MessageNodeConfig data={localData} onChange={handleUpdate} />;
      case "button":
        return <ButtonNodeConfig data={localData} onChange={handleUpdate} />;
      case "list":
        return <ListNodeConfig data={localData} onChange={handleUpdate} />;
      case "ai":
        return <AiNodeConfig data={localData} onChange={handleUpdate} />;
      case "condition":
        return <ConditionNodeConfig data={localData} onChange={handleUpdate} />;
      case "delay":
        return <DelayNodeConfig data={localData} onChange={handleUpdate} />;
      case "action":
        return <ActionNodeConfig data={localData} onChange={handleUpdate} />;
      case "end":
        return <EndNodeConfig data={localData} onChange={handleUpdate} />;
      default:
        return null;
    }
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

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerIcon,
                  { backgroundColor: `${config.color}15` },
                ]}
              >
                <Ionicons
                  name={config.icon as any}
                  size={20}
                  color={config.color}
                />
              </View>
              <View>
                <Text style={styles.title}>{config.label}</Text>
                <Text style={styles.subtitle}>{config.description}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Config */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.content}
          >
            {renderNodeConfig()}
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.bottomBar}>
            {onDelete && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => {
                  Alert.alert("Delete Node", "Are you sure?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        onDelete();
                        onClose();
                      },
                    },
                  ]);
                }}
              >
                <Ionicons name="trash" size={16} color={Colors.error} />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
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
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
    maxHeight: "90%",
    minHeight: "60%",
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
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },

  content: {
    flex: 1,
  },

  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: `${Colors.error}15`,
    gap: 6,
  },
  deleteBtnText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: "700",
  },
  doneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    gap: 6,
  },
  doneBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
