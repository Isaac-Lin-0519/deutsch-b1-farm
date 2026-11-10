/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

/** 版本＝建置時間，設定頁顯示，用來確認更新了沒 */
const d = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const BUILD = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

// base 用相對路徑，部署到 GitHub Pages 的任何 repo 子路徑都能用
export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // 在 src/lib/pwa.ts 自己註冊，設定頁才能手動檢查更新
      manifest: {
        name: 'Deutsch B1 單字農場',
        short_name: '單字農場',
        description: '用種田和養邊牧的方式複習 Goethe-Zertifikat B1 單字',
        lang: 'zh-Hant-TW',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#3f7f2c',
        theme_color: '#3f7f2c',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff2,json}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  test: { include: ['tests/**/*.test.ts'] },
});
