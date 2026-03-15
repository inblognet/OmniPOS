import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './', // ✅ This is the magic line for Electron!
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false, // Keeps Vite from opening a Chrome tab
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});