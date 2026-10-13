import type { Config } from "tailwindcss";

// Warna landing & dashboard membaca token di app/globals.css,
// jadi otomatis ikut tema light / dark. Format rgb(var(--x) / alpha)
// membuat modifier opacity seperti bg-ink/10 tetap bekerja.
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Di perangkat Apple memakai SF Pro; di tempat lain jatuh ke Inter.
        display: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Inter Variable", "Inter", "system-ui", "sans-serif"],
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Inter Variable", "Inter", "system-ui", "sans-serif"],
        mono: ["SF Mono", "ui-monospace", "JetBrains Mono Variable", "Menlo", "monospace"],
      },
      borderRadius: {
        card: "28px",
        pill: "999px",
        "4xl": "32px",
        "5xl": "40px",
      },
      colors: {
        base: "var(--bg-base)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        "text-faint": "var(--text-faint)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        // Token landing
        paper: token("bg"),
        card: token("surface"),
        ink: token("ink"),
        "ink-2": token("ink2"),
        "ink-3": token("ink3"),
        fill: token("fill"),
        accent: token("accent"),
        ok: token("ok"),
        warn: token("warn"),
        bad: token("bad"),
      },
      boxShadow: {
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)",
        pop: "var(--shadow-pop)",
      },
      transitionTimingFunction: {
        bounce: "var(--ease-bounce)",
        soft: "var(--ease-soft)",
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
