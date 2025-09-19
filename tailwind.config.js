export default {
  content: ["./index.html", "./**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Candara-like look: prefer system UI + Inter
        sans: ['Inter', 'Segoe UI', 'Candara', 'Calibri', 'Arial', 'sans-serif'],
      },
      colors: {
        pira: {
          purple: '#221B63',    // header (blue-purple)
          light: '#EEF0FF',     // very light violet background accents
          accent: '#5B6BFF',    // controls
        }
      },
      borderRadius: {
        xl2: '1rem'
      }
    },
  },
  plugins: [],
}
