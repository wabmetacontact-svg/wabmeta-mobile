import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthService } from "../../src/services/auth.service";
import { Button } from "../../src/components/common/Button";
import { Input } from "../../src/components/common/Input";
import { Colors } from "../../src/constants/colors";

export default function ResetPasswordScreen() {
  const { resetToken } = useLocalSearchParams<{ resetToken: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await AuthService.resetPassword({
        token: resetToken || "",
        password,
        confirmPassword,
      });
      Alert.alert("Success", "Password updated successfully! Please login.", [
        { text: "OK", onPress: () => router.replace("/(auth)/login") }
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password 🔒</Text>
        <Text style={styles.subtitle}>Enter your new password below</Text>
        <Input label="New Password" value={password} onChangeText={setPassword} placeholder="••••••••" isPassword leftIcon="lock-closed-outline" />
        <Input label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••••" isPassword leftIcon="lock-closed-outline" />
        <Button title="Update Password" onPress={handleReset} loading={loading} style={{ marginTop: 8 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24, justifyContent: "center" },
  content: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, elevation: 3 },
  title: { fontSize: 24, fontWeight: "700", color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20 },
});
