// app/(app)/settings/whatsapp.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Platform,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ExpoLinking from "expo-linking";
import { meta as metaApi, whatsapp as whatsappApi } from "../../../src/services/api";
import { useAuth } from "../../../src/context/AuthContext";
import { Colors } from "../../../src/constants/colors";
import { WhatsAppAccount } from "../../../src/types/whatsapp";

const getQualityConfig = (rating: string | null) => {
  switch (rating?.toUpperCase()) {
    case "GREEN":
    case "HIGH":
      return { label: "High", color: Colors.success, bg: `${Colors.success}15` };
    case "YELLOW":
    case "MEDIUM":
      return { label: "Medium", color: Colors.warning, bg: `${Colors.warning}15` };
    case "RED":
    case "LOW":
      return { label: "Low", color: Colors.error, bg: `${Colors.error}15` };
    default:
      return { label: "Unknown", color: Colors.textMuted, bg: Colors.surfaceSecondary };
  }
};

const getMessagingTierLabel = (
  tier: string | null,
  status?: "ASSIGNED" | "PENDING" | "SYNCING"
): string => {
  if (!tier) {
    // Meta ne tier assign hi nahi kiya (naya / unverified number) - ise
    // "Syncing..." dikhana jhooth hoga, wo kabhi aayega hi nahi jab tak
    // Meta khud assign na kare.
    if (status === "PENDING") return "Not available yet";
    return "Syncing...";
  }
  const tierMap: Record<string, string> = {
    TIER_50: "50/day",
    TIER_250: "250/day",
    TIER_1K: "1K/day",
    TIER_10K: "10K/day",
    TIER_100K: "100K/day",
    TIER_UNLIMITED: "Unlimited",
  };
  return tierMap[tier] || tier;
};

const getVerificationConfig = (status: string | null) => {
  switch (status?.toUpperCase()) {
    case "VERIFIED":
      return { label: "Verified", color: Colors.success, icon: "checkmark-circle" as const };
    case "EXPIRED":
      return { label: "Expired", color: Colors.error, icon: "close-circle" as const };
    case "PENDING":
      return { label: "Pending", color: Colors.warning, icon: "time" as const };
    default:
      return { label: status || "Unknown", color: Colors.textMuted, icon: "help-circle" as const };
  }
};

