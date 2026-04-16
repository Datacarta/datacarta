/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/renderer/index.html", "./src/renderer/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#000000",
          elevated: "rgba(28,28,30,0.6)",
          secondary: "rgba(44,44,46,0.6)",
          border: "rgba(255,255,255,0.08)",
        },
        accent: {
          DEFAULT: "#007AFF",
          dim: "#0A84FF",
        },
        surface: {
          primary: "#FFFFFF",
          secondary: "rgba(255,255,255,0.6)",
          tertiary: "rgba(255,255,255,0.3)",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      backdropBlur: {
        glass: "20px",
      },
    },
  },
  plugins: [],
};
