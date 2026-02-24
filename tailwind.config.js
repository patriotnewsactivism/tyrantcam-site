/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tyrant-red': '#8a0000',
        'tyrant-black': '#0a0a0a',
        'tyrant-gray': '#1a1a1a',
      },
      fontFamily: {
        'display': ['Impact', 'Haettenschweiler', 'Arial Narrow Bold', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
