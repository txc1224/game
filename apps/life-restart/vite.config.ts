import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 部署到 GitHub Pages 时站点挂在 https://txc1224.github.io/game/ 下,
// 故 base 需为 '/game/';本地开发用 '/'。通过环境变量 VITE_BASE 覆盖。
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 前端统一用相对路径 /api,开发服务器代理到后端 Fastify(仅联网模式需要)
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
