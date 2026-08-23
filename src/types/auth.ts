// src/types/auth.ts
export interface LoginCredentials {
  email: string;
  password: string;
}

// ✅ FIXED: Backend ke exact fields
export interface SignupData {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  confirmPassword: string;       // ← Required
  organizationName: string;      // ← Required (companyName nahi)
  phone?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  name?: string;
  phone?: string;
  avatar?: string;
  emailVerified: boolean;
  role?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  planType: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
  organization?: Organization;
}