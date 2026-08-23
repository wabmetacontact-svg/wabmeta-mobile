// src/components/campaigns/steps/StepAudience.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constants/colors";
import { CampaignFormData } from "../../../types/campaign";

interface Props {
  formData: CampaignFormData;
  setFormData: React.Dispatch<React.SetStateAction<CampaignFormData>>;
  contacts: any[];
  availableTags: string[];
  groups: any[];
  totalAllContacts: number;
  totalRecipients: number;
}

const AUDIENCE_TYPES = [
  {
    value: "all" as const,
    label: "All Contacts",
    icon: "people" as const,
    color: Colors.info,
    description: "Send to all active contacts",
  },
  {
    value: "tags" as const,
    label: "By Tags",
    icon: "pricetags" as const,
    color: Colors.warning,
    description: "Filter by contact tags",
  },
  {
    value: "group" as const,
    label: "Contact Group",
    icon: "folder" as const,
    color: "#8B5CF6",
    description: "Send to specific group",
  },
  {
    value: "manual" as const,
    label: "Select Manually",
    icon: "person-add" as const,
    color: Colors.success,
    description: "Pick individual contacts",
  },
];

export function StepAudience({
  formData,
  setFormData,
  contacts,
  availableTags,
  groups,
  totalAllContacts,
  totalRecipients,
}: Props) {
  const [contactSearch, setContactSearch] = useState("");

  const filteredContacts = contactSearch
    ? contacts.filter(
        (c) =>
          c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
          c.phone?.includes(contactSearch)
      )
    : contacts;

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Audience</Text>
        <Text style={styles.sectionSubtitle}>
          Choose who will receive this campaign
        </Text>
      </View>

      {/* Recipients Count */}
      <View style={styles.countCard}>
        <View style={styles.countIcon}>
          <Ionicons name="people" size={20} color={Colors.primary} />
        </View>
        <View style={styles.countContent}>
          <Text style={styles.countValue}>
            {totalRecipients.toLocaleString("en-IN")}
          </Text>
          <Text style={styles.countLabel}>Recipients selected</Text>
        </View>
      </View>

      {/* Audience Type */}
      <Text style={styles.label}>Audience Type</Text>
      <View style={styles.typesList}>
        {AUDIENCE_TYPES.map((type) => {
          const isSelected = formData.audienceType === type.value;
          return (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeCard,
                isSelected && styles.typeCardActive,
              ]}
              onPress={() =>
                setFormData((f) => ({ ...f, audienceType: type.value }))
              }
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.typeIcon,
                  { backgroundColor: `${type.color}15` },
                ]}
              >
                <Ionicons name={type.icon} size={20} color={type.color} />
              </View>
              <View style={styles.typeContent}>
                <Text style={styles.typeLabel}>{type.label}</Text>
                <Text style={styles.typeDesc}>{type.description}</Text>
              </View>
              <View
                style={[
                  styles.radio,
                  isSelected && styles.radioActive,
                ]}
              >
                {isSelected && (
                  <View style={styles.radioDot} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Type-specific selectors */}
      {formData.audienceType === "all" && (
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={16} color={Colors.info} />
          <Text style={styles.infoText}>
            Will send to all {totalAllContacts.toLocaleString("en-IN")} active
            contacts
          </Text>
        </View>
      )}

      {formData.audienceType === "tags" && (
        <View style={styles.subSection}>
          <Text style={styles.label}>Select Tags</Text>
          {availableTags.length === 0 ? (
            <Text style={styles.emptyText}>
              No tags found. Add tags to contacts first.
            </Text>
          ) : (
            <View style={styles.tagsRow}>
              {availableTags.map((tag) => {
                const isSelected = formData.selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagChip,
                      isSelected && styles.tagChipActive,
                    ]}
                    onPress={() =>
                      setFormData((f) => ({
                        ...f,
                        selectedTags: isSelected
                          ? f.selectedTags.filter((t) => t !== tag)
                          : [...f.selectedTags, tag],
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.tagText,
                        isSelected && styles.tagTextActive,
                      ]}
                    >
                      {tag}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {formData.audienceType === "group" && (
        <View style={styles.subSection}>
          <Text style={styles.label}>Select Group</Text>
          {groups.length === 0 ? (
            <Text style={styles.emptyText}>No groups created yet</Text>
          ) : (
            <View style={styles.groupsList}>
              {groups.map((group) => {
                const isSelected = formData.selectedGroup === group.id;
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.groupItem,
                      isSelected && styles.groupItemActive,
                    ]}
                    onPress={() =>
                      setFormData((f) => ({
                        ...f,
                        selectedGroup: isSelected ? "" : group.id,
                      }))
                    }
                  >
                    <View
                      style={[
                        styles.groupDot,
                        { backgroundColor: group.color || Colors.primary },
                      ]}
                    />
                    <View style={styles.groupContent}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupCount}>
                        {group.contactCount || 0} contacts
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkBadgeSmall}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {formData.audienceType === "manual" && (
        <View style={styles.subSection}>
          <Text style={styles.label}>
            Select Contacts ({formData.selectedContacts.length} selected)
          </Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={contactSearch}
              onChangeText={setContactSearch}
              placeholder="Search contacts..."
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <ScrollView style={styles.contactsList} nestedScrollEnabled>
            {filteredContacts.slice(0, 100).map((contact) => {
              const isSelected = formData.selectedContacts.includes(contact.id);
              return (
                <TouchableOpacity
                  key={contact.id}
                  style={styles.contactItem}
                  onPress={() =>
                    setFormData((f) => ({
                      ...f,
                      selectedContacts: isSelected
                        ? f.selectedContacts.filter((id) => id !== contact.id)
                        : [...f.selectedContacts, contact.id],
                    }))
                  }
                >
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxActive,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    )}
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
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
  subSection: {
    marginTop: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 10,
  },

  countCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.primary}10`,
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  countIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}20`,
    justifyContent: "center",
    alignItems: "center",
  },
  countContent: { flex: 1 },
  countValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.primary,
  },
  countLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  typesList: { gap: 8, marginBottom: 16 },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  typeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  typeContent: { flex: 1 },
  typeLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  typeDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },

  infoCard: {
    flexDirection: "row",
    backgroundColor: `${Colors.info}10`,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  emptyText: {
    padding: 20,
    textAlign: "center",
    color: Colors.textMuted,
    fontSize: 13,
  },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 4,
  },
  tagChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  tagTextActive: {
    color: "#fff",
  },

  groupsList: { gap: 8 },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  groupItemActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  groupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  groupContent: { flex: 1 },
  groupName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  groupCount: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkBadgeSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    padding: 0,
  },
  contactsList: {
    maxHeight: 300,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  contactInfo: { flex: 1 },
  contactName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  contactPhone: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
