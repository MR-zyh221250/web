import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  server: { host: '127.0.0.1', port: 5182, strictPort: true },
  build: { target: 'es2022', rollupOptions: { input: { room: resolve(import.meta.dirname, 'index.html'), manage: resolve(import.meta.dirname, 'manage.html') } } }
});
