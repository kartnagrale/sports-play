/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#08090A",
          surface: "#121316",
          elev: "#1A1D24",
        },
        primary: {
          DEFAULT: "#D3FF24",
          hover: "#B8E610",
        },
        secondary: "#00F0FF",
        danger: "#FF3B30",
        success: "#22C55E",
        warning: "#F59E0B",
      },
      fontFamily: {
        heading: ["Oswald", "sans-serif"],
        body: ["Outfit", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      dropShadow: {
        glow: "0 0 12px rgba(211, 255, 36, 0.45)",
        cyan: "0 0 12px rgba(0, 240, 255, 0.45)",
        danger: "0 0 12px rgba(255, 59, 48, 0.45)",
      },
      animation: {
        "pulse-slow": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
