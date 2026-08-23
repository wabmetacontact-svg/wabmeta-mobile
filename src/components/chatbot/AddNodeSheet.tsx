// src/components/chatbot/AddNodeSheet.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { NodeType, NODE_TYPE_CONFIGS } from "../../types/chatbot";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: NodeType) => void;
}

export function AddNodeSheet({ visible, onClose, onSelect }: Props) {
  const categories = {
    message: NODE_TYPE_CONFIGS.filter((c) => c.category === "message"),
    logic: NODE_TYPE_CONFIGS.filter((c) => c.category === "logic"),
    action: NODE_TYPE_CONFIGS.filter((c) => c.category === "action"),
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Add Node</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Message Nodes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💬 Send Messages</Text>
              {categories.message.map((config) => (
                <NodeOption
                  key={config.type}
                  config={config}
                  onPress={() => onSelect(config.type)}
                />
              ))}
            </View>

            {/* Logic Nodes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔀 Logic & Flow</Text>
              {categories.logic.map((config) => (
                <NodeOption
                  key={config.type}
                  config={config}
                  onPress={() => onSelect(config.type)}
                />
              ))}
            </View>

            {/* Action Nodes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚡ Actions</Text>
              {categories.action.map((config) => (
                <NodeOption
                  key={config.type}
                  config={config}
                  onPress={() => onSelect(config.type)}
                />
              ))}
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function NodeOption({
  config,
  onPress,
}: {
  config: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.option}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.optionIcon, { backgroundColor: `${config.color}15` }]}>
        <Ionicons name={config.icon} size={22} color={config.color} />
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionLabel}>{config.label}</Text>
        <Text style={styles.optionDesc}>{config.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
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
    maxHeight: "85%",
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
  },
  title: {
    fontSize: 20,
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionContent: { flex: 1 },
  optionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  optionDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
