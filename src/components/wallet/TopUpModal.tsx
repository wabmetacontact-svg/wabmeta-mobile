// src/components/wallet/TopUpModal.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { wallet as walletApi } from "../../services/api";
import { Colors } from "../../constants/colors";
import { RazorpayCheckout } from "../billing/RazorpayCheckout";

interface Props {
  visible: boolean;
  currentBalance: number;
  maxTopUp: number;
  maxMonthlyRemaining: number;
  onClose: () => void;
  onSuccess: () => void;
}

const QUICK_AMOUNTS = [200, 500, 1000, 2000, 5000];

export function TopUpModal({
  visible,
  currentBalance,
  maxTopUp,
  maxMonthlyRemaining,
  onClose,
  onSuccess,
}: Props) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Razorpay Checkout Modal state
  const [checkoutConfig, setCheckoutConfig] = useState<{
    visible: boolean;
    orderId: string;
    amount: number;
    key: string;
    actualAmount: number;
  } | null>(null);

  const effectiveMax = Math.min(maxTopUp, maxMonthlyRemaining);

  const validate = (val: number): string => {
    if (!val || isNaN(val)) return "Please enter an amount";
    if (val < 100) return "Minimum top-up amount is ₹100";
    if (val > effectiveMax)
      return `Maximum allowed is ₹${effectiveMax.toLocaleString("en-IN")}`;
    return "";
  };

  const handleTopUp = async () => {
    const numAmount = Number(amount);
    const validationError = validate(numAmount);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const orderRes = await walletApi.createTopUpOrder(numAmount);
      if (!orderRes?.data?.success) {
        throw new Error(orderRes?.data?.message || "Failed to create order");
      }

      const orderData = orderRes.data.data as any;

      setCheckoutConfig({
        visible: true,
        orderId: orderData?.orderId || orderData?.id,
        amount: orderData?.amountPaise || numAmount * 100,
        key: orderData?.razorpayKeyId || orderData?.key || process.env.EXPO_PUBLIC_RAZORPAY_KEY || "rzp_test_placeholder",
        actualAmount: numAmount,
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to initiate payment";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (data: any) => {
    const actualAmount = checkoutConfig?.actualAmount || Number(amount);
    setCheckoutConfig(null);
    setLoading(true);

    try {
      const verifyRes = await walletApi.verifyTopUp({
        razorpayOrderId: data.razorpay_order_id,
        razorpayPaymentId: data.razorpay_payment_id,
        razorpaySignature: data.razorpay_signature,
        amount: actualAmount,
      });

      if (verifyRes?.data?.success) {
        Alert.alert("Top-up Successful! 🎉", `₹${actualAmount.toLocaleString("en-IN")} added to your wallet.`);
        onSuccess();
        onClose();
      } else {
        Alert.alert("Notice", "Payment completed. Updating wallet balance...");
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError("Payment successful but verification failed. Admin will resolve this.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Ionicons name="card" size={22} color={Colors.primary} />
                <Text style={styles.title}>Add Money to Wallet</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Current Balance */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceValue}>
                ₹
                {currentBalance.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>

            {/* Quick Amounts */}
            <View style={styles.field}>
              <Text style={styles.label}>Quick Select</Text>
              <View style={styles.quickGrid}>
                {QUICK_AMOUNTS.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.quickBtn,
                      amount === String(amt) && styles.quickBtnActive,
                      amt > effectiveMax && styles.quickBtnDisabled,
                    ]}
                    onPress={() => {
                      setAmount(String(amt));
                      setError("");
                    }}
                    disabled={amt > effectiveMax}
                  >
                    <Text
                      style={[
                        styles.quickBtnText,
                        amount === String(amt) && styles.quickBtnTextActive,
                      ]}
                    >
                      {amt >= 1000 ? `₹${amt / 1000}K` : `₹${amt}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Amount Input */}
            <View style={styles.field}>
              <Text style={styles.label}>Enter Amount</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={(v) => {
                    setAmount(v.replace(/[^0-9]/g, ""));
                    setError("");
                  }}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <Text style={styles.hint}>
                Min: ₹100 • Max: ₹{effectiveMax.toLocaleString("en-IN")}
              </Text>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons
                name="information-circle"
                size={16}
                color={Colors.info}
              />
              <Text style={styles.infoText}>
                This amount will be used exclusively for Meta API payments.
                Secure payment via Razorpay.
              </Text>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.payBtn,
                (loading || !amount) && styles.payBtnDisabled,
              ]}
              onPress={handleTopUp}
              disabled={loading || !amount}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="card" size={18} color="#fff" />
                  <Text style={styles.payBtnText}>
                    Pay ₹{amount ? Number(amount).toLocaleString("en-IN") : "0"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.securityText}>
              🔒 Powered by Razorpay • 256-bit SSL encryption
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Razorpay Checkout Modal */}
      {checkoutConfig && (
        <RazorpayCheckout
          visible={checkoutConfig.visible}
          orderId={checkoutConfig.orderId}
          amount={checkoutConfig.amount}
          razorpayKey={checkoutConfig.key}
          onSuccess={handlePaymentSuccess}
          onClose={() => {
            setCheckoutConfig(null);
            Alert.alert("Payment Cancelled", "Top-up payment was cancelled.");
          }}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "90%",
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  balanceCard: {
    backgroundColor: `${Colors.primary}10`,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.primary,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    minWidth: "18%",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    alignItems: "center",
  },
  quickBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  quickBtnDisabled: {
    opacity: 0.4,
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  quickBtnTextActive: {
    color: "#fff",
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textPrimary,
    padding: 12,
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 6,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${Colors.info}10`,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.error}10`,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: Colors.error,
    fontWeight: "600",
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
  },
  payBtnDisabled: {
    opacity: 0.5,
  },
  payBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  securityText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
  },
});
