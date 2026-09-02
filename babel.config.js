module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "react-native-reanimated/plugin", // MUST be last
    ],
    env: {
      // Release builds me har console.* call hata do. Logcat par koi bhi
      // padh sakta hai - cable laga kar, ya READ_LOGS wali app se - aur
      // hamare console.error calls me err.response.data chala jata hai,
      // jisme customer ka data hota hai. Dev me sab waisa ka waisa chalta
      // rahega, sirf production bundle saaf hota hai.
      production: {
        plugins: ["transform-remove-console"],
      },
    },
  };
};
