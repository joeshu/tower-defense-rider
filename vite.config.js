import { defineConfig } from 'vite';

/* ============================================================
 *  Vite 配置 —— 骑马走格塔防
 *  当前阶段：以项目根目录作为入口，保留全局变量加载顺序
 *  后续可逐步迁移到 src/ 模块化结构
 * ============================================================ */
export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 8080,
    host: true,
    open: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2015',
    // 项目使用全局变量共享状态，避免 Vite 打包时拆分过细
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
