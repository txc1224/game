import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 纯前端单页,无需后端代理。
// 部署到 GitHub Pages 等子路径时,通过 VITE_BASE 覆盖 base(如 '/game/wulin-mud/')。
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5174,
  },
});
