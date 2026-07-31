/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./js/**/*.js",
    "./jeux/**/*.html",
    "./logiciels/**/*.html",
    "./telechargement/**/*.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
        heading: ["Montserrat", "sans-serif"],
        title: ["Montserrat", "Inter", "sans-serif"],
        serif: ["Playfair Display", "Source Serif 4", "serif"],
        mono: ["Fira Code", "monospace"],
      },
      colors: {
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        accent: "var(--accent)",
        surface: "var(--surface)",
        ink: "#08111f",
        panel: "#101b2d",
        line: "rgba(148, 163, 184, .18)",
        cyanx: "#20d3ee",
        rosex: "#ff4d8d",
        limex: "#a3e635",
        brand: {
          dark: "#0f172a",
          darker: "#000000",
          panel: "#101b2d",
          primary: "#0ea5e9",
          secondary: "#a855f7",
          accent: "#22d3ee",
          hot: "#ec4899",
          success: "#22c55e",
          warning: "#f59e0b",
          danger: "#ef4444",
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s infinite",
        "pulse-slow": "pulse 3s cubic-bezier(.4, 0, .6, 1) infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px #0ea5e9" },
          "50%": { boxShadow: "0 0 40px #a855f7" },
        },
      },
    },
  },
  plugins: [],
};
