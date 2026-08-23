import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/context/AuthContext";
import { Avatar } from "../../../src/components/common/Avatar";
import { Colors } from "../../../src/constants/colors";

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out of WabMeta?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => logout() }
    ]);
  };

  const SETTINGS_SECTIONS = [
    {
      title: "Business & Integrations",
      items: [
        { icon: "logo-whatsapp" as const, label: "WhatsApp Connection", route: "/(app)/settings/whatsapp", color: "#25D366" },
        { icon: "chatbubble-ellipses-outline" as const, label: "Chatbot & AI", route: "/(app)/chatbot" },
        { icon: "flash-outline" as const, label: "Automation Workflows", route: "/(app)/automation" },
        { icon: "document-text-outline" as const, label: "Message Templates", route: "/(app)/templates" },
        { icon: "people-circle-outline" as const, label: "Team Members", route: "/(app)/team" },
      ]
    },
    {
      title: "Billing & Finance",
      items: [
        { icon: "wallet-outline" as const, label: "Wallet & Credits", route: "/(app)/wallet" },
        { icon: "receipt-outline" as const, label: "Invoices & Plans", route: "/(app)/billing" },
      ]
    },
    {
      title: "Account",
      items: [
        { icon: "person-outline" as const, label: "Profile Information", route: "/(app)/profile" },
        { icon: "stats-chart-outline" as const, label: "Reports & Analytics", route: "/(app)/reports" },
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <TouchableOpacity style={styles.profileCard} onPress={() => router.push("/(app)/profile")}>
          <Avatar name={user?.name || "User"} source={user?.avatar} size={60} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || "Business User"}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileRole}>Role: {user?.role || "Admin"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        {SETTINGS_SECTIONS.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, itemIdx) => (
                <TouchableOpacity
                  key={itemIdx}
                  style={[styles.itemRow, itemIdx < section.items.length - 1 && styles.itemBorder]}
                  onPress={() => router.push(item.route as any)}
                >
                  <Ionicons name={item.icon} size={22} color={(item as any).color || Colors.primary} style={styles.itemIcon} />
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: Colors.surface },
  headerTitle: { fontSize: 24, fontWeight: "700", color: Colors.textPrimary },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  profileInfo: { flex: 1, marginLeft: 14 },
  profileName: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  profileEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  profileRole: { fontSize: 12, color: Colors.primary, fontWeight: "600", marginTop: 4 },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, overflow: "hidden" },
  itemRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  itemIcon: { marginRight: 12 },
  itemLabel: { flex: 1, fontSize: 15, color: Colors.textPrimary, fontWeight: "500" },
  logoutBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.error + "30",
  },
  logoutText: { color: Colors.error, fontSize: 16, fontWeight: "600" },
});
