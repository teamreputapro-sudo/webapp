import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const normalizeBase = (value: string): string => {
  if (!value) return '/';
  return value.endsWith('/') ? value : `${value}/`;
};

const basePath = normalizeBase(process.env.VITE_BASE_PATH || '/');

// Dev convenience: run the scanner locally, proxying API/WS to production to avoid CORS.
export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    port: 8080,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'https://54strategydigital.com',
        changeOrigin: true,
        // In some WSL setups HTTPS may resolve to a self-signed origin (Cloudflare bypass).
        // This is dev-only; we prefer a working local UX over strict TLS validation here.
        secure: false,
      },
      '/ws': {
        target: 'wss://54strategydigital.com',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
