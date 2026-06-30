import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui"],
        heading: [
          "var(--font-heading)",
          "var(--font-sans)",
          "Geist",
          "Inter",
          "ui-sans-serif",
          "system-ui",
        ],
        serif: [
          "var(--font-heading)",
          "var(--font-sans)",
          "Geist",
          "Inter",
          "ui-sans-serif",
          "system-ui",
        ],
      },
      fontSize: {
        display: ["3.75rem", { lineHeight: "0.98", letterSpacing: "-0.055em" }],
        hero: ["3rem", { lineHeight: "1.02", letterSpacing: "-0.05em" }],
        title: ["2.25rem", { lineHeight: "1.08", letterSpacing: "-0.04em" }],
        lead: ["1rem", { lineHeight: "1.7" }],
        caption: ["0.75rem", { lineHeight: "1.45", letterSpacing: "0.02em" }],
      },
      boxShadow: {
        soft: "0 18px 48px -32px hsl(0 0% 0% / 0.9)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } }
      },
      animation: { "accordion-down": "accordion-down 0.2s ease-out", "accordion-up": "accordion-up 0.2s ease-out" }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
