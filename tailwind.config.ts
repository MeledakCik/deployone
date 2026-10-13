import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Bricolage Grotesque Variable", "Inter Tight Variable", "system-ui", "sans-serif"],
        sans: ["Inter Tight Variable", "Inter Tight", "Inter", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "32px",
        pill: "999px",
      },
      colors: {
        base: "var(--bg-base)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        "text-faint": "var(--text-faint)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        // Token landing "Obsidian Edge" (dari Stitch). Diberi prefix obs- agar
        // tidak bentrok dengan token dashboard.
        obs: {
          base: "#0A0A0E",
          subtle: "#111118",
          elevated: "#181822",
          lowest: "#0e0e12",
          low: "#1b1b1f",
          container: "#1f1f24",
          high: "#2a292e",
          highest: "#353439",
          bright: "#39393d",
          ink: "#FFFFFF",
          sec: "#94A3B8",
          mute: "#64748B",
          violet: "#8B5CF6",
          purple: "#A855F7",
          pink: "#EC4899",
          lilac: "#e9ddff",
          mint: "#4edea3",
          rose: "#ffb0cd",
          ok: "#10B981",
          warn: "#F59E0B",
          bad: "#EF4444",
        },
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        glow: "glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
