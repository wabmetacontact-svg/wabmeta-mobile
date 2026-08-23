// src/components/contacts/ContactActionsSheet.tsx
import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { Contact } from "../../types/contact";

interface Props {
  visible: boolean;
  contact: Contact | null;
  onClose: () => void;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
  onMessage?: (contact: Contact) => void;
}

export function ContactActionsSheet({
  visible,
  contact,
  onClose,
  onEdit,
  onDelete,
  onMessage,
}: Props) {
  if (!contact) return null;

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
          <Text style={styles.title}>{contact.fullName || contact.phone}</Text>
          <Text style={styles.phone}>{contact.fullPhone || contact.phone}</Text>

          <View style={styles.actionsList}>
            {onMessage && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  onMessage(contact);
                }}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.actionText}>Send Message</Text>
              </TouchableOpacity>
            )}

            {onEdit && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  onEdit(contact);
                }}
              >
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={Colors.info}
                />
                <Text style={styles.actionText}>Edit Contact</Text>
              </TouchableOpacity>
            )}

            {onDelete && (
              <TouchableOpacity
                style={[styles.actionItem, styles.deleteItem]}
                onPress={() => {
                  onClose();
                  onDelete(contact);
                }}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
                <Text style={[styles.actionText, { color: Colors.error }]}>
                  Delete Contact
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
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
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  phone: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 20,
  },
  actionsList: {
    gap: 4,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    gap: 12,
  },
  deleteItem: {
    backgroundColor: `${Colors.error}10`,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
});
