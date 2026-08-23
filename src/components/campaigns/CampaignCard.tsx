// src/components/campaigns/CampaignCard.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { Campaign, CampaignStatus } from "../../types/campaign";

interface Props {
  campaign: Campaign;
  actionLoading: boolean;
  onPress: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

const STATUS_CONFIG: Record<
  CampaignStatus,
  {
    label: string;
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  DRAFT: { label: "Draft", color: Colors.textMuted, icon: "document" },
  SCHEDULED: { label: "Scheduled", color: Colors.info, icon: "time" },
  RUNNING: { label: "Running", color: Colors.success, icon: "play-circle" },
  PAUSED: { label: "Paused", color: Colors.warning, icon: "pause-circle" },
  COMPLETED: { label: "Completed", color: "#8B5CF6", icon: "checkmark-circle" },
  FAILED: { label: "Failed", color: Colors.error, icon: "close-circle" },
  CANCELLED: { label: "Cancelled", color: Colors.textMuted, icon: "ban" },
};

const timeAgo = (date: string): string => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-IN");
};

export function CampaignCard({
  campaign,
  actionLoading,
  onPress,
  onStart,
  onPause,
  onResume,
  onCancel,
  onDelete,
}: Props) {
  const config = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.DRAFT;

  const total = campaign.totalContacts || 0;
  const sent = campaign.sentCount || 0;
  const delivered = campaign.deliveredCount || 0;
  const read = campaign.readCount || 0;
  const failed = campaign.failedCount || 0;

  const processed = sent + failed;
  const progress = total > 0 ? Math.min(100, (processed / total) * 100) : 0;

  const successRate = total > 0
    ? Math.round(((sent - failed) / total) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {campaign.name}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${config.color}15` },
              ]}
            >
              <Ionicons name={config.icon} size={11} color={config.color} />
              <Text style={[styles.statusText, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
          </View>

          {campaign.templateName && (
            <Text style={styles.template} numberOfLines={1}>
              📄 {campaign.templateName}
            </Text>
          )}
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatBox label="Recipients" value={total} color={Colors.textPrimary} />
        <StatBox label="Sent" value={sent} color={Colors.info} />
        <StatBox
          label="Delivered"
          value={delivered + read}
          color={Colors.success}
        />
        <StatBox label="Failed" value={failed} color={Colors.error} />
      </View>

      {/* Progress Bar (only for RUNNING/PAUSED/COMPLETED) */}
      {(["RUNNING", "PAUSED", "COMPLETED"].includes(campaign.status) ||
        sent > 0) && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressValue}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor:
                    campaign.status === "COMPLETED"
                      ? "#8B5CF6"
                      : campaign.status === "PAUSED"
                      ? Colors.warning
                      : Colors.success,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Success Rate Badge (Completed only) */}
      {campaign.status === "COMPLETED" && total > 0 && (
        <View style={styles.successBadgeContainer}>
          <View
            style={[
              styles.successBadge,
              {
                backgroundColor:
                  successRate >= 90
                    ? `${Colors.success}15`
                    : successRate >= 80
                    ? `${Colors.info}15`
                    : `${Colors.warning}15`,
              },
            ]}
          >
            <Ionicons
              name="trending-up"
              size={12}
              color={
                successRate >= 90
                  ? Colors.success
                  : successRate >= 80
                  ? Colors.info
                  : Colors.warning
              }
            />
            <Text
              style={[
                styles.successBadgeText,
                {
                  color:
                    successRate >= 90
                      ? Colors.success
                      : successRate >= 80
                      ? Colors.info
                      : Colors.warning,
                },
              ]}
            >
              {successRate}% Success Rate
            </Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.footerText}>
            {campaign.completedAt
              ? `Completed ${timeAgo(campaign.completedAt)}`
              : campaign.startedAt
              ? `Started ${timeAgo(campaign.startedAt)}`
              : campaign.scheduledAt
              ? `Scheduled ${new Date(campaign.scheduledAt).toLocaleString(
                  "en-IN"
                )}`
              : `Created ${timeAgo(campaign.createdAt)}`}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {actionLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              {(campaign.status === "DRAFT" ||
                campaign.status === "SCHEDULED") && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.startBtn]}
                  onPress={(e) => {
                    e.stopPropagation();
                    onStart();
                  }}
                >
                  <Ionicons name="play" size={14} color={Colors.success} />
                </TouchableOpacity>
              )}

              {campaign.status === "RUNNING" && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.pauseBtn]}
                  onPress={(e) => {
                    e.stopPropagation();
                    onPause();
                  }}
                >
                  <Ionicons name="pause" size={14} color={Colors.warning} />
                </TouchableOpacity>
              )}

              {campaign.status === "PAUSED" && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.startBtn]}
                  onPress={(e) => {
                    e.stopPropagation();
                    onResume();
                  }}
                >
                  <Ionicons name="play" size={14} color={Colors.success} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                disabled={campaign.status === "RUNNING"}
              >
                <Ionicons name="trash-outline" size={14} color={Colors.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
  const formatValue = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toString();
  };

  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{formatValue(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  header: {
    marginBottom: 12,
  },
  headerLeft: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  template: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    padding: 10,
    borderRadius: 10,
  },
  statLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
  },

  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  progressValue: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: "800",
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },

  successBadgeContainer: {
    marginBottom: 12,
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  successBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  footerText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  startBtn: {
    backgroundColor: `${Colors.success}15`,
  },
  pauseBtn: {
    backgroundColor: `${Colors.warning}15`,
  },
  deleteBtn: {
    backgroundColor: `${Colors.error}15`,
  },
});
