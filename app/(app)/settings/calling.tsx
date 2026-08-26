// app/(app)/settings/calling.tsx
// WhatsApp Calling settings - Meta ke call settings API par mapped

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../src/constants/colors";
import {
  calling as callingApi,
  handleApiError,
  type CallingSettings,
} from "../../../src/services/api";

// Meta call_icons.restrict_to_user_countries ISO codes leta hai
const COUNTRY_OPTIONS = [
  { code: "IN", label: "India", flag: "🇮🇳" },
  { code: "GB", label: "UK", flag: "🇬🇧" },
  { code: "US", label: "USA", flag: "🇺🇸" },
  { code: "AE", label: "UAE", flag: "🇦🇪" },
  { code: "SG", label: "Singapore", flag: "🇸🇬" },
  { code: "AU", label: "Australia", flag: "🇦🇺" },
  { code: "CA", label: "Canada", flag: "🇨🇦" },
  { code: "BR", label: "Brazil", flag: "🇧🇷" },
];

const TIMEZONE_OPTIONS = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

const DAYS = [
  { key: "MONDAY", short: "Mon" },
  { key: "TUESDAY", short: "Tue" },
  { key: "WEDNESDAY", short: "Wed" },
  { key: "THURSDAY", short: "Thu" },
  { key: "FRIDAY", short: "Fri" },
  { key: "SATURDAY", short: "Sat" },
  { key: "SUNDAY", short: "Sun" },
];

interface DayHours {
  day: string;
  enabled: boolean;
  openTime: string;
  closeTime: string;
}

const DEFAULT_HOURS: DayHours[] = DAYS.map((d) => ({
  day: d.key,
  enabled: d.key !== "SATURDAY" && d.key !== "SUNDAY",
  openTime: "09:00",
  closeTime: "18:00",
}));

export default function CallingSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<CallingSettings | null>(null);

  const [callingEnabled, setCallingEnabled] = useState(false);
  const [showCallButton, setShowCallButton] = useState(true);
  const [callbackEnabled, setCallbackEnabled] = useState(true);
  const [callHoursEnabled, setCallHoursEnabled] = useState(false);
  const [restrictCountries, setRestrictCountries] = useState<string[]>([]);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [showTimezones, setShowTimezones] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState<DayHours[]>(DEFAULT_HOURS);

  const fetchSettings = useCallback(async () => {
    try {
      setError(null);
      const res = await callingApi.getSettings();
      const d = res.data?.data;
      if (d) {
        setAccount(d);
        setCallingEnabled(!!d.callingEnabled);
        if (d.showCallButton !== undefined) setShowCallButton(d.showCallButton);
        if (d.callbackEnabled !== undefined) setCallbackEnabled(d.callbackEnabled);
        if (d.callHoursEnabled !== undefined) setCallHoursEnabled(d.callHoursEnabled);
        if (Array.isArray(d.restrictToCountries)) {
          setRestrictCountries(d.restrictToCountries);
        }
      }
    } catch (err: any) {
      setError(handleApiError(err, "Could not load calling settings"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await callingApi.updateSettings({
        callingEnabled,
        showCallButton,
        callbackEnabled,
        callHoursEnabled,
        restrictToCountries: restrictCountries,
        timezone,
        weeklyHours: callHoursEnabled
          ? weeklyHours
              .filter((h) => h.enabled)
              .map((h) => ({
                day: h.day,
                openTime: h.openTime,
                closeTime: h.closeTime,
              }))
          : [],
      });
      Alert.alert("Saved", "Calling settings updated.");
      fetchSettings();
    } catch (err: any) {
      Alert.alert("Could not save", handleApiError(err, "Update failed"));
    } finally {
      setSaving(false);
    }
  };

  const toggleCountry = (code: string) => {
    setRestrictCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleDay = (day: string) => {
    setWeeklyHours((prev) =>
      prev.map((h) => (h.day === day ? { ...h, enabled: !h.enabled } : h))
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WhatsApp Calling</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centeredText}>Loading settings...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={40} color={Colors.error} />
          <Text style={styles.centeredText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchSettings}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {account?.phoneNumber && (
            <Text style={styles.numberLine}>{account.phoneNumber}</Text>
          )}

          {/* Requirements */}
          <View style={styles.banner}>
            <Ionicons name="information-circle" size={18} color="#B45309" />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Requirements</Text>
              <Text style={styles.bannerItem}>
                • Daily messaging limit of at least 2,000 unique recipients
              </Text>
              <Text style={styles.bannerItem}>
                • Cloud API number (not the WhatsApp Business app)
              </Text>
              <Text style={styles.bannerItem}>
                • Calling enabled on the number in WhatsApp Manager
              </Text>
              <Text style={styles.bannerItem}>
                • Business-initiated calls are not available for numbers in the
                US, Canada, Egypt, Vietnam or Nigeria — customers from those
                countries can still call you
              </Text>
            </View>
          </View>

          {/* Toggles */}
          <Section title="Basic Settings">
            <ToggleRow
              icon="call"
              label="Enable WhatsApp Calling"
              desc="Call customers directly via WhatsApp"
              value={callingEnabled}
              onChange={setCallingEnabled}
            />
            <ToggleRow
              icon="eye"
              label="Show call button to customers"
              desc="Turn off to stop customers from calling you"
              value={showCallButton}
              onChange={setShowCallButton}
            />
            <ToggleRow
              icon="refresh"
              label="Callback Requests"
              desc="Customers can request a callback for missed calls"
              value={callbackEnabled}
              onChange={setCallbackEnabled}
              last
            />
          </Section>

          {/* Countries */}
          <Section title="Country Restriction">
            <View style={styles.sectionBody}>
              <Text style={styles.hint}>
                Call button sirf in countries ke users ko dikhega. Kuch select
                na karo to sab countries ko dikhega.
              </Text>

              <View style={styles.chipWrap}>
                {COUNTRY_OPTIONS.map((c) => {
                  const active = restrictCountries.includes(c.code);
                  return (
                    <TouchableOpacity
                      key={c.code}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleCountry(c.code)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {c.flag} {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {restrictCountries.length === 0 && (
                <Text style={styles.infoNote}>
                  🌍 No restriction — call button sab countries mein dikhega
                </Text>
              )}
            </View>
          </Section>

          {/* Business hours */}
          <Section title="Business Hours">
            <View style={styles.sectionBody}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.rowLabel}>Limit calls to set hours</Text>
                  <Text style={styles.rowDesc}>
                    {callHoursEnabled
                      ? "The call button only shows during these hours"
                      : "Off — the call button shows 24/7"}
                  </Text>
                </View>
                <Switch
                  value={callHoursEnabled}
                  onValueChange={setCallHoursEnabled}
                  trackColor={{ true: Colors.primary, false: Colors.border }}
                  thumbColor="#fff"
                />
              </View>

              {callHoursEnabled && (
                <>
                  <Text style={styles.fieldLabel}>Timezone</Text>
                  <TouchableOpacity
                    style={styles.select}
                    onPress={() => setShowTimezones((v) => !v)}
                  >
                    <Text style={styles.selectText}>{timezone}</Text>
                    <Ionicons
                      name={showTimezones ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>

                  {showTimezones && (
                    <View style={styles.selectList}>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <TouchableOpacity
                          key={tz}
                          style={styles.selectOption}
                          onPress={() => {
                            setTimezone(tz);
                            setShowTimezones(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.selectOptionText,
                              tz === timezone && {
                                color: Colors.primary,
                                fontWeight: "700",
                              },
                            ]}
                          >
                            {tz}
                          </Text>
                          {tz === timezone && (
                            <Ionicons
                              name="checkmark"
                              size={18}
                              color={Colors.primary}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <View style={{ marginTop: 12, gap: 8 }}>
                    {weeklyHours.map((h) => {
                      const label =
                        DAYS.find((d) => d.key === h.day)?.short || h.day;
                      return (
                        <View
                          key={h.day}
                          style={[
                            styles.dayRow,
                            !h.enabled && { opacity: 0.5 },
                          ]}
                        >
                          <TouchableOpacity
                            style={styles.dayToggle}
                            onPress={() => toggleDay(h.day)}
                          >
                            <Ionicons
                              name={h.enabled ? "checkbox" : "square-outline"}
                              size={20}
                              color={
                                h.enabled ? Colors.primary : Colors.textMuted
                              }
                            />
                            <Text style={styles.dayLabel}>{label}</Text>
                          </TouchableOpacity>

                          <Text style={styles.dayTime}>
                            {h.openTime} – {h.closeTime}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <Text style={styles.infoNote}>
                    Timings badalne ke liye abhi web dashboard use karein.
                  </Text>
                </>
              )}
            </View>
          </Section>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save" size={17} color="#fff" />
                <Text style={styles.saveBtnText}>Save Settings</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  desc,
  value,
  onChange,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.toggleIcon}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: Colors.primary, false: Colors.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
  },
  centeredText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  content: { padding: 16 },
  numberLine: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
    fontWeight: "600",
  },

  banner: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
    marginBottom: 4,
  },
  bannerItem: {
    fontSize: 11.5,
    lineHeight: 17,
    color: "#B45309",
  },

  section: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    marginBottom: 14,
  },
  sectionHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  sectionBody: { padding: 14 },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  toggleIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: `${Colors.primary}12`,
    justifyContent: "center",
    alignItems: "center",
  },
  rowLabel: { fontSize: 14.5, fontWeight: "600", color: Colors.textPrimary },
  rowDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  hint: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}12`,
  },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "600" },
  chipTextActive: { color: Colors.primary },

  infoNote: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.info,
    backgroundColor: `${Colors.info}10`,
    borderRadius: 8,
    padding: 10,
  },

  fieldLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginTop: 14,
    marginBottom: 6,
  },
  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    backgroundColor: Colors.surface,
  },
  selectText: { fontSize: 14.5, color: Colors.textPrimary },
  selectList: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  selectOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  selectOptionText: { fontSize: 14, color: Colors.textPrimary },

  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  dayToggle: { flexDirection: "row", alignItems: "center", gap: 8 },
  dayLabel: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  dayTime: { fontSize: 13, color: Colors.textSecondary },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 50,
    marginTop: 6,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
