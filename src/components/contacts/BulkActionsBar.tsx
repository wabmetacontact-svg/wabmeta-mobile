// src/components/contacts/BulkActionsBar.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";

interface Props {
  count: number;
  onDelete: () => void;
  onCancel: () => void;
}

export function BulkActionsBar({ count, onDelete, onCancel }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
        <Ionicons name="trash" size={20} color={Colors.error} />
        <Text style={[styles.actionText, { color: Colors.error }]}>Delete</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionBtn}>
        <Ionicons name="folder" size={20} color={Colors.info} />
        <Text style={[styles.actionText, { color: Colors.info }]}>Group</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionBtn}>
        <Ionicons name="pricetag" size={20} color={Colors.warning} />
        <Text style={[styles.actionText, { color: Colors.warning }]}>Tag</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionBtn}>
        <Ionicons name="download" size={20} color={Colors.primary} />
        <Text style={[styles.actionText, { color: Colors.primary }]}>
          Export
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingVertical: 10,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    padding: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
