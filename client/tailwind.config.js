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
          DEFAULT: '#1B2559',
          dark: '#11193F',
          light: '#E9EDF7',
        },
        brand: {
          blue: '#1B2559',
          lavender: '#68769F',
          bg: '#FFFFFF',
          dark: '#0B1437',
          'dark-bg': '#080E29',
        },
        zinc: {
          400: '#A3AED0',
          700: '#2D3748',
          800: '#1B2559',
          900: '#111C44',
          950: '#0B1437',
        },
        secondary: '#68769F',
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
