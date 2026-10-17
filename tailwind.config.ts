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
        display: ["Inter Tight Variable", "Inter Tight", "Inter Variable", "Inter", "Helvetica", "Arial", "sans-serif"],
        sans: ["Inter Tight Variable", "Inter Tight", "Inter Variable", "Inter", "Helvetica", "Arial", "sans-serif"],
        mono: ["JetBrains Mono Variable", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        card: "28px",
        pill: "999px",
      },
      colors: {
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        "text-faint": "var(--text-faint)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",

        // Palet utama (diambil dari referensi desain)
        ink: "#120B2E",
        midnight: "#1E1150",
        mist: "#EDE8FF",
        // Putih di atas Midnight, sudah dicampur jadi warna solid (tanpa opacity)
        night: {
          4: "#271b57",
          6: "#2c1f5a",
          7: "#2e225c",
          8: "#30245e",
          10: "#342962",
          12: "#392e65",
          15: "#40356a",
          20: "#4b4173",
          25: "#564c7c",
          30: "#625884",
          35: "#6d648d",
          40: "#787096",
          45: "#837c9f",
          50: "#8e88a8",
          55: "#9a94b0",
          60: "#a5a0b9",
          70: "#bcb8ca",
          75: "#c7c4d3",
          80: "#d2cfdc",
        },
        violet: {
          50: "#F4F1FF", 100: "#E7E0FF", 200: "#D2C4FF", 300: "#B69FFF", 400: "#9876FF",
          500: "#7B50FF", 600: "#6A45E0", 700: "#5A39C0", 800: "#492EA0", 900: "#382381",
        },
        lime: {
          50: "#FAFEEF", 100: "#F5FDDA", 200: "#ECFBB9", 300: "#E0F98E", 400: "#D3F65F",
          500: "#C6F432", 600: "#AAD329", 700: "#8EB120", 800: "#729017", 900: "#566E0E",
        },
        lav: {
          DEFAULT: "#C6F432",
          deep: "#AAD329",
          soft: "#EDE8FF",
          text: "var(--accent-text)",
        },
        // Warna kartu pastel. Di tema gelap otomatis jadi tint transparan.
        tone: {
          lilac: "var(--tone-lilac)",
          peach: "var(--tone-peach)",
          mint: "var(--tone-mint)",
          sky: "var(--tone-sky)",
          peri: "var(--tone-peri)",
          pink: "var(--tone-pink)",
          lemon: "var(--tone-lemon)",
        },
        // Status
        // Token status: pakai ini, bukan emerald-*/red-*/amber-* mentah.
        // `-fg` untuk teks/ikon, tanpa akhiran untuk titik & grafik, `-bg`/`-line` untuk latar banner.
        ok: "var(--ok-dot)",
        warn: "var(--warn-dot)",
        bad: "var(--bad-dot)",
        "ok-fg": "var(--ok-fg)",
        "warn-fg": "var(--warn-fg)",
        "bad-fg": "var(--bad-fg)",
        "bad-solid": "var(--bad-solid)",
        "ok-bg": "var(--ok-bg)",
        "warn-bg": "var(--warn-bg)",
        "bad-bg": "var(--bad-bg)",
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
