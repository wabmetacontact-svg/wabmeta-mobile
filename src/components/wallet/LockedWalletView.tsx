// src/components/wallet/LockedWalletView.tsx
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

export function LockedWalletView() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.iconContainer}>
        <View style={styles.lockCircle}>
          <Ionicons name="lock-closed" size={40} color={Colors.textMuted} />
        </View>
      </View>

      <Text style={styles.title}>Wallet Feature Locked</Text>
      <Text style={styles.subtitle}>
        The Meta Payment Wallet is a premium feature available for all paid
        subscription plans. Upgrade your plan from Free to manage payments
        with ease.
      </Text>

      <TouchableOpacity
        style={styles.upgradeBtn}
        onPress={() => router.push("/(app)/billing" as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="flash" size={18} color="#fff" />
        <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
      </TouchableOpacity>

      <View style={styles.featuresGrid}>
        <FeatureCard
          title="No International Cards"
          description="Pay in INR without needing international credit cards."
        />
        <FeatureCard
          title="Automated Billing"
          description="We handle Meta's direct billing so you don't have to."
        />
      </View>
    </ScrollView>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureCard}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: "center",
  },
  iconContainer: {
    marginTop: 40,
    marginBottom: 24,
  },
  lockCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 32,
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 40,
  },
  upgradeBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  featuresGrid: {
    width: "100%",
    gap: 12,
  },
  featureCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
