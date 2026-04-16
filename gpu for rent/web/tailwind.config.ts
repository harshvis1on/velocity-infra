import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#818CF8",
          dark: "#6366F1",
          light: "#A5B4FC",
        },
        accent: {
          DEFAULT: "#6366F1",
          glow: "rgba(99,102,241,0.15)",
        },
        surface: {
          DEFAULT: "rgba(255,255,255,0.03)",
          hover: "rgba(255,255,255,0.05)",
          border: "rgba(255,255,255,0.06)",
          "border-hover": "rgba(255,255,255,0.12)",
        },
        muted: "#64748B",
        "muted-foreground": "#94A3B8",
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        glow: '0 0 24px rgba(99,102,241,0.2)',
        "glow-lg": '0 0 40px rgba(99,102,241,0.25)',
        "glow-sm": '0 0 12px rgba(99,102,241,0.15)',
      },
    },
  },
  plugins: [],
};
export default config;
