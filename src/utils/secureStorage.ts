// src/utils/secureStorage.ts
// Web: localStorage -> Mobile: SecureStore + AsyncStorage

import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Buffer } from "buffer";

// JWT tokens -> SecureStore (encrypted)
// User data, org -> AsyncStorage (JSON)

const TOKEN_KEYS = {
  ACCESS: "accessToken",
  REFRESH: "refreshToken",
  USER: "wabmeta_user",
  ORG: "wabmeta_org",
} as const;

// --- Secure (tokens) ------------------------------------
export const SecureStorage = {
  async setToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // SecureStore fallback on AsyncStorage
      await AsyncStorage.setItem(key, value);
    }
  },

  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return AsyncStorage.getItem(key);
    }
  },

  async removeToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
    await AsyncStorage.removeItem(key);
  },
};

// --- JWT Validator ---------------------------------------
export const isValidJWT = (token: string | null): boolean => {
  if (!token || typeof token !== "string") return false;
  return token.split(".").length === 3;
};

// --- JWT Decode (web: atob -> mobile: Buffer/base64) ------
export const decodeJWTPayload = (token: string): any => {
  try {
    const base64 = token.split(".")[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decoded = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

// --- Token Freshness --------------------------------------
// isValidJWT sirf shape check karta hai (3 parts) - wo expiry nahi dekhta.
// Ye actually exp claim check karta hai, thode margin ke saath, taki token
// use hone se pehle hi expire na ho jaye.
export const isTokenFresh = (
  token: string | null,
  marginMs = 30_000
): boolean => {
  if (!isValidJWT(token)) return false;

  const payload = decodeJWTPayload(token as string);
  if (!payload?.exp) return false;

  return payload.exp * 1000 - Date.now() > marginMs;
};

// --- Auth Storage (High Level) ---------------------------
export const AuthStorage = {
  async saveTokens(
    accessToken: string,
    refreshToken: string
  ): Promise<void> {
    await Promise.all([
      SecureStorage.setToken(TOKEN_KEYS.ACCESS, accessToken),
      SecureStorage.setToken(TOKEN_KEYS.REFRESH, refreshToken),
    ]);
  },

  // Sirf access token rotate karo - refresh token untouched rahe
  async saveAccessToken(accessToken: string): Promise<void> {
    await SecureStorage.setToken(TOKEN_KEYS.ACCESS, accessToken);
  },

  async getAccessToken(): Promise<string | null> {
    const token = await SecureStorage.getToken(TOKEN_KEYS.ACCESS);
    return isValidJWT(token) ? token : null;
  },

  async getRefreshToken(): Promise<string | null> {
    const token = await SecureStorage.getToken(TOKEN_KEYS.REFRESH);
    return token && token.length > 0 ? token : null;
  },

  async saveUser(user: unknown): Promise<void> {
    await AsyncStorage.setItem(
      TOKEN_KEYS.USER,
      JSON.stringify(user)
    );
  },

  async getUser<T>(): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(TOKEN_KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async saveOrg(org: unknown): Promise<void> {
    await AsyncStorage.setItem(
      TOKEN_KEYS.ORG,
      JSON.stringify(org)
    );
  },

  async getOrg<T>(): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(TOKEN_KEYS.ORG);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async getOrgId(): Promise<string | null> {
    const org = await this.getOrg<{ id: string }>();
    return org?.id || null;
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      SecureStorage.removeToken(TOKEN_KEYS.ACCESS),
      SecureStorage.removeToken(TOKEN_KEYS.REFRESH),
      AsyncStorage.removeItem(TOKEN_KEYS.USER),
      AsyncStorage.removeItem(TOKEN_KEYS.ORG),
    ]);
  },
};
