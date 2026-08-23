import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthService } from "../../src/services/auth.service";
import { Button } from "../../src/components/common/Button";
import { Input } from "../../src/components/common/Input";
import { Colors } from "../../src/constants/colors";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email");
      return;
    }
    setLoading(true);
    try {
      await AuthService.forgotPassword(email);
      router.push({ pathname: "/(auth)/verify-otp", params: { email, type: "reset_password" } });
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Forgot Password 🔑</Text>
        <Text style={styles.subtitle}>Enter your registered email to receive an OTP</Text>
        <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" leftIcon="mail-outline" />
        <Button title="Send Reset OTP" onPress={handleSubmit} loading={loading} style={{ marginTop: 8 }} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24, justifyContent: "center" },
  content: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, elevation: 3 },
  title: { fontSize: 24, fontWeight: "700", color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20 },
  backLink: { marginTop: 16, alignItems: "center" },
  backText: { color: Colors.primary, fontSize: 14, fontWeight: "600" },
});