export default function WhatsAppSettingsScreen() {
  const { organization } = useAuth();
  const pathname = usePathname();

  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const [disconnectModal, setDisconnectModal] = useState<{
    accountId: string;
    phoneNumber: string;
  } | null>(null);

  const mountedRef = useRef(true);

  // ═══════════════════════════════════
  // FETCH ACCOUNTS
  // ═══════════════════════════════════

  const fetchAccounts = useCallback(async (silent = false) => {
    try {
      if (!silent && mountedRef.current) setLoading(true);

      const res = await metaApi.getAccounts();
      const data = res.data?.data;

      let list: WhatsAppAccount[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (Array.isArray((data as any)?.accounts)) {
        list = (data as any).accounts;
      }

      if (mountedRef.current) setAccounts(list);
    } catch (err: any) {
      console.error("Failed to fetch accounts:", err);
      if (!silent) Alert.alert("Error", "Failed to load accounts");
    } finally {
      if (!silent && mountedRef.current) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Retry fetch (backend DB commit delay after connect)
  const fetchAccountsWithRetry = useCallback(async () => {
    await fetchAccounts(false);

    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const res = await metaApi.getAccounts();
        const data = res.data?.data;
        let list: WhatsAppAccount[] = [];
        if (Array.isArray(data)) list = data;
        else if (Array.isArray((data as any)?.accounts)) list = (data as any).accounts;

        if (list.length > 0) {
          if (mountedRef.current) setAccounts(list);
          break;
        }
      } catch {
        // ignore
      }
    }
  }, [fetchAccounts]);

  // ═══════════════════════════════════
  // SYNC QUALITY
  // ═══════════════════════════════════

  const syncAllQuality = useCallback(async (showToast = false) => {
    try {
      setSyncing(true);
      const res = await whatsappApi.syncAllAccountsQuality();
      const data = res.data?.data as any;

      if (data?.accounts && Array.isArray(data.accounts) && mountedRef.current) {
        setAccounts(data.accounts);
        setLastSyncTime(new Date());
      }

      if (showToast) {
        const stats = data?.syncStats;
        if (stats?.synced > 0) {
          Alert.alert("Success", `Synced ${stats.synced} account(s)`);
        } else if (stats?.total === 0) {
          Alert.alert("Info", "No connected accounts to sync");
        }
      }
    } catch (err: any) {
      console.error("Sync failed:", err);
      if (showToast) Alert.alert("Error", "Failed to sync accounts");
    } finally {
      if (mountedRef.current) setSyncing(false);
    }
  }, []);

  const syncSingleAccount = async (accountId: string) => {
    try {
      setSyncingAccountId(accountId);
      const res = await whatsappApi.syncAccountQuality(accountId);
      const updated = res.data?.data;

      if (updated && mountedRef.current) {
        setAccounts((prev) =>
          prev.map((acc) => (acc.id === accountId ? { ...acc, ...updated } : acc))
        );
        setLastSyncTime(new Date());
      }
    } catch (err: any) {
      Alert.alert("Error", "Failed to refresh account");
    } finally {
      if (mountedRef.current) setSyncingAccountId(null);
    }
  };

  // ═══════════════════════════════════
  // INITIAL LOAD
  // ═══════════════════════════════════

  useEffect(() => {
    mountedRef.current = true;
    fetchAccounts();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchAccounts]);

  // Refresh on app focus or route change (after coming back from WebView / browser)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        fetchAccountsWithRetry();
      }
    });
    return () => sub.remove();
  }, [fetchAccountsWithRetry]);

  useEffect(() => {
    if (pathname.includes("whatsapp")) {
      fetchAccountsWithRetry();
    }
  }, [pathname, fetchAccountsWithRetry]);

  // ═══════════════════════════════════
  // DEEP LINK HANDLER
  // ═══════════════════════════════════

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log("🔗 Deep link received:", event.url);

      if (event.url.includes("meta-connected")) {
        // Refresh accounts
        setTimeout(() => {
          fetchAccountsWithRetry();
        }, 1000);

        Alert.alert(
          "Success! 🎉",
          "WhatsApp connected successfully. Loading your account...",
          [{ text: "OK" }]
        );
      } else if (event.url.includes("meta-error")) {
        try {
          const url = new URL(event.url);
          const errorMsg = url.searchParams.get("error") || "Connection failed";
          Alert.alert("Connection Failed", errorMsg);
        } catch {
          Alert.alert("Connection Failed", "An error occurred during WhatsApp connection");
        }
      }
    };

    const subscription = ExpoLinking.addEventListener("url", handleDeepLink);

    // Check if app opened via deep link
    ExpoLinking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // Auto-refresh accounts when returning to the app
    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        fetchAccounts(true);
      }
    });

    return () => {
      subscription.remove();
      appStateSub.remove();
    };
  }, [fetchAccountsWithRetry, fetchAccounts]);

  // ═══════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccounts();
  };

  const handleConnect = async () => {
    const connectedAccount = accounts.find((a) => a.status === "CONNECTED");
    if (connectedAccount) {
      Alert.alert(
        "Already Connected",
        `${connectedAccount.phoneNumber} is already connected. Please disconnect it first to add a new account.`
      );
      return;
    }

    const settingsUrl = "https://wabmeta.com/dashboard/settings";
    try {
      const canOpen = await ExpoLinking.canOpenURL(settingsUrl);
      if (canOpen) {
        await ExpoLinking.openURL(settingsUrl);
      } else {
        Alert.alert(
          "Open Web Dashboard",
          "Please visit " + settingsUrl + " to connect your WhatsApp Business account."
        );
      }
    } catch (err) {
      console.error("Error opening URL:", err);
      Alert.alert("Error", "Failed to open browser");
    }
  };

  const handleDisconnect = () => {
    if (!disconnectModal) return;

    (async () => {
      try {
        await metaApi.disconnect(disconnectModal.accountId);
        Alert.alert("Success", "Account disconnected");
        setDisconnectModal(null);
        fetchAccounts();
      } catch (err: any) {
        Alert.alert(
          "Error",
          err?.response?.data?.message || "Failed to disconnect"
        );
      }
    })();
  };

  const handleSetDefault = async (accountId: string) => {
    try {
      await metaApi.setDefault(accountId);
      Alert.alert("Success", "Default account updated");
      fetchAccounts();
    } catch (err: any) {
      Alert.alert("Error", "Failed to set default");
    }
  };

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const connectedAccounts = accounts.filter((a) => a.status === "CONNECTED");
  const hasConnected = connectedAccounts.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>WhatsApp</Text>
          <Text style={styles.headerSubtitle}>
            {hasConnected ? "Connected" : "Not connected"}
          </Text>
        </View>
        {hasConnected && (
          <TouchableOpacity
            onPress={() => syncAllQuality(true)}
            style={styles.iconBtn}
            disabled={syncing}
          >
            <Ionicons
              name="refresh"
              size={22}
              color={syncing ? Colors.textMuted : Colors.textPrimary}
            />
          </TouchableOpacity>
        )}
        {!hasConnected && <View style={{ width: 40 }} />}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {hasConnected ? (
          <>
            {/* Hero Card */}
            <View style={styles.heroWrap}>
              <LinearGradient
                colors={["#25D366", "#128C7E"]}
                style={styles.heroCard}
              >
                <View style={styles.heroCircle1} />
                <View style={styles.heroCircle2} />

                <View style={styles.heroContent}>
                  <View style={styles.heroIcon}>
                    <Ionicons name="logo-whatsapp" size={32} color="#fff" />
                  </View>
                  <Text style={styles.heroTitle}>Connected</Text>
                  <Text style={styles.heroSubtitle}>
                    {connectedAccounts.length} account
                    {connectedAccounts.length !== 1 ? "s" : ""} active
                  </Text>

                  {lastSyncTime && (
                    <View style={styles.syncTime}>
                      <Ionicons
                        name="time"
                        size={12}
                        color="rgba(255,255,255,0.8)"
                      />
                      <Text style={styles.syncTimeText}>
                        Updated{" "}
                        {new Date(lastSyncTime).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </View>

            {/* Accounts List */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Connected Accounts</Text>
            </View>

            {connectedAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                syncing={syncingAccountId === account.id}
                canSetDefault={connectedAccounts.length > 1 && !account.isDefault}
                onRefresh={() => syncSingleAccount(account.id)}
                onSetDefault={() => handleSetDefault(account.id)}
                onDisconnect={() =>
                  setDisconnectModal({
                    accountId: account.id,
                    phoneNumber: account.phoneNumber,
                  })
                }
              />
            ))}

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons
                name="information-circle"
                size={20}
                color={Colors.info}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>About Quality Rating</Text>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: "700" }}>High (Green):</Text>{" "}
                  Excellent quality, no restrictions.{"\n"}
                  <Text style={{ fontWeight: "700" }}>Medium (Yellow):</Text>{" "}
                  Some user complaints, monitor activity.{"\n"}
                  <Text style={{ fontWeight: "700" }}>Low (Red):</Text> Many
                  complaints, may face restrictions.
                </Text>
              </View>
            </View>
          </>
        ) : (
          <ConnectView onConnect={handleConnect} />
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Disconnect Modal */}
      {disconnectModal && (
        <Modal
          visible={!!disconnectModal}
          transparent
          animationType="fade"
          onRequestClose={() => setDisconnectModal(null)}
        >
          <View style={modalStyles.overlay}>
            <View style={modalStyles.modal}>
              <View style={modalStyles.iconWrap}>
                <Ionicons
                  name="warning"
                  size={28}
                  color={Colors.error}
                />
              </View>

              <Text style={modalStyles.title}>Disconnect WhatsApp?</Text>
              <Text style={modalStyles.text}>
                Disconnecting{" "}
                <Text style={{ fontWeight: "700" }}>
                  {disconnectModal.phoneNumber}
                </Text>{" "}
                will:
              </Text>

              <View style={modalStyles.list}>
                {[
                  "Pause all active campaigns",
                  "Stop all chatbot flows",
                  "Disable all automations",
                  "Block new inbox messages",
                  "Disable webhook notifications",
                ].map((item, i) => (
                  <View key={i} style={modalStyles.listItem}>
                    <Ionicons
                      name="ellipse"
                      size={5}
                      color={Colors.textMuted}
                    />
                    <Text style={modalStyles.listText}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={modalStyles.actions}>
                <TouchableOpacity
                  style={modalStyles.cancelBtn}
                  onPress={() => setDisconnectModal(null)}
                >
                  <Text style={modalStyles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={modalStyles.confirmBtn}
                  onPress={handleDisconnect}
                >
                  <Text style={modalStyles.confirmBtnText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════
// ACCOUNT CARD
// ═══════════════════════════════════

function AccountCard({
  account,
  syncing,
  canSetDefault,
  onRefresh,
  onSetDefault,
  onDisconnect,
}: {
  account: WhatsAppAccount;
  syncing: boolean;
  canSetDefault: boolean;
  onRefresh: () => void;
  onSetDefault: () => void;
  onDisconnect: () => void;
}) {
  const quality = getQualityConfig(account.qualityRating);
  const verify = getVerificationConfig(account.codeVerificationStatus);

  const phoneDisplay = account.phoneNumber?.startsWith("+")
    ? account.phoneNumber
    : `+${account.phoneNumber}`;

  return (
    <View style={styles.accountCard}>
      {/* Header */}
      <View style={styles.accountHeader}>
        <View style={styles.accountHeaderLeft}>
          <View style={styles.phoneIcon}>
            <Ionicons name="call" size={20} color="#25D366" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.phoneRow}>
              <Text style={styles.phoneNumber}>{phoneDisplay}</Text>
              {account.isDefault && (
                <View style={styles.defaultBadge}>
                  <Ionicons name="star" size={10} color={Colors.warning} />
                  <Text style={styles.defaultText}>DEFAULT</Text>
                </View>
              )}
            </View>
            <Text style={styles.accountName} numberOfLines={1}>
              {account.verifiedName || account.displayName || "Unnamed"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onRefresh}
          style={styles.refreshBtn}
          disabled={syncing}
        >
          <Ionicons
            name="refresh"
            size={18}
            color={syncing ? Colors.textMuted : Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Metrics */}
      <View style={styles.metricsGrid}>
        {/* Quality */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons name="trending-up" size={12} color={Colors.textMuted} />
            <Text style={styles.metricLabel}>Quality</Text>
          </View>
          <View
            style={[
              styles.qualityBadge,
              { backgroundColor: quality.bg },
            ]}
          >
            <View
              style={[styles.qualityDot, { backgroundColor: quality.color }]}
            />
            <Text style={[styles.qualityText, { color: quality.color }]}>
              {quality.label}
            </Text>
          </View>
        </View>

        {/* Messaging limit + 24h usage */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons name="pulse" size={12} color={Colors.textMuted} />
            <Text style={styles.metricLabel}>Limit</Text>
          </View>
          <Text style={styles.metricValue}>
            {getMessagingTierLabel(
              account.messagingLimit,
              account.messagingTierStatus
            )}
          </Text>
          <Text style={styles.metricSubtext}>
            {account.messagingTierStatus === "PENDING"
              ? "Meta assigns after first sends"
              : typeof account.messagingUsed24h === "number"
              ? account.messagingLimitPerDay == null
                ? `${account.messagingUsed24h} used · 24h`
                : `${account.messagingUsed24h}/${account.messagingLimitPerDay} used · 24h`
              : "per day"}
          </Text>

          {/* Usage bar - sirf jab limit finite ho */}
          {typeof account.messagingUsed24h === "number" &&
            typeof account.messagingLimitPerDay === "number" &&
            account.messagingLimitPerDay > 0 && (
              <View style={styles.usageTrack}>
                <View
                  style={[
                    styles.usageFill,
                    {
                      width: `${Math.min(
                        100,
                        (account.messagingUsed24h /
                          account.messagingLimitPerDay) *
                          100
                      )}%`,
                      backgroundColor:
                        account.messagingUsed24h /
                          account.messagingLimitPerDay >=
                        0.9
                          ? Colors.error
                          : account.messagingUsed24h /
                              account.messagingLimitPerDay >=
                            0.7
                          ? Colors.warning
                          : Colors.success,
                    },
                  ]}
                />
              </View>
            )}
        </View>

        {/* Verification */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons
              name="shield-checkmark"
              size={12}
              color={Colors.textMuted}
            />
            <Text style={styles.metricLabel}>Status</Text>
          </View>
          <View
            style={[
              styles.qualityBadge,
              { backgroundColor: `${verify.color}15` },
            ]}
          >
            <Ionicons name={verify.icon} size={11} color={verify.color} />
            <Text style={[styles.qualityText, { color: verify.color }]}>
              {verify.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.accountActions}>
        {canSetDefault && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.setDefaultBtn]}
            onPress={onSetDefault}
          >
            <Ionicons name="star" size={14} color={Colors.info} />
            <Text style={[styles.actionText, { color: Colors.info }]}>
              Set Default
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, styles.disconnectBtn]}
          onPress={onDisconnect}
        >
          <Ionicons name="trash-outline" size={14} color={Colors.error} />
          <Text style={[styles.actionText, { color: Colors.error }]}>
            Disconnect
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════
// CONNECT VIEW (Empty State)
// ═══════════════════════════════════

function ConnectView({ onConnect }: { onConnect: () => void }) {
  return (
    <View style={styles.connectContainer}>
      <TouchableOpacity
        style={styles.connectCardWrap}
        onPress={onConnect}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={["#25D366", "#128C7E"]}
          style={styles.connectCard}
        >
          <View style={styles.connectIcon}>
            <Ionicons name="logo-whatsapp" size={44} color="#fff" />
          </View>

          <Text style={styles.connectTitle}>Connect WhatsApp Business</Text>
          <Text style={styles.connectDesc}>
            Link your WhatsApp Business Account to start sending messages,
            running campaigns and managing chats
          </Text>

          <View style={styles.connectBtn}>
            <Text style={styles.connectBtnText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color="#25D366" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Features */}
      <View style={styles.featuresList}>
        <Text style={styles.featuresTitle}>What you get:</Text>
        {[
          {
            icon: "chatbubbles" as const,
            title: "Send Messages",
            desc: "Reach your customers via WhatsApp",
          },
          {
            icon: "megaphone" as const,
            title: "Run Campaigns",
            desc: "Send bulk template messages",
          },
          {
            icon: "analytics" as const,
            title: "View Analytics",
            desc: "Track delivery, reads and engagement",
          },
          {
            icon: "hardware-chip" as const,
            title: "Chatbots",
            desc: "Automate customer conversations",
          },
        ].map((feature, i) => (
          <View key={i} style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name={feature.icon} size={18} color={Colors.primary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Prerequisites */}
      <View style={styles.prereqCard}>
        <View style={styles.prereqHeader}>
          <Ionicons
            name="information-circle"
            size={18}
            color={Colors.warning}
          />
          <Text style={styles.prereqTitle}>Before you begin</Text>
        </View>
        <View style={styles.prereqList}>
          {[
            "Facebook Business account",
            "Valid business phone number",
            "Payment method (for Meta billing)",
          ].map((item, i) => (
            <View key={i} style={styles.prereqItem}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={Colors.success}
              />
              <Text style={styles.prereqText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════
// STYLES
// ═══════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
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
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Hero
  heroWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#25D366",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  heroCard: {
    padding: 24,
    position: "relative",
    overflow: "hidden",
  },
  heroCircle1: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.1)",
    top: -50,
    right: -30,
  },
  heroCircle2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -30,
    left: -20,
  },
  heroContent: {
    alignItems: "center",
    position: "relative",
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },
  syncTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncTimeText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },

  // Section
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Account Card
  accountCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  accountHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  phoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#25D36615",
    justifyContent: "center",
    alignItems: "center",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  phoneNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.warning}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  defaultText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.warning,
    letterSpacing: 0.3,
  },
  accountName: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },

  // Metrics
  metricsGrid: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  metricSubtext: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 2,
  },
  usageTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    marginTop: 6,
    overflow: "hidden",
  },
  usageFill: {
    height: "100%",
    borderRadius: 2,
  },
  qualityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: "flex-start",
  },
  qualityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  qualityText: {
    fontSize: 10,
    fontWeight: "800",
  },

  // Actions
  accountActions: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  setDefaultBtn: {
    backgroundColor: `${Colors.info}10`,
  },
  disconnectBtn: {
    backgroundColor: `${Colors.error}10`,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Info Card
  infoCard: {
    flexDirection: "row",
    backgroundColor: `${Colors.info}10`,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: `${Colors.info}20`,
  },
  infoContent: { flex: 1 },
  infoTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.info,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },

  // Connect View
  connectContainer: {
    padding: 16,
  },
  connectCardWrap: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#25D366",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 24,
  },
  connectCard: {
    padding: 28,
    alignItems: "center",
  },
  connectIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  connectTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  connectDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  connectBtnText: {
    color: "#25D366",
    fontSize: 15,
    fontWeight: "800",
  },

  featuresList: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  featuresTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  featureContent: { flex: 1 },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  featureDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  prereqCard: {
    backgroundColor: `${Colors.warning}10`,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.warning}30`,
  },
  prereqHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  prereqTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.warning,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  prereqList: {
    gap: 8,
  },
  prereqItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  prereqText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.error}15`,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  list: {
    gap: 8,
    marginBottom: 20,
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listText: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.error,
    alignItems: "center",
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
