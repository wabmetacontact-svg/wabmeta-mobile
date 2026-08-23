// app/(app)/wallet/index.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { wallet as walletApi } from "../../../src/services/api";
import { Colors } from "../../../src/constants/colors";
import { WalletData } from "../../../src/types/wallet";
import { LockedWalletView } from "../../../src/components/wallet/LockedWalletView";
import { InactiveWalletView } from "../../../src/components/wallet/InactiveWalletView";
import { ActiveWalletView } from "../../../src/components/wallet/ActiveWalletView";
import { TopUpModal } from "../../../src/components/wallet/TopUpModal";
import { RequestAccessModal } from "../../../src/components/wallet/RequestAccessModal";

export default function WalletScreen() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [hasPlanAccess, setHasPlanAccess] = useState(true);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await walletApi.getWallet();

      if (res?.data?.success) {
        setWalletData(res.data.data as WalletData);
      }
    } catch (err: any) {
      console.error("❌ Wallet error:", err?.response?.data?.message);

      // Check for plan access
      if (err?.response?.status === 403) {
        setHasPlanAccess(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallet();
  };

  // ═══════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════
  if (loading && !walletData) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════
  // NO PLAN ACCESS
  // ═══════════════════════════════════
  if (!hasPlanAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <WalletHeader onRefresh={onRefresh} />
        <LockedWalletView />
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════
  // WALLET NOT ACTIVE (needs request)
  // ═══════════════════════════════════
  if (!walletData?.isActive) {
    return (
      <SafeAreaView style={styles.container}>
        <WalletHeader onRefresh={onRefresh} />
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          <InactiveWalletView
            walletData={walletData}
            onRequestAccess={() => setShowRequestModal(true)}
          />
        </ScrollView>

        {showRequestModal && (
          <RequestAccessModal
            visible={showRequestModal}
            onClose={() => setShowRequestModal(false)}
            onSuccess={() => {
              setShowRequestModal(false);
              fetchWallet();
            }}
          />
        )}
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════
  // ACTIVE WALLET
  // ═══════════════════════════════════
  return (
    <SafeAreaView style={styles.container}>
      <WalletHeader onRefresh={onRefresh} />

      <ActiveWalletView
        walletData={walletData}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onAddMoney={() => setShowTopUpModal(true)}
      />

      {showTopUpModal && (
        <TopUpModal
          visible={showTopUpModal}
          currentBalance={walletData.balance}
          maxTopUp={walletData.maxTopUpAmount}
          maxMonthlyRemaining={
            walletData.maxMonthlyTopUp - walletData.currentMonthTopUp
          }
          onClose={() => setShowTopUpModal(false)}
          onSuccess={() => {
            setShowTopUpModal(false);
            fetchWallet();
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════
// HEADER COMPONENT
// ═══════════════════════════════════
function WalletHeader({ onRefresh }: { onRefresh: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
        <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <Text style={styles.headerSubtitle}>Meta API Payments</Text>
      </View>

      <TouchableOpacity onPress={onRefresh} style={styles.iconBtn}>
        <Ionicons name="refresh" size={22} color={Colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
