import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthService } from "../../src/services/auth.service";
import { AuthStorage } from "../../src/utils/secureStorage";
import { Button } from "../../src/components/common/Button";
import { Input } from "../../src/components/common/Input";
import { Colors } from "../../src/constants/colors";

export default function VerifyOtpScreen() {
  const { email, type } = useLocalSearchParams<{ email: string; type?: string }>();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const isSignup = type === "signup";

  const handleVerify = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert("Error", "Please enter the valid OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await AuthService.verifyOTP(email || "", otp);
      const data = (res as any).data?.data || (res as any).data;

      if (isSignup) {
        // Account verification flow
        if (data?.tokens) {
          await AuthStorage.saveTokens(
            data.tokens.accessToken,
            data.tokens.refreshToken
          );
          if (data.user) await AuthStorage.saveUser(data.user);
          if (data.organization) await AuthStorage.saveOrg(data.organization);

          Alert.alert("Verified", "Your account has been verified successfully!", [
            {
              text: "Get Started",
              onPress: () => router.replace("/(app)/(tabs)"),
            },
          ]);
        } else {
          Alert.alert(
            "Verified",
            "Your email has been verified! Please log in with your credentials.",
            [
              {
                text: "Login",
                onPress: () => router.replace("/(auth)/login"),
              },
            ]
          );
        }
      } else {
        // Password reset flow
        const resetToken = data?.resetToken || data?.token;
        if (!resetToken) {
          throw new Error("No reset token received");
        }
        router.push({
          pathname: "/(auth)/reset-password",
          params: { resetToken },
        });
      }
    } catch (e: any) {
      Alert.alert("Verification Failed", e?.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      if (isSignup) {
        await AuthService.sendOTP(email);
      } else {
        await AuthService.forgotPassword(email);
      }
      Alert.alert("Code Sent", `A new verification code has been sent to ${email}`);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {isSignup ? "Verify Account ✉️" : "Enter OTP 🔢"}
        </Text>
        <Text style={styles.subtitle}>
          {isSignup
            ? `Enter the verification code sent to ${email || "your email"} to activate your account`
            : `Enter the 6-digit verification code sent to ${email || "your email"}`}
        </Text>

        <Input
          label="Verification Code"
          value={otp}
          onChangeText={setOtp}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          leftIcon="key-outline"
        />

        <Button
          title={isSignup ? "Verify & Continue" : "Verify OTP"}
          onPress={handleVerify}
          loading={loading}
          style={{ marginTop: 8 }}
        />

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          <TouchableOpacity onPress={handleResend} disabled={resending}>
            <Text style={styles.resendLink}>
              {resending ? "Sending..." : "Resend Code"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          style={styles.backLink}
        >
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
    justifyContent: "center",
  },
  content: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  resendText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  backLink: {
    marginTop: 14,
    alignItems: "center",
  },
  backText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
});
