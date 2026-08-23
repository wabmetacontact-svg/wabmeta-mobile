// src/components/inbox/WindowStatusBar.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";

interface Props {
  isWindowOpen: boolean;
  windowExpiresAt?: string | null;
}

export function WindowStatusBar({ isWindowOpen, windowExpiresAt }: Props) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!isWindowOpen || !windowExpiresAt) return;

    const update = () => {
      const now = Date.now();
      const expires = new Date(windowExpiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft("Window closed");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m left`);
      } else {
        setTimeLeft(`${mins}m left`);
      }
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [isWindowOpen, windowExpiresAt]);

  if (!isWindowOpen) {
    return (
      <View style={[styles.container, styles.closed]}>
        <Ionicons name="lock-closed" size={14} color={Colors.warning} />
        <Text style={styles.text}>
          24-hour window closed. Send a template to reopen.
        </Text>
      </View>
    );
  }

  if (windowExpiresAt) {
    const hoursLeft = Math.floor(
      (new Date(windowExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60)
    );

    // Only show if less than 4 hours
    if (hoursLeft > 4) return null;

    return (
      <View style={[styles.container, styles.expiring]}>
        <Ionicons name="time" size={14} color={Colors.warning} />
        <Text style={styles.text}>
          Session ends in {timeLeft}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
  },
  closed: {
    backgroundColor: `${Colors.warning}15`,
    borderBottomColor: `${Colors.warning}30`,
  },
  expiring: {
    backgroundColor: `${Colors.warning}10`,
    borderBottomColor: `${Colors.warning}20`,
  },
  text: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: "600",
  },
});
