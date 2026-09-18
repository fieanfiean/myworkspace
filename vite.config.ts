import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'favicon-96x96.png',
        'apple-touch-icon.png',
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // 增加单文件缓存上限至 4MB，避免 Workbox 对大文件反复做体积校验导致卡顿
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'My Workspace & Budget Tracker',
        short_name: 'Workspace',
        description: 'Personal portfolio, resume generator, and budget tracker.',
        start_url: '/',
        scope: '/',
        lang: 'en',
        display: 'standalone',
        background_color: '#0B0F17',
        theme_color: '#0B0F17',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    // 提升 Chunk 大小警告阈值（默认 500kb）
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          // 1. React 核心框架
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) {
            return 'react-vendor'
          }

          // 2. Supabase 数据库客户端
          if (id.includes('/@supabase/')) {
            return 'supabase-vendor'
          }

          // 3. UI 组件与图标库 (Lucide, Radix, Framer Motion 等)
          if (
            id.includes('/lucide-react/') ||
            id.includes('/@radix-ui/') ||
            id.includes('/framer-motion/') ||
            id.includes('/clsx/')
          ) {
            return 'ui-vendor'
          }

          // 4. PDF 生成相关库 (简历生成器用到的工具，通常体积巨大)
          if (id.includes('/pdfjs-dist/') || id.includes('/jspdf/') || id.includes('/@react-pdf/renderer/') || id.includes('/html2canvas/') || id.includes('/html2pdf.js/')) {
            return 'pdf-vendor'
          }

          // 5. 图表库 (预算追踪器用到的 Recharts / Chart.js 等)
          if (id.includes('/recharts/') || id.includes('/chart.js/') || id.includes('/react-chartjs-2/')) {
            return 'chart-vendor'
          }

          // 6. 其他剩余第三方依赖
          return undefined
        },
      },
    },
  },
})
