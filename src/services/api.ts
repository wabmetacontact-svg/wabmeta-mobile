// src/services/api.ts
// Mobile port of WabMeta API client

import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { EventEmitter } from "events";
import {
  AuthStorage,
  isValidJWT,
  isTokenFresh,
} from "../utils/secureStorage";

// --- App Events (window.dispatchEvent replacement) -------
export const AppEvents = new EventEmitter();
AppEvents.setMaxListeners(20);

// Event names (web ke CustomEvent names same rakh)
export const APP_EVENT = {
  FORCE_LOGOUT: "force_logout",
  PLAN_LIMIT: "planLimitExceeded",
  TOKEN_REFRESHED: "token_refreshed",
} as const;

// --- Types (same as web) ---------------------------------
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
  details?: any;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  emailVerified: boolean;
  createdAt: string;
  role?: string;
  name?: string;
}

export interface AuthResponseData {
  user: AuthUser;
  tokens: AuthTokens;
  organization?: {
    id: string;
    name: string;
    slug: string;
    planType: string;
  };
}

// --- Config ----------------------------------------------
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.wabmeta.com/api";

console.log("API BASE URL:", API_BASE_URL);

// --- Axios Instance --------------------------------------
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// --- Request Interceptor ---------------------------------
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const accessToken = await AuthStorage.getAccessToken();

    if (accessToken) {
      config.headers.Authorization = "Bearer " + accessToken;
    }

    const orgId = await AuthStorage.getOrgId();
    if (orgId) {
      config.headers["X-Organization-Id"] = orgId;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// --- Single-Flight Token Refresh -------------------------
let isRefreshing = false;
let lastRefreshTimestamp = 0;

type QueueItem = {
  resolve: (token: string) => void;
  reject: (error: any) => void;
};

let refreshQueue: QueueItem[] = [];
const REFRESH_DEBOUNCE_MS = 10_000;

const processQueue = (
  error: any, 
  token: string | null = null
): void => {
  refreshQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : token && resolve(token);
  });
  refreshQueue = [];
};

export const performTokenRefresh = async (): Promise<string> => {
  const now = Date.now();

  const currentToken = await AuthStorage.getAccessToken();
  if (isTokenFresh(currentToken)) return currentToken as string;

  // Debounce window ke andar bhi stored token tabhi return karo jab wo
  // sach mein fresh ho. Pehle yahan sirf isValidJWT (shape check) tha, to
  // expired token bhi pass ho jata tha aur socket handshake us par fail hota.
  if (now - lastRefreshTimestamp < REFRESH_DEBOUNCE_MS) {
    const token = await AuthStorage.getAccessToken();
    if (isTokenFresh(token)) return token as string;
  }

  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  const refreshToken = await AuthStorage.getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  isRefreshing = true;

  try {
    const response = await axios.post<ApiResponse<AuthTokens>>(
      API_BASE_URL + "/auth/refresh",
      { refreshToken },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      }
    );

    const newAccessToken = response.data?.data?.accessToken;
    const newRefreshToken = response.data?.data?.refreshToken;

    if (!newAccessToken || !isValidJWT(newAccessToken)) {
      throw new Error("Invalid token from refresh");
    }

    await AuthStorage.saveTokens(
      newAccessToken,
      newRefreshToken || refreshToken
    );
    lastRefreshTimestamp = Date.now();

    AppEvents.emit(APP_EVENT.TOKEN_REFRESHED, {
      accessToken: newAccessToken,
    });

    processQueue(null, newAccessToken);
    return newAccessToken;

  } catch (error: any) {
    processQueue(error, null);

    if (error?.response?.status === 401) {
      await AuthStorage.clearAll();
      lastRefreshTimestamp = 0;

      AppEvents.emit(APP_EVENT.FORCE_LOGOUT, {
        title: "Session Expired",
        message: "Please sign in to continue.",
      });
    }

    throw error;
  } finally {
    isRefreshing = false;
  }
};

