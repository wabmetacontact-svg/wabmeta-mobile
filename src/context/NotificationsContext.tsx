// src/context/NotificationsContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { notifications as notificationsApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { usePushNotifications, PushStatus } from "../hooks/usePushNotifications";

export interface AppNotification {
  id: string;
  type: "message" | "campaign" | "team" | "billing" | "alert" | "whatsapp" | "system";
  title: string;
  description: string;
  actionUrl?: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationsContextProps {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  fetchNotifications: (filter?: "all" | "unread", type?: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  // Push kaam kar raha hai ya nahi - taaki UI wajah dikha sake
  pushStatus: PushStatus;
  pushError: string | null;
}

const NotificationsContext = createContext<NotificationsContextProps | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { lastNotification, pushStatus, pushError } = usePushNotifications();

  const fetchNotifications = useCallback(async (filter: "all" | "unread" = "all", type = "all") => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationsApi.getAll({
        filter: filter === "all" ? undefined : "unread",
        type: type === "all" ? undefined : type,
        limit: 100,
      });

      if (res?.data?.success) {
        const data = res.data.data as any;
        const items = Array.isArray(data) ? data : data?.items || data?.notifications || [];
        setNotifications(items);
        setUnreadCount(typeof data?.unreadCount === "number" ? data.unreadCount : items.filter((n: any) => !n.read).length);
      }
    } catch (error) {
      console.error("Error loading notifications from API:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  // Sync background triggers instantly to the UI
  useEffect(() => {
    if (lastNotification) {
      fetchNotifications();
    }
  }, [lastNotification, fetchNotifications]);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await notificationsApi.markAsRead(id);
    } catch (e) {
      fetchNotifications(); // rollback on failure
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      await notificationsApi.markAllAsRead();
    } catch (e) {
      fetchNotifications();
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const isUnread = notifications.find((n) => n.id === id)?.read === false;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (isUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
      await notificationsApi.delete(id);
    } catch (e) {
      fetchNotifications();
    }
  };

  const clearAll = async () => {
    try {
      setNotifications([]);
      setUnreadCount(0);
      await notificationsApi.clearAll();
    } catch (e) {
      fetchNotifications();
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refreshing,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        pushStatus,
        pushError,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
};
