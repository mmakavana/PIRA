export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        pira: {
          purple: "#2d2671",
          purple50: "#f3f2ff",
          purple100: "#e8e6ff",
          purple600: "#4b44a3"
        }
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '18px'
      }
    },
  },
  plugins: [],
}
