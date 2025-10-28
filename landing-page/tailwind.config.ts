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
        // Genie's official color palette
        genie: {
          yellow: {
            50: "#FEF3C7",
            100: "#FDE68A",
            200: "#FCD34D",
            300: "#FBBF24",
            400: "#F59E0B",
            500: "#FCD34D", // Official Genie yellow
            600: "#D97706",
            700: "#B45309",
            800: "#92400E",
            900: "#78350F",
          },
          dark: {
            50: "#F9F9F9",
            100: "#F0F0F0",
            200: "#E0E0E0",
            300: "#D0D0D0",
            400: "#B0B0B0",
            500: "#808080",
            600: "#606060",
            700: "#404040",
            800: "#202020",
            900: "#000000",
          },
          background: {
            primary: "#0A0C10", // Very dark blue (almost black)
            secondary: "#101215", // Dark blue-gray
            tertiary: "#181A1F", // Medium dark blue
            card: "#1F2126", // Card background (subtle blue tint)
            modal: "#101215", // Modal background (dark blue)
          },
          text: {
            primary: "#FFFFFF", // Pure white
            secondary: "#CCCCCC", // Light gray
            tertiary: "#999999", // Medium gray
            disabled: "#666666", // Disabled gray
            inverse: "#000000", // Black for light backgrounds
          },
          border: {
            primary: "#404040", // Dark border
            secondary: "#606060", // Medium border
            focus: "#FFFFFF", // White focus
            error: "#999999", // Gray border
          },
        },
      },
      animation: {
        "bounce-slow": "bounce 3s infinite",
        "pulse-slow": "pulse 3s infinite",
        float: "float 6s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 20px rgba(255, 255, 104, 0.3)" },
          "100%": { boxShadow: "0 0 40px rgba(255, 255, 104, 0.6)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "genie-gradient": "linear-gradient(135deg, #FCD34D 0%, #FFFFFF 100%)",
        "hero-gradient": "linear-gradient(to bottom, #000000 0%, #000000 50%, #FCD34D 100%)",
        "section-gradient-1": "linear-gradient(to bottom, #FCD34D 0%, #000000 50%, #000000 100%)",
        "section-gradient-2": "linear-gradient(to bottom, #000000 0%, #FCD34D 50%, #000000 100%)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
