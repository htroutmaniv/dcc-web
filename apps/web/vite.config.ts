import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const port = Number(process.env.VITE_PORT ?? 5173);
/** Browser entry (nginx). HMR WebSocket must use ws:// on this port in dev — not wss. */
const hmrClientPort = Number(
  process.env.VITE_HMR_CLIENT_PORT ?? process.env.NGINX_HTTP_PORT ?? process.env.HTTP_PORT ?? 8080,
);
const hmrProtocol = (process.env.VITE_HMR_PROTOCOL ?? 'ws') as 'ws' | 'wss';

/** Hostnames nginx may forward — vite blocks unknown Host headers by default. */
const allowedHosts = ['localhost', '127.0.0.1', 'hat3d.com', 'www.hat3d.com'];

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
          if (id.includes('konva') || id.includes('react-konva')) return 'konva';
          if (id.includes('socket.io-client')) return 'socket';
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port,
    strictPort: true,
    allowedHosts,
    // HMR via nginx (:8080) → Vite WS server on :5173. Force ws:// (dev nginx has no TLS).
    hmr: {
      protocol: hmrProtocol,
      host: process.env.VITE_HMR_HOST ?? 'localhost',
      port,
      clientPort: hmrClientPort,
    },
    // Optional: hit Vite directly without nginx (localhost:5173)
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:3003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/socket.io': {
        target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:3003',
        ws: true,
      },
      '/uploads': {
        target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:3003',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port,
    strictPort: true,
    allowedHosts,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:3003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/socket.io': {
        target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:3003',
        ws: true,
      },
      '/uploads': {
        target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:3003',
        changeOrigin: true,
      },
    },
  },
});
