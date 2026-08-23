// src/hooks/useCampaignRealtime.ts
import { useEffect, useState, useCallback, useRef } from "react";
import { useSocket } from "../context/SocketContext";

interface Progress {
  sent: number;
  failed: number;
  delivered: number;
  read: number;
  total: number;
  percentage: number;
  status?: string;
}

interface ContactStatus {
  status: string;
  messageId?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  error?: string;
}

export function useCampaignRealtime(campaignId: string | null) {
  const { socket, isConnected, joinCampaign, leaveCampaign } = useSocket();

  const [progress, setProgress] = useState<Progress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedStats, setCompletedStats] = useState<any>(null);
  const [contactStatusMap, setContactStatusMap] = useState<
    Map<string, ContactStatus>
  >(new Map());
  const [campaignError, setCampaignError] = useState<any>(null);

  const currentCampaignRef = useRef<string | null>(null);

  const resetStats = useCallback(() => {
    setProgress(null);
    setIsProcessing(false);
    setCompletedStats(null);
    setContactStatusMap(new Map());
    setCampaignError(null);
  }, []);

  // Join campaign room
  useEffect(() => {
    if (!campaignId || !socket) return;

    // Leave previous
    if (currentCampaignRef.current && currentCampaignRef.current !== campaignId) {
      leaveCampaign(currentCampaignRef.current);
    }

    joinCampaign(campaignId);
    currentCampaignRef.current = campaignId;

    return () => {
      if (currentCampaignRef.current) {
        leaveCampaign(currentCampaignRef.current);
      }
    };
  }, [campaignId, socket, joinCampaign, leaveCampaign]);

  // Socket events
  useEffect(() => {
    if (!socket || !campaignId) return;

    const onUpdate = (data: any) => {
      if (data.campaignId !== campaignId) return;
      if (data.status === "RUNNING") setIsProcessing(true);
      if (data.status === "COMPLETED" || data.status === "FAILED") {
        setIsProcessing(false);
      }
    };

    const onProgress = (data: any) => {
      if (data.campaignId !== campaignId) return;
      setProgress({
        sent: data.sent || 0,
        failed: data.failed || 0,
        delivered: data.delivered || 0,
        read: data.read || 0,
        total: data.total || 0,
        percentage: data.percentage || 0,
        status: data.status,
      });
      setIsProcessing(true);
    };

    const onCompleted = (data: any) => {
      if (data.campaignId !== campaignId) return;
      setCompletedStats(data);
      setIsProcessing(false);
    };

    const onContactStatus = (data: any) => {
      if (data.campaignId !== campaignId) return;
      setContactStatusMap((prev) => {
        const next = new Map(prev);
        next.set(data.contactId, {
          status: data.status,
          messageId: data.messageId,
          error: data.error,
          sentAt: data.status === "SENT" ? new Date().toISOString() : undefined,
        });
        return next;
      });
    };

    const onError = (data: any) => {
      if (data.campaignId !== campaignId) return;
      setCampaignError(data);
    };

    socket.on("campaign:update", onUpdate);
    socket.on("campaign:progress", onProgress);
    socket.on("campaign:completed", onCompleted);
    // Backend emits per-contact updates as campaign:contact / campaign:contact:status
    // (not "contact:status"). Bind both so live per-recipient status works.
    socket.on("campaign:contact", onContactStatus);
    socket.on("campaign:contact:status", onContactStatus);
    socket.on("campaign:error", onError);

    return () => {
      socket.off("campaign:update", onUpdate);
      socket.off("campaign:progress", onProgress);
      socket.off("campaign:completed", onCompleted);
      socket.off("campaign:contact", onContactStatus);
      socket.off("campaign:contact:status", onContactStatus);
      socket.off("campaign:error", onError);
    };
  }, [socket, campaignId]);

  return {
    progress,
    isProcessing,
    completedStats,
    contactStatusMap,
    isConnected,
    campaignError,
    resetStats,
  };
}

export default useCampaignRealtime;
