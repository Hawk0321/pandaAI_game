// trading人生 单独部署用的构建配置：只打包滑牌游戏，输出到 dist-reigns/。
// base 用绝对路径 '/'，音频与关卡文件不随页面所在目录变化。
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    target: 'es2020',
    outDir: 'dist-reigns',
    emptyOutDir: true,
    rollupOptions: { input: fileURLToPath(new URL('src/reigns/demo.html', import.meta.url)) },
  },
});
