// src/context/SocketContext.tsx
// Exact matching socket events & room manager for WabMeta

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { AuthStorage } from "../utils/secureStorage";
import { performTokenRefresh, AppEvents, APP_EVENT } from "../services/api";

export const SOCKET_EVENTS = {
  // Inbox
  MESSAGE_NEW: "message:new",
  MESSAGE_STATUS: "message:status",
  CONVERSATION_UPDATED: "conversation:updated",

  // Account
  ACCOUNT_UPDATED: "account:updated",

  // Campaign
  CAMPAIGN_PROGRESS: "campaign:progress",
  CAMPAIGN_COMPLETED: "campaign:completed",
  CAMPAIGN_FAILED: "campaign:failed",

  // Auth
  FORCE_LOGOUT: "force_logout",
} as const;

export const SOCKET_ROOMS = {
  JOIN_CONVERSATION: "join:conversation",
  LEAVE_CONVERSATION: "leave:conversation",
  JOIN_CAMPAIGN: "campaign:join",
  LEAVE_CAMPAIGN: "campaign:leave",
  JOIN_ORG: "org:join",
  JOIN_USER: "user:join",
} as const;

const SOCKET_URL = (
  process.env.EXPO_PUBLIC_API_URL || "https://api.wabmeta.com/api"
).replace(/\/api\/?$/, "");

// Handshake reject hone par kitni baar token refresh karke retry karein
const MAX_AUTH_RETRIES = 3;

const isAuthError = (message?: string): boolean =>
  /token|auth|unauthor|jwt|expired|forbidden/i.test(message || "");

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  joinCampaign: (campaignId: string) => void;
  leaveCampaign: (campaignId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinConversation: () => {},
  leaveConversation: () => {},
  joinCampaign: () => {},
  leaveCampaign: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    let cancelled = false;
    let authRetries = 0;

    const initSocket = async () => {
      const storedToken = await AuthStorage.getAccessToken();
      if (!storedToken || cancelled) return;

      const socket = io(SOCKET_URL, {
        // Function form har connect/reconnect attempt par dobara chalta hai,
        // isliye handshake hamesha fresh (non-expired) token bhejta hai.
        auth: (cb: (data: object) => void) => {
          void (async () => {
            let token = await AuthStorage.getAccessToken();
            try {
              token = await performTokenRefresh();
            } catch {
              // Refresh fail -> jo stored hai usi se try karo
            }
            const organizationId = await AuthStorage.getOrgId();
            cb({ token, organizationId });
          })();
        },
        transports: ["websocket", "polling"],
        path: "/socket.io/",
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 45000,
      });

      if (cancelled) {
        socket.disconnect();
        return;
      }

      socketRef.current = socket;

      socket.on("connect", async () => {
        setIsConnected(true);
        authRetries = 0;
        console.log("Socket connected:", socket.id);

        const orgId = await AuthStorage.getOrgId();
        if (orgId) socket.emit(SOCKET_ROOMS.JOIN_ORG, orgId);
        if (user?.id) socket.emit(SOCKET_ROOMS.JOIN_USER, user.id);
      });

      socket.on("disconnect", (reason) => {
        setIsConnected(false);
        console.log("Socket disconnected:", reason);
      });

      socket.on("connect_error", async (err) => {
        console.error("Socket error:", err.message);

        if (!isAuthError(err.message)) return;

        // Auth reject: token refresh karke ek manual retry,
        // kyunki server ne handshake par hi connection band kar diya hai.
        if (authRetries >= MAX_AUTH_RETRIES) {
          console.warn("Socket auth failed after retries, giving up");
          return;
        }
        authRetries += 1;

        try {
          await performTokenRefresh();
        } catch {
          // performTokenRefresh 401 par khud FORCE_LOGOUT emit karta hai
          return;
        }

        if (!cancelled && !socket.connected) socket.connect();
      });

      socket.on(SOCKET_EVENTS.FORCE_LOGOUT, async (data: any) => {
        console.log("Force logout received:", data?.reason);
        socket.disconnect();
        await logout();
      });
    };

    // API layer ne token rotate kiya -> socket ko naye token par reconnect karo
    const handleTokenRefreshed = () => {
      const socket = socketRef.current;
      if (socket && !socket.connected) socket.connect();
    };
    AppEvents.on(APP_EVENT.TOKEN_REFRESHED, handleTokenRefreshed);

    initSocket();

    return () => {
      cancelled = true;
      AppEvents.off(APP_EVENT.TOKEN_REFRESHED, handleTokenRefreshed);
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, user?.id]);

  const joinConversation = useCallback((id: string) => {
    socketRef.current?.emit(SOCKET_ROOMS.JOIN_CONVERSATION, id);
  }, []);

  const leaveConversation = useCallback((id: string) => {
    socketRef.current?.emit(SOCKET_ROOMS.LEAVE_CONVERSATION, id);
  }, []);

  const joinCampaign = useCallback((id: string) => {
    socketRef.current?.emit(SOCKET_ROOMS.JOIN_CAMPAIGN, id);
  }, []);

  const leaveCampaign = useCallback((id: string) => {
    socketRef.current?.emit(SOCKET_ROOMS.LEAVE_CAMPAIGN, id);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        joinConversation,
        leaveConversation,
        joinCampaign,
        leaveCampaign,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
