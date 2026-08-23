// app/(app)/team/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../src/constants/colors";
import { useAuth } from "../../../src/context/AuthContext";
import {
  organizations as orgApi,
  handleApiError,
  type OrgMember,
  type OrgRole,
} from "../../../src/services/api";

const ASSIGNABLE_ROLES: Exclude<OrgRole, "OWNER">[] = [
  "ADMIN",
  "MEMBER",
  "VIEWER",
];

const ROLE_DESCRIPTION: Record<Exclude<OrgRole, "OWNER">, string> = {
  ADMIN: "Manage team, campaigns and settings",
  MEMBER: "Send messages and manage contacts",
  VIEWER: "Read-only access",
};

const roleColor = (role: OrgRole) => {
  switch (role) {
    case "OWNER":
      return Colors.primary;
    case "ADMIN":
      return Colors.info;
    case "VIEWER":
      return Colors.textMuted;
    default:
      return Colors.textSecondary;
  }
};

const memberName = (member: OrgMember) => {
  const first = member.firstName?.trim();
  const last = member.lastName?.trim();
  const full = [first, last].filter(Boolean).join(" ");
  return full || member.email;
};

const initials = (member: OrgMember) => {
  const name = memberName(member);
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] || "?").concat(parts[1]?.[0] || "").toUpperCase();
};

export default function TeamScreen() {
  const { user, organization } = useAuth();
  const orgId = organization?.id;

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<Exclude<OrgRole, "OWNER">>("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!orgId) {
      setError("No organization selected");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const res = await orgApi.getById(orgId);
      const data = res.data?.data as any;

      setMembers(Array.isArray(data?.members) ? data.members : []);
      setOwnerId(data?.ownerId || data?.owner?.id || null);
    } catch (err: any) {
      setError(handleApiError(err, "Could not load team members"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Role backend se aata hai; membership row hi source of truth hai
  const myMembership = useMemo(
    () => members.find((m) => m.userId === user?.id),
    [members, user?.id]
  );

  const isOwner = ownerId ? ownerId === user?.id : myMembership?.role === "OWNER";
  const canInvite = isOwner || myMembership?.role === "ADMIN";

  const onRefresh = () => {
    setRefreshing(true);
    fetchMembers();
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim();

    if (!email) {
      setInviteError("Email is required");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setInviteError("Enter a valid email");
      return;
    }

    setInviting(true);
    setInviteError(null);

    try {
      await orgApi.inviteMember(orgId!, { email, role: inviteRole });
      setShowInvite(false);
      setInviteEmail("");
      setInviteRole("MEMBER");
      await fetchMembers();
      Alert.alert("Invited", `${email} has been added to your team.`);
    } catch (err: any) {
      setInviteError(handleApiError(err, "Could not invite this member"));
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = (member: OrgMember) => {
    // Backend: role change sirf owner kar sakta hai
    Alert.alert(
      "Change role",
      `Select a new role for ${memberName(member)}`,
      [
        ...ASSIGNABLE_ROLES.filter((r) => r !== member.role).map((role) => ({
          text: role,
          onPress: async () => {
            setBusyMemberId(member.id);
            try {
              await orgApi.updateMemberRole(orgId!, member.id, role);
              await fetchMembers();
            } catch (err: any) {
              Alert.alert(
                "Failed",
                handleApiError(err, "Could not update role")
              );
            } finally {
              setBusyMemberId(null);
            }
          },
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  };

  const handleRemove = (member: OrgMember) => {
    Alert.alert(
      "Remove member",
      `${memberName(member)} will lose access to this workspace.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setBusyMemberId(member.id);
            try {
              await orgApi.removeMember(orgId!, member.id);
              setMembers((prev) => prev.filter((m) => m.id !== member.id));
            } catch (err: any) {
              Alert.alert(
                "Failed",
                handleApiError(err, "Could not remove this member")
              );
            } finally {
              setBusyMemberId(null);
            }
          },
        },
      ]
    );
  };

  const openMemberActions = (member: OrgMember) => {
    const isMe = member.userId === user?.id;
    const isTargetOwner = member.role === "OWNER" || member.userId === ownerId;

    if (isMe || isTargetOwner) return;

    const options: any[] = [];

    if (isOwner) {
      options.push({
        text: "Change role",
        onPress: () => handleChangeRole(member),
      });
    }
    if (canInvite) {
      options.push({
        text: "Remove from team",
        style: "destructive",
        onPress: () => handleRemove(member),
      });
    }

    if (options.length === 0) return;

    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert(memberName(member), member.email, options);
  };

  const renderMember = ({ item }: { item: OrgMember }) => {
    const isMe = item.userId === user?.id;
    const isTargetOwner = item.role === "OWNER" || item.userId === ownerId;
    const actionable = !isMe && !isTargetOwner && (isOwner || canInvite);

    return (
      <TouchableOpacity
        style={styles.memberCard}
        activeOpacity={actionable ? 0.7 : 1}
        onPress={() => openMemberActions(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(item)}</Text>
        </View>

        <View style={styles.memberInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {memberName(item)}
            </Text>
            {isMe && (
              <View style={styles.meBadge}>
                <Text style={styles.meText}>You</Text>
              </View>
            )}
          </View>
          <Text style={styles.email} numberOfLines={1}>
            {item.email}
          </Text>
          {!item.joinedAt && (
            <Text style={styles.pendingText}>Invite pending</Text>
          )}
        </View>

        {busyMemberId === item.id ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <View style={styles.rightSide}>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: `${roleColor(isTargetOwner ? "OWNER" : item.role)}18` },
              ]}
            >
              <Text
                style={[
                  styles.roleText,
                  { color: roleColor(isTargetOwner ? "OWNER" : item.role) },
                ]}
              >
                {isTargetOwner ? "OWNER" : item.role}
              </Text>
            </View>
            {actionable && (
              <Ionicons
                name="ellipsis-vertical"
                size={16}
                color={Colors.textMuted}
              />
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Management</Text>
        {canInvite ? (
          <TouchableOpacity
            onPress={() => {
              setInviteError(null);
              setShowInvite(true);
            }}
            style={styles.iconBtn}
          >
            <Ionicons name="person-add" size={22} color={Colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centeredText}>Loading team...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={40} color={Colors.error} />
          <Text style={styles.centeredText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchMembers}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderMember}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>
              {members.length} {members.length === 1 ? "member" : "members"}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons
                name="people-outline"
                size={40}
                color={Colors.textMuted}
              />
              <Text style={styles.centeredText}>No team members yet</Text>
            </View>
          }
        />
      )}

      {/* Invite modal */}
      <Modal
        visible={showInvite}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInvite(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite team member</Text>
              <TouchableOpacity onPress={() => setShowInvite(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="name@company.com"
              placeholderTextColor={Colors.textMuted}
              value={inviteEmail}
              onChangeText={(t) => {
                setInviteEmail(t);
                if (inviteError) setInviteError(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Role</Text>
            {ASSIGNABLE_ROLES.map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleOption,
                  inviteRole === role && styles.roleOptionActive,
                ]}
                onPress={() => setInviteRole(role)}
              >
                <Ionicons
                  name={
                    inviteRole === role
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={20}
                  color={
                    inviteRole === role ? Colors.primary : Colors.textMuted
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleOptionTitle}>{role}</Text>
                  <Text style={styles.roleOptionDesc}>
                    {ROLE_DESCRIPTION[role]}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {inviteError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#B91C1C" />
                <Text style={styles.errorBoxText}>{inviteError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, inviting && { opacity: 0.7 }]}
              onPress={handleInvite}
              disabled={inviting}
            >
              {inviting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add" size={17} color="#fff" />
                  <Text style={styles.primaryBtnText}>Send Invite</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },

  listContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  centeredText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  memberInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  meBadge: {
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  meText: { fontSize: 10, fontWeight: "700", color: Colors.textSecondary },
  email: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 2 },
  pendingText: {
    fontSize: 11,
    color: Colors.warning,
    marginTop: 3,
    fontWeight: "600",
  },
  rightSide: { alignItems: "flex-end", gap: 6 },
  roleBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  roleText: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.4 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: Colors.textPrimary },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceSecondary,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  roleOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}0D`,
  },
  roleOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  roleOptionDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  errorBoxText: { flex: 1, fontSize: 13, color: "#B91C1C", lineHeight: 18 },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 50,
    marginTop: 16,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
