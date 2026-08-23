// src/services/auth.service.ts
import { api } from "./api";

export const AuthService = {
  async login(credentials: { email: string; password: string }) {
    return api.post("/auth/login", credentials);
  },

  // ✅ FIXED: /auth/signup → /auth/register + correct fields
  async signup(data: {
    firstName: string;
    lastName?: string;
    email: string;
    password: string;
    confirmPassword: string;
    organizationName: string;
    phone?: string;
  }) {
    return api.post("/auth/register", data);
  },

  async forgotPassword(email: string) {
    return api.post("/auth/forgot-password", { email });
  },

  async sendOTP(email: string) {
    return api.post("/auth/send-otp", { email });
  },

  async verifyOTP(email: string, otp: string) {
    return api.post("/auth/verify-otp", { email, otp });
  },

  async resetPassword(data: {
    token: string;
    password: string;
    confirmPassword: string;
  }) {
    return api.post("/auth/reset-password", data);
  },

  async getProfile() {
    return api.get("/auth/me");
  },

  async logout() {
    return api.post("/auth/logout");
  },
};