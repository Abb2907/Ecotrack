/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#080c14",
          card: "#0f1626",
          border: "#1e293b",
          primary: "#10b981",    // Emerald
          secondary: "#06b6d4",  // Teal/Cyan
          accent: "#f59e0b",     // Amber
          error: "#ef4444",      // Red
          text: "#f8fafc",       // Slate 50
          muted: "#94a3b8",      // Slate 400
        }
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      boxShadow: {
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glass-emerald": "0 8px 32px 0 rgba(16, 185, 129, 0.15)",
      }
    },
  },
  plugins: [],
}
