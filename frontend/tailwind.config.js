/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0B0F14",
        surface: {
          lowest: "#060A0E",
          low: "#101419",
          DEFAULT: "#121924",
          high: "#182230",
          highest: "#233245",
        },
        primary: {
          DEFAULT: "#06B6D4",
          light: "#4CD7F6",
          dark: "#00687A",
        },
        secondary: {
          DEFAULT: "#F59E0B",
          light: "#FFB95F",
          dark: "#B45309",
        },
        critical: {
          DEFAULT: "#EF4444",
          light: "#FF817A",
          dark: "#991B1B",
        },
        emerald: {
          DEFAULT: "#10B981",
          light: "#34D399",
          dark: "#047857",
        },
        border: {
          hairline: "#233245",
          focused: "#2F4158",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
