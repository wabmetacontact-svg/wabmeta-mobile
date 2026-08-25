// app/(app)/profile/index.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { users as usersApi } from "../../../src/services/api";
import { useAuth } from "../../../src/context/AuthContext";
import { Colors } from "../../../src/constants/colors";

export default function ProfileScreen() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [formData, setFormData] = useState({
    firstName: user?.firstName || user?.name?.split(" ")[0] || "",
    lastName: user?.lastName || user?.name?.split(" ")[1] || "",
    phone: user?.phone || "",
    avatar: user?.avatar || "",
  });

  useEffect(() => {
    fetchProfile();
    fetchSessions();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await usersApi.getProfile();
      if (res.data?.success) {
        const data = res.data.data;
        setFormData({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          phone: data.phone || "",
          avatar: data.avatar || "",
        });
        updateUser(data);
      }
    } catch (err: any) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await usersApi.getSessions();
      if (res.data?.success) {
        const sdata = res.data.data;
        setSessions(Array.isArray(sdata) ? sdata : sdata?.sessions || []);
      } else {
        setSessions([]);
      }
    } catch (err: any) {
      console.error("Sessions error:", err);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSave = async () => {
    if (!formData.firstName.trim()) {
      Alert.alert("Error", "First name is required");
      return;
    }

    try {
      setSaving(true);

      // Gallery se chuni hui photo data-uri hoti hai, aur /users/profile ka
      // avatar sirf URL accept karta hai - isiliye "Validation failed" aata
      // tha. Pehle use /users/avatar par bhejo, wahan se hosted URL milta hai.
      let avatar = formData.avatar || undefined;

      if (avatar?.startsWith("data:")) {
        const up = await usersApi.updateAvatar(avatar);
        const uploaded = up.data?.data as any;
        const hosted: string | undefined = uploaded?.avatar || uploaded?.url;

        // Agar dono uploads fail ho gaye to backend wahi data-uri lauta deta
        // hai. Use profile call mein mat bhejo, warna wahi validation error
        // dobara aayega - photo /users/avatar se already save ho chuki hai.
        avatar = hosted && !hosted.startsWith("data:") ? hosted : undefined;

        if (avatar) {
          setFormData((prev) => ({ ...prev, avatar: avatar as string }));
        }
      }

      const res = await usersApi.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName || undefined,
        phone: formData.phone || undefined,
        avatar,
      });

      if (res.data?.success) {
        Alert.alert("Success", "Profile updated successfully");
        updateUser(res.data.data);
      }
    } catch (err: any) {
      const data = err.response?.data;
      // Zod validation errors detail array mein aate hain - unhe dikhao,
      // sirf "Validation failed" se user ko kuch pata nahi chalta
      const detail = Array.isArray(data?.errors)
        ? data.errors.map((e: any) => e.message).join("\n")
        : null;

      Alert.alert(
        "Error",
        detail || data?.message || "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please allow gallery access");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const avatarUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setFormData((prev) => ({ ...prev, avatar: avatarUri }));
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleRevokeSession = (sessionId: string) => {
    Alert.alert(
      "Revoke Session",
      "Are you sure you want to log out from this device?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            try {
              await usersApi.revokeSession(sessionId);
              setSessions((prev) => prev.filter((s) => s.id !== sessionId));
              Alert.alert("Success", "Session revoked");
            } catch (err) {
              Alert.alert("Error", "Failed to revoke session");
            }
          },
        },
      ]
    );
  };

  // Poora page block karne ke bajay header turant dikhta hai aur
  // spinner sirf form wale area mein aata hai
  const getInitials = () => {
    const f = formData.firstName.charAt(0).toUpperCase();
    const l = formData.lastName.charAt(0).toUpperCase();
    return f + l || (user?.email?.charAt(0).toUpperCase() || "U");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || loading}
          style={styles.saveBtn}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <LinearGradient
            colors={[Colors.primary, "#0A7061"]}
            style={styles.avatarSection}
          >
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              <View style={styles.avatar}>
                {formData.avatar ? (
                  <Image
                    source={{ uri: formData.avatar }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>{getInitials()}</Text>
                )}
              </View>
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.emailText}>{user?.email}</Text>
            {user?.emailVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons
                  name="shield-checkmark"
                  size={12}
                  color={Colors.success}
                />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </LinearGradient>

          {/* Form */}
          <View style={styles.formSection}>
            <View style={styles.field}>
              <Text style={styles.label}>First Name</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person" size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(v) => setFormData({ ...formData, firstName: v })}
                  placeholder="John"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Last Name</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person" size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(v) => setFormData({ ...formData, lastName: v })}
                  placeholder="Doe"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="call" size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(v) => setFormData({ ...formData, phone: v })}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          {/* Sessions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Sessions</Text>
              <TouchableOpacity onPress={fetchSessions}>
                <Ionicons name="refresh" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {loadingSessions ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : sessions.length === 0 ? (
              <Text style={styles.emptyText}>No sessions found</Text>
            ) : (
              <View style={styles.sessionsList}>
                {sessions.map((session) => (
                  <View
                    key={session.id}
                    style={[
                      styles.sessionItem,
                      session.isCurrent && styles.sessionCurrent,
                    ]}
                  >
                    <View style={styles.sessionIconBox}>
                      <Ionicons
                        name={
                          session.userAgent?.toLowerCase().includes("mobile") ||
                          session.userAgent?.toLowerCase().includes("android") ||
                          session.userAgent?.toLowerCase().includes("ios")
                            ? "phone-portrait"
                            : "desktop"
                        }
                        size={18}
                        color={
                          session.isCurrent
                            ? Colors.success
                            : Colors.textSecondary
                        }
                      />
                    </View>
                    <View style={styles.sessionInfo}>
                      <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                        <Text style={styles.sessionDevice} numberOfLines={1}>
                          {session.userAgent?.split(" ")[0] || "Unknown Device"}
                        </Text>
                        {session.isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentText}>Current</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.sessionMeta}>
                        {session.ipAddress || "Unknown IP"} •{" "}
                        {new Date(session.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    {!session.isCurrent && (
                      <TouchableOpacity
                        onPress={() => handleRevokeSession(session.id)}
                        style={styles.revokeBtn}
                      >
                        <Ionicons name="log-out" size={16} color={Colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Danger Zone */}
          <View style={styles.dangerZone}>
            <Text style={styles.dangerTitle}>Danger Zone</Text>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => Alert.alert("Coming Soon", "Account deletion must be done from the web dashboard for security reasons.")}
            >
              <Ionicons name="trash" size={18} color={Colors.error} />
              <Text style={styles.deleteText}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

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
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  avatarSection: {
    padding: 30,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.4)",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#0A7061",
  },
  emailText: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 6,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "700",
  },

  formSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  field: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },

  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    padding: 20,
  },
  sessionsList: { gap: 10 },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    gap: 12,
  },
  sessionCurrent: {
    backgroundColor: `${Colors.success}10`,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
  },
  sessionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  sessionInfo: { flex: 1 },
  sessionDevice: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    maxWidth: 160,
  },
  currentBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
  },
  sessionMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  revokeBtn: {
    padding: 8,
    backgroundColor: `${Colors.error}15`,
    borderRadius: 8,
  },

  dangerZone: {
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: `${Colors.error}10`,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.error,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.error,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  deleteText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
