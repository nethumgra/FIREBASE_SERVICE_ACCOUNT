/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        green: {
          50:  '#f0f7f0',
          100: '#d6ebd6',
          200: '#aed4ae',
          300: '#7fb97f',
          400: '#559d55',
          500: '#348a34',
          600: '#2d6a2d',
          700: '#255525',
          800: '#1c3f1c',
          900: '#132a13',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
