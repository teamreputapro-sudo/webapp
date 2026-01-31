import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
const normalizeBase = (value: string): string => {
  if (!value) return '/';
  return value.endsWith('/') ? value : `${value}/`;
};

const basePath = normalizeBase(process.env.VITE_BASE_PATH || '/');

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    port: 8080,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      }
    }
  }
})
