// src/hooks/useGoogleAuth.ts
import { useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { auth as authApi } from "../services/api";
import { AuthStorage } from "../utils/secureStorage";

WebBrowser.maybeCompleteAuthSession();

interface GoogleAuthResult {
  success: boolean;
  data?: any;
  error?: string;
}

const ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
  "wabmeta-android.apps.googleusercontent.com";
const IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
  "wabmeta-ios.apps.googleusercontent.com";
const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  "wabmeta-web.apps.googleusercontent.com";

export const useGoogleAuth = () => {
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
  });

  const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
    // Check if user has set real client IDs in .env
    const isPlaceholder =
      !process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID.includes("your-android-client-id") ||
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID === "wabmeta-android.apps.googleusercontent.com";

    if (isPlaceholder) {
      return {
        success: false,
        error:
          "Please configure your Google Cloud OAuth Client ID (EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID) in the .env file.",
      };
    }

    setLoading(true);

    try {
      const result = await promptAsync();

      if (result.type !== "success") {
        setLoading(false);
        return {
          success: false,
          error: "Google sign in cancelled",
        };
      }

      // Google token received
      const { authentication } = result;
      const idToken = authentication?.idToken;
      const accessToken = authentication?.accessToken;

      if (!idToken && !accessToken) {
        setLoading(false);
        return {
          success: false,
          error: "No token received from Google",
        };
      }

      // Send credential to backend /auth/google
      const credential = idToken || accessToken || "";
      const backendResponse =
        (await authApi.googleLogin?.({ credential })) ||
        (await fetch(
          `${process.env.EXPO_PUBLIC_API_URL || "https://api.wabmeta.com/api"}/auth/google`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential }),
          }
        ).then((r) => r.json()));

      const data: any =
        backendResponse?.data?.data || backendResponse?.data || backendResponse;

      if (!data?.tokens?.accessToken) {
        setLoading(false);
        return {
          success: false,
          error: data?.message || "Login failed on server",
        };
      }

      // Save tokens
      await AuthStorage.saveTokens(
        data.tokens.accessToken,
        data.tokens.refreshToken
      );

      if (data.user) await AuthStorage.saveUser(data.user);
      if (data.organization) await AuthStorage.saveOrg(data.organization);

      setLoading(false);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error("Google auth error:", error);
      setLoading(false);
      return {
        success: false,
        error: error?.message || "Google login failed",
      };
    }
  };

  return {
    signInWithGoogle,
    loading,
    isReady: !!request,
  };
};
