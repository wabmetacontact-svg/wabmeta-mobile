// app/(app)/(tabs)/index.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../../src/context/AuthContext";
import { useSocket } from "../../../src/context/SocketContext";
import { useNotifications } from "../../../src/context/NotificationsContext";
import { dashboard, wallet } from "../../../src/services/api";
import { StatsCard } from "../../../src/components/dashboard/StatsCard";
import { QuickAction } from "../../../src/components/dashboard/QuickAction";
import { Colors } from "../../../src/constants/colors";

// ============================================
// TYPES - Backend response ke exact match
// ============================================

interface DashboardStats {
  contacts: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  messages: {
    sent: number;
    received: number;
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  delivery: {
    delivered: number;
    read: number;
    failed: number;
    deliveryRate: number;
    readRate: number;
    failureRate: number;
  };
  conversations: {
    total: number;
    active: number;
    unread: number;
  };
  campaigns: {
    total: number;
    active: number;
    completed: number;
    thisMonth: number;
  };
  templates: {
    total: number;
    approved: number;
  };
  whatsapp: {
    connected: number;
  };
}

interface WidgetData {
  messagesOverview: Array<{
    date: string;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }>;
  recentCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    totalContacts: number;
    sentCount: number;
    deliveredCount: number;
    deliveryRate: number;
    createdAt: string;
  }>;
  recentConversations: Array<{
    id: string;
    contactName: string;
    phone: string;
    avatar?: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
  }>;
  summary: {
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalFailed: number;
    deliveryRate: number;
    readRate: number;
  };
}

interface ActivityItem {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  user?: {
    name: string;
    avatar?: string;
  };
}

interface WalletData {
  balance: number;
  currency: string;
}

// ============================================
// QUICK ACTIONS CONFIG
// ============================================

const QUICK_ACTIONS = [
  {
    id: "1",
    icon: "send" as const,
    label: "Campaign",
    color: "#8B5CF6",
    route: "/(app)/campaigns/create",
  },
  {
    id: "2",
    icon: "person-add" as const,
    label: "Contact",
    color: "#3B82F6",
    route: "/(app)/(tabs)/contacts",
  },
  {
    id: "3",
    icon: "document-text" as const,
    label: "Template",
    color: "#F59E0B",
    route: "/(app)/templates",
  },
  {
    id: "4",
    icon: "chatbubbles" as const,
    label: "Inbox",
    color: "#10B981",
    route: "/(app)/(tabs)/inbox",
  },
  {
    id: "5",
    icon: "hardware-chip" as const,
    label: "Chatbot",
    color: "#EC4899",
    route: "/(app)/chatbot",
  },
  {
    id: "6",
    icon: "bar-chart" as const,
    label: "Reports",
    color: "#06B6D4",
    route: "/(app)/reports",
  },
  {
    id: "7",
    icon: "people" as const,
    label: "CRM",
    color: "#F97316",
    route: "/(app)/crm",
  },
  {
    id: "8",
    icon: "wallet" as const,
    label: "Wallet",
    color: "#0A6B5C",
    route: "/(app)/wallet",
  },
];

// ============================================
// HELPERS
// ============================================

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good Morning";
  if (h >= 12 && h < 17) return "Good Afternoon";
  if (h >= 17 && h < 22) return "Good Evening";
  return "Good Night";
};

const formatRelativeTime = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case "COMPLETED":
      return Colors.success;
    case "RUNNING":
    case "ACTIVE":
      return Colors.info;
    case "SCHEDULED":
    case "PAUSED":
      return Colors.warning;
    case "FAILED":
      return Colors.error;
    default:
      return Colors.textMuted;
  }
};

// ============================================
// MAIN DASHBOARD
// ============================================

