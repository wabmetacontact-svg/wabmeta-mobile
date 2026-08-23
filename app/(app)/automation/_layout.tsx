// app/(app)/automation/_layout.tsx
import { Stack } from "expo-router";

export default function AutomationLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="[id]" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
