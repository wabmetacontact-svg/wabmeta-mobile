// src/components/common/LockedFeatureView.tsx
// Plan ke hisab se locked feature ka screen. LockedWalletView jaisa hi look,
// bas har feature ke liye reusable.

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import {
  featureDescription,
  featureLabel,
  type LockableFeature,
} from "../../hooks/useFeatureLock";

const FEATURE_ICON: Record<LockableFeature, keyof typeof Ionicons.glyphMap> = {
  inbox: "chatbubbles",
  campaigns: "megaphone",
  chatbot: "hardware-chip",
  automation: "git-branch",
  connection: "link",
};

export function LockedFeatureView({
  feature,
  planType,
}: {
  feature: LockableFeature;
  planType?: string;
}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.lockCircle}>
        <Ionicons name="lock-closed" size={38} color={Colors.textMuted} />
        <View style={styles.featureIconBadge}>
          <Ionicons name={FEATURE_ICON[feature]} size={16} color="#fff" />
        </View>
      </View>

      <Text style={styles.title}>{featureLabel(feature)} Locked</Text>
      <Text style={styles.subtitle}>{featureDescription(feature)}</Text>

      {planType && (
        <View style={styles.planChip}>
          <Text style={styles.planChipText}>
            Current plan: {planType.replace(/_/g, " ")}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.upgradeBtn}
        onPress={() => router.push("/(app)/billing" as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="flash" size={18} color="#fff" />
        <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
      </TouchableOpacity>

      <Text style={styles.helpText}>
        Plan upgrade ke baad ye feature turant unlock ho jayega.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  lockCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.borderLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  featureIconBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  planChip: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.borderLight,
  },
  planChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "capitalize",
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 28,
    height: 50,
    marginTop: 24,
  },
  upgradeBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  helpText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 14,
  },
});

export default LockedFeatureView;
