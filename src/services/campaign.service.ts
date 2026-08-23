import { api } from "./api";
import { Campaign, Template } from "../types/campaign";

export const CampaignService = {
  async getCampaigns(params?: { page?: number; status?: string }) {
    return api.get<{ data: { campaigns: Campaign[]; total: number } }>("/campaigns", { params });
  },

  async getCampaignById(id: string) {
    return api.get<{ data: { campaign: Campaign } }>("/campaigns/" + id);
  },

  async createCampaign(payload: Partial<Campaign>) {
    return api.post<{ data: { campaign: Campaign } }>("/campaigns", payload);
  },

  async getTemplates() {
    return api.get<{ data: { templates: Template[] } }>("/templates");
  },
};
