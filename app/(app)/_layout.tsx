import { Stack } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#075E54" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="inbox/[id]"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="contacts/groups"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="contacts/groups/[id]"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="contacts/import"
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="contacts/[id]"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="campaigns/[id]"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="campaigns/create"
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="notifications"
        options={{ animation: "slide_from_bottom" }}
      />
    </Stack>
  );
}