// --- Response Interceptor --------------------------------
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const newToken = response.headers["x-new-access-token"];
    if (newToken && isValidJWT(newToken)) {
      // saveTokens(newToken, "") refresh token ko blank kar deta tha
      void AuthStorage.saveAccessToken(newToken).then(() => {
        AppEvents.emit(APP_EVENT.TOKEN_REFRESHED, { accessToken: newToken });
      });
      lastRefreshTimestamp = Date.now();
    }
    return response;
  },

  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const status = error.response?.status;
    const url = originalRequest?.url || "";

    if (error.code === "ERR_NETWORK") {
      return Promise.reject({
        message: "No internet connection.",
        code: "NETWORK_ERROR",
      });
    }

    if (error.code === "ECONNABORTED") {
      return Promise.reject({
        message: "Request timed out.",
        code: "TIMEOUT",
      });
    }

    if (status === 402) {
      const errorData = error.response?.data as any;

      AppEvents.emit(APP_EVENT.PLAN_LIMIT, {
        limitType: errorData?.data?.limitType,
        used: errorData?.data?.used,
        limit: errorData?.data?.limit,
        message: errorData?.message,
      });

      return Promise.reject({
        ...error,
        isLimitExceeded: true,
        limitData: errorData?.data,
      });
    }

    const skipRefresh =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/verify");

    if (status === 401 && originalRequest && !originalRequest._retry) {
      if (skipRefresh) return Promise.reject(error);

      const refreshToken = await AuthStorage.getRefreshToken();
      if (!refreshToken) {
        await AuthStorage.clearAll();
        AppEvents.emit(APP_EVENT.FORCE_LOGOUT, {
          title: "Session Expired",
          message: "Please sign in to continue.",
        });
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const newToken = await performTokenRefresh();

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = "Bearer " + newToken;
        }

        return api(originalRequest);
      } catch (refreshError: any) {
        if (refreshError?.response?.status === 401) {
          await AuthStorage.clearAll();
          AppEvents.emit(APP_EVENT.FORCE_LOGOUT, {
            title: "Session Expired",
            message: "Your session has ended.",
          });
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// --- API Modules -----------------------------------------

export const auth = {
  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse<AuthResponseData>>("/auth/login", data),

  googleLogin: (data: { credential: string }) =>
    api.post<ApiResponse<AuthResponseData>>("/auth/google", data),

  register: (data: {
    email: string;
    password: string;
    confirmPassword?: string;
    firstName: string;
    lastName?: string;
    phone?: string;
    organizationName?: string;
  }) => api.post<ApiResponse>("/auth/register", data),

  me: () => api.get<ApiResponse<AuthUser>>("/auth/me"),

  logout: () =>
    api.post<ApiResponse<{ message: string }>>("/auth/logout"),

  forgotPassword: (data: { email: string }) =>
    api.post<ApiResponse>("/auth/forgot-password", data),

  resetPassword: (data: {
    token: string;
    password: string;
    confirmPassword?: string;
  }) => api.post<ApiResponse>("/auth/reset-password", data),

  verifyEmail: (data: { token: string }) =>
    api.post<ApiResponse>("/auth/verify-email", data),

  sendOTP: (data: { email: string }) =>
    api.post<ApiResponse>("/auth/send-otp", data),

  verifyOTP: (data: { email: string; otp: string }) =>
    api.post<ApiResponse<AuthResponseData>>("/auth/verify-otp", data),

  sendPhoneOTP: (data: { phone: string }) =>
    api.post<ApiResponse>("/auth/send-phone-otp", data),

  verifyPhoneOTP: (data: { phone: string; otp: string; name?: string }) =>
    api.post<ApiResponse<AuthResponseData>>("/auth/verify-phone-otp", data),

  refresh: (refreshToken: string) =>
    api.post<ApiResponse<AuthTokens>>("/auth/refresh", { refreshToken }),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => api.post<ApiResponse>("/auth/change-password", data),
};

export const inbox = {
  // Conversations
  getConversations: (params?: any) =>
    api.get<ApiResponse>("/inbox/conversations", { params }),

  getConversation: (id: string) =>
    api.get<ApiResponse>(`/inbox/conversations/${id}`),

  startConversation: (contactId: string) =>
    api.post<ApiResponse>("/inbox/conversations/start", { contactId }),

  updateConversation: (id: string, data: any) =>
    api.put<ApiResponse>(`/inbox/conversations/${id}`, data),

  deleteConversation: (id: string) =>
    api.delete<ApiResponse>(`/inbox/conversations/${id}`),

  markAsRead: (id: string) =>
    api.post<ApiResponse>(`/inbox/conversations/${id}/read`),

  archiveConversation: (id: string) =>
    api.post<ApiResponse>(`/inbox/conversations/${id}/archive`),

  unarchiveConversation: (id: string) =>
    api.post<ApiResponse>(`/inbox/conversations/${id}/unarchive`),

  togglePin: (id: string, isPinned: boolean) =>
    api.patch<ApiResponse>(`/inbox/conversations/${id}/pin`, { isPinned }),

  sendTypingIndicator: (id: string) =>
    api.post<ApiResponse>(`/inbox/conversations/${id}/typing`),

  assignConversation: (id: string, userId: string | null) =>
    api.post<ApiResponse>(`/inbox/conversations/${id}/assign`, { userId }),

  // Messages
  getMessages: (conversationId: string, params?: any) =>
    api.get<ApiResponse>(
      `/inbox/conversations/${conversationId}/messages`,
      { params }
    ),

  sendMessage: async (
    conversationId: string,
    data: { content: string; type?: string; tempId?: string }
  ) => {
    const response = await api.post<ApiResponse>(
      `/inbox/conversations/${conversationId}/messages`,
      data
    );
    const now = new Date().toISOString();
    if (response.data?.data) {
      const msg = response.data.data as any;
      response.data.data = {
        ...msg,
        createdAt: msg.createdAt || now,
        timestamp: msg.timestamp || now,
        sentAt: msg.sentAt || now,
      };
    }
    return response;
  },

  deleteMessage: (conversationId: string, messageId: string) =>
    api.delete<ApiResponse>(
      `/inbox/conversations/${conversationId}/messages/${messageId}`
    ),

  editMessage: (conversationId: string, messageId: string, content: string) =>
    api.patch<ApiResponse>(
      `/inbox/conversations/${conversationId}/messages/${messageId}`,
      { content }
    ),

  // Media
  uploadMedia: async (uri: string, type: string, name: string) => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      type,
      name,
    } as any);

    return api.post<ApiResponse>("/inbox/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    });
  },

  sendMediaMessage: (
    conversationId: string,
    data: {
      mediaType: "image" | "video" | "audio" | "document";
      mediaUrl: string;
      caption?: string;
      tempId?: string;
    }
  ) =>
    api.post<ApiResponse>(
      `/inbox/conversations/${conversationId}/messages/media`,
      data
    ),

  // Labels
  getLabels: () => api.get<ApiResponse>("/inbox/labels"),

  createCustomLabel: (label: string, color?: string) =>
    api.post<ApiResponse>("/inbox/labels", { label, color }),

  deleteCustomLabel: (label: string) =>
    api.delete<ApiResponse>(`/inbox/labels/${label}`),

  addLabels: (id: string, labels: string[]) =>
    api.post<ApiResponse>(`/inbox/conversations/${id}/labels`, { labels }),

  removeLabel: (id: string, label: string) =>
    api.delete<ApiResponse>(`/inbox/conversations/${id}/labels/${label}`),

  // Bulk
  bulkUpdate: (data: { conversationIds: string[]; [key: string]: any }) =>
    api.post<ApiResponse>("/inbox/bulk", data),

  bulkDelete: (conversationIds: string[]) =>
    api.post<ApiResponse>("/inbox/bulk-delete", { conversationIds }),

  deleteAllConversations: () =>
    api.delete<ApiResponse>("/inbox/delete-all"),

  // Search + Stats
  searchMessages: (query: string, params?: any) =>
    api.get<ApiResponse>("/inbox/search", { params: { q: query, ...params } }),

  stats: () => api.get<ApiResponse>("/inbox/stats"),

  // Template media resolution
  resolveTemplateMedia: (templateId: string) =>
    api.post<ApiResponse>("/inbox/template/resolve-media", { templateId }),

  // Media proxy URL builder
  getMediaUrl: (mediaId: string) =>
    `${process.env.EXPO_PUBLIC_API_URL || "https://api.wabmeta.com"}/inbox/media/${mediaId}`,
};

