import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:6853',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying for SSE
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['lightweight-charts'],
  },
});
