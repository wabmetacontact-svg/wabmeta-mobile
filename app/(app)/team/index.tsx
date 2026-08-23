// app/(app)/team/index.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../src/constants/colors";
import { useAuth } from "../../../src/context/AuthContext";

export default function TeamScreen() {
  const { user } = useAuth();

  const teamMembers = [
    {
      id: "1",
      name: user?.name || `${user?.firstName || "Sameer"} ${user?.lastName || "Thakur"}`.trim(),
      email: user?.email || "sameer@wabmeta.com",
      role: "OWNER",
      isMe: true,
    },
    { id: "2", name: "Ankit Singh", email: "ankit@wabmeta.com", role: "ADMIN", isMe: false },
    { id: "3", name: "Support Team", email: "support@wabmeta.com", role: "MEMBER", isMe: false },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Management</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={Colors.info} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Team Features Coming Soon</Text>
            <Text style={styles.infoText}>
              Inviting and managing team members directly from the mobile app will be available in the next update. Please use the web dashboard to manage your team for now.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Current Members</Text>
        
        <FlatList
          data={teamMembers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.memberCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.memberInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.isMe && (
                    <View style={styles.meBadge}>
                      <Text style={styles.meText}>YOU</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.email}>{item.email}</Text>
              </View>
              <View style={[
                styles.roleBadge,
                item.role === 'OWNER' ? { backgroundColor: `${Colors.error}15` } :
                item.role === 'ADMIN' ? { backgroundColor: `${Colors.primary}15` } :
                { backgroundColor: `${Colors.textMuted}20` }
              ]}>
                <Text style={[
                  styles.roleText,
                  item.role === 'OWNER' ? { color: Colors.error } :
                  item.role === 'ADMIN' ? { color: Colors.primary } :
                  { color: Colors.textSecondary }
                ]}>{item.role}</Text>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  iconBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },
  
  content: { padding: 16, flex: 1 },
  
  infoBanner: {
    flexDirection: "row",
    backgroundColor: `${Colors.info}10`,
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: `${Colors.info}30`,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.info,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  memberInfo: { flex: 1 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  meBadge: {
    backgroundColor: Colors.textPrimary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  meText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
  },
  email: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "800",
  },
});
