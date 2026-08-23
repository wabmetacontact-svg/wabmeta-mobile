// src/components/campaigns/steps/StepReview.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../constants/colors";
import {
  CampaignFormData,
  Template,
  WalletEstimate,
} from "../../../types/campaign";

interface Props {
  formData: CampaignFormData;
  selectedTemplate?: Template;
  totalRecipients: number;
  walletEstimate: WalletEstimate | null;
  loadingEstimate: boolean;
}

export function StepReview({
  formData,
  selectedTemplate,
  totalRecipients,
  walletEstimate,
  loadingEstimate,
}: Props) {
  const canProceed =
    !walletEstimate?.hasWallet ||
    !walletEstimate?.walletActive ||
    walletEstimate?.canProceed;

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Review & Confirm</Text>
        <Text style={styles.sectionSubtitle}>
          Verify everything before sending
        </Text>
      </View>

      {/* Success Banner */}
      <View style={styles.successBanner}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
        </View>
        <View style={styles.successContent}>
          <Text style={styles.successTitle}>Campaign Created!</Text>
          <Text style={styles.successText}>
            Review the cost estimate below
          </Text>
        </View>
      </View>

      {/* Campaign Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Campaign Details</Text>
        <ReviewRow icon="text" label="Name" value={formData.name} />
        {formData.description ? (
          <ReviewRow
            icon="document"
            label="Description"
            value={formData.description}
          />
        ) : null}
        <ReviewRow
          icon="chatbox"
          label="Template"
          value={selectedTemplate?.name || ""}
        />
        <ReviewRow
          icon="people"
          label="Recipients"
          value={`${totalRecipients.toLocaleString("en-IN")} contacts`}
        />
        <ReviewRow
          icon="time"
          label="Schedule"
          value={
            formData.scheduleType === "now"
              ? "Send immediately"
              : `${formData.scheduledDate} at ${formData.scheduledTime}`
          }
        />
      </View>

      {/* Cost Estimate */}
      {loadingEstimate ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingText}>Calculating cost...</Text>
        </View>
      ) : walletEstimate ? (
        <>
          {!walletEstimate.hasWallet || !walletEstimate.walletActive ? (
            <View style={styles.infoCard}>
              <Ionicons
                name="information-circle"
                size={20}
                color={Colors.info}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>No Wallet Configured</Text>
                <Text style={styles.infoText}>
                  Charges applied to your Meta Business account
                </Text>
              </View>
            </View>
          ) : (
            <>
              {/* Cost breakdown */}
              <View style={styles.costCard}>
                <Text style={styles.cardTitle}>Wallet & Cost</Text>

                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Available Balance</Text>
                  <Text style={[styles.costValue, { color: Colors.success }]}>
                    ₹{walletEstimate.availableBalance.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Estimated Cost</Text>
                  <Text style={[styles.costValue, { color: Colors.info }]}>
                    ₹{walletEstimate.estimatedCost.toFixed(2)}
                  </Text>
                </View>

                <View style={[styles.costRow, styles.costRowTotal]}>
                  <Text style={styles.costLabelTotal}>After Sending</Text>
                  <Text
                    style={[
                      styles.costValueTotal,
                      {
                        color: walletEstimate.canProceed
                          ? Colors.textPrimary
                          : Colors.error,
                      },
                    ]}
                  >
                    ₹
                    {Math.max(
                      0,
                      walletEstimate.availableBalance -
                        walletEstimate.estimatedCost
                    ).toFixed(2)}
                  </Text>
                </View>

                {walletEstimate.estimatedCostBreakdown && (
                  <View style={styles.rateInfo}>
                    <Text style={styles.rateText}>
                      Rate:{" "}
                      <Text style={styles.rateValue}>
                        ₹
                        {walletEstimate.estimatedCostBreakdown.ratePerMessage.toFixed(
                          4
                        )}
                        /message
                      </Text>
                    </Text>
                  </View>
                )}
              </View>

              {/* Insufficient balance */}
              {!walletEstimate.canProceed && (
                <View style={styles.errorCard}>
                  <Ionicons
                    name="alert-circle"
                    size={20}
                    color={Colors.error}
                  />
                  <View style={styles.errorContent}>
                    <Text style={styles.errorTitle}>Insufficient Balance</Text>
                    <Text style={styles.errorText}>
                      You need ₹{walletEstimate.shortfall.toFixed(2)} more to
                      run this campaign
                    </Text>
                    <TouchableOpacity
                      style={styles.topUpBtn}
                      onPress={() => router.push("/(app)/wallet" as never)}
                    >
                      <Ionicons name="wallet" size={14} color="#fff" />
                      <Text style={styles.topUpBtnText}>Top Up Wallet</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </>
      ) : null}

      {/* Final confirmation */}
      {canProceed && !loadingEstimate && (
        <View style={styles.confirmCard}>
          <Ionicons name="send" size={16} color={Colors.success} />
          <Text style={styles.confirmText}>
            Tap "Confirm & Send" to start your campaign
          </Text>
        </View>
      )}
    </View>
  );
}

function ReviewRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.reviewRow}>
      <Ionicons name={icon} size={14} color={Colors.textMuted} />
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.success}10`,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
  },
  successIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.success,
    justifyContent: "center",
    alignItems: "center",
  },
  successContent: { flex: 1 },
  successTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.success,
  },
  successText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  reviewLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    width: 90,
    fontWeight: "600",
  },
  reviewValue: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: "700",
  },

  loadingCard: {
    padding: 24,
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  infoCard: {
    flexDirection: "row",
    backgroundColor: `${Colors.info}10`,
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  infoContent: { flex: 1 },
  infoTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.info,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  costCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  costRowTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginTop: 8,
    paddingTop: 12,
  },
  costLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  costLabelTotal: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "800",
  },
  costValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  costValueTotal: {
    fontSize: 16,
    fontWeight: "800",
  },
  rateInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  rateText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  rateValue: {
    color: Colors.textPrimary,
    fontWeight: "700",
    fontStyle: "normal",
  },

  errorCard: {
    flexDirection: "row",
    backgroundColor: `${Colors.error}10`,
    padding: 14,
    borderRadius: 12,
    gap: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
  },
  errorContent: { flex: 1 },
  errorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.error,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  topUpBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
    gap: 6,
  },
  topUpBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  confirmCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: `${Colors.success}10`,
    borderRadius: 10,
    gap: 8,
    marginTop: 12,
  },
  confirmText: {
    flex: 1,
    fontSize: 12,
    color: Colors.success,
    fontWeight: "700",
  },
});