export const contacts = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    tags?: string[];
    groupId?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    hasWhatsAppProfile?: boolean;
  }) => api.get<ApiResponse>("/contacts", { params }),

  create: (data: {
    phone: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    tags?: string[];
    customFields?: any;
    groupIds?: string[];
  }) => api.post<ApiResponse>("/contacts", data),

  getById: (id: string) => api.get<ApiResponse>(`/contacts/${id}`),

  // Backend uses PATCH for contact/group edits, not PUT.
  update: (id: string, data: any) => api.patch<ApiResponse>(`/contacts/${id}`, data),

  delete: (id: string) => api.delete<ApiResponse>(`/contacts/${id}`),

  bulkUpdate: (data: {
    contactIds: string[];
    tags?: string[];
    groupIds?: string[];
    status?: string;
  }) => api.patch<ApiResponse>("/contacts/bulk", data),

  // Bulk/all delete are DELETE with the ids in the request body.
  bulkDelete: (contactIds: string[]) =>
    api.delete<ApiResponse>("/contacts/bulk", { data: { contactIds } }),

  deleteAll: () => api.delete<ApiResponse>("/contacts/all"),

  import: (data: {
    contacts?: any[];
    csvData?: string;
    groupId?: string;
    groupName?: string;
    tags?: string[];
  }) => api.post<ApiResponse>("/contacts/import", data),

  bulkPaste: (data: {
    phoneNumbers: string;
    groupId?: string;
    tags?: string[];
  }) => api.post<ApiResponse>("/contacts/bulk-paste", data),

  export: (groupId?: string) =>
    api.get(`/contacts/export`, {
      params: { format: "csv", groupId },
      responseType: "blob",
    }),

  stats: () => api.get<ApiResponse>("/contacts/stats"),

  getTags: () => api.get<ApiResponse>("/contacts/tags"),

  getGroups: () => api.get<ApiResponse>("/contacts/groups/all"),

  search: (query: string, limit = 30) =>
    api.get<ApiResponse>("/contacts/search", {
      params: { q: query, limit },
    }),

  getImportStats: () => api.get<ApiResponse>("/contacts/import-stats"),

  // Groups
  createGroup: (data: {
    name: string;
    description?: string;
    color?: string;
  }) => api.post<ApiResponse>("/contacts/groups", data),

  updateGroup: (groupId: string, data: any) =>
    api.patch<ApiResponse>(`/contacts/groups/${groupId}`, data),

  deleteGroup: (groupId: string, deleteContacts?: boolean) =>
    api.delete<ApiResponse>(`/contacts/groups/${groupId}`, {
      params: { deleteContacts },
    }),

  getGroupContacts: (groupId: string, params?: any) =>
    api.get<ApiResponse>(`/contacts/groups/${groupId}/contacts`, { params }),

  addContactsToGroup: (groupId: string, contactIds: string[]) =>
    api.post<ApiResponse>(`/contacts/groups/${groupId}/contacts`, { contactIds }),

  removeContactsFromGroup: (groupId: string, contactIds: string[]) =>
    api.delete<ApiResponse>(`/contacts/groups/${groupId}/contacts`, {
      data: { contactIds },
    }),
};

