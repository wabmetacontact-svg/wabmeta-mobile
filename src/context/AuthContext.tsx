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
  }, []);

  useEffect(() => {
    const handleForceLogout = async () => {
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

  const restoreSession = async () => {
    try {
      const accessToken = await AuthStorage.getAccessToken();
      const storedUser = await AuthStorage.getUser<User>();
      const storedOrg = await AuthStorage.getOrg<Organization>();

      if (!accessToken || !storedUser) {
        setIsLoading(false);
        return;
      }

      setUser(storedUser);
      if (storedOrg) setOrganizationState(storedOrg);

      try {
        const response = await authApi.me();
        const freshUser = response.data.data;
        setUser(freshUser as User);
        await AuthStorage.saveUser(freshUser);
      } catch {
        // Keep offline cached user if temporary failure
      }

      // Feature locks admin panel se badalte hain. Sirf login ke waqt saved
      // org rakhne se user ko dobara login kiye bina naya plan nahi dikhta,
      // isliye startup par org refresh kar lete hain.
      try {
        const orgRes = await orgApi.getCurrent();
        const freshOrg = orgRes.data?.data;
        if (freshOrg?.id) {
          setOrganizationState(freshOrg as Organization);
          await AuthStorage.saveOrg(freshOrg);
        }
      } catch {
        // Cached org se hi kaam chalao
      }
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
