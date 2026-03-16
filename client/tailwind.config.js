/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4318FF',
          dark: '#2d0fcc',
          light: '#e9e3ff',
        },
        brand: {
          blue: '#4318FF',
          lavender: '#A3AED0',
          bg: '#F4F7FE',
          dark: '#18181B',
          'dark-bg': '#09090B',
        },
        zinc: {
          400: '#A1A1AA',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
          950: '#09090B',
        },
        secondary: '#A3AED0',
        danger: '#EE5D50',
        warning: '#FFB547',
        success: '#05CD99',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
      },
      boxShadow: {
        'soft': '0px 18px 40px rgba(112, 144, 176, 0.12)',
        'premium': '0px 20px 48px rgba(0, 0, 0, 0.05)',
        'dark-soft': '0px 18px 40px rgba(0, 0, 0, 0.45)',
      }
    },
  },
  plugins: [],
}
