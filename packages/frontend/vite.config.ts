import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env from the monorepo root (3 levels up from packages/frontend/<config>)
  const env = loadEnv(mode, '../..', '');
  const apiUrl = env.VITE_API_URL || 'http://localhost:4000';
  const port = Number(env.WEB_PORT) || 5173;

  return {
    plugins: [react()],
    envDir: '../..',
    server: {
      port,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
