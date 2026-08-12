/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2fa', 100: '#d7e0f0', 200: '#b0c1e1', 300: '#89a2d2',
          400: '#5c7dbb', 500: '#3d5da0', 600: '#2c4680', 700: '#1f3363',
          800: '#152447', 900: '#0d1730', 950: '#080f20',
        },
        gold: {
          50: '#fdf9ec', 100: '#faf0c9', 200: '#f4e090', 300: '#eecb57',
          400: '#e6b52f', 500: '#d49a1e', 600: '#b17a17', 700: '#8c5c16',
          800: '#734a18', 900: '#623d19',
        },
      },
    },
  },
  plugins: [],
}
