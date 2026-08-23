import React, { createContext, useContext, useState } from "react";

interface AppContextType {
  unreadMessagesCount: number;
  setUnreadMessagesCount: (count: number) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AppContext = createContext<AppContextType>({
  unreadMessagesCount: 0,
  setUnreadMessagesCount: () => {},
  activeTab: "dashboard",
  setActiveTab: () => {},
});

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <AppContext.Provider
      value={{
        unreadMessagesCount,
        setUnreadMessagesCount,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
