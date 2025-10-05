/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f1f8f5',
          100: '#dcefe5',
          200: '#b9dfcb',
          300: '#86c8a7',
          400: '#55af82',
          500: '#2f8f64',
          600: '#1f734f',
          700: '#195d41',
          800: '#154a35',
          900: '#123d2c',
        },
        ocean: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bedbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        clay: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5f5',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      boxShadow: {
        card: '0 18px 40px -24px rgba(15, 23, 42, 0.25)',
        subtle: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
      },
      borderRadius: {
        xl: '1rem',
      },
    },
  },
  plugins: [],
};
