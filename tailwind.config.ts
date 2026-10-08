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
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass: "0 4px 24px 0 rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)",
        "glass-dark": "0 4px 32px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
        "glass-lg": "0 8px 32px 0 rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
      },
    },
  },
  plugins: [],
};
export default config;
