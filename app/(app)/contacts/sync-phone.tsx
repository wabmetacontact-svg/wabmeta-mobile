// app/(app)/contacts/sync-phone.tsx
// Phone ke contacts ko WabMeta contacts mein import karo

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Contact,
  ContactField,
  ContactsSortOrder,
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-contacts";
import { Colors } from "../../../src/constants/colors";
import {
  contacts as contactsApi,
  handleApiError,
} from "../../../src/services/api";

// Backend ek request mein bahut saare contacts handle kar sakta hai, par
// chhote batches se progress dikhana aasan hai aur timeout ka risk kam.
const BATCH_SIZE = 200;

interface PhoneContact {
  key: string; // normalized digits - dedupe key
  name: string;
  phone: string; // jaisa device par hai (backend canonical bana lega)
  email?: string;
}

// Sirf halka cleanup - asli normalization backend ka toCanonicalPhone karta hai
const digitsOf = (value: string) => value.replace(/[^0-9]/g, "");

// Backend har contact ko Zod se validate karta hai aur ek bhi invalid email
// poore batch ko 400 kar deta hai. Phone ke bina to contact kaam ka hi nahi,
// par email optional hai - isliye shak ho to bhejo hi mat.
const cleanEmail = (value?: string): string | undefined => {
  const email = (value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : undefined;
};

const buildName = (c: any): string => {
  const first = (c?.givenName || "").trim();
  const last = (c?.familyName || "").trim();
  const full = [first, last].filter(Boolean).join(" ");
  return full || (c?.fullName || "").trim();
};

export default function SyncPhoneContactsScreen() {
  const [permission, setPermission] = useState<
    "unknown" | "granted" | "denied"
  >("unknown");
  const [loading, setLoading] = useState(true);
  const [deviceContacts, setDeviceContacts] = useState<PhoneContact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // ═══════════════════════════════════
  // LOAD DEVICE CONTACTS
  // ═══════════════════════════════════

  const loadContacts = useCallback(async () => {
    setLoading(true);

    try {
      let { status } = await getPermissionsAsync();

      if (status !== "granted") {
        ({ status } = await requestPermissionsAsync());
      }

      if (status !== "granted") {
        setPermission("denied");
        setLoading(false);
        return;
      }

      setPermission("granted");

      // getAllDetails bulk ke liye optimized hai - poore Contact instances
      // nahi banata, sirf maange hue fields deta hai
      const details = await Contact.getAllDetails(
        [
          ContactField.GIVEN_NAME,
          ContactField.FAMILY_NAME,
          ContactField.FULL_NAME,
          ContactField.PHONES,
          ContactField.EMAILS,
        ],
        { sortOrder: ContactsSortOrder.GivenName }
      );

      const seen = new Set<string>();
      const list: PhoneContact[] = [];

      for (const c of details as any[]) {
        const phones = Array.isArray(c?.phones) ? c.phones : [];
        if (phones.length === 0) continue;

        const name = buildName(c);
        const email = Array.isArray(c?.emails)
          ? cleanEmail(c.emails[0]?.address)
          : undefined;

        // Ek contact ke multiple numbers ho sakte hain - har number alag
        // WhatsApp contact hai, isliye sabko alag entry banate hain
        for (const p of phones) {
          const raw = (p?.number || "").trim();
          if (!raw) continue;

          const digits = digitsOf(raw);
          // E.164 mein 8-15 digits hote hain. Isse chhote shortcodes/USSD hain
          // aur bade galat data - dono backend par validation fail karte
          if (digits.length < 8 || digits.length > 15) continue;

          // Dedupe: last 10 digits par, taaki +91 wale aur bina code wale
          // same number do baar na aayein
          const key = digits.slice(-10);
          if (seen.has(key)) continue;
          seen.add(key);

          list.push({
            key,
            name: name || raw,
            phone: raw,
            email,
          });
        }
      }

      list.sort((a, b) => a.name.localeCompare(b.name));

      setDeviceContacts(list);
      // Sync ka matlab hi sab laana hai - default sab selected
      setSelected(new Set(list.map((c) => c.key)));
    } catch (err: any) {
      console.error("Load phone contacts error:", err);
      Alert.alert("Error", "Could not load your phone contacts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // ═══════════════════════════════════
  // SELECTION
  // ═══════════════════════════════════

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return deviceContacts;
    return deviceContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || digitsOf(c.phone).includes(digitsOf(q))
    );
  }, [deviceContacts, search]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.key));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((c) => next.delete(c.key));
      } else {
        filtered.forEach((c) => next.add(c.key));
      }
      return next;
    });
  };

  // ═══════════════════════════════════
  // IMPORT
  // ═══════════════════════════════════

  const runImport = async () => {
    const toImport = deviceContacts.filter((c) => selected.has(c.key));
    if (toImport.length === 0) return;

    setImporting(true);
    setProgress({ done: 0, total: toImport.length });

    let imported = 0;
    let skipped = 0;
    let failed = 0;
    let batchError: string | null = null;

    for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
      const batch = toImport.slice(i, i + BATCH_SIZE);

      const payload = batch.map((c) => {
        const parts = c.name.trim().split(/\s+/);
        return {
          phone: c.phone,
          firstName: parts[0] || undefined,
          lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
          email: c.email,
        };
      });

      // Har batch alag se handle karo. Ek batch mein ek bhi invalid entry ho
      // to backend poore batch ko reject karta hai - us wajah se baaki
      // contacts ka import rukna nahi chahiye.
      try {
        const res = await contactsApi.import({
          contacts: payload,
          tags: ["phone-sync"],
        });

        const data = res.data?.data as any;
        imported += data?.imported ?? 0;
        skipped += data?.skipped ?? 0;
        failed += data?.failed ?? 0;
      } catch (err: any) {
        failed += batch.length;
        if (!batchError) {
          batchError = handleApiError(err, "Some contacts could not be imported");
        }
      }

      setProgress({
        done: Math.min(i + batch.length, toImport.length),
        total: toImport.length,
      });
    }

    setImporting(false);

    const summary = [
      `${imported} added`,
      skipped > 0 ? `${skipped} already existed` : null,
      failed > 0 ? `${failed} invalid` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    if (batchError) {
      Alert.alert(
        "Partially imported",
        `${summary}\n\n${batchError}`,
        [{ text: "OK", onPress: () => router.back() }]
      );
      return;
    }

    Alert.alert("Contacts synced", summary, [
      { text: "Done", onPress: () => router.back() },
    ]);
  };

  const confirmImport = () => {
    const count = selected.size;
    if (count === 0) return;

    Alert.alert(
      "Import contacts",
      `${count} contact${count === 1 ? "" : "s"} will be added to your WabMeta contacts. Anyone already saved will be skipped.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Import", onPress: runImport },
      ]
    );
  };

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  const renderItem = ({ item }: { item: PhoneContact }) => {
    const isSelected = selected.has(item.key);

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => toggle(item.key)}
        activeOpacity={0.7}
        disabled={importing}
      >
        <Ionicons
          name={isSelected ? "checkbox" : "square-outline"}
          size={22}
          color={isSelected ? Colors.primary : Colors.textMuted}
        />
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.name[0] || "?").toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.phone} numberOfLines={1}>
            {item.phone}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          disabled={importing}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sync Phone Contacts</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centeredText}>Reading your contacts...</Text>
        </View>
      ) : permission === "denied" ? (
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={40} color={Colors.textMuted} />
          <Text style={styles.centeredTitle}>Contacts permission needed</Text>
          <Text style={styles.centeredText}>
            WabMeta ko aapke phone contacts padhne ki permission chahiye taaki
            unhe import kiya ja sake. Ye contacts sirf aapke workspace mein
            add hote hain.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() =>
              Platform.OS === "ios"
                ? Linking.openURL("app-settings:")
                : Linking.openSettings()
            }
          >
            <Text style={styles.primaryBtnText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={loadContacts} style={styles.retryLink}>
            <Text style={styles.retryLinkText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : deviceContacts.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.centeredText}>
            Aapke phone mein koi contact number nahi mila
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name or number"
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              editable={!importing}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.selectBar}>
            <Text style={styles.selectCount}>
              {selected.size} of {deviceContacts.length} selected
            </Text>
            <TouchableOpacity onPress={toggleAll} disabled={importing}>
              <Text style={styles.selectAll}>
                {allFilteredSelected ? "Deselect all" : "Select all"}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            initialNumToRender={20}
            windowSize={10}
            removeClippedSubviews
            keyboardShouldPersistTaps="handled"
          />

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                styles.footerBtn,
                (selected.size === 0 || importing) && { opacity: 0.6 },
              ]}
              onPress={confirmImport}
              disabled={selected.size === 0 || importing}
            >
              {importing ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.primaryBtnText}>
                    Importing {progress.done}/{progress.total}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="cloud-download" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>
                    Import {selected.size} contact
                    {selected.size === 1 ? "" : "s"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
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

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
  },
  centeredTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 4,
  },
  centeredText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  retryLink: { marginTop: 4, padding: 8 },
  retryLinkText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },

  selectBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  selectCount: { fontSize: 13, color: Colors.textSecondary, fontWeight: "600" },
  selectAll: { fontSize: 13, color: Colors.primary, fontWeight: "700" },

  listContent: { paddingBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  name: { fontSize: 15, fontWeight: "600", color: Colors.textPrimary },
  phone: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 1 },

  footer: {
    padding: 14,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    height: 50,
  },
  footerBtn: { width: "100%" },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
