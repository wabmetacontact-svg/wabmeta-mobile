// app/(app)/settings/whatsapp-connect.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { Colors } from "../../../src/constants/colors";

const SETTINGS_URL = "https://wabmeta.com/dashboard/settings";

export default function WhatsAppConnectScreen() {
  const handleOpenBrowser = async () => {
    try {
      const canOpen = await Linking.canOpenURL(SETTINGS_URL);
      if (canOpen) {
        await Linking.openURL(SETTINGS_URL);
        router.back();
      } else {
        Alert.alert(
          "Open Web Dashboard",
          `Please visit ${SETTINGS_URL} in your browser to connect WhatsApp.`
        );
      }
    } catch (err) {
      console.error("Error opening URL:", err);
      Alert.alert("Error", "Failed to open browser");
    }
  };

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
              <Text style={styles.stepText}>Tap "Open in Browser" below.</Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>2.</Text>
              <Text style={styles.stepText}>
                Log in and tap "Connect WhatsApp with Meta".
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>3.</Text>
              <Text style={styles.stepText}>
                Return to this app — your connected account will appear automatically!
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.connectBtn}
            onPress={handleOpenBrowser}
            activeOpacity={0.8}
          >
            <Ionicons name="open-outline" size={20} color="#fff" />
            <Text style={styles.connectBtnText}>Open in Browser</Text>
          </TouchableOpacity>
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
