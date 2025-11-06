import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // React Query for data fetching
          'vendor-query': ['@tanstack/react-query'],

          // Nivo chart libraries (large bundle)
          'vendor-charts-core': ['@nivo/core'],
          'vendor-charts-basic': ['@nivo/bar', '@nivo/line', '@nivo/pie'],
          'vendor-charts-advanced': [
            '@nivo/radar',
            '@nivo/network',
            '@nivo/sankey',
            '@nivo/chord',
            '@nivo/geo',
            '@nivo/heatmap',
            '@nivo/scatterplot',
            '@nivo/treemap',
          ],

          // UI libraries
          'vendor-ui': [
            '@headlessui/react',
            '@heroicons/react',
            'framer-motion',
          ],

          // Forms and utilities
          'vendor-utils': ['react-hook-form', 'recharts'],
        },
      },
    },
  },
});
