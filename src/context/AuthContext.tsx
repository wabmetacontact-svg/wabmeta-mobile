// src/context/AuthContext.tsx
// Mobile version of AuthContext with AppEvents & SecureStorage

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { router } from "expo-router";
import {
  auth as authApi,
  organizations as orgApi,
  AppEvents,
  APP_EVENT,
  handleApiError,
} from "../services/api";
import { AuthStorage } from "../utils/secureStorage";
import { cacheClearAll } from "../hooks/useCachedFetch";

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  avatar?: string;
  emailVerified?: boolean;
  role?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  planType: string;
  featureInboxLocked?: boolean;
  featureCampaignsLocked?: boolean;
  featureChatbotLocked?: boolean;
  featureAutomationLocked?: boolean;
  featureConnectionLocked?: boolean;
}

export interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  googleLogin: (googleData: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  updateOrganization: (org: Partial<Organization>) => void;
  setOrganization: (org: Organization | null) => void;
  clearError: () => void;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage padhne me itna time bilkul nahi lagna chahiye - ye sirf
// tab bachata hai jab native module hi jawab dena band kar de
const SESSION_RESTORE_TIMEOUT_MS = 8000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganizationState] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    restoreSession();

    // Safety net: agar storage read kisi wajah se kabhi resolve hi na ho
    // (SecureStore ka native call latak jaye), to app hamesha ke liye
    // loading screen par phans jayegi. Utna intezaar karne ke baad
    // logged-out maan kar aage badh jao - login screen dikhna kam se kam
    // ek jammed spinner se behtar hai.
    const failsafe = setTimeout(() => {
      setIsLoading((stillLoading) => {
        if (stillLoading) {
          console.warn("Session restore timed out - continuing logged out");
        }
        return false;
      });
    }, SESSION_RESTORE_TIMEOUT_MS);

    return () => clearTimeout(failsafe);
  }, []);

  useEffect(() => {
    const handleForceLogout = async () => {
      cacheClearAll();
      await AuthStorage.clearAll();
      setUser(null);
      setOrganizationState(null);
      router.replace("/(auth)/login");
    };

    AppEvents.on(APP_EVENT.FORCE_LOGOUT, handleForceLogout);

    return () => {
      AppEvents.off(APP_EVENT.FORCE_LOGOUT, handleForceLogout);
    };
  }, []);

  // Server se latest user aur org le aao. Ye startup ko block nahi karta -
  // pehle cached session se app khul jati hai, fresh data baad me aa kar
  // chupchap replace ho jata hai.
  const refreshFromServer = async () => {
    const [userResult, orgResult] = await Promise.allSettled([
      authApi.me(),
      // Feature locks admin panel se badalte hain. Sirf login ke waqt saved
      // org rakhne se user ko dobara login kiye bina naya plan nahi dikhta,
      // isliye startup par org refresh kar lete hain.
      orgApi.getCurrent(),
    ]);

    if (userResult.status === "fulfilled") {
      const freshUser = userResult.value.data?.data;
      if (freshUser) {
        setUser(freshUser as User);
        await AuthStorage.saveUser(freshUser);
      }
    }
    // Fail hone par cached user hi chalta rahega (offline / flaky network)

    if (orgResult.status === "fulfilled") {
      const freshOrg = orgResult.value.data?.data;
      if (freshOrg?.id) {
        setOrganizationState(freshOrg as Organization);
        await AuthStorage.saveOrg(freshOrg);
      }
    }
    // Fail hone par cached org se hi kaam chalao
  };

  const restoreSession = async () => {
    try {
      const [accessToken, storedUser, storedOrg] = await Promise.all([
        AuthStorage.getAccessToken(),
        AuthStorage.getUser<User>(),
        AuthStorage.getOrg<Organization>(),
      ]);

      if (!accessToken || !storedUser) return;

      setUser(storedUser);
      if (storedOrg) setOrganizationState(storedOrg);

      // Jaan bujh kar await nahi kar rahe. Pehle yahan me() aur
      // getCurrent() dono await hote the - dono par 30s ka axios timeout
      // hai, to slow ya dead network par app poore 60 second loading
      // screen par atak jati thi. Cached session pehle se maujood hai,
      // isliye UI turant khol do aur refresh background me hone do.
      void refreshFromServer().catch(() => {});
    } catch (err) {
      console.error("Session restore error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    try {
      const response = await authApi.login({ email, password });
      const { user: userData, tokens, organization: orgData } =
        response.data.data;

      await AuthStorage.saveTokens(
        tokens.accessToken,
        tokens.refreshToken
      );

      await AuthStorage.saveUser(userData);
      if (orgData) await AuthStorage.saveOrg(orgData);

      setUser(userData as User);
      if (orgData) setOrganizationState(orgData as Organization);

      router.replace("/(app)/(tabs)");
      return { success: true };
    } catch (err: any) {
      const message = handleApiError(err, "Login failed");
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const googleLogin = useCallback(
    async (googleData: any): Promise<{ success: boolean; error?: string }> => {
      setError(null);
      try {
        const { user: userData, organization: orgData } = googleData;

        if (userData) setUser(userData as User);
        if (orgData) setOrganizationState(orgData as Organization);

        router.replace("/(app)/(tabs)");
        return { success: true };
      } catch (err: any) {
        const message = err?.message || "Google login failed";
        setError(message);
        return { success: false, error: message };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      // Screen caches bhi saaf karo - warna agla user pichhle user ka
      // data (chats, contacts, campaigns) dekh lega
      cacheClearAll();
      await AuthStorage.clearAll();
      setUser(null);
      setOrganizationState(null);
      router.replace("/(auth)/login");
    }
  }, []);

  const updateUser = useCallback((updatedData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const newUser = { ...prev, ...updatedData };
      AuthStorage.saveUser(newUser);
      return newUser;
    });
  }, []);

  const setOrganization = useCallback(
    (org: Organization | null) => {
      setOrganizationState(org);
      if (org) AuthStorage.saveOrg(org);
    },
    []
  );

  const updateOrganization = useCallback(
    (updatedData: Partial<Organization>) => {
      setOrganizationState((prev) => {
        if (!prev) return prev;
        const newOrg = { ...prev, ...updatedData };
        AuthStorage.saveOrg(newOrg);
        return newOrg;
      });
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const response = await authApi.me();
      const freshUser = response.data.data;
      setUser(freshUser as User);
      await AuthStorage.saveUser(freshUser);
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      organization,
      isAuthenticated: !!user,
      isLoading,
      error,
      login,
      googleLogin,
      logout,
      updateUser,
      updateOrganization,
      setOrganization,
      clearError,
      refreshSession,
    }),
    [
      user,
      organization,
      isLoading,
      error,
      login,
      googleLogin,
      logout,
      updateUser,
      updateOrganization,
      setOrganization,
      clearError,
      refreshSession,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export default AuthContext;
