// src/components/wallet/InactiveWalletView.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { WalletData } from "../../types/wallet";

interface Props {
  walletData: WalletData | null;
  onRequestAccess: () => void;
}

export function InactiveWalletView({ walletData, onRequestAccess }: Props) {
  const isPending = walletData?.hasPendingRequest;

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={styles.iconWrap}>
        <View style={styles.iconCircle}>
          <Ionicons name="wallet" size={40} color={Colors.primary} />
        </View>
      </View>

      <Text style={styles.title}>Meta Payment Wallet</Text>
      <Text style={styles.subtitle}>
        Manage your WhatsApp API payments without international cards
      </Text>

      {/* Status Card */}
      <View style={styles.statusCard}>
        {isPending ? (
          <PendingState requestedAt={walletData?.pendingRequest?.requestedAt} />
        ) : (
          <NotRequestedState onRequestAccess={onRequestAccess} />
        )}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={18} color={Colors.success} />
          <Text style={styles.infoTitle}>How WabMeta Wallet Works</Text>
        </View>

        <Text style={styles.infoText}>
          If you do not have a credit or debit card, you can use the WabMeta
          Wallet to pay for bulk messaging services.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoBoxItem}>
            • If you have a card, add it directly to Meta account
          </Text>
          <Text style={styles.infoBoxItem}>
            • Without a card, use the WabMeta Wallet as alternative
          </Text>
        </View>

        <Text style={styles.infoSubtitle}>With WabMeta Wallet:</Text>
        <View style={styles.benefitsList}>
          {[
            "Add funds to your wallet within the platform",
            "We process Meta payments on your behalf",
            "Works like a controlled credit line",
          ].map((benefit, i) => (
            <View key={i} style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function PendingState({ requestedAt }: { requestedAt?: string }) {
  return (
    <View style={styles.pendingContainer}>
      <View style={styles.pendingHeader}>
        <Ionicons name="time" size={22} color={Colors.warning} />
        <Text style={styles.pendingTitle}>Request Under Review</Text>
      </View>

      <Text style={styles.pendingText}>
        Your wallet access request is being reviewed by our team. We'll notify
        you once processed (usually within 24 hours).
      </Text>

      <View style={styles.pendingTip}>
        <Text style={styles.pendingTipText}>
          💡 Make sure you're on a paid subscription plan
        </Text>
      </View>

      {requestedAt && (
        <Text style={styles.pendingDate}>
          Submitted:{" "}
          {new Date(requestedAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </Text>
      )}
    </View>
  );
}

function NotRequestedState({ onRequestAccess }: { onRequestAccess: () => void }) {
  return (
    <View>
      <Text style={styles.requirementsTitle}>Requirements to Enable Wallet:</Text>

      <View style={styles.requirementsList}>
        {[
          {
            icon: "checkmark-circle" as const,
            color: Colors.success,
            text: "Active paid subscription plan",
          },
          {
            icon: "checkmark-circle" as const,
            color: Colors.success,
            text: "Admin approval required (24hr)",
          },
          {
            icon: "shield-checkmark" as const,
            color: Colors.info,
            text: "Balance only for Meta API payments",
          },
        ].map((item, i) => (
          <View key={i} style={styles.requirement}>
            <Ionicons name={item.icon} size={18} color={item.color} />
            <Text style={styles.requirementText}>{item.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.requestBtn}
        onPress={onRequestAccess}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.requestBtnText}>Request Wallet Access</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  iconWrap: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.primary}15`,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },

  // Status Card
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  // Pending State
  pendingContainer: {
    alignItems: "center",
  },
  pendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.warning,
  },
  pendingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  pendingTip: {
    backgroundColor: `${Colors.warning}15`,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  pendingTipText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: "600",
  },
  pendingDate: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Not Requested State
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  requirementsList: {
    gap: 10,
    marginBottom: 20,
  },
  requirement: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  requirementText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  requestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  requestBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Info Card
  infoCard: {
    backgroundColor: `${Colors.success}08`,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: `${Colors.success}20`,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.success,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  infoBoxItem: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  infoSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  benefitText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
