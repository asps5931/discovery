/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,mdx,md}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        ink: {
          950: "#0a0a0b",
          900: "#131316",
          800: "#1c1d21",
          700: "#26282d",
          600: "#36393f",
          500: "#4a4d54",
          400: "#6b6f78",
          300: "#9ea3ad",
          200: "#c8ccd4",
          100: "#e4e7ec",
          50: "#f4f5f7",
        },
        accent: {
          50: "#eefcf5",
          100: "#d6f7e8",
          200: "#b0eed3",
          300: "#7ce0b9",
          400: "#40c896",
          500: "#1ba87c",
          600: "#108a66",
          700: "#0c6e52",
          800: "#0a5842",
          900: "#084836",
        },
      },
      transitionTimingFunction: {
        "slide": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
