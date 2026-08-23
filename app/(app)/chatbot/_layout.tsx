// app/(app)/chatbot/_layout.tsx
import { Stack } from "expo-router";

export default function ChatbotLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
