// src/components/common/AppLoading.tsx
// Splash ke baad jo pehla frame dikhta hai wo bilkul splash jaisa hi hona
// chahiye - warna user ko ek flash dikhta hai (pehle yahan plain green
// screen thi). Isliye background, logo ka size aur position app.json ke
// expo-splash-screen config se exactly match karte hain.

import React from "react";
import { View, Image, ActivityIndicator, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";

// app.json -> plugins.expo-splash-screen ke saath in dono ko sync rakho
const SPLASH_BACKGROUND = "#FDFDFD";
const SPLASH_IMAGE_WIDTH = 220;

// splash-icon.png 876x641 ka hai. Height isi ratio se nikalte hain taaki
// logo bilkul utna hi bada rahe jitna native splash par tha
const SPLASH_IMAGE_HEIGHT = Math.round(SPLASH_IMAGE_WIDTH * (641 / 876));

export function AppLoading() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/images/splash-icon.png")}
        style={styles.logo}
        resizeMode="contain"
        fadeDuration={0}
      />

      {/* Spinner ko absolute rakha hai taaki logo splash wali jagah par hi
          rahe - layout me add karte to logo thoda upar khisak jata */}
      <View style={styles.spinner} pointerEvents="none">
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SPLASH_BACKGROUND,
  },
  logo: {
    width: SPLASH_IMAGE_WIDTH,
    height: SPLASH_IMAGE_HEIGHT,
  },
  spinner: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: "18%",
    alignItems: "center",
  },
});

export default AppLoading;
