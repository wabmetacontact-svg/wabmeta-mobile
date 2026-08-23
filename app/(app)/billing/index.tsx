// app/(app)/billing/index.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { RazorpayCheckout } from "../../../src/components/billing/RazorpayCheckout";
import { useAuth } from "../../../src/context/AuthContext";
import { billing as billingApi } from "../../../src/services/api";
import { Colors } from "../../../src/constants/colors";
import { CurrentSubscription, Plan, Invoice } from "../../../src/types/billing";

const FALLBACK_PLANS: Plan[] = [
  {
    id: "plan-starter",
    name: "Starter",
    slug: "starter",
    description: "Best for small businesses getting started with WhatsApp marketing",
    priceMonthly: 999,
    priceYearly: 9990,
    maxContacts: 2500,
    maxCampaigns: 50,
    features: [
      { name: "2,500 Contacts", included: true },
      { name: "50 Campaigns/mo", included: true },
      { name: "Standard Chatbot Builder", included: true },
      { name: "Broadcast Analytics", included: true },
    ],
  },
  {
    id: "plan-pro",
    name: "Professional",
    slug: "pro",
    description: "For growing teams that need advanced automation & higher limits",
    priceMonthly: 2499,
    priceYearly: 24990,
    maxContacts: 10000,
    maxCampaigns: 200,
    isPopular: true,
    features: [
      { name: "10,000 Contacts", included: true },
      { name: "Unlimited Campaigns", included: true },
      { name: "AI Smart Chatbot", included: true },
      { name: "Full CRM & Lead Pipeline", included: true },
      { name: "Multi-Agent Team Inbox", included: true },
    ],
  },
  {
    id: "plan-enterprise",
    name: "Enterprise Growth",
    slug: "enterprise",
    description: "Unlimited scale with dedicated manager & custom webhook integrations",
    priceMonthly: 5999,
    priceYearly: 59990,
    maxContacts: 50000,
    maxCampaigns: 1000,
    features: [
      { name: "50,000+ Contacts", included: true },
      { name: "Unlimited Campaigns & Workflows", included: true },
      { name: "Custom API & Webhook Automations", included: true },
      { name: "Dedicated Account Support", included: true },
    ],
  },
];

