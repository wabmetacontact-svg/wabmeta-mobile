// app/(auth)/login.tsx
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { useAuth } from "../../src/context/AuthContext";
import { useGoogleAuth } from "../../src/hooks/useGoogleAuth";
import { Colors } from "../../src/constants/colors";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const { login, googleLogin } = useAuth();
  const { signInWithGoogle, loading: googleLoading, isReady } = useGoogleAuth();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email.trim())) newErrors.email = "Enter a valid email";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Minimum 6 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      Alert.alert(
        "Login Failed",
        error?.response?.data?.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isReady) {
      Alert.alert("Please wait", "Google sign in is initializing...");
      return;
    }

    const result = await signInWithGoogle();

    if (result.success && result.data) {
      await googleLogin(result.data);
    } else if (result.error && result.error !== "Google sign in cancelled") {
      Alert.alert("Google Login Failed", result.error);
    }
  };

  const handleMicrosoftLogin = () => {
    Alert.alert("Coming Soon", "Microsoft login will be available soon");
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#E8F5F1", "#F2FAF7", "#FFFFFF"]}
        style={styles.gradient}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {/* Top Hero Section */}
              <View style={styles.heroSection}>
                <View style={styles.heroTextContainer}>
                  <Text style={styles.logo} numberOfLines={1}>WabMeta</Text>
                  <Text style={styles.tagline} numberOfLines={2}>
                    WhatsApp Business Platform
                  </Text>

                  {/* Trust Badge */}
                  <View style={styles.trustBadge}>
                    <Ionicons
                      name="shield-checkmark"
                      size={14}
                      color="#0A6B5C"
                    />
                    <Text style={styles.trustText} numberOfLines={1}>
                      Secure. Reliable. Powerful.
                    </Text>
                  </View>
                </View>

                {/* Hero Illustration */}
                <View style={styles.heroImageContainer}>
                  <Image
                    source={require("../../assets/images/hero-illustration.png")}
                    style={styles.heroImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Login Form Card */}
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Welcome Back 👋</Text>
                <Text style={styles.formSubtitle}>
                  Login to your account
                </Text>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => emailRef.current?.focus()}
                    style={[
                      styles.inputContainer,
                      emailFocused && styles.inputFocused,
                      errors.email && styles.inputErrorBorder,
                    ]}
                  >
                    <View style={styles.iconBox} pointerEvents="none">
                      <Ionicons name="mail" size={17} color="#FFFFFF" />
                    </View>
                    <TextInput
                      ref={emailRef}
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (errors.email) setErrors({ ...errors, email: undefined });
                      }}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      placeholder="you@example.com"
                      placeholderTextColor="#8696A0"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.textInput}
                    />
                  </TouchableOpacity>
                  {errors.email && (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  )}
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => passwordRef.current?.focus()}
                    style={[
                      styles.inputContainer,
                      passwordFocused && styles.inputFocused,
                      errors.password && styles.inputErrorBorder,
                    ]}
                  >
                    <View style={styles.iconBox} pointerEvents="none">
                      <Ionicons name="lock-closed" size={17} color="#FFFFFF" />
                    </View>
                    <TextInput
                      ref={passwordRef}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (errors.password)
                          setErrors({ ...errors, password: undefined });
                      }}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      placeholder="••••••••"
                      placeholderTextColor="#8696A0"
                      secureTextEntry={!showPassword}
                      style={styles.textInput}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#8696A0"
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  {errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  )}
                </View>

                {/* Forgot Password */}
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/forgot-password")}
                  style={styles.forgotContainer}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.88}
                  style={styles.loginButton}
                >
                  <LinearGradient
                    colors={["#0A6B5C", "#085448"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginGradient}
                  >
                    <Ionicons name="lock-closed" size={17} color="#FFFFFF" />
                    <Text style={styles.loginBtnText}>
                      {loading ? "Logging in..." : "Login"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.divider} />
                </View>

                {/* Social Login */}
                <View style={styles.socialRow}>
                  <TouchableOpacity
                    style={[
                      styles.socialBtn,
                      (googleLoading || !isReady) && styles.socialBtnDisabled,
                    ]}
                    onPress={handleGoogleLogin}
                    activeOpacity={0.8}
                    disabled={googleLoading || !isReady}
                  >
                    {googleLoading ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <>
                        <AntDesign name="google" size={18} color="#EA4335" />
                        <Text style={styles.socialText}>Google</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.socialBtn}
                    onPress={handleMicrosoftLogin}
                    activeOpacity={0.8}
                  >
                    {/* Microsoft 4-square Logo */}
                    <View style={styles.microsoftLogo}>
                      <View style={[styles.msSquare, { backgroundColor: "#F25022" }]} />
                      <View style={[styles.msSquare, { backgroundColor: "#7FBA00" }]} />
                      <View style={[styles.msSquare, { backgroundColor: "#00A4EF" }]} />
                      <View style={[styles.msSquare, { backgroundColor: "#FFB900" }]} />
                    </View>
                    <Text style={styles.socialText}>Microsoft</Text>
                  </TouchableOpacity>
                </View>

                {/* Sign Up Link */}
                <View style={styles.signupContainer}>
                  <Text style={styles.signupText}>
                    Don't have an account?{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/(auth)/signup")}
                  >
                    <Text style={styles.signupLink}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F5F1",
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Hero Section
  heroSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    minHeight: 195,
    alignItems: "center",
  },
  heroTextContainer: {
    flex: 1.1,
    justifyContent: "center",
    paddingRight: 4,
  },
  logo: {
    fontSize: 34,
    fontWeight: "800",
    color: "#0A6B5C",
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 12.5,
    color: "#667781",
    fontWeight: "500",
    marginBottom: 12,
    lineHeight: 16,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D5ECE4",
    alignSelf: "flex-start",
    gap: 5,
    shadowColor: "#0A6B5C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  trustText: {
    fontSize: 10.5,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  heroImageContainer: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  heroImage: {
    width: width * 0.44,
    height: 185,
  },

  // Form Card
  formCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: Platform.OS === "ios" ? 36 : 40,
    marginTop: "auto",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 8,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  formSubtitle: {
    fontSize: 14,
    color: "#667781",
    marginBottom: 22,
  },

  // Inputs
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#0A6B5C",
    height: 54,
    paddingHorizontal: 8,
  },
  inputFocused: {
    borderColor: "#0A6B5C",
    shadowColor: "#0A6B5C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputErrorBorder: {
    borderColor: "#EF4444",
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#0A6B5C",
    justifyContent: "center",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    height: 52,
    fontSize: 15,
    color: "#1A1A1A",
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  eyeBtn: {
    paddingHorizontal: 8,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
    marginLeft: 4,
  },

  // Forgot Password
  forgotContainer: {
    alignSelf: "flex-end",
    marginTop: 4,
    marginBottom: 20,
    paddingVertical: 2,
  },
  forgotText: {
    fontSize: 13,
    color: "#0A6B5C",
    fontWeight: "600",
  },

  // Login Button
  loginButton: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#0A6B5C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  loginGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    gap: 8,
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // Divider
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E9EDEF",
  },
  dividerText: {
    fontSize: 12,
    color: "#8696A0",
    marginHorizontal: 12,
  },

  // Social Buttons
  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 22,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: "#E9EDEF",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  socialBtnDisabled: {
    opacity: 0.6,
  },
  microsoftLogo: {
    width: 16,
    height: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  msSquare: {
    width: 7,
    height: 7,
    borderRadius: 0.5,
  },
  socialText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },

  // Sign Up
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingBottom: 4,
  },
  signupText: {
    fontSize: 14,
    color: "#667781",
  },
  signupLink: {
    fontSize: 14,
    color: "#0A6B5C",
    fontWeight: "700",
  },
});