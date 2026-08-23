import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import { Colors } from "../constants/colors";
import { Storage } from "../utils/storage";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colors: typeof Colors;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  themeMode: "system",
  setThemeMode: () => {},
  colors: Colors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    Storage.get<ThemeMode>("themeMode").then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeModeState(stored);
      }
    });
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    Storage.set("themeMode", mode);
  };

  const isDark = themeMode === "system" ? systemScheme === "dark" : themeMode === "dark";

  return (
    <ThemeContext.Provider value={{ isDark, themeMode, setThemeMode, colors: Colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
