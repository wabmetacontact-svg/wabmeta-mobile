import { api } from "./api";
import { Contact, Tag } from "../types/contact";

export const ContactService = {
  async getContacts(params?: { search?: string; tag?: string; page?: number }) {
    return api.get<{ data: { contacts: Contact[]; total: number } }>("/contacts", { params });
  },

  async getContactById(id: string) {
    return api.get<{ data: { contact: Contact } }>("/contacts/" + id);
  },

  async createContact(payload: Partial<Contact>) {
    return api.post<{ data: { contact: Contact } }>("/contacts", payload);
  },

  async getTags() {
    return api.get<{ data: { tags: Tag[] } }>("/contacts/tags");
  },
};
