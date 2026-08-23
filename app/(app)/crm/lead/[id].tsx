// app/(app)/crm/lead/[id].tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { crm as crmApi } from "../../../../src/services/api";
import { Colors } from "../../../../src/constants/colors";

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"notes" | "tasks" | "activity">("notes");
  
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (id) fetchLead();
  }, [id]);

  const fetchLead = async () => {
    try {
      const res = await crmApi.getLeadById(id!);
      if (res?.data?.success) {
        setLead(res.data.data);
      } else {
        // No fabricated lead: treat an unsuccessful response as a load failure.
        Alert.alert("Error", "Failed to load lead details");
        router.back();
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load lead details");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (stageId: string) => {
    try {
      await crmApi.updateLead(id!, { stageId });
      fetchLead();
    } catch {
      Alert.alert("Error", "Failed to update stage");
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await crmApi.addLeadNote(id!, newNote);
      setNewNote("");
      fetchLead();
    } catch {
      Alert.alert("Error", "Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const handleWhatsApp = () => {
    if (lead?.contact?.phone) {
      const phone = lead.contact.phone.replace(/[^0-9]/g, "");
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!lead) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{lead.title}</Text>
        <TouchableOpacity onPress={handleWhatsApp} style={styles.iconBtn}>
          <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.leadTitle}>{lead.title}</Text>
          {lead.contact && (
            <View style={styles.contactInfo}>
              <View style={styles.contactRow}>
                <Ionicons name="person" size={14} color={Colors.textMuted} />
                <Text style={styles.contactText}>
                  {lead.contact.firstName || ""} {lead.contact.lastName || ""}
                </Text>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="call" size={14} color={Colors.textMuted} />
                <Text style={styles.contactText}>{lead.contact.phone}</Text>
              </View>
            </View>
          )}

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Value</Text>
              <Text style={styles.metaValue}>₹{lead.value?.toLocaleString("en-IN") || "0"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Priority</Text>
              <Text style={[styles.metaValue, { color: lead.priority === "URGENT" ? Colors.error : Colors.textPrimary }]}>
                {lead.priority}
              </Text>
            </View>
          </View>

          {/* Stage Selector */}
          <Text style={styles.metaLabel}>Pipeline Stage</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stagesScroll}>
            {lead.pipeline?.stages?.map((stage: any) => (
              <TouchableOpacity
                key={stage.id}
                style={[
                  styles.stageChip,
                  lead.stageId === stage.id && { backgroundColor: stage.color || Colors.primary, borderColor: stage.color || Colors.primary }
                ]}
                onPress={() => handleStageChange(stage.id)}
              >
                <Text style={[
                  styles.stageText,
                  lead.stageId === stage.id && { color: "#fff" }
                ]}>
                  {stage.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tabs */}
        <View style={styles.tabsHeader}>
          {(["notes", "tasks", "activity"] as const).map(t => (
            <TouchableOpacity 
              key={t}
              style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === "notes" && (
            <View>
              <View style={styles.addNoteBox}>
                <TextInput
                  style={styles.noteInput}
                  value={newNote}
                  onChangeText={setNewNote}
                  placeholder="Add a note..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />
                <TouchableOpacity style={styles.sendNoteBtn} onPress={handleAddNote} disabled={addingNote}>
                  {addingNote ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={16} color="#fff" />}
                </TouchableOpacity>
              </View>

              {lead.notes?.map((n: any) => (
                <View key={n.id} style={styles.noteCard}>
                  <Text style={styles.noteText}>{n.content}</Text>
                  <Text style={styles.noteTime}>{new Date(n.createdAt).toLocaleString("en-IN")}</Text>
                </View>
              ))}
            </View>
          )}

          {activeTab === "activity" && (
            <View style={styles.activityList}>
              {lead.activities?.map((a: any) => (
                <View key={a.id} style={styles.activityItem}>
                  <View style={styles.activityDot} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{a.title}</Text>
                    <Text style={styles.activityTime}>{new Date(a.createdAt).toLocaleString("en-IN")}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === "tasks" && (
            <Text style={{ textAlign: "center", color: Colors.textMuted, padding: 20 }}>Tasks coming soon in mobile</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  iconBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "800", textAlign: "center", color: Colors.textPrimary },

  infoCard: { backgroundColor: Colors.surface, padding: 20, marginBottom: 10 },
  leadTitle: { fontSize: 20, fontWeight: "800", marginBottom: 12, color: Colors.textPrimary },
  contactInfo: { flexDirection: "row", gap: 16, marginBottom: 16 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  contactText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },
  
  metaGrid: { flexDirection: "row", gap: 16, paddingVertical: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight, marginBottom: 10 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 11, color: Colors.textMuted, textTransform: "uppercase", fontWeight: "700", marginBottom: 4 },
  metaValue: { fontSize: 16, fontWeight: "800", color: Colors.primary },

  stagesScroll: { marginTop: 4, paddingBottom: 8 },
  stageChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.borderLight, marginRight: 8, backgroundColor: Colors.surfaceSecondary },
  stageText: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary },

  tabsHeader: { flexDirection: "row", backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabBtnActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: Colors.textMuted },
  tabTextActive: { color: Colors.primary, fontWeight: "700" },

  tabContent: { padding: 16 },

  addNoteBox: { flexDirection: "row", gap: 10, marginBottom: 20 },
  noteInput: { flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 60, textAlignVertical: "top", color: Colors.textPrimary },
  sendNoteBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", alignSelf: "flex-end" },
  
  noteCard: { backgroundColor: Colors.surface, padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight },
  noteText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  noteTime: { fontSize: 10, color: Colors.textMuted, marginTop: 8 },

  activityList: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16 },
  activityItem: { flexDirection: "row", gap: 12, marginBottom: 16 },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.info, marginTop: 6 },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
  activityTime: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
