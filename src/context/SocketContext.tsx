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

    const initSocket = async () => {
      const token = await AuthStorage.getAccessToken();
      const orgId = await AuthStorage.getOrgId();

      if (!token) return;

      const socket = io("https://api.wabmeta.com", {
        auth: {
          token,
          organizationId: orgId,
        },
        transports: ["websocket", "polling"],
        path: "/socket.io/",
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 45000,
      });

      socket.on("connect", () => {
        setIsConnected(true);
        console.log("Socket connected:", socket.id);

        if (orgId) socket.emit(SOCKET_ROOMS.JOIN_ORG, orgId);
        if (user?.id) socket.emit(SOCKET_ROOMS.JOIN_USER, user.id);
      });

      socket.on("disconnect", (reason) => {
        setIsConnected(false);
        console.log("Socket disconnected:", reason);
      });

      socket.on("connect_error", (err) => {
        console.error("Socket error:", err.message);
      });

      socket.on(SOCKET_EVENTS.FORCE_LOGOUT, async (data: any) => {
        console.log("Force logout received:", data?.reason);
        socket.disconnect();
        await logout();
      });

      socketRef.current = socket;
    };

    initSocket();

    return () => {
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
