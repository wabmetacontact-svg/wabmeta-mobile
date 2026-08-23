// app/(auth)/signup.tsx
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
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AuthService } from "../../src/services/auth.service";
import { AuthStorage } from "../../src/utils/secureStorage";
import { Colors } from "../../src/constants/colors";

const { width } = Dimensions.get("window");

export default function SignupScreen() {
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const orgRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email.trim())) newErrors.email = "Enter a valid email";
    if (!organizationName.trim()) newErrors.organizationName = "Organization name is required";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 8) newErrors.password = "Minimum 8 characters";
    if (!confirmPassword) newErrors.confirmPassword = "Confirm your password";
    else if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await AuthService.signup({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
        confirmPassword,
        organizationName: organizationName.trim(),
      });

      const data = (res as any)?.data?.data || (res as any)?.data;
      if (data?.tokens) {
        await AuthStorage.saveTokens(data.tokens.accessToken, data.tokens.refreshToken);
        if (data.user) await AuthStorage.saveUser(data.user);
        if (data.organization) await AuthStorage.saveOrg(data.organization);
        Alert.alert("Account Created", "Welcome to WabMeta!", [
          { text: "Get Started", onPress: () => router.replace("/(app)/(tabs)") },
        ]);
        return;
      }

      Alert.alert("Account Created", "Please enter the OTP sent to your email to verify your account.", [
        {
          text: "Verify OTP",
          onPress: () =>
            router.replace({
              pathname: "/(auth)/verify-otp",
              params: { email: email.trim().toLowerCase(), type: "signup" },
            }),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Signup Failed",
        error?.response?.data?.message || "Please try again."
      );
    } finally {
      setLoading(false);
    }
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
              {/* Top Hero Section With Illustration */}
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

              {/* Signup Form Card */}
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Create Account</Text>
                <Text style={styles.formSubtitle}>
                  Start your WhatsApp business journey
                </Text>

                {/* First Name & Last Name Row */}
                <View style={styles.row}>
                  {/* First Name */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>First Name *</Text>
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={() => firstNameRef.current?.focus()}
                      style={[
                        styles.inputContainer,
                        focusedField === "firstName" && styles.inputFocused,
                        errors.firstName && styles.inputErrorBorder,
                      ]}
                    >
                      <View style={styles.iconBox} pointerEvents="none">
                        <Ionicons name="person" size={16} color="#FFFFFF" />
                      </View>
                      <TextInput
                        ref={firstNameRef}
                        value={firstName}
                        onChangeText={(text) => {
                          setFirstName(text);
                          if (errors.firstName) setErrors({ ...errors, firstName: undefined });
                        }}
                        onFocus={() => setFocusedField("firstName")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="John"
                        placeholderTextColor="#8696A0"
                        autoCapitalize="words"
                        style={styles.textInput}
                      />
                    </TouchableOpacity>
                    {errors.firstName && (
                      <Text style={styles.errorText}>{errors.firstName}</Text>
                    )}
                  </View>

                  <View style={{ width: 12 }} />

                  {/* Last Name */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Last Name</Text>
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={() => lastNameRef.current?.focus()}
                      style={[
                        styles.inputContainer,
                        focusedField === "lastName" && styles.inputFocused,
                      ]}
                    >
                      <View style={styles.iconBox} pointerEvents="none">
                        <Ionicons name="person" size={16} color="#FFFFFF" />
                      </View>
                      <TextInput
                        ref={lastNameRef}
                        value={lastName}
                        onChangeText={(text) => {
                          setLastName(text);
                          if (errors.lastName) setErrors({ ...errors, lastName: undefined });
                        }}
                        onFocus={() => setFocusedField("lastName")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Doe"
                        placeholderTextColor="#8696A0"
                        autoCapitalize="words"
                        style={styles.textInput}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email *</Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => emailRef.current?.focus()}
                    style={[
                      styles.inputContainer,
                      focusedField === "email" && styles.inputFocused,
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
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
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

                {/* Organization Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Organization Name *</Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => orgRef.current?.focus()}
                    style={[
                      styles.inputContainer,
                      focusedField === "org" && styles.inputFocused,
                      errors.organizationName && styles.inputErrorBorder,
                    ]}
                  >
                    <View style={styles.iconBox} pointerEvents="none">
                      <Ionicons name="business" size={17} color="#FFFFFF" />
                    </View>
                    <TextInput
                      ref={orgRef}
                      value={organizationName}
                      onChangeText={(text) => {
                        setOrganizationName(text);
                        if (errors.organizationName) setErrors({ ...errors, organizationName: undefined });
                      }}
                      onFocus={() => setFocusedField("org")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="My Company"
                      placeholderTextColor="#8696A0"
                      autoCapitalize="words"
                      style={styles.textInput}
                    />
                  </TouchableOpacity>
                  {errors.organizationName && (
                    <Text style={styles.errorText}>{errors.organizationName}</Text>
                  )}
                </View>

                {/* Phone (Optional) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone (Optional)</Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => phoneRef.current?.focus()}
                    style={[
                      styles.inputContainer,
                      focusedField === "phone" && styles.inputFocused,
                    ]}
                  >
                    <View style={styles.iconBox} pointerEvents="none">
                      <Ionicons name="call" size={17} color="#FFFFFF" />
                    </View>
                    <TextInput
                      ref={phoneRef}
                      value={phone}
                      onChangeText={(text) => {
                        setPhone(text);
                        if (errors.phone) setErrors({ ...errors, phone: undefined });
                      }}
                      onFocus={() => setFocusedField("phone")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="+91 9999999999"
                      placeholderTextColor="#8696A0"
                      keyboardType="phone-pad"
                      style={styles.textInput}
                    />
                  </TouchableOpacity>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password *</Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => passwordRef.current?.focus()}
                    style={[
                      styles.inputContainer,
                      focusedField === "password" && styles.inputFocused,
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
                        if (errors.password) setErrors({ ...errors, password: undefined });
                      }}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Minimum 8 characters"
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

                {/* Confirm Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password *</Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => confirmPasswordRef.current?.focus()}
                    style={[
                      styles.inputContainer,
                      focusedField === "confirmPassword" && styles.inputFocused,
                      errors.confirmPassword && styles.inputErrorBorder,
                    ]}
                  >
                    <View style={styles.iconBox} pointerEvents="none">
                      <Ionicons name="lock-closed" size={17} color="#FFFFFF" />
                    </View>
                    <TextInput
                      ref={confirmPasswordRef}
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                      }}
                      onFocus={() => setFocusedField("confirmPassword")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Re-enter your password"
                      placeholderTextColor="#8696A0"
                      secureTextEntry={!showConfirmPassword}
                      style={styles.textInput}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#8696A0"
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  {errors.confirmPassword && (
                    <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                  )}
                </View>

                {/* Create Account Button */}
                <TouchableOpacity
                  onPress={handleSignup}
                  disabled={loading}
                  activeOpacity={0.88}
                  style={styles.signupButton}
                >
                  <LinearGradient
                    colors={["#0A6B5C", "#085448"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.signupGradient}
                  >
                    <Ionicons name="person-add" size={17} color="#FFFFFF" />
                    <Text style={styles.signupBtnText}>
                      {loading ? "Creating Account..." : "Create Account"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Login Link */}
                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>
                    Already have an account?{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.replace("/(auth)/login")}
                  >
                    <Text style={styles.loginLink}>Login</Text>
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

  row: {
    flexDirection: "row",
    marginBottom: 16,
  },

  // Inputs
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 7,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#0A6B5C",
    height: 52,
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
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#0A6B5C",
    justifyContent: "center",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    height: 50,
    fontSize: 14.5,
    color: "#1A1A1A",
    paddingHorizontal: 10,
    paddingVertical: 0,
  },
  eyeBtn: {
    paddingHorizontal: 8,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
    marginLeft: 4,
  },

  // Signup Button
  signupButton: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 20,
    shadowColor: "#0A6B5C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  signupGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    gap: 8,
  },
  signupBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // Login link
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingBottom: 4,
  },
  loginText: {
    fontSize: 14,
    color: "#667781",
  },
  loginLink: {
    fontSize: 14,
    color: "#0A6B5C",
    fontWeight: "700",
  },
});