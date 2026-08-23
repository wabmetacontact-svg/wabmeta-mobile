// app/(app)/crm/new.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { crm as crmApi, contacts as contactsApi } from "../../../src/services/api";
import { Colors } from "../../../src/constants/colors";

export default function CreateLeadScreen() {
  const [loading, setLoading] = useState(false);
  const [pipelines, setPipelines] = useState<any[]>([]);
  
  // Search contacts
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: "",
    value: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    source: "",
  });

  useEffect(() => {
    crmApi.getPipelines().then(res => {
      if (res?.data?.success) {
        setPipelines(res.data.data || []);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (search.length > 2) {
      contactsApi.getAll({ search, limit: 10 }).then(res => {
        if (res?.data?.success) {
          const cdata = res.data.data as any;
          setContacts(Array.isArray(cdata) ? cdata : cdata?.contacts || []);
        }
      }).catch(() => {});
    } else {
      setContacts([]);
    }
  }, [search]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert("Error", "Title is required");
      return;
    }

    setLoading(true);
    try {
      await crmApi.createLead({
        title: formData.title,
        value: formData.value ? parseFloat(formData.value) : undefined,
        priority: formData.priority,
        source: formData.source || undefined,
        contactId: selectedContact?.id,
        pipelineId: pipelines[0]?.id, // Auto assign to default
      });
      Alert.alert("Success", "Lead created successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to create lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Lead</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Lead Title *</Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(v) => setFormData({ ...formData, title: v })}
            placeholder="e.g. Website Design Project"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Contact Link */}
        <View style={styles.field}>
          <Text style={styles.label}>Link Contact (Optional)</Text>
          
          {selectedContact ? (
            <View style={styles.selectedContact}>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>
                  {selectedContact.firstName || ""} {selectedContact.lastName || selectedContact.name || "Contact"}
                </Text>
                <Text style={styles.contactPhone}>{selectedContact.phone}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedContact(null)}>
                <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search contacts by name or phone..."
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          )}

          {search.length > 2 && contacts.length > 0 && !selectedContact && (
            <View style={styles.searchResults}>
              {contacts.map((c: any) => (
                <TouchableOpacity 
                  key={c.id} 
                  style={styles.searchItem}
                  onPress={() => { setSelectedContact(c); setSearch(""); }}
                >
                  <Text style={styles.searchName}>{c.firstName || ""} {c.lastName || c.name || "Contact"}</Text>
                  <Text style={styles.searchPhone}>{c.phone}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Value */}
        <View style={styles.field}>
          <Text style={styles.label}>Deal Value (₹)</Text>
          <TextInput
            style={styles.input}
            value={formData.value}
            onChangeText={(v) => setFormData({ ...formData, value: v.replace(/[^0-9.]/g, "") })}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Priority */}
        <View style={styles.field}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityRow}>
            {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.priorityBtn, formData.priority === p && styles.priorityBtnActive]}
                onPress={() => setFormData({ ...formData, priority: p })}
              >
                <Text style={[styles.priorityText, formData.priority === p && styles.priorityTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveText: { color: "#fff", fontWeight: "700" },
  
  content: { padding: 20 },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 10, padding: 14, fontSize: 15, color: Colors.textPrimary },
  
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 10, paddingHorizontal: 12 },
  searchInput: { flex: 1, padding: 14, fontSize: 15, color: Colors.textPrimary },
  searchResults: { backgroundColor: Colors.surface, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: Colors.borderLight, overflow: "hidden", maxHeight: 200 },
  searchItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  searchName: { fontWeight: "600", fontSize: 14, color: Colors.textPrimary },
  searchPhone: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  
  selectedContact: { flexDirection: "row", alignItems: "center", backgroundColor: `${Colors.success}10`, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: `${Colors.success}30` },
  contactName: { fontWeight: "700", color: Colors.textPrimary },
  contactPhone: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  priorityRow: { flexDirection: "row", gap: 8 },
  priorityBtn: { flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: Colors.surfaceSecondary, borderRadius: 8, borderWidth: 1, borderColor: Colors.borderLight },
  priorityBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  priorityText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  priorityTextActive: { color: "#fff" },
});
