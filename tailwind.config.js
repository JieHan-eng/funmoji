/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: "#1a0a2e",
          dark: "#0f0618",
          accent: "#a855f7",
          neon: "#c084fc",
          cyan: "#22d3ee",
          pink: "#ec4899",
        },
      },
    },
  },
  plugins: [],
};
