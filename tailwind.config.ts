import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 20px 50px rgba(15, 23, 42, 0.08)",
        soft: "0 12px 40px rgba(15, 23, 42, 0.12)"
      },
      colors: {
        ink: "#09111f",
        mist: "#f4f7fb",
        line: "rgba(15, 23, 42, 0.08)",
        accent: "#2f6fed",
        accentSoft: "#dce7ff"
      },
      keyframes: {
        pulseLine: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(300%)" }
        }
      },
      animation: {
        pulseLine: "pulseLine 1.6s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
