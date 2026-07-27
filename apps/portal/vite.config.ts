import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 部署到 GitHub Pages 时合集页挂在站点根,base 用 VITE_BASE 注入;本地开发 '/'
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5175,
  },
});
