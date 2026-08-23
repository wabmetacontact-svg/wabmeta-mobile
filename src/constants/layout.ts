import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const Layout = {
  window: {
    width,
    height,
  },
  isSmallDevice: width < 375,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 20,
    full: 9999,
  },
};
