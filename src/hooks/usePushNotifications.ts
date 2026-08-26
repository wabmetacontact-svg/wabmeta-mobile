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

// Notifications purane code se web-style actionUrl le kar aati hain
// (jaise "/dashboard/billing"). Aisa path mobile router par kaam nahi karta -
// tap karne par kuch nahi hota. Jo pehchan me aaye use map kar do, baaki
// ke liye notifications screen khol do.
const WEB_TO_APP: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^\/dashboard\/inbox\/?(.*)$/, (m) => (m[1] ? `/(app)/inbox/${m[1]}` : "/(app)/(tabs)/inbox")],
  [/^\/dashboard\/campaigns\/([^/]+)$/, (m) => `/(app)/campaigns/${m[1]}`],
  [/^\/dashboard\/campaigns\/?$/, () => "/(app)/(tabs)/campaigns"],
  [/^\/dashboard\/crm\/leads\/([^/]+)$/, (m) => `/(app)/crm/lead/${m[1]}`],
  [/^\/dashboard\/crm\/?.*$/, () => "/(app)/crm"],
  [/^\/dashboard\/billing\/?.*$/, () => "/(app)/billing"],
  [/^\/dashboard\/wallet\/?.*$/, () => "/(app)/wallet"],
  [/^\/dashboard\/contacts\/([^/]+)$/, (m) => `/(app)/contacts/${m[1]}`],
  [/^\/dashboard\/contacts\/?$/, () => "/(app)/(tabs)/contacts"],
  [/^\/dashboard\/settings\/?.*$/, () => "/(app)/(tabs)/settings"],
];

function resolveRoute(actionUrl?: string): string {
  if (!actionUrl || typeof actionUrl !== "string") {
    return "/(app)/notifications";
  }

  // Pehle se mobile route hai
  if (actionUrl.startsWith("/(app)/")) return actionUrl;

  for (const [pattern, build] of WEB_TO_APP) {
    const match = actionUrl.match(pattern);
    if (match) return build(match);
  }

  // Pata nahi kya hai - notifications list par le jao, taaki tap
  // kam se kam kuch to kare
  return "/(app)/notifications";
}

export type PushStatus =
  | "idle"
  | "registered"
  | "expo-go"
  | "no-device"
  | "denied"
  | "no-project-id"
  | "failed";

export function usePushNotifications() {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus>("idle");
  const [pushError, setPushError] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<any | null>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const { user, isAuthenticated } = useAuth();

  const registerForPushNotifications = async () => {
    // Skip if running in Expo Go on Android or Notifications not loaded
    if (!Notifications || (isExpoGo && Platform.OS === "android")) {
      setPushStatus("expo-go");
      setPushError(
        "Expo Go on Android cannot receive push notifications. Install the built APK instead."
      );
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
        setPushStatus("no-device");
        setPushError("Push notifications need a real phone, not an emulator.");
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        setPushStatus("denied");
        setPushError(
          "Notification permission was denied. Turn it on in phone Settings > Apps > WabMeta > Notifications."
        );
        return null;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      if (!projectId) {
        setPushStatus("no-project-id");
        setPushError(
          "EAS projectId missing from app config - push tokens cannot be issued."
        );
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      return tokenData.data;
    } catch (err: any) {
      const raw = String(err?.message || err);

      // Android par sabse aam wajah: FCM credentials set hi nahi hain.
      // Ye chup-chaap console.warn me chala jata tha, isliye kisi ko pata
      // hi nahi chalta tha ki notifications kyun nahi aa rahe.
      const isFcm =
        raw.includes("FirebaseApp") ||
        raw.includes("google-services") ||
        raw.includes("FCM") ||
        raw.includes("SERVICE_NOT_AVAILABLE");

      setPushStatus("failed");
      setPushError(
        isFcm
          ? "Firebase (FCM) is not configured for this build, so Android cannot issue a push token."
          : raw
      );
      console.warn("Push registration failed:", raw);
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
          setPushStatus("registered");
          setPushError(null);
          console.log("📲 Push token registered:", token.slice(0, 24) + "...");
        } catch (error: any) {
          setPushStatus("failed");
          setPushError(
            "Token was issued but the server rejected it: " +
              (error?.response?.data?.message || error?.message || "unknown")
          );
          console.error("Failed to sync push token with backend:", error);
        }
      }
    });

    // App poori tarah band thi aur notification tap se khuli - us case me
    // addNotificationResponseReceivedListener bahut der se lagta hai aur
    // tap ka jawab kho jata hai. Aakhri response yahan se uthao.
    (async () => {
      try {
        if (typeof Notifications.getLastNotificationResponseAsync !== "function") return;

        const last = await Notifications.getLastNotificationResponseAsync();
        const data = last?.notification?.request?.content?.data;
        if (!data) return;

        const route = resolveRoute(data.actionUrl);
        // Navigation stack tayaar hone ke baad
        setTimeout(() => {
          try {
            router.push(route as any);
          } catch {}
        }, 400);
      } catch {}
    })();

    try {
      if (typeof Notifications.addNotificationReceivedListener === "function") {
        notificationListener.current = Notifications.addNotificationReceivedListener((notif: any) => {
          setLastNotification(notif);
        });
      }

      if (typeof Notifications.addNotificationResponseReceivedListener === "function") {
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
          const data = response.notification.request.content.data;

          try {
            router.push(resolveRoute(data?.actionUrl) as any);
          } catch (e) {
            // Route galat nikla to app ko crash mat hone do
            console.warn("Notification route failed:", data?.actionUrl, e);
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

  return { pushToken, pushStatus, pushError, lastNotification };
}
