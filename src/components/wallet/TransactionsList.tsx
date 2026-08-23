// src/components/wallet/TransactionsList.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { wallet as walletApi } from "../../services/api";
import { Colors } from "../../constants/colors";
import { Transaction } from "../../types/wallet";

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; isCredit: boolean }
> = {
  credit: { label: "Added", color: Colors.success, isCredit: true },
  debit: { label: "Meta Charge", color: Colors.error, isCredit: false },
  admin_credit: {
    label: "Adjustment by Meta",
    color: Colors.info,
    isCredit: true,
  },
  admin_debit: {
    label: "Adjustment by Meta",
    color: Colors.warning,
    isCredit: false,
  },
  refund: { label: "Refund", color: "#8B5CF6", isCredit: true },
  reserved: { label: "Reserved", color: Colors.textMuted, isCredit: false },
  released: { label: "Released", color: "#14B8A6", isCredit: true },
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "credit", label: "Added" },
  { value: "debit", label: "Charges" },
  { value: "admin_credit", label: "Adjustments" },
  { value: "refund", label: "Refunds" },
];

export function TransactionsList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState("");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await walletApi.getTransactions({
        page,
        limit: 15,
        type: filter || undefined,
      });

      if (res?.data?.success) {
        const data = res.data.data as any;
        setTransactions(data.transactions || []);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error("❌ Transactions error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const formatDescription = (desc: string): string => {
    if (!desc) return "";
    return desc
      .replace(/manual debit by admin/gi, "Debit by WabMeta")
      .replace(/manual credit by admin/gi, "Credit by WabMeta")
      .replace(/Manual debit/gi, "Debit by WabMeta")
      .replace(/Manual credit/gi, "Credit by WabMeta");
  };

  return (
    <View>
      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.filterBtn,
              filter === f.value && styles.filterBtnActive,
            ]}
            onPress={() => {
              setFilter(f.value);
              setPage(1);
            }}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.value && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="receipt-outline" size={32} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No transactions found</Text>
          <Text style={styles.emptySubtitle}>
            {filter
              ? "Try changing the filter"
              : "Your transactions will appear here"}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {transactions.map((tx) => {
            const config = TYPE_CONFIG[tx.type] || {
              label: tx.type,
              color: Colors.textMuted,
              isCredit: false,
            };

            return (
              <TouchableOpacity
                key={tx.id}
                style={styles.txItem}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.txIcon, { backgroundColor: `${config.color}15` }]}
                >
                  <Ionicons
                    name={config.isCredit ? "arrow-down" : "arrow-up"}
                    size={16}
                    color={config.color}
                  />
                </View>

                <View style={styles.txContent}>
                  <Text style={styles.txDesc} numberOfLines={1}>
                    {formatDescription(tx.description)}
                  </Text>

                  <View style={styles.txMeta}>
                    <View
                      style={[
                        styles.txBadge,
                        { backgroundColor: `${config.color}15` },
                      ]}
                    >
                      <Text style={[styles.txBadgeText, { color: config.color }]}>
                        {config.label}
                      </Text>
                    </View>
                    <Text style={styles.txDate}>
                      {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>

                  {tx.note && (
                    <Text style={styles.txNote} numberOfLines={1}>
                      Note: {formatDescription(tx.note)}
                    </Text>
                  )}
                </View>

                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: config.isCredit ? Colors.success : Colors.error },
                    ]}
                  >
                    {config.isCredit ? "+" : "-"}₹
                    {tx.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                  <Text style={styles.txBalance}>
                    Bal: ₹{tx.balanceAfter.toFixed(2)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
            onPress={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <Ionicons name="chevron-back" size={16} color={Colors.textPrimary} />
            <Text style={styles.pageBtnText}>Prev</Text>
          </TouchableOpacity>

          <Text style={styles.pageText}>
            Page <Text style={styles.pageNumber}>{page}</Text> of {totalPages}
          </Text>

          <TouchableOpacity
            style={[
              styles.pageBtn,
              page === totalPages && styles.pageBtnDisabled,
            ]}
            onPress={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            <Text style={styles.pageBtnText}>Next</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filtersRow: {
    gap: 8,
    marginBottom: 12,
    paddingRight: 16,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: "#fff",
  },

  loadingBox: {
    alignItems: "center",
    padding: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  emptyBox: {
    alignItems: "center",
    padding: 32,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  list: {
    gap: 4,
  },
  txItem: {
    flexDirection: "row",
    padding: 10,
    gap: 10,
    borderRadius: 12,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  txContent: {
    flex: 1,
    justifyContent: "center",
  },
  txDesc: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  txMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  txBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  txDate: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  txNote: {
    fontSize: 10,
    color: Colors.textMuted,
    fontStyle: "italic",
    marginTop: 2,
  },
  txRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "800",
  },
  txBalance: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },

  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    gap: 4,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  pageText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  pageNumber: {
    fontWeight: "700",
    color: Colors.textPrimary,
  },
});
