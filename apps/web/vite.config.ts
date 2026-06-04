import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const port = Number(process.env.VITE_PORT ?? 5173);
/** Public port users open (nginx). HMR WebSocket connects here when proxied. */
const hmrClientPort = Number(process.env.VITE_HMR_CLIENT_PORT ?? process.env.HTTP_PORT ?? 8080);

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port,
    strictPort: true,
    hmr: {
      host: 'localhost',
      clientPort: hmrClientPort,
    },
    // Optional: hit Vite directly without nginx (localhost:5173)
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/socket.io': {
        target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:3001',
        ws: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port,
    strictPort: true,
  },
});
