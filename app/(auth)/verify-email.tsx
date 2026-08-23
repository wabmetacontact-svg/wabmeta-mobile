import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../src/components/common/Button";
import { Colors } from "../../src/constants/colors";

export default function VerifyEmailScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="mail-open-outline" size={64} color={Colors.primary} style={{ alignSelf: "center", marginBottom: 16 }} />
        <Text style={styles.title}>Check Your Email ✉️</Text>
        <Text style={styles.subtitle}>We have sent a verification link to your email address. Please click the link to activate your account.</Text>
        <Button title="Back to Login" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: 16 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24, justifyContent: "center" },
  content: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, elevation: 3, alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 12 },
});
