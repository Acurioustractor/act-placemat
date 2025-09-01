/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'body': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Australian-inspired color palette
        ochre: {
          50: '#fdf8f2',
          100: '#fbecd9',
          200: '#f6d6b2',
          300: '#efb881',
          400: '#e7944e',
          500: '#e17a2a',
          600: '#d2641f',
          700: '#af4d1c',
          800: '#8c3e1e',
          900: '#72331b',
        },
        eucalyptus: {
          50: '#f0f7f4',
          100: '#dcede3',
          200: '#bbddc9',
          300: '#8dc4a7',
          400: '#5ba680',
          500: '#3d8b63',
          600: '#2e6f4f',
          700: '#255a41',
          800: '#1f4735',
          900: '#1a3c2e',
        },
        sunset: {
          50: '#fef3f2',
          100: '#fee4e2',
          200: '#fececa',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
    },
  },
  plugins: [],
}