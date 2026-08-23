// src/components/wallet/WalletAnalytics.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { wallet as walletApi } from "../../services/api";
import { Colors } from "../../constants/colors";

export function WalletAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await walletApi.getAnalytics({ days: 30 });
      if (res?.data?.success) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.error("Analytics error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.empty}>
        <Ionicons name="bar-chart-outline" size={40} color={Colors.textMuted} />
        <Text style={styles.emptyText}>No analytics data available</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.periodText}>Last 30 Days</Text>

      {/* Message Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Messages</Text>
        <View style={styles.statsRow}>
          <StatBox
            label="Sent"
            value={analytics.allMessages?.sent || 0}
            color={Colors.info}
          />
          <StatBox
            label="Delivered"
            value={analytics.allMessages?.delivered || 0}
            color={Colors.success}
          />
          <StatBox
            label="Failed"
            value={analytics.allMessages?.failed || 0}
            color={Colors.error}
          />
        </View>
      </View>

      {/* Charges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Approximate Charges</Text>
        <View style={styles.chargeCard}>
          <Text style={styles.chargeLabel}>Total Cost</Text>
          <Text style={styles.chargeValue}>
            ₹
            {(analytics.approximateCharges?.total || 0).toLocaleString(
              "en-IN",
              { minimumFractionDigits: 2 }
            )}
          </Text>
        </View>

        {analytics.approximateCharges?.byCategory?.map((cat: any) => (
          <View key={cat.category} style={styles.categoryRow}>
            <Text style={styles.categoryLabel}>{cat.label}</Text>
            <Text style={styles.categoryValue}>
              ₹{(cat.cost || 0).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statBoxValue, { color }]}>
        {value.toLocaleString("en-IN")}
      </Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    padding: 40,
    alignItems: "center",
  },
  empty: {
    padding: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  periodText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  statBoxValue: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  chargeCard: {
    backgroundColor: `${Colors.primary}10`,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  chargeLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  chargeValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.primary,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  categoryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  categoryValue: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
});
