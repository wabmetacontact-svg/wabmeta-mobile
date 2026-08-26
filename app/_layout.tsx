import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "../src/context/AuthContext";
import { SocketProvider } from "../src/context/SocketContext";
import { ThemeProvider } from "../src/context/ThemeContext";
import { AppContextProvider } from "../src/context/AppContext";
import { NotificationsProvider } from "../src/context/NotificationsContext";

function NavigationContent() {
  return (
    <>
      {/* Status bar icons phone ke theme se nahi, screen ke rang se match
          hone chahiye. Pehle yahan isDark dekha jata tha - par app ka UI
          hamesha light palette par chalta hai (Colors.dark define to hai,
          kahin use nahi hoti). To phone dark mode me icons safed ho jate
          the aur app ke light background par gayab.

          SDK 57 me backgroundColor prop hata diya gaya hai (edge-to-edge),
          isliye status bar ke peeche screen ka apna rang hi dikhta hai -
          aur wo har screen par light hai. */}
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <AppContextProvider>
                <NotificationsProvider>
                  <NavigationContent />
                </NotificationsProvider>
              </AppContextProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
