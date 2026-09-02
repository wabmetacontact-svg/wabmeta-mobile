import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { isRunningInExpoGo } from "expo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { SocketProvider } from "../src/context/SocketContext";
import { ThemeProvider } from "../src/context/ThemeContext";
import { AppContextProvider } from "../src/context/AppContext";
import { NotificationsProvider } from "../src/context/NotificationsContext";

// Native splash ko tab tak roko jab tak session restore na ho jaye. Bina
// iske splash pehle frame par hi hat jata tha aur user ko app ki apni
// loading screen dikhne lagti thi. Docs kehte hain ise global scope me
// call karo (component/hook ke andar late ho jata hai).
SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash already hidden ho to koi baat nahi
});

// Expo Go apna hi splash dikhata hai, custom wala nahi - wahan setOptions()
// kuch karta nahi, bas warning chhapta hai. Ye wahi check hai jo expo-splash-screen
// khud andar lagata hai, isliye dev/production builds me animation chalti rahegi.
if (!isRunningInExpoGo()) {
  SplashScreen.setOptions({ duration: 300, fade: true });
}

function SplashGate({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Auth pata chal gaya - ab pehli asli screen render ho chuki hai,
    // splash safely fade out kar sakta hai
    SplashScreen.hideAsync().catch(() => {});
  }, [isLoading]);

  // Children hamesha render karo. Loading ke dauraan bhi navigator mount
  // rehna chahiye, warna <Redirect> ke paas jaane ke liye kuch hota hi nahi.
  return <>{children}</>;
}

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
            <SplashGate>
              <SocketProvider>
                <AppContextProvider>
                  <NotificationsProvider>
                    <NavigationContent />
                  </NotificationsProvider>
                </AppContextProvider>
              </SocketProvider>
            </SplashGate>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
