import { Tabs } from "expo-router";
import { CustomTabBar } from "../../../src/components/navigation/CustomTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props: any) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="campaigns"
        options={{ title: "Campaigns" }}
      />
      <Tabs.Screen
        name="inbox"
        options={{ title: "Inbox" }}
      />
      <Tabs.Screen
        name="index"
        options={{ title: "Home" }}
      />
      <Tabs.Screen
        name="contacts"
        options={{ title: "Contacts" }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings" }}
      />
    </Tabs>
  );
}
