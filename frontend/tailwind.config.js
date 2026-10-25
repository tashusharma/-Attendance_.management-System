/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0B1B2E",
          800: "#10243E",
          700: "#1B3A5C",
          600: "#2A5278",
        },
        teal: {
          400: "#4FD3C4",
          500: "#2BB3A3",
          600: "#1F8C80",
        },
        amber: {
          400: "#F0B255",
          500: "#E8A33D",
        },
        coral: {
          400: "#E37875",
          500: "#D9534F",
        },
        slate: {
          50: "#F5F7F9",
          100: "#EDF1F4",
          400: "#6B7B8C",
          900: "#1E2A38",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
