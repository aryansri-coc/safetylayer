import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: "#06070a",
          900: "#0a0c12",
          850: "#0e111a",
          800: "#131724",
          700: "#1b2133",
          600: "#272f47",
        },
        titanium: {
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
        },
        cyber: {
          emerald: "#00f5a0",
          cyan: "#00d9f5",
          amber: "#f5a623",
          crimson: "#ff3366",
          violet: "#8b5cf6",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      backgroundImage: {
        "metallic-surface": "linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.01) 100%)",
        "metallic-card": "linear-gradient(135deg, rgba(22, 27, 40, 0.85) 0%, rgba(10, 12, 18, 0.95) 100%)",
        "metallic-glow": "radial-gradient(ellipse at top, rgba(0, 245, 160, 0.12), transparent 70%)",
        "titanium-shine": "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 100%)",
      },
      animation: {
        "radar-pulse": "radarPulse 2.8s cubic-bezier(0, 0, 0.2, 1) infinite",
        "laser-scan": "laserScan 3.5s ease-in-out infinite alternate",
        "subtle-float": "subtleFloat 6s ease-in-out infinite",
      },
      keyframes: {
        radarPulse: {
          "0%": { transform: "scale(0.8)", opacity: "0.9" },
          "70%": { transform: "scale(2.2)", opacity: "0" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        laserScan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        subtleFloat: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