export default function DashboardScreen() {
  const { user, organization } = useAuth();
  const { socket } = useSocket();
  const { unreadCount } = useNotifications();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [widgets, setWidgets] = useState<WidgetData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [walletData, setWalletData] = useState<WalletData | null>(null);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingWidgets, setLoadingWidgets] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============================================
  // FETCH FUNCTIONS
  // ============================================

  const fetchStats = useCallback(async () => {
    try {
      const res = await dashboard.getStats();
      console.log("📊 Stats response:", JSON.stringify(res.data, null, 2));

      if (res?.data?.success && res?.data?.data) {
        setStats(res.data.data as DashboardStats);
      }
    } catch (err: any) {
      console.error("❌ Stats error:", err?.response?.data?.message || err.message);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchWidgets = useCallback(async () => {
    try {
      const res = await dashboard.getWidgets(7);
      console.log("📈 Widgets response:", JSON.stringify(res.data, null, 2));

      if (res?.data?.success && res?.data?.data) {
        setWidgets(res.data.data as WidgetData);
      }
    } catch (err: any) {
      console.error("❌ Widgets error:", err?.response?.data?.message || err.message);
    } finally {
      setLoadingWidgets(false);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      // ✅ Add getActivity to api.ts if not present
      const res = await dashboard.getActivity?.(10);
      console.log("📝 Activity response:", JSON.stringify(res?.data, null, 2));

      if (res?.data?.success && Array.isArray(res?.data?.data)) {
        setActivity(res.data.data);
      }
    } catch (err: any) {
      console.error("❌ Activity error:", err?.response?.data?.message || err.message);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await wallet.getWallet();
      console.log("💰 Wallet response:", JSON.stringify(res.data, null, 2));

      if (res?.data?.success && res?.data?.data) {
        const data = res.data.data as any;
        setWalletData({
          balance: Number(data?.balance) || 0,
          currency: data?.currency || "INR",
        });
      }
    } catch (err: any) {
      console.error("❌ Wallet error:", err?.response?.data?.message || err.message);
    }
  }, []);

  const fetchAll = useCallback(() => {
    fetchStats();
    fetchWidgets();
    fetchActivity();
    fetchWallet();
  }, [fetchStats, fetchWidgets, fetchActivity, fetchWallet]);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Socket updates - debounced
  useEffect(() => {
    if (!socket) return;

    const debouncedRefetch = () => {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      refetchTimerRef.current = setTimeout(() => {
        fetchStats();
        fetchWidgets();
      }, 3000);
    };

    socket.on("message:new", debouncedRefetch);
    socket.on("message:status", debouncedRefetch);
    socket.on("campaign:completed", debouncedRefetch);

    return () => {
      socket.off("message:new", debouncedRefetch);
      socket.off("message:status", debouncedRefetch);
      socket.off("campaign:completed", debouncedRefetch);
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    };
  }, [socket, fetchStats, fetchWidgets]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchWidgets(), fetchActivity(), fetchWallet()]);
    setRefreshing(false);
  }, [fetchStats, fetchWidgets, fetchActivity, fetchWallet]);

  // ============================================
  // EXTRACT DATA WITH SAFE DEFAULTS
  // ============================================

  const contactsTotal = stats?.contacts?.total ?? 0;
  const messagesSent = stats?.messages?.sent ?? 0;
  const deliveryRate = stats?.delivery?.deliveryRate ?? 0;
  const totalDelivered = stats?.delivery?.delivered ?? 0;
  const totalFailed = stats?.delivery?.failed ?? 0;
  const activeCampaigns = stats?.campaigns?.active ?? 0;
  const totalCampaigns = stats?.campaigns?.total ?? 0;
  const conversationsUnread = stats?.conversations?.unread ?? 0;
  const conversationsActive = stats?.conversations?.active ?? 0;
  const templatesApproved = stats?.templates?.approved ?? 0;
  const whatsappConnected = stats?.whatsapp?.connected ?? 0;
  const contactsGrowth = stats?.contacts?.growth ?? 0;
  const messagesGrowth = stats?.messages?.growth ?? 0;

  const recentCampaigns = widgets?.recentCampaigns || [];
  const hasAnyData = contactsTotal > 0 || messagesSent > 0 || activeCampaigns > 0;
  const isNewUser = !loadingStats && !hasAnyData;

  const getUserName = () => {
    if (!user) return "there";
    return user.firstName || user.name?.split(" ")[0] || "there";
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (loadingStats && !stats) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ═══════════════════════════════════
            HEADER
        ═══════════════════════════════════ */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.userName}>{getUserName()}</Text>
            {organization && (
              <View style={styles.orgBadge}>
                <Ionicons name="business" size={11} color={Colors.primary} />
                <Text style={styles.orgText} numberOfLines={1}>
                  {organization.name}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push("/(app)/notifications" as any)}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={Colors.textPrimary}
            />
            {(unreadCount > 0 || conversationsUnread > 0) && (
              <View style={styles.notificationDot}>
                <Text style={styles.notificationCount}>
                  {(unreadCount || conversationsUnread) > 9
                    ? "9+"
                    : (unreadCount || conversationsUnread)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ═══════════════════════════════════
            WALLET CARD
        ═══════════════════════════════════ */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/(app)/wallet")}
          style={styles.walletCardContainer}
        >
          <LinearGradient
            colors={[Colors.primary, "#0A7061", "#128C7E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletCard}
          >
            <View style={styles.walletCircle1} />
            <View style={styles.walletCircle2} />

            <View style={styles.walletContent}>
              <View style={styles.walletLeft}>
                <View style={styles.walletHeader}>
                  <Ionicons name="wallet" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.walletLabel}>Wallet Balance</Text>
                </View>
                <Text style={styles.walletAmount}>
                  ₹
                  {(walletData?.balance || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text style={styles.walletSubtext}>
                  {walletData?.currency || "INR"} • Available Balance
                </Text>
              </View>

              <TouchableOpacity
                style={styles.topUpBtn}
                onPress={() => router.push("/(app)/wallet")}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color={Colors.primary} />
                <Text style={styles.topUpText}>Top Up</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ═══════════════════════════════════
            NEW USER ONBOARDING (if no data)
        ═══════════════════════════════════ */}
        {isNewUser && (
          <View style={styles.onboardingCard}>
            <View style={styles.onboardingBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.onboardingBadgeText}>QUICK SETUP</Text>
            </View>

            <Text style={styles.onboardingTitle}>Let's Get Started 🚀</Text>
            <Text style={styles.onboardingSubtitle}>
              Complete these steps to launch your first campaign
            </Text>

            <View style={styles.stepsList}>
              {[
                {
                  step: "01",
                  label: "Connect WhatsApp",
                  done: whatsappConnected > 0,
                },
                {
                  step: "02",
                  label: "Import contacts",
                  done: contactsTotal > 0,
                },
                {
                  step: "03",
                  label: "Create template",
                  done: templatesApproved > 0,
                },
                {
                  step: "04",
                  label: "Send first campaign",
                  done: totalCampaigns > 0,
                },
              ].map((item) => (
                <View
                  key={item.step}
                  style={[styles.stepItem, item.done && styles.stepItemDone]}
                >
                  <View
                    style={[
                      styles.stepBadge,
                      item.done && styles.stepBadgeDone,
                    ]}
                  >
                    {item.done ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : (
                      <Text style={styles.stepBadgeText}>{item.step}</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      item.done && styles.stepLabelDone,
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.onboardingBtn}
              onPress={() => router.push("/(app)/(tabs)/settings")}
            >
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={styles.onboardingBtnText}>Connect WhatsApp</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* ═══════════════════════════════════
            OVERVIEW STATS
        ═══════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <TouchableOpacity onPress={() => router.push("/(app)/reports")}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatsCard
              label="Contacts"
              value={contactsTotal}
              icon="people"
              color="#3B82F6"
              trend={
                contactsGrowth !== 0
                  ? {
                    value: contactsGrowth,
                    isPositive: contactsGrowth > 0,
                  }
                  : undefined
              }
              onPress={() => router.push("/(app)/(tabs)/contacts")}
              style={{ marginRight: 6 }}
            />
            <StatsCard
              label="Campaigns"
              value={totalCampaigns}
              icon="megaphone"
              color="#8B5CF6"
              onPress={() => router.push("/(app)/(tabs)/campaigns")}
              style={{ marginLeft: 6 }}
            />
          </View>

          <View style={[styles.statsRow, { marginTop: 12 }]}>
            <StatsCard
              label="Messages Sent"
              value={messagesSent}
              icon="chatbubbles"
              color="#10B981"
              trend={
                messagesGrowth !== 0
                  ? {
                    value: messagesGrowth,
                    isPositive: messagesGrowth > 0,
                  }
                  : undefined
              }
              style={{ marginRight: 6 }}
            />
            <StatsCard
              label="Active Chats"
              value={conversationsActive}
              icon="chatbubble-ellipses"
              color="#F59E0B"
              onPress={() => router.push("/(app)/(tabs)/inbox")}
              style={{ marginLeft: 6 }}
            />
          </View>
        </View>

        {/* ═══════════════════════════════════
            DELIVERY PERFORMANCE
        ═══════════════════════════════════ */}
        {messagesSent > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Delivery Performance</Text>
            </View>

            <View style={styles.deliveryCard}>
              <View style={styles.deliveryHeader}>
                <View>
                  <Text style={styles.deliveryLabel}>Delivery Rate</Text>
                  <Text style={styles.deliveryValue}>{deliveryRate}%</Text>
                </View>
                <View style={styles.deliveryIconBox}>
                  <Ionicons name="checkmark-done" size={24} color={Colors.success} />
                </View>
              </View>

              <View style={styles.deliveryStats}>
                <View style={styles.deliveryStatItem}>
                  <View style={[styles.deliveryDot, { backgroundColor: Colors.success }]} />
                  <Text style={styles.deliveryStatLabel}>Delivered</Text>
                  <Text style={styles.deliveryStatValue}>{totalDelivered}</Text>
                </View>
                <View style={styles.deliveryStatItem}>
                  <View style={[styles.deliveryDot, { backgroundColor: Colors.info }]} />
                  <Text style={styles.deliveryStatLabel}>Read</Text>
                  <Text style={styles.deliveryStatValue}>{stats?.delivery?.read || 0}</Text>
                </View>
                <View style={styles.deliveryStatItem}>
                  <View style={[styles.deliveryDot, { backgroundColor: Colors.error }]} />
                  <Text style={styles.deliveryStatLabel}>Failed</Text>
                  <Text style={styles.deliveryStatValue}>{totalFailed}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* ═══════════════════════════════════
            QUICK ACTIONS
        ═══════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <QuickAction
              key={action.id}
              icon={action.icon}
              label={action.label}
              color={action.color}
              onPress={() => router.push(action.route as never)}
            />
          ))}
        </View>

        {/* ═══════════════════════════════════
            RECENT CAMPAIGNS
        ═══════════════════════════════════ */}
        {recentCampaigns.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Campaigns</Text>
              <TouchableOpacity onPress={() => router.push("/(app)/(tabs)/campaigns")}>
                <Text style={styles.viewAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.campaignsList}>
              {recentCampaigns.slice(0, 3).map((campaign) => (
                <TouchableOpacity
                  key={campaign.id}
                  style={styles.campaignItem}
                  onPress={() =>
                    router.push(`/(app)/campaigns/${campaign.id}` as never)
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.campaignIconBox}>
                    <Ionicons
                      name="megaphone"
                      size={20}
                      color={Colors.primary}
                    />
                  </View>

                  <View style={styles.campaignContent}>
                    <View style={styles.campaignHeader}>
                      <Text style={styles.campaignName} numberOfLines={1}>
                        {campaign.name}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: `${getStatusColor(campaign.status)}15`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(campaign.status) },
                          ]}
                        >
                          {campaign.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.campaignFooter}>
                      <Text style={styles.campaignStatText}>
                        {campaign.sentCount || 0} / {campaign.totalContacts || 0} sent
                      </Text>
                      <Text style={styles.campaignRate}>
                        {campaign.deliveryRate || 0}% delivered
                      </Text>
                    </View>

                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${campaign.totalContacts
                                ? Math.min(
                                  100,
                                  (campaign.sentCount / campaign.totalContacts) * 100
                                )
                                : 0
                              }%`,
                            backgroundColor: getStatusColor(campaign.status),
                          },
                        ]}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ═══════════════════════════════════
            AT A GLANCE - Quick Stats
        ═══════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>At a Glance</Text>
        </View>

        <View style={styles.glanceContainer}>
          <QuickStatItem
            label="Unread Chats"
            value={conversationsUnread}
            icon="mail"
            color="#F59E0B"
            onPress={() => router.push("/(app)/(tabs)/inbox")}
          />
          <QuickStatItem
            label="Templates"
            value={templatesApproved}
            icon="document-text"
            color="#10B981"
            onPress={() => router.push("/(app)/templates")}
          />
          <QuickStatItem
            label="WhatsApp Accounts"
            value={whatsappConnected}
            icon="call"
            color="#8B5CF6"
            onPress={() => router.push("/(app)/(tabs)/settings")}
          />
          <QuickStatItem
            label="Active Campaigns"
            value={activeCampaigns}
            icon="flash"
            color="#3B82F6"
            onPress={() => router.push("/(app)/(tabs)/campaigns")}
          />
        </View>

        {/* ═══════════════════════════════════
            RECENT ACTIVITY
        ═══════════════════════════════════ */}
        {activity.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>

            <View style={styles.activityList}>
              {activity.slice(0, 5).map((item) => (
                <View key={item.id} style={styles.activityItem}>
                  <View style={styles.activityDot} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityAction}>
                      {item.action?.replace(/_/g, " ").toLowerCase() || "Activity"}
                    </Text>
                    <Text style={styles.activityTime}>
                      {formatRelativeTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// QUICK STAT ITEM COMPONENT
// ============================================

interface QuickStatItemProps {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

function QuickStatItem({ label, value, icon, color, onPress }: QuickStatItemProps) {
  return (
    <TouchableOpacity
      style={styles.glanceItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.glanceIconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.glanceLabel}>{label}</Text>
      <Text style={styles.glanceValue}>{value}</Text>
    </TouchableOpacity>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  scrollContent: {
    paddingBottom: 110,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 14, color: Colors.textSecondary, fontWeight: "500" },
  userName: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  orgBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.primary}12`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 6,
    gap: 4,
    maxWidth: 200,
  },
  orgText: { fontSize: 11, fontWeight: "600", color: Colors.primary },
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationDot: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: Colors.error,
    borderWidth: 2,
    borderColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationCount: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
  },

  // Wallet Card
  walletCardContainer: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  walletCard: { padding: 20, position: "relative", overflow: "hidden" },
  walletCircle1: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -50,
    right: -30,
  },
  walletCircle2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -30,
    left: -20,
  },
  walletContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletLeft: { flex: 1 },
  walletHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  walletLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  walletAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
    marginBottom: 4,
  },
  walletSubtext: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  topUpBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  topUpText: { color: Colors.primary, fontSize: 14, fontWeight: "700" },

  // Onboarding
  onboardingCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  onboardingBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: `${Colors.success}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 12,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  onboardingBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.success,
    letterSpacing: 0.5,
  },
  onboardingTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  onboardingSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  stepsList: { gap: 8, marginBottom: 20 },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    gap: 12,
  },
  stepItemDone: {
    backgroundColor: `${Colors.success}10`,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  stepBadgeDone: {
    backgroundColor: Colors.success,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  stepLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
    flex: 1,
  },
  stepLabelDone: {
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  onboardingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  onboardingBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Sections
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  viewAllText: { fontSize: 13, color: Colors.primary, fontWeight: "600" },

  // Stats Grid
  statsGrid: { paddingHorizontal: 14 },
  statsRow: { flexDirection: "row" },

  // Delivery Card
  deliveryCard: {
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  deliveryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  deliveryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginBottom: 4,
  },
  deliveryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  deliveryIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${Colors.success}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  deliveryStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  deliveryStatItem: {
    flex: 1,
    alignItems: "center",
  },
  deliveryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  deliveryStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  deliveryStatValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },

  // Campaigns
  campaignsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  campaignItem: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  campaignIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  campaignContent: { flex: 1, justifyContent: "center" },
  campaignHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  campaignName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  campaignFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  campaignStatText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  campaignRate: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "700",
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },

  // At a Glance
  glanceContainer: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  glanceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  glanceIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  glanceLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  glanceValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  // Activity
  activityList: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  activityTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});