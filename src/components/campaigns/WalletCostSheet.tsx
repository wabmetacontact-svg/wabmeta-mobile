// src/components/campaigns/WalletCostSheet.tsx
import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { WalletEstimate } from "../../types/campaign";

interface Props {
  visible: boolean;
  estimate: WalletEstimate | null;
  loading: boolean;
  campaignName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function WalletCostSheet({
  visible,
  estimate,
  loading,
  campaignName,
  onConfirm,
  onClose,
}: Props) {
  const canProceed =
    !estimate?.hasWallet ||
    !estimate?.walletActive ||
    estimate?.canProceed;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="wallet" size={22} color={Colors.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Confirm Campaign</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {campaignName}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.loadingText}>
                  Calculating cost estimate...
                </Text>
              </View>
            ) : estimate ? (
              <View style={styles.content}>
                {/* Wallet not configured */}
                {!estimate.hasWallet || !estimate.walletActive ? (
                  <View style={styles.infoCard}>
                    <Ionicons
                      name="information-circle"
                      size={20}
                      color={Colors.info}
                    />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoTitle}>No wallet configured</Text>
                      <Text style={styles.infoText}>
                        Charges will be applied directly to your Meta Business
                        account.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <>
                    {/* Cost breakdown cards */}
                    <View style={styles.cardsRow}>
                      <CostCard
                        label="Available"
                        value={estimate.availableBalance}
                        color={Colors.success}
                      />
                      <CostCard
                        label="Est. Cost"
                        value={estimate.estimatedCost}
                        color={Colors.info}
                      />
                      <CostCard
                        label="After"
                        value={Math.max(
                          0,
                          estimate.availableBalance - estimate.estimatedCost
                        )}
                        color={
                          estimate.canProceed ? Colors.textPrimary : Colors.error
                        }
                      />
                    </View>

                    {/* Rate info */}
                    {estimate.estimatedCostBreakdown && (
                      <View style={styles.rateCard}>
                        <View style={styles.rateRow}>
                          <Text style={styles.rateLabel}>Recipients</Text>
                          <Text style={styles.rateValue}>
                            {estimate.estimatedCostBreakdown.totalRecipients.toLocaleString(
                              "en-IN"
                            )}
                          </Text>
                        </View>
                        <View style={styles.rateRow}>
                          <Text style={styles.rateLabel}>Avg rate/message</Text>
                          <Text style={styles.rateValue}>
                            ₹
                            {estimate.estimatedCostBreakdown.ratePerMessage.toFixed(
                              4
                            )}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Country breakdown */}
                    {estimate.estimatedCostBreakdown?.countryBreakdown &&
                      estimate.estimatedCostBreakdown.countryBreakdown.length >
                        0 && (
                        <View style={styles.countryCard}>
                          <Text style={styles.countryTitle}>
                            Country Breakdown
                          </Text>
                          {estimate.estimatedCostBreakdown.countryBreakdown
                            .slice(0, 3)
                            .map((c) => (
                              <View key={c.country} style={styles.countryRow}>
                                <Text style={styles.countryName}>
                                  {c.country}
                                </Text>
                                <Text style={styles.countryCount}>
                                  {c.count.toLocaleString("en-IN")} msgs
                                </Text>
                                <Text style={styles.countryCost}>
                                  ₹{c.cost.toFixed(2)}
                                </Text>
                              </View>
                            ))}
                        </View>
                      )}

                    {/* Insufficient balance warning */}
                    {!estimate.canProceed && (
                      <View style={styles.warningCard}>
                        <Ionicons
                          name="alert-circle"
                          size={20}
                          color={Colors.error}
                        />
                        <View style={styles.warningContent}>
                          <Text style={styles.warningTitle}>
                            Insufficient Balance
                          </Text>
                          <Text style={styles.warningText}>
                            Need ₹{estimate.shortfall.toFixed(2)} more to run
                            this campaign.
                          </Text>
                          <TouchableOpacity
                            style={styles.walletBtn}
                            onPress={() => {
                              onClose();
                              router.push("/(app)/wallet" as never);
                            }}
                          >
                            <Ionicons name="wallet" size={14} color="#fff" />
                            <Text style={styles.walletBtnText}>
                              Add Money to Wallet
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
            ) : (
              <View style={styles.infoCard}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={Colors.info}
                />
                <Text style={styles.infoText}>Ready to send campaign</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  (!canProceed || loading) && styles.confirmBtnDisabled,
                ]}
                onPress={onConfirm}
                disabled={!canProceed || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#fff" />
                    <Text style={styles.confirmBtnText}>Confirm & Send</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CostCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.costCard}>
      <Text style={styles.costLabel}>{label}</Text>
      <Text style={[styles.costValue, { color }]}>
        ₹{value.toFixed(2)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingBox: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textMuted,
  },

  content: {
    gap: 12,
  },

  infoCard: {
    flexDirection: "row",
    backgroundColor: `${Colors.info}10`,
    padding: 12,
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
    marginBottom: 2,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },

  cardsRow: {
    flexDirection: "row",
    gap: 8,
  },
  costCard: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  costLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  costValue: {
    fontSize: 15,
    fontWeight: "800",
  },

  rateCard: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  rateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rateLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  rateValue: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  countryCard: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 12,
    borderRadius: 10,
  },
  countryTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  countryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  countryName: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: "600",
    flex: 1,
  },
  countryCount: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginRight: 12,
  },
  countryCost: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },

  warningCard: {
    flexDirection: "row",
    backgroundColor: `${Colors.error}10`,
    padding: 12,
    borderRadius: 12,
    gap: 10,
    alignItems: "flex-start",
  },
  warningContent: { flex: 1 },
  warningTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.error,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  walletBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
    gap: 6,
  },
  walletBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  confirmBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    gap: 8,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
