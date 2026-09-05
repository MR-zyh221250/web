import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  publicDir: 'site-public', server: { host: '127.0.0.1', port: 5182, strictPort: true, proxy: { '/api': { target: 'http://127.0.0.1:3000', configure(proxy) { if (process.env.NEON_QA === '1') proxy.on('proxyReq', req => req.setHeader('Origin','http://test.local')); } } } },
  build: { target: 'es2022', rollupOptions: { input: { market: resolve(import.meta.dirname, 'index.html'), manage: resolve(import.meta.dirname, 'manage.html'), merchant: resolve(import.meta.dirname, 'merchant.html') } } }
});
