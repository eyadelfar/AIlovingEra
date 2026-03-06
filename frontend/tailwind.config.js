/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    '!text-left', '!text-center', '!text-right',
    '!font-bold', '!italic', '!underline',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}