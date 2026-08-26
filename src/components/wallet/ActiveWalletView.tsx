// src/components/wallet/ActiveWalletView.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../constants/colors";
import { WalletData } from "../../types/wallet";
import { TransactionsList } from "./TransactionsList";
import { WalletAnalytics } from "./WalletAnalytics";

type TabType = "overview" | "transactions" | "analytics";

interface Props {
  walletData: WalletData;
  refreshing: boolean;
  onRefresh: () => void;
  onAddMoney: () => void;
}

export function ActiveWalletView({
  walletData,
  refreshing,
  onRefresh,
  onAddMoney,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Reserved paisa kharch nahi ho sakta, isliye "low" ka faisla available par
  // hona chahiye - warna sab reserved hote hue bhi wallet bhara dikhta hai
  const isLowBalance =
    walletData.availableBalance < walletData.lowBalanceThreshold;
  const monthlyPercent =
    walletData.maxMonthlyTopUp > 0
      ? (walletData.currentMonthTopUp / walletData.maxMonthlyTopUp) * 100
      : 0;

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* ═══════════════════════════════════
          MAIN BALANCE CARD
      ═══════════════════════════════════ */}
      <View style={styles.balanceCardWrap}>
        <LinearGradient
          colors={[Colors.primary, "#0A7061", "#128C7E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          {/* Decorative */}
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={styles.circle3} />

          {/* Header */}
          <View style={styles.balanceHeader}>
            <View style={styles.balanceHeaderLeft}>
              <Ionicons name="wallet" size={18} color="rgba(255,255,255,0.9)" />
              <Text style={styles.balanceLabel}>Available Balance</Text>
            </View>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyBadgeText}>
                {walletData.currency}
              </Text>
            </View>
          </View>

          {/* Amount */}
          {/* Label "Available Balance" hai to value bhi available honi chahiye.
              Pehle yahan poora balance dikhta tha, aur neeche details mein wahi
              label available balance ke saath - do alag numbers, ek hi naam.
              Campaign chalte waqt paisa reserve hota hai to lagta tha amount
              apne aap ghat-badh raha hai. */}
          <Text style={styles.balanceAmount}>
            ₹
            {walletData.availableBalance.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>

          {walletData.reservedBalance > 0 && (
            <Text style={styles.reservedText}>
              ₹{walletData.reservedBalance.toFixed(2)} reserved &middot; ₹
              {walletData.balance.toFixed(2)} total
            </Text>
          )}

          {/* Low Balance Warning */}
          {isLowBalance && (
            <View style={styles.lowBalanceWarn}>
              <Ionicons name="warning" size={14} color="#fff" />
              <Text style={styles.lowBalanceText}>
                Low balance! Add money to avoid interruption.
              </Text>
            </View>
          )}

          {/* Monthly Usage */}
          {walletData.maxMonthlyTopUp > 0 && (
            <View style={styles.monthlyContainer}>
              <View style={styles.monthlyHeader}>
                <Text style={styles.monthlyLabel}>Monthly top-up</Text>
                <Text style={styles.monthlyValue}>
                  ₹{walletData.currentMonthTopUp.toLocaleString("en-IN")} / ₹
                  {walletData.maxMonthlyTopUp.toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={styles.monthlyBar}>
                <View
                  style={[
                    styles.monthlyBarFill,
                    { width: `${Math.min(monthlyPercent, 100)}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Add Money Button */}
          <TouchableOpacity
            style={styles.addMoneyBtn}
            onPress={onAddMoney}
            activeOpacity={0.9}
          >
            <Ionicons name="add-circle" size={18} color={Colors.primary} />
            <Text style={styles.addMoneyText}>Add Money</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Flagged Warning */}
      {walletData.flagged && (
        <View style={styles.flaggedCard}>
          <Ionicons name="alert-circle" size={20} color={Colors.error} />
          <View style={styles.flaggedContent}>
            <Text style={styles.flaggedTitle}>Wallet Flagged</Text>
            <Text style={styles.flaggedText}>
              {walletData.flagReason ||
                "Please contact support for more information."}
            </Text>
          </View>
        </View>
      )}

      {/* ═══════════════════════════════════
          CREDIT LINE (if enabled)
      ═══════════════════════════════════ */}
      {walletData.creditEnabled && (
        <View style={styles.creditCard}>
          <View style={styles.creditHeader}>
            <View style={styles.creditIconBox}>
              <Ionicons name="card" size={16} color={Colors.info} />
            </View>
            <Text style={styles.creditLabel}>Credit Line</Text>
          </View>

          <Text style={styles.creditAmount}>
            ₹
            {walletData.availableCredit.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </Text>
          <Text style={styles.creditLimit}>
            of ₹{walletData.creditLimit.toLocaleString("en-IN")} limit
          </Text>

          <View style={styles.creditBar}>
            <View
              style={[
                styles.creditBarFill,
                {
                  width: `${
                    walletData.creditLimit > 0
                      ? (walletData.creditUsed / walletData.creditLimit) * 100
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
          <Text style={styles.creditUsed}>
            ₹{walletData.creditUsed.toLocaleString("en-IN")} used
          </Text>
        </View>
      )}

      {/* ═══════════════════════════════════
          STATS GRID
      ═══════════════════════════════════ */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Total Added"
          value={walletData.totalCredited}
          icon="trending-up"
          color={Colors.success}
        />
        <StatCard
          label="Total Used"
          value={walletData.totalDebited}
          icon="trending-down"
          color={Colors.error}
        />
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          label="Alert Threshold"
          value={walletData.lowBalanceThreshold}
          icon="notifications"
          color={Colors.warning}
        />
        <StatCard
          label="Max Per Top-up"
          value={walletData.maxTopUpAmount}
          icon="card"
          color={Colors.info}
        />
      </View>

      {/* Last Transaction */}
      {walletData.lastTransactionAt && (
        <View style={styles.lastTxCard}>
          <Ionicons name="time" size={14} color={Colors.textMuted} />
          <Text style={styles.lastTxText}>
            Last transaction:{" "}
            {new Date(walletData.lastTransactionAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      )}

      {/* ═══════════════════════════════════
          TABS
      ═══════════════════════════════════ */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsHeader}>
          {[
            { id: "overview" as const, label: "Overview", icon: "grid" as const },
            {
              id: "transactions" as const,
              label: "Transactions",
              icon: "list" as const,
            },
            {
              id: "analytics" as const,
              label: "Analytics",
              icon: "bar-chart" as const,
            },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabBtn,
                activeTab === tab.id && styles.tabBtnActive,
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={activeTab === tab.id ? Colors.primary : Colors.textMuted}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>
          {activeTab === "overview" && <OverviewTab walletData={walletData} />}
          {activeTab === "transactions" && <TransactionsList />}
          {activeTab === "analytics" && <WalletAnalytics />}
        </View>
      </View>

      {/* Security Note */}
      <View style={styles.securityNote}>
        <Ionicons name="shield-checkmark" size={18} color={Colors.info} />
        <Text style={styles.securityText}>
          <Text style={styles.securityBold}>Security Note:</Text> Wallet balance
          can only be used for Meta API payments. Direct withdrawals are not
          allowed.
        </Text>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ═══════════════════════════════════
// STAT CARD
// ═══════════════════════════════════
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statValue}>
        ₹
        {value.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ═══════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════
function OverviewTab({ walletData }: { walletData: WalletData }) {
  return (
    <View style={styles.overviewContainer}>
      <Text style={styles.overviewTitle}>Wallet Details</Text>

      <View style={styles.detailsGrid}>
        <DetailItem
          label="Available Balance"
          value={`₹${walletData.availableBalance.toFixed(2)}`}
          color={Colors.primary}
        />
        <DetailItem
          label="Reserved"
          value={`₹${walletData.reservedBalance.toFixed(2)}`}
          color={Colors.warning}
        />
        {walletData.creditEnabled && (
          <>
            <DetailItem
              label="Credit Limit"
              value={`₹${walletData.creditLimit.toFixed(2)}`}
              color={Colors.info}
            />
            <DetailItem
              label="Credit Used"
              value={`₹${walletData.creditUsed.toFixed(2)}`}
              color={Colors.error}
            />
          </>
        )}
        <DetailItem
          label="Monthly Limit"
          value={`₹${walletData.maxMonthlyTopUp.toLocaleString("en-IN")}`}
          color={Colors.textPrimary}
        />
        <DetailItem
          label="Currency"
          value={walletData.currency}
          color={Colors.textPrimary}
        />
      </View>
    </View>
  );
}

function DetailItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, { color }]}>{value}</Text>
    </View>
  );
}

// ═══════════════════════════════════
// STYLES
// ═══════════════════════════════════
const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 30,
  },

  // Balance Card
  balanceCardWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  balanceCard: {
    padding: 22,
    minHeight: 220,
    position: "relative",
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -70,
    right: -50,
  },
  circle2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -40,
    left: -20,
  },
  circle3: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: 30,
    left: 20,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  currencyBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currencyBadgeText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "700",
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1.5,
    marginTop: 4,
  },
  reservedText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  lowBalanceWarn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  lowBalanceText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    flex: 1,
  },
  monthlyContainer: {
    marginTop: 16,
  },
  monthlyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  monthlyLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
  },
  monthlyValue: {
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  monthlyBar: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  monthlyBarFill: {
    height: "100%",
    backgroundColor: "#fff",
  },
  addMoneyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    marginTop: 16,
  },
  addMoneyText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },

  // Flagged
  flaggedCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${Colors.error}10`,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  flaggedContent: { flex: 1 },
  flaggedTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.error,
    marginBottom: 2,
  },
  flaggedText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },

  // Credit Card
  creditCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  creditHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  creditIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${Colors.info}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  creditLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  creditAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  creditLimit: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 10,
  },
  creditBar: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  creditBarFill: {
    height: "100%",
    backgroundColor: Colors.info,
    borderRadius: 3,
  },
  creditUsed: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginTop: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: "500",
  },

  // Last Transaction
  lastTxCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 10,
    gap: 6,
  },
  lastTxText: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Tabs
  tabsContainer: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tabsHeader: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  tabContent: {
    padding: 16,
    minHeight: 200,
  },

  // Overview
  overviewContainer: {},
  overviewTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  detailsGrid: {
    gap: 8,
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
  },

  // Security Note
  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${Colors.info}10`,
    borderWidth: 1,
    borderColor: `${Colors.info}20`,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  securityBold: {
    fontWeight: "700",
    color: Colors.info,
  },
});
