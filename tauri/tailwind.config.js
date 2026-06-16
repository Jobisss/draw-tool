import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // acento azul-cobalto (tema escuro, vibe toile/engraving)
        accent: {
          50: "#eef0ff",
          100: "#e0e3ff",
          200: "#c4caff",
          300: "#9aa5ff",
          400: "#6f80ff",
          500: "#4a5cf5",
          600: "#3a47db",
          700: "#2e39b0",
          800: "#262e8c",
          900: "#222a70",
        },
        // superfícies do tema escuro
        bg: "#0b0b12",
        surface: "#15151f",
        surface2: "#1f1f2c",
        line: "#2a2a3a",
        ink: "#e9e9f2",
        muted: "#9a9ab2",
        faint: "#65657d",
      },
      fontFamily: {
        serif: [
          "Iowan Old Style",
          "Palatino Linotype",
          "Palatino",
          "Book Antiqua",
          "Georgia",
          "ui-serif",
          "serif",
        ],
      },
    },
  },
  plugins: [typography],
};
