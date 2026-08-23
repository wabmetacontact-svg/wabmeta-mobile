// src/constants/colors.ts
export const Colors = {
  // Brand
  primary: "#0A6B5C",        // Dark green (button/logo)
  primaryLight: "#128C7E",
  accent: "#25D366",
  accentLight: "#DCF8C6",

  // Backgrounds
  background: "#F5F7FA",
  surface: "#FFFFFF",
  surfaceSecondary: "#F8F9FA",

  // Text
  textPrimary: "#1A1A1A",
  textSecondary: "#667781",
  textMuted: "#8696A0",
  textInverse: "#FFFFFF",

  // Status
  success: "#25D366",
  warning: "#FFA000",
  error: "#EF4444",
  info: "#3B82F6",

  // Borders
  border: "#E9EDEF",
  borderLight: "#F0F2F5",

  // Dark Mode
  dark: {
    background: "#111B21",
    surface: "#1F2C34",
    surfaceSecondary: "#2A3942",
    textPrimary: "#E9EDEF",
    textSecondary: "#8696A0",
    border: "#2A3942",
  },
} as const;

export type ColorTheme = typeof Colors;
