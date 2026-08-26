// app/(app)/settings/whatsapp-connect.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import { meta as metaApi } from "../../../src/services/api";
import { handleApiError } from "../../../src/services/api";
import { Colors } from "../../../src/constants/colors";
import { useAuth } from "../../../src/context/AuthContext";
import { useFeatureLock } from "../../../src/hooks/useFeatureLock";
import { LockedFeatureView } from "../../../src/components/common/LockedFeatureView";

export default function WhatsAppConnectScreen() {
  const { organization } = useAuth();
  const connectionLocked = useFeatureLock("connection");

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  // Pehle ye screen sirf Chrome me web dashboard khol deti thi - user ko
  // wahan dobara login karke poora setup browser me karna padta tha.
  //
  // Meta ka Embedded Signup sirf Facebook ke JS SDK se chalta hai
  // ("Embedded Signup relies on the JavaScript SDK"), jo React Native me
  // chal nahi sakta. Isliye ek chhota bridge page hai jo wahi FB.login
  // flow chalata hai aur code ko wapas app par deep-link karta hai.
  //
  // Wo page in-app browser me khulta hai (alag Chrome tab nahi), usme
  // WabMeta ka login nahi maanga jata, aur khatam hote hi apne aap band
  // ho kar app me wapas le aata hai.
  const handleConnect = async () => {
    if (!organization?.id) {
      Alert.alert("Error", "Organization not found. Please sign in again.");
      return;
    }

    setBusy(true);
    setProgress("Preparing Meta setup…");

    try {
      const cfgRes = await metaApi.getSignupConfig();
      const cfg = cfgRes.data?.data;

      if (!cfg?.appId || !cfg?.configId) {
        throw new Error(
          "WhatsApp signup is not configured on the server yet. Please contact support."
        );
      }

      // CSRF guard - jo state bheja wahi wapas aana chahiye
      const state = Crypto.randomUUID();

      const authUrl =
        `${cfg.mobileSignupUrl}` +
        `?app_id=${encodeURIComponent(cfg.appId)}` +
        `&config_id=${encodeURIComponent(cfg.configId)}` +
        `&redirect=${encodeURIComponent(cfg.mobileAppScheme)}` +
        `&state=${encodeURIComponent(state)}` +
        `&version=${encodeURIComponent(cfg.graphApiVersion || "v22.0")}`;

      setProgress("Opening Meta setup…");

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        cfg.mobileAppScheme
      );

      if (result.type !== "success" || !result.url) {
        // User ne band kar diya - ye error nahi hai
        setBusy(false);
        setProgress("");
        return;
      }

      const returned = new URL(result.url);
      const code = returned.searchParams.get("code");
      const returnedState = returned.searchParams.get("state");
      const oauthError =
        returned.searchParams.get("error_description") ||
        returned.searchParams.get("error");

      // User ne wizard band kar diya - ye galti nahi hai
      if (oauthError === "cancelled") {
        setBusy(false);
        setProgress("");
        return;
      }

      if (oauthError) throw new Error(oauthError);
      if (!code) throw new Error("Meta did not return an authorization code.");

      if (returnedState && returnedState !== state) {
        throw new Error("Security check failed. Please try again.");
      }

      setProgress("Connecting your WhatsApp Business Account…");

      const res = await metaApi.connect({
        code,
        organizationId: organization.id,
        // Bridge page ne postMessage se ye pakde hain. Na milen to
        // backend khud Graph API se dhoondh leta hai.
        wabaId: returned.searchParams.get("waba_id") || undefined,
        phoneNumberId: returned.searchParams.get("phone_number_id") || undefined,
      });

      if (res.data?.success === false) {
        throw new Error(res.data?.message || "Connection failed");
      }

      const warning = (res.data?.data as any)?.warning;

      Alert.alert(
        "WhatsApp Connected",
        warning === "PHONE_NOT_REGISTERED"
          ? "Your number is connected but not fully activated yet. Finish the remaining steps in Meta Business Manager."
          : "Your WhatsApp Business account is now connected.",
        [{ text: "Done", onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert(
        "Could not connect",
        handleApiError(err, "Something went wrong. Please try again.")
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  if (connectionLocked) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconBtn}
          >
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Connect WhatsApp</Text>
          </View>
          <View style={styles.iconBtn} />
        </View>
        <LockedFeatureView
          feature="connection"
          planType={organization?.planType}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Connect WhatsApp</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="logo-whatsapp" size={48} color="#25D366" />
          </View>

          <Text style={styles.title}>Connect WhatsApp Business</Text>
          <Text style={styles.subtitle}>
            Meta Embedded Signup allows you to connect your official WhatsApp Business Account safely through Meta Business Manager.
          </Text>

          <View style={styles.stepsBox}>
            <Text style={styles.stepsTitle}>Quick Steps:</Text>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>1.</Text>
              <Text style={styles.stepText}>
                Tap "Get Started" — Meta's setup opens right here.
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>
                Sign in to Facebook and pick your WhatsApp Business number.
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>
                That's it — you come straight back and the account is connected.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.connectBtn, busy && { opacity: 0.7 }]}
            onPress={handleConnect}
            activeOpacity={0.8}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="logo-whatsapp" size={20} color="#fff" />
            )}
            <Text style={styles.connectBtnText}>
              {busy ? "Connecting…" : "Get Started"}
            </Text>
          </TouchableOpacity>

          {!!progress && <Text style={styles.progressText}>{progress}</Text>}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
        <Text style={styles.footerText}>
          Official Meta Tech Provider Connection
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#25D36615",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  stepsBox: {
    width: "100%",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    gap: 8,
  },
  stepsTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  connectBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  progressText: {
    marginTop: 12,
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  connectBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "600",
  },
});