export const campaigns = {
  getAll: (params?: any) => api.get<ApiResponse>("/campaigns", { params }),

  create: (data: any) => api.post<ApiResponse>("/campaigns", data),

  getById: (id: string) => api.get<ApiResponse>(`/campaigns/${id}`),

  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/campaigns/${id}`, data),

  delete: (id: string) => api.delete<ApiResponse>(`/campaigns/${id}`),

  start: (id: string) => api.post<ApiResponse>(`/campaigns/${id}/start`),

  pause: (id: string) => api.post<ApiResponse>(`/campaigns/${id}/pause`),

  resume: (id: string) => api.post<ApiResponse>(`/campaigns/${id}/resume`),

  cancel: (id: string) => api.post<ApiResponse>(`/campaigns/${id}/cancel`),

  retry: (id: string, data?: any) =>
    api.post<ApiResponse>(`/campaigns/${id}/retry`, data),

  duplicate: (id: string, name: string) =>
    api.post<ApiResponse>(`/campaigns/${id}/duplicate`, { name }),

  stats: () => api.get<ApiResponse>("/campaigns/stats"),

  getContacts: (id: string, params?: any) =>
    api.get<ApiResponse>(`/campaigns/${id}/contacts`, { params }),

  getDetailedStats: (id: string) =>
    api.get<ApiResponse>(`/campaigns/${id}/stats`),

  getAnalytics: (id: string) =>
    api.get<ApiResponse>(`/campaigns/${id}/analytics`),

  estimateCost: (id: string) =>
    api.get<ApiResponse>(`/campaigns/${id}/estimate-cost`),

  getFailedContacts: (id: string, page = 1, limit = 100) =>
    api.get<ApiResponse>(`/campaigns/${id}/failed`, {
      params: { page, limit },
    }),

  exportFailedContacts: (id: string) =>
    api.get(`/campaigns/${id}/failed/export`, { responseType: "blob" }),

  getRecipients: (id: string, params?: any) =>
    api.get<ApiResponse>(`/campaigns/${id}/recipients`, { params }),

  exportRecipients: (id: string, status?: string) =>
    api.get(`/campaigns/${id}/recipients/export`, {
      params: { status },
      responseType: "blob",
    }),

  retryFailed: (id: string, data?: any) =>
    api.post<ApiResponse>(`/campaigns/${id}/retry-failed`, data),
};

export const templates = {
  getAll: (params?: any) =>
    api.get<ApiResponse>("/templates", { params }),

  getById: (id: string) =>
    api.get<ApiResponse>(`/templates/${id}`),

  getApproved: (params?: any) =>
    api.get<ApiResponse>("/templates/approved", { params }),

  create: (data: any) =>
    api.post<ApiResponse>("/templates", data),

  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/templates/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/templates/${id}`),

  duplicate: (id: string, newName: string, whatsappAccountId?: string) =>
    api.post<ApiResponse>(`/templates/${id}/duplicate`, {
      newName,
      whatsappAccountId,
    }),

  submit: (id: string, whatsappAccountId?: string) =>
    api.post<ApiResponse>(`/templates/${id}/submit`, { whatsappAccountId }),

  sync: (whatsappAccountId?: string) =>
    api.post<ApiResponse>("/templates/sync", { whatsappAccountId }),

  stats: (whatsappAccountId?: string) =>
    api.get<ApiResponse>("/templates/stats", {
      params: { whatsappAccountId },
    }),

  languages: (whatsappAccountId?: string) =>
    api.get<ApiResponse>("/templates/languages", {
      params: { whatsappAccountId },
    }),

  preview: (data: {
    bodyText: string;
    variables?: Record<string, string>;
    headerType?: string;
    headerContent?: string;
    footerText?: string;
    buttons?: any[];
  }) => api.post<ApiResponse>("/templates/preview", data),

  uploadMedia: async (
    uri: string,
    type: string,
    name: string,
    whatsappAccountId: string
  ) => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      type,
      name,
    } as any);
    formData.append("whatsappAccountId", whatsappAccountId);

    return api.post<ApiResponse>("/templates/upload-media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 180000,
    });
  },
};

