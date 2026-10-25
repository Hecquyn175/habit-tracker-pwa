/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        moc: '#10b981',
        hoa: '#f97316',
        tho: '#f59e0b',
        kim: '#38bdf8',
        thuy: '#818cf8'
      },
      fontFamily: {
        sans: ["'Be Vietnam Pro'", 'system-ui', '-apple-system', 'sans-serif'],
        hud: ["'Chakra Petch'", "'Be Vietnam Pro'", 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
