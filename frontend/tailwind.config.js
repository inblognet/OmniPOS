/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        'pos': '1fr 400px',
      },
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
      }
    },
  },
  plugins: [],
}
