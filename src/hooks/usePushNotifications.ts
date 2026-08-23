// src/hooks/usePushNotifications.ts
import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { router } from "expo-router";
import { notifications as notificationsApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

// Check if running inside Expo Go
const isExpoGo =
  Constants.appOwnership === "expo" ||
  (Constants as any).executionEnvironment === "storeClient";

// Lazily load expo-notifications only when NOT running on Android in Expo Go
// (Expo SDK 53+ removed Android remote notifications from Expo Go)
let Notifications: any = null;
if (!isExpoGo || Platform.OS !== "android") {
  try {
    Notifications = require("expo-notifications");
    if (Notifications && typeof Notifications.setNotificationHandler === "function") {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  } catch (err) {
    console.warn("Notifications module skipped in Expo Go:", err);
  }
}

export function usePushNotifications() {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<any | null>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const { user, isAuthenticated } = useAuth();

  const registerForPushNotifications = async () => {
    // Skip if running in Expo Go on Android or Notifications not loaded
    if (!Notifications || (isExpoGo && Platform.OS === "android")) {
      return null;
    }

    try {
      if (Platform.OS === "android" && Notifications.setNotificationChannelAsync) {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance?.MAX ?? 5,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#0A6B5C",
        });
      }

      if (!Device.isDevice) {
        console.warn("Push notifications require a physical device.");
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Failed to obtain push notifications permission!");
        return null;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      return tokenData.data;
    } catch (err) {
      console.warn("Push notification registration skipped or failed:", err);
      return null;
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user || !Notifications || (isExpoGo && Platform.OS === "android")) {
      setPushToken(null);
      return;
    }

    registerForPushNotifications().then(async (token) => {
      if (token) {
        setPushToken(token);
        try {
          await notificationsApi.registerPushToken({
            token,
            deviceId: Device.modelName || "Simulator",
            platform: Platform.OS,
          });
          console.log("📲 Push Token Registered to DB:", token);
        } catch (error) {
          console.error("Failed to sync push token with backend:", error);
        }
      }
    });

    try {
      if (typeof Notifications.addNotificationReceivedListener === "function") {
        notificationListener.current = Notifications.addNotificationReceivedListener((notif: any) => {
          setLastNotification(notif);
        });
      }

      if (typeof Notifications.addNotificationResponseReceivedListener === "function") {
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
          const data = response.notification.request.content.data;
          if (data?.actionUrl) {
            router.push(data.actionUrl as any);
          } else {
            router.push("/(app)/notifications" as any);
          }
        });
      }
    } catch (e) {
      console.warn("Could not attach notification listeners:", e);
    }

    return () => {
      try {
        if (notificationListener.current?.remove) {
          notificationListener.current.remove();
        }
        if (responseListener.current?.remove) {
          responseListener.current.remove();
        }
      } catch {}
    };
  }, [isAuthenticated, user]);

  return { pushToken, lastNotification };
}
