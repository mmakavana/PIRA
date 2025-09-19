/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pira: {
          header: "#261E6A", // dark blue-purple
          band: "#2F2877",   // mid purple for the tabs strip
          chip: "#4F46E5",   // indigo accent for controls
          bg: "#F3F0FF",     // very light lavender background
          grid: "#E6E2FF",
        },
      },
      fontFamily: {
        ui: ['Candara', 'Segoe UI', 'Inter', 'system-ui', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: "0 6px 24px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        tab: "14px",
        card: "16px",
      },
    },
  },
  plugins: [],
};