export const dashboard = {
  getStats: () => api.get<ApiResponse>("/dashboard/stats"),

  getWidgets: (days = 7) =>
    api.get<ApiResponse>("/dashboard/widgets", {
      params: { days },
    }),

  getActivity: (limit = 10) =>
    api.get<ApiResponse>("/dashboard/activity", {
      params: { limit },
    }),
};

export const wallet = {
  getWallet: () => api.get<ApiResponse>("/wallet"),

  requestAccess: (data: { reason: string; additionalInfo?: string }) =>
    api.post<ApiResponse>("/wallet/request-access", data),

  getTransactions: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get<ApiResponse>("/wallet/transactions", { params }),

  createTopUpOrder: (amount: number) =>
    api.post<ApiResponse>("/wallet/topup/create-order", { amount }),

  verifyTopUp: (data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    amount: number;
  }) => api.post<ApiResponse>("/wallet/topup/verify", data),

  getAnalytics: (params?: {
    days?: number;
    startDate?: string;
    endDate?: string;
  }) => api.get<ApiResponse>("/wallet/analytics", { params }),

  getPendingTopUps: () => api.get<ApiResponse>("/wallet/pending-topups"),

  retryTopUp: (data: {
    razorpayOrderId: string;
    razorpayPaymentId?: string;
  }) => api.post<ApiResponse>("/wallet/topup/retry", data),
};

