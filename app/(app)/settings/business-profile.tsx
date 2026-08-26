// app/(app)/settings/business-profile.tsx
// WhatsApp Business Profile - Meta par jo customers ko dikhta hai

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "../../../src/constants/colors";
import {
  meta as metaApi,
  handleApiError,
  type BusinessProfile,
} from "../../../src/services/api";

// Meta ki fixed list - inke alawa koi value accept nahi hoti
const VERTICALS = [
  { value: "UNDEFINED", label: "Not set" },
  { value: "OTHER", label: "Other" },
  { value: "AUTO", label: "Automotive" },
  { value: "BEAUTY", label: "Beauty & Spa" },
  { value: "APPAREL", label: "Clothing & Apparel" },
  { value: "EDU", label: "Education" },
  { value: "ENTERTAIN", label: "Entertainment" },
  { value: "EVENT_PLAN", label: "Event Planning" },
  { value: "FINANCE", label: "Finance & Banking" },
  { value: "GROCERY", label: "Food & Grocery" },
  { value: "GOVT", label: "Public Service" },
  { value: "HOTEL", label: "Hotel & Lodging" },
  { value: "HEALTH", label: "Medical & Health" },
  { value: "NONPROFIT", label: "Non-profit" },
  { value: "PROF_SERVICES", label: "Professional Services" },
  { value: "RETAIL", label: "Shopping & Retail" },
  { value: "TRAVEL", label: "Travel & Transport" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "NOT_A_BIZ", label: "Not a business" },
];

const nameStatusStyle = (status?: string | null) => {
  switch ((status || "").toUpperCase()) {
    case "APPROVED":
      return { label: "Approved", color: Colors.success };
    case "PENDING_REVIEW":
      return { label: "Pending review", color: Colors.warning };
    case "DECLINED":
      return { label: "Declined", color: Colors.error };
    default:
      return null;
  }
};