export default function BillingScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"plans" | "invoices">("plans");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [processing, setProcessing] = useState(false);

  // Razorpay Checkout Modal state
  const [checkoutConfig, setCheckoutConfig] = useState<{
    visible: boolean;
    orderId: string;
    amount: number;
    key: string;
  } | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const [subRes, plansRes, invRes] = await Promise.allSettled([
        billingApi.getCurrentPlan(),
        billingApi.getPlans(),
        billingApi.getInvoices({ limit: 10 }),
      ]);

      if (subRes.status === "fulfilled" && subRes.value?.data?.success) {
        setSubscription(subRes.value.data.data);
      } else {
        // Never fabricate a subscription — that would claim the user is on a paid
        // plan they may not have. Show the real "no active plan" state instead.
        setSubscription(null);
      }

      if (plansRes.status === "fulfilled" && plansRes.value?.data?.success) {
        const pList = plansRes.value.data.data;
        setPlans(Array.isArray(pList) && pList.length > 0 ? pList : FALLBACK_PLANS);
      } else {
        setPlans(FALLBACK_PLANS);
      }

      if (invRes.status === "fulfilled" && invRes.value?.data?.success) {
        const invData = invRes.value.data.data as any;
        const invList = invData.invoices || invData.items || (Array.isArray(invData) ? invData : []);
        setInvoices(invList);
      } else {
        // Never fabricate paid invoices — real billing history only.
        setInvoices([]);
      }
    } catch (err) {
      console.error("Billing fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    if (subscription?.plan?.id === plan.id && subscription?.billingCycle === billingCycle) {
      Alert.alert("Already Active", "You are already on this plan.");
      return;
    }

    setProcessing(true);
    try {
      const res = await billingApi.createRazorpayOrder({
        planKey: plan.slug || (plan as any).key || plan.id,
        billingCycle,
      });

      if (res.data?.success) {
        const orderData = res.data.data as any;
        setCheckoutConfig({
          visible: true,
          orderId: orderData.orderId || orderData.id,
          amount: orderData.amountPaise || (orderData.amount ? orderData.amount * 100 : (billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly) * 100),
          key: orderData.razorpayKeyId || orderData.key || process.env.EXPO_PUBLIC_RAZORPAY_KEY || "rzp_test_placeholder",
        });
      } else {
        Alert.alert("Error", res.data?.message || "Failed to create order");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to create order");
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async (data: any) => {
    setCheckoutConfig(null);
    setLoading(true);
    try {
      const verifyRes = await billingApi.verifyRazorpayPayment({
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
      });

      if (verifyRes?.data?.success) {
        Alert.alert("Payment Successful! 🎉", "Your plan has been upgraded successfully.");
        fetchBillingData();
      } else {
        Alert.alert("Verification Notice", "Payment completed. Updating account status...");
        fetchBillingData();
      }
    } catch (err: any) {
      Alert.alert("Verification Failed", err?.response?.data?.message || "Payment verification failed. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = (url?: string) => {
    if (!url) {
      Alert.alert("Not Available", "PDF receipt is being generated. You can also download it from the web dashboard.");
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Failed to open invoice PDF");
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading billing data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billing & Plans</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Custom Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "plans" && styles.tabBtnActive]}
          onPress={() => setActiveTab("plans")}
        >
          <Text style={[styles.tabText, activeTab === "plans" && styles.tabTextActive]}>
            My Plan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "invoices" && styles.tabBtnActive]}
          onPress={() => setActiveTab("invoices")}
        >
          <Text style={[styles.tabText, activeTab === "invoices" && styles.tabTextActive]}>
            Invoices
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeTab === "plans" ? (
          <View>
            {/* Current Plan Card */}
            {subscription ? (
              <LinearGradient colors={[Colors.primary, "#0A7061"]} style={styles.currentPlanCard}>
                <View style={styles.currentPlanHeader}>
                  <View>
                    <Text style={styles.currentPlanLabel}>CURRENT PLAN</Text>
                    <Text style={styles.currentPlanName}>{subscription.plan?.name || "Professional"}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{subscription.status}</Text>
                  </View>
                </View>

                <View style={styles.currentPlanDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={16} color="#fff" />
                    <Text style={styles.detailText}>
                      Renews on: {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "Active"}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="repeat-outline" size={16} color="#fff" />
                    <Text style={styles.detailText}>
                      Billing: {(subscription.billingCycle || "monthly").toUpperCase()}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            ) : (
              <View style={styles.noPlanCard}>
                <Ionicons name="warning-outline" size={24} color={Colors.warning} />
                <Text style={styles.noPlanText}>You are currently on a Free/Trial Plan</Text>
              </View>
            )}

            {/* Cycle Toggle */}
            <View style={styles.cycleToggleWrap}>
              <View style={styles.cycleToggle}>
                <TouchableOpacity
                  style={[styles.cycleBtn, billingCycle === "monthly" && styles.cycleBtnActive]}
                  onPress={() => setBillingCycle("monthly")}
                >
                  <Text style={[styles.cycleBtnText, billingCycle === "monthly" && styles.cycleBtnTextActive]}>
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cycleBtn, billingCycle === "yearly" && styles.cycleBtnActive]}
                  onPress={() => setBillingCycle("yearly")}
                >
                  <Text style={[styles.cycleBtnText, billingCycle === "yearly" && styles.cycleBtnTextActive]}>
                    Yearly (Save 20%)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Pricing Plans */}
            <View style={styles.plansList}>
              {plans.map((plan) => {
                const isCurrent = subscription?.plan?.id === plan.id;
                const rawMonthly = (plan as any).priceMonthly ?? (plan as any).monthlyPrice ?? (plan as any).price ?? 0;
                const rawYearly = (plan as any).priceYearly ?? (plan as any).yearlyPrice ?? (typeof rawMonthly === "number" ? rawMonthly * 10 : 0);
                const price = billingCycle === "monthly" ? rawMonthly : rawYearly;
                const displayPrice = (typeof price === "number" ? price : parseFloat(price) || 0).toLocaleString("en-IN");
                const contacts = (plan as any).maxContacts ?? (plan as any).credits ?? (plan as any).contactLimit ?? 2500;
                const displayContacts = (typeof contacts === "number" ? contacts : parseInt(contacts) || 0).toLocaleString("en-IN");

                return (
                  <View key={plan.id} style={[styles.planCard, plan.isPopular && styles.planCardPopular]}>
                    {plan.isPopular && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>MOST POPULAR</Text>
                      </View>
                    )}

                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planDesc}>{plan.description}</Text>
                    
                    <View style={styles.priceWrap}>
                      <Text style={styles.priceSymbol}>₹</Text>
                      <Text style={styles.priceAmount}>{displayPrice}</Text>
                      <Text style={styles.pricePeriod}>/{billingCycle === "monthly" ? "mo" : "yr"}</Text>
                    </View>

                    <View style={styles.limitsWrap}>
                      <View style={styles.limitItem}>
                        <Ionicons name="people" size={14} color={Colors.textSecondary} />
                        <Text style={styles.limitText}>{displayContacts} Contacts</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.upgradeBtn, isCurrent && styles.upgradeBtnCurrent]}
                      onPress={() => handleUpgrade(plan)}
                      disabled={processing || isCurrent}
                    >
                      {processing ? (
                        <ActivityIndicator color={isCurrent ? Colors.primary : "#fff"} size="small" />
                      ) : (
                        <Text style={[styles.upgradeBtnText, isCurrent && styles.upgradeBtnTextCurrent]}>
                          {isCurrent ? "Current Plan" : "Upgrade"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          /* INVOICES TAB */
          <View style={styles.invoicesList}>
            {invoices.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No Invoices Yet</Text>
                <Text style={styles.emptySubtitle}>Your billing history will appear here once you make a payment.</Text>
              </View>
            ) : (
              invoices.map((inv) => {
                const invAmt = (inv as any).amount ?? (inv as any).total ?? 0;
                const displayAmt = (typeof invAmt === "number" ? invAmt : parseFloat(invAmt) || 0).toLocaleString("en-IN");

                return (
                  <View key={inv.id} style={styles.invoiceCard}>
                    <View style={styles.invIconBox}>
                      <Ionicons name="document-text" size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.invInfo}>
                      <Text style={styles.invNumber}>{inv.invoiceNumber || (inv as any).number || `INV-${inv.id.slice(0, 8)}`}</Text>
                      <Text style={styles.invDate}>{new Date(inv.createdAt || (inv as any).date || Date.now()).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.invRight}>
                      <Text style={styles.invAmount}>₹{displayAmt}</Text>
                      <View style={[styles.invStatus, inv.status === 'PAID' ? styles.statusPaid : styles.statusFailed]}>
                        <Text style={[styles.invStatusText, inv.status === 'PAID' ? styles.statusTextPaid : styles.statusTextFailed]}>
                          {inv.status}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.downloadBtn} 
                      onPress={() => handleDownloadInvoice(inv.pdfUrl || (inv as any).url)}
                    >
                      <Ionicons name="download-outline" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* RAZORPAY CHECKOUT MODAL */}
      {checkoutConfig && (
        <RazorpayCheckout
          visible={checkoutConfig.visible}
          orderId={checkoutConfig.orderId}
          amount={checkoutConfig.amount}
          razorpayKey={checkoutConfig.key}
          prefillName={user?.firstName || user?.name}
          prefillEmail={user?.email}
          prefillContact={user?.phone || ""}
          onSuccess={handlePaymentSuccess}
          onClose={() => {
            setCheckoutConfig(null);
            Alert.alert("Payment Cancelled", "You closed the payment window.");
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: Colors.textMuted },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: Colors.surface,
  },
  iconBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },

  tabsContainer: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceSecondary,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10 },
  tabBtnActive: { backgroundColor: Colors.surface, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: "600", color: Colors.textMuted },
  tabTextActive: { color: Colors.textPrimary, fontWeight: "800" },

  scrollContent: { padding: 16, paddingBottom: 100 },

  currentPlanCard: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  currentPlanHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  currentPlanLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "700", letterSpacing: 1, marginBottom: 4 },
  currentPlanName: { fontSize: 24, fontWeight: "800", color: "#fff" },
  statusBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  currentPlanDetails: { gap: 8 },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailText: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "500" },

  noPlanCard: { flexDirection: "row", alignItems: "center", backgroundColor: `${Colors.warning}15`, padding: 16, borderRadius: 12, gap: 12, marginBottom: 24, borderWidth: 1, borderColor: `${Colors.warning}30` },
  noPlanText: { flex: 1, color: Colors.warning, fontWeight: "600", fontSize: 13 },

  cycleToggleWrap: { alignItems: "center", marginBottom: 24 },
  cycleToggle: { flexDirection: "row", backgroundColor: Colors.surfaceSecondary, borderRadius: 12, padding: 4, width: "100%", maxWidth: 300 },
  cycleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  cycleBtnActive: { backgroundColor: Colors.surface, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cycleBtnText: { fontSize: 13, fontWeight: "600", color: Colors.textMuted },
  cycleBtnTextActive: { color: Colors.primary, fontWeight: "700" },

  plansList: { gap: 16 },
  planCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.borderLight, position: "relative" },
  planCardPopular: { borderColor: Colors.primary, borderWidth: 2 },
  popularBadge: { position: "absolute", top: -12, alignSelf: "center", backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  popularText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  planName: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary, marginBottom: 4 },
  planDesc: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  priceWrap: { flexDirection: "row", alignItems: "flex-end", marginBottom: 16 },
  priceSymbol: { fontSize: 20, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4, marginRight: 2 },
  priceAmount: { fontSize: 36, fontWeight: "800", color: Colors.textPrimary, letterSpacing: -1 },
  pricePeriod: { fontSize: 14, color: Colors.textSecondary, marginBottom: 6, marginLeft: 2 },
  
  limitsWrap: { backgroundColor: Colors.surfaceSecondary, padding: 12, borderRadius: 12, marginBottom: 20 },
  limitItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  limitText: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
  
  upgradeBtn: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  upgradeBtnCurrent: { backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.borderLight },
  upgradeBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  upgradeBtnTextCurrent: { color: Colors.textSecondary },

  invoicesList: { gap: 12 },
  invoiceCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, padding: 16, borderRadius: 16, gap: 12, borderWidth: 1, borderColor: Colors.borderLight },
  invIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: `${Colors.primary}10`, justifyContent: "center", alignItems: "center" },
  invInfo: { flex: 1 },
  invNumber: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4 },
  invDate: { fontSize: 12, color: Colors.textSecondary },
  invRight: { alignItems: "flex-end", marginRight: 8 },
  invAmount: { fontSize: 14, fontWeight: "800", color: Colors.textPrimary, marginBottom: 4 },
  invStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusPaid: { backgroundColor: `${Colors.success}15` },
  statusFailed: { backgroundColor: `${Colors.error}15` },
  invStatusText: { fontSize: 10, fontWeight: "800" },
  statusTextPaid: { color: Colors.success },
  statusTextFailed: { color: Colors.error },
  downloadBtn: { padding: 8, backgroundColor: Colors.surfaceSecondary, borderRadius: 8 },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", paddingHorizontal: 40 },
});