export const meta = {
  getAccounts: () => api.get<ApiResponse>("/meta/accounts"),

  getAccount: (id: string) => api.get<ApiResponse>(`/meta/accounts/${id}`),

  getOrgStatus: (organizationId: string) =>
    api.get<ApiResponse>(`/meta/organizations/${organizationId}/status`),

  disconnect: (id: string) =>
    api.post<ApiResponse>(`/meta/accounts/${id}/disconnect`),

  setDefault: (id: string) =>
    api.post<ApiResponse>(`/meta/accounts/${id}/set-default`),

  syncTemplates: (organizationId: string, accountId: string) =>
    api.post<ApiResponse>(
      `/meta/organizations/${organizationId}/accounts/${accountId}/sync-templates`
    ),

  refreshHealth: (organizationId: string, accountId: string) =>
    api.post<ApiResponse>(
      `/meta/organizations/${organizationId}/accounts/${accountId}/health`
    ),

  getConfig: () => api.get<ApiResponse>("/meta/config"),

  getIntegrationStatus: () =>
    api.get<ApiResponse>("/meta/integration-status"),
};

export const whatsapp = {
  accounts: () => api.get<ApiResponse>("/meta/accounts"),

  sendText: async (data: {
    whatsappAccountId: string;
    to: string;
    message: string;
    tempId?: string;
    // conversationId bhejna zaroori hai: iske bina backend har send par
    // conversation dobara dhoondta/banata hai (2 extra DB round trip) aur
    // 24h window check bhi skip ho jata hai.
    conversationId?: string;
  }) => {
    const response = await api.post<ApiResponse>(
      "/whatsapp/send/text",
      data
    );
    const now = new Date().toISOString();
    if (response.data?.data) {
      const msg = response.data.data as any;
      response.data.data = {
        ...msg,
        createdAt: msg.createdAt || now,
        sentAt: msg.sentAt || now,
      };
    }
    return response;
  },

  sendTemplate: (data: any) =>
    api.post<ApiResponse>("/whatsapp/send/template", data),

  syncAccountQuality: (accountId: string) =>
    api.post<ApiResponse>(`/whatsapp/accounts/${accountId}/sync-quality`),

  syncAllAccountsQuality: () =>
    api.post<ApiResponse>("/whatsapp/accounts/sync-all"),
};

export const chatbots = {
  getAll: (params?: any) =>
    api.get<ApiResponse>("/chatbots", { params }),

  getById: (id: string) =>
    api.get<ApiResponse>(`/chatbots/${id}`),

  create: (data: any) =>
    api.post<ApiResponse>("/chatbots", data),

  update: (id: string, data: any) =>
    api.put<ApiResponse>(`/chatbots/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/chatbots/${id}`),

  activate: (id: string) =>
    api.post<ApiResponse>(`/chatbots/${id}/activate`),

  deactivate: (id: string) =>
    api.post<ApiResponse>(`/chatbots/${id}/deactivate`),

  duplicate: (id: string, name?: string) =>
    api.post<ApiResponse>(`/chatbots/${id}/duplicate`, { name }),

  getStats: (id: string) =>
    api.get<ApiResponse>(`/chatbots/${id}/stats`),
};

export const analytics = {
  getOverview: (params?: any) =>
    api.get<ApiResponse>("/analytics/overview", { params }),

  getMessages: (days: number) =>
    api.get<ApiResponse>("/analytics/messages", { params: { days } }),

  getCampaigns: (limit?: number) =>
    api.get<ApiResponse>("/analytics/campaigns", { params: { limit } }),

  exportReport: (params?: any) =>
    api.get<ApiResponse>("/analytics/export", { params }),
};

export const automations = {
  getAll: () => api.get<ApiResponse>("/automations"),
  getById: (id: string) => api.get<ApiResponse>(`/automations/${id}`),
  create: (data: any) => api.post<ApiResponse>("/automations", data),
  update: (id: string, data: any) => api.put<ApiResponse>(`/automations/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse>(`/automations/${id}`),
  toggle: (id: string) => api.post<ApiResponse>(`/automations/${id}/toggle`),
  stats: () => api.get<ApiResponse>("/automations/stats"),
};

export const crm = {
  getStats: () => api.get<ApiResponse>("/crm/stats"),
  getPipelines: () => api.get<ApiResponse>("/crm/pipelines"),
  getPipelineById: (id: string) => api.get<ApiResponse>(`/crm/pipelines/${id}`),
  getLeads: (params?: any) => api.get<ApiResponse>("/crm/leads", { params }),
  getLeadById: (id: string) => api.get<ApiResponse>(`/crm/leads/${id}`),
  createLead: (data: any) => api.post<ApiResponse>("/crm/leads", data),
  updateLead: (id: string, data: any) => api.put<ApiResponse>(`/crm/leads/${id}`, data),
  deleteLead: (id: string) => api.delete<ApiResponse>(`/crm/leads/${id}`),
  addLeadNote: (id: string, note: string) =>
    api.post<ApiResponse>(`/crm/leads/${id}/notes`, { content: note }),
  syncFromContacts: () => api.post<ApiResponse>("/crm/sync-from-contacts"),
};

export const users = {
  getProfile: () => api.get<ApiResponse>("/users/profile"),
  getProfileFull: () => api.get<ApiResponse>("/users/profile/full"),
  updateProfile: (data: any) => api.put<ApiResponse>("/users/profile", data),
  getStats: () => api.get<ApiResponse>("/users/stats"),
  getSessions: () => api.get<ApiResponse>("/users/sessions"),
  revokeSession: (id: string) => api.delete<ApiResponse>(`/users/sessions/${id}`),
};

export const billing = {
  getCurrentPlan: () => api.get<ApiResponse>("/billing/plan"),
  getPlans: () => api.get<ApiResponse>("/billing/plans"),
  getUsage: () => api.get<ApiResponse>("/billing/usage"),
  upgrade: (data: { planType: string; billingCycle: string }) =>
    api.post<ApiResponse>("/billing/upgrade", data),
  cancel: () => api.post<ApiResponse>("/billing/cancel"),
  cancelSubscription: () => api.post<ApiResponse>("/billing/cancel"),
  getInvoices: (params?: any) =>
    api.get<ApiResponse>("/billing/invoices", { params }),
  createRazorpayOrder: (data: { planKey: string; billingCycle?: string }) =>
    api.post<ApiResponse>("/billing/razorpay/create-order", data),
  verifyRazorpayPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => api.post<ApiResponse>("/billing/razorpay/verify", data),
};

export const notifications = {
  getAll: (params?: { filter?: "all" | "unread"; type?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse>("/notifications", { params }),

  getUnreadCount: () =>
    api.get<ApiResponse<{ count: number }>>("/notifications/unread-count"),

  markAsRead: (id: string) =>
    api.patch<ApiResponse>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.patch<ApiResponse>("/notifications/mark-all-read"),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/notifications/${id}`),

  clearAll: () =>
    api.delete<ApiResponse>("/notifications/clear-all"),

  registerPushToken: (data: { token: string; deviceId?: string; platform?: string }) =>
    api.post<ApiResponse>("/notifications/push-token", data),

  removePushToken: (token: string) =>
    api.delete<ApiResponse>("/notifications/push-token", { data: { token } }),
};

export const handleApiError = (
  error: any,
  fallback = "An error occurred"
): string => {
  const data = error?.response?.data;

  // Zod validation errors: { message: "Validation failed", errors: [{ field, message }] }
  // "Validation failed" user ko kuch nahi batata - actual field messages dikhao.
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const details = data.errors
      .map((e: any) => e?.message)
      .filter(Boolean)
      .join("\n");
    if (details) return details;
  }

  return (
    data?.message ||
    data?.error ||
    // Interceptor network/timeout errors ko plain object bana kar reject karta
    // hai (koi .response nahi), isliye .message yahan bhi check karna zaroori hai
    error?.message ||
    fallback
  );
};

export default api;
export { api };
