import { api } from "./api";
import { Conversation, Message } from "../types/chat";

export const InboxService = {
  async getConversations(params?: { search?: string; status?: string; page?: number }) {
    return api.get<{ data: { conversations: Conversation[]; total: number } }>(
      "/inbox/conversations",
      { params }
    );
  },

  async getMessages(conversationId: string, page = 1) {
    return api.get<{ data: { messages: Message[]; total: number } }>(
      "/inbox/conversations/" + conversationId + "/messages",
      { params: { page } }
    );
  },

  async sendMessage(conversationId: string, payload: { content: string; type?: string; mediaUrl?: string }) {
    return api.post<{ data: { message: Message } }>(
      "/inbox/conversations/" + conversationId + "/messages",
      payload
    );
  },

  async markAsRead(conversationId: string) {
    return api.post("/inbox/conversations/" + conversationId + "/read");
  },
};