export default function BusinessProfileScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [about, setAbout] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [vertical, setVertical] = useState("UNDEFINED");
  const [showVerticals, setShowVerticals] = useState(false);

  const [showNameModal, setShowNameModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [nameSubmitting, setNameSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const applyProfile = (p: BusinessProfile) => {
    setProfile(p);
    setAbout(p.about || "");
    setDescription(p.description || "");
    setAddress(p.address || "");
    setEmail(p.email || "");
    setWebsite(p.websites?.[0] || "");
    setVertical(p.vertical || "UNDEFINED");
  };

  const fetchProfile = useCallback(async () => {
    if (!accountId) {
      setError("No WhatsApp account selected");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const res = await metaApi.getBusinessProfile(accountId);
      const data = res.data?.data;
      if (data) applyProfile(data);
    } catch (err: any) {
      setError(handleApiError(err, "Could not load business profile"));
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await metaApi.updateBusinessProfile(accountId!, {
        about,
        description,
        address,
        email,
        // Meta websites ko array leta hai (max 2)
        websites: website.trim() ? [website.trim()] : [],
        vertical,
      });

      const data = res.data?.data;
      if (data) applyProfile(data);

      Alert.alert("Saved", "Your WhatsApp business profile has been updated.");
    } catch (err: any) {
      Alert.alert("Could not save", handleApiError(err, "Update failed"));
    } finally {
      setSaving(false);
    }
  };

  const handlePickPicture = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Photo access is needed so you can choose a profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      // WhatsApp profile picture square dikhti hai
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType === "image/png" ? "image/png" : "image/jpeg";

    setUploadingPicture(true);
    try {
      const res = await metaApi.updateProfilePicture(
        accountId!,
        asset.uri,
        mimeType
      );
      const data = res.data?.data;
      if (data) applyProfile(data);
      Alert.alert("Updated", "Profile picture badal gayi.");
    } catch (err: any) {
      Alert.alert(
        "Upload failed",
        handleApiError(err, "Could not update profile picture")
      );
    } finally {
      setUploadingPicture(false);
    }
  };

  // Alert.prompt sirf iOS par hai, isliye apna modal use kar rahe hain -
  // Android par bhi kaam kare
  const openNameModal = () => {
    setNewDisplayName(profile?.displayName || "");
    setNameError(null);
    setShowNameModal(true);
  };

  const submitDisplayName = async () => {
    const name = newDisplayName.trim();

    if (name.length < 3) {
      setNameError("Display name must be at least 3 characters");
      return;
    }
    if (name === profile?.displayName) {
      setNameError("This is already your display name");
      return;
    }

    setNameSubmitting(true);
    setNameError(null);

    try {
      const res = await metaApi.requestDisplayNameChange(accountId!, name);
      setShowNameModal(false);
      Alert.alert(
        "Submitted for review",
        res.data?.message ||
          "Your display name has been submitted to Meta for review."
      );
      fetchProfile();
    } catch (err: any) {
      setNameError(handleApiError(err, "Could not submit display name"));
    } finally {
      setNameSubmitting(false);
    }
  };

  const status = nameStatusStyle(profile?.nameStatus);
  const verticalLabel =
    VERTICALS.find((v) => v.value === vertical)?.label || "Not set";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centeredText}>Loading profile...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={40} color={Colors.error} />
          <Text style={styles.centeredText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchProfile}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Picture + display name */}
            <View style={styles.identityCard}>
              <TouchableOpacity
                onPress={handlePickPicture}
                disabled={uploadingPicture}
                style={styles.avatarWrap}
              >
                {profile?.profile_picture_url ? (
                  <Image
                    source={{ uri: profile.profile_picture_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarEmpty]}>
                    <Ionicons name="business" size={28} color={Colors.textMuted} />
                  </View>
                )}

                <View style={styles.avatarBadge}>
                  {uploadingPicture ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={14} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>

              <Text style={styles.displayName}>
                {profile?.displayName || "Not set"}
              </Text>

              {status && (
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: `${status.color}18` },
                  ]}
                >
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
              )}

              <TouchableOpacity onPress={openNameModal}>
                <Text style={styles.changeNameLink}>Change display name</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.helper}>
              Ye details WhatsApp par aapke business profile mein customers ko
              dikhti hain.
            </Text>

            <Field
              label="About"
              value={about}
              onChange={setAbout}
              placeholder="Short status line"
              maxLength={139}
            />

            <Field
              label="Description"
              value={description}
              onChange={setDescription}
              placeholder="What your business does"
              maxLength={512}
              multiline
            />

            <Field
              label="Address"
              value={address}
              onChange={setAddress}
              placeholder="Business address"
              maxLength={256}
              multiline
            />

            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="contact@company.com"
              maxLength={128}
              keyboardType="email-address"
            />

            <Field
              label="Website"
              value={website}
              onChange={setWebsite}
              placeholder="https://company.com"
              maxLength={256}
              keyboardType="url"
            />

            {/* Category */}
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              style={styles.select}
              onPress={() => setShowVerticals((v) => !v)}
            >
              <Text style={styles.selectText}>{verticalLabel}</Text>
              <Ionicons
                name={showVerticals ? "chevron-up" : "chevron-down"}
                size={18}
                color={Colors.textMuted}
              />
            </TouchableOpacity>

            {showVerticals && (
              <View style={styles.selectList}>
                {VERTICALS.map((v) => (
                  <TouchableOpacity
                    key={v.value}
                    style={styles.selectOption}
                    onPress={() => {
                      setVertical(v.value);
                      setShowVerticals(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.selectOptionText,
                        vertical === v.value && { color: Colors.primary, fontWeight: "700" },
                      ]}
                    >
                      {v.label}
                    </Text>
                    {vertical === v.value && (
                      <Ionicons name="checkmark" size={18} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="save" size={17} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Display name change */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNameModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change display name</Text>
              <TouchableOpacity onPress={() => setShowNameModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalNote}>
              Ye naam customers ko dikhta hai. Meta ise review karta hai, aur
              approve hone ke baad number reconnect karna padta hai tabhi naya
              naam apply hota hai. Meta 30 din mein 10 changes allow karta hai.
            </Text>

            <TextInput
              style={styles.input}
              value={newDisplayName}
              onChangeText={(t) => {
                setNewDisplayName(t);
                if (nameError) setNameError(null);
              }}
              placeholder="Your business name"
              placeholderTextColor={Colors.textMuted}
              maxLength={75}
              autoFocus
            />

            {nameError && (
              <View style={styles.modalErrorBox}>
                <Ionicons name="alert-circle" size={15} color="#B91C1C" />
                <Text style={styles.modalErrorText}>{nameError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, nameSubmitting && { opacity: 0.7 }]}
              onPress={submitDisplayName}
              disabled={nameSubmitting}
            >
              {nameSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Submit for review</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "url";
}) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {maxLength && (
          <Text style={styles.counter}>
            {value.length}/{maxLength}
          </Text>
        )}
      </View>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        maxLength={maxLength}
        multiline={multiline}
        keyboardType={keyboardType || "default"}
        autoCapitalize={keyboardType === "email-address" || keyboardType === "url" ? "none" : "sentences"}
        autoCorrect={false}
      />
    </View>
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

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
  },
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

  content: { padding: 16 },

  identityCard: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  avatarWrap: { marginBottom: 10 },
  avatar: { width: 76, height: 76, borderRadius: 38 },
  avatarEmpty: {
    backgroundColor: Colors.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  displayName: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  statusPill: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: "800" },
  changeNameLink: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },

  helper: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },

  fieldWrap: { marginBottom: 14 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 12.5,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  counter: { fontSize: 11, color: Colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  inputMultiline: {
    height: 92,
    paddingTop: 12,
    textAlignVertical: "top",
  },

  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: Colors.surface,
    marginTop: 6,
  },
  selectText: { fontSize: 15, color: Colors.textPrimary },
  selectList: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  selectOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  selectOptionText: { fontSize: 14.5, color: Colors.textPrimary },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 50,
    marginTop: 20,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

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
    marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: Colors.textPrimary },
  modalNote: {
    fontSize: 12.5,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  modalErrorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  modalErrorText: { flex: 1, fontSize: 13, color: "#B91C1C", lineHeight: 18 },
});
