import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import WindiCSS from 'vite-plugin-windicss';
import path from 'path';

export default defineConfig({
  plugins: [react(), WindiCSS()],
  server: {
    port: 1420,
  },
  build: {
    target: 'esnext',
    outDir: '../frontend/dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
});
