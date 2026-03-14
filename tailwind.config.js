/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Jost", "system-ui", "sans-serif"],
      },
      colors: {
        gold: "#c8b89a",
        espresso: "#2c2420",
        cream: "#faf9f7",
        "cream-warm": "#f2ede6",
        dark: "#1a1410",
        darker: "#100c09",
        "gold-muted": "#8b7355",
      },
    },
  },
  plugins: [],
}