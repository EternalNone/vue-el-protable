import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ['src/**/*.ts', 'src/**/*.vue'],
      insertTypesEntry: true,
      rollupTypes: true,
      copyDtsFiles: false
    })
  ],
  resolve: {
    alias: {
      'vue-el-protable/style.css': fileURLToPath(new URL('./src/styles/index.css', import.meta.url)),
      'vue-el-protable': fileURLToPath(new URL('./src/index.ts', import.meta.url))
    }
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'index.es.js'
    },
    rollupOptions: {
      external: [
        'vue',
        'element-plus',
        '@element-plus/icons-vue',
        /^vue\//,
        /^@vue\//,
        /^element-plus\//,
        /^@element-plus\//
      ],
      output: {
        // 保持 CSS 单文件输出为 style.css
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.some((n) => n.endsWith('.css'))) return 'style.css'
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    cssCodeSplit: false,
    sourcemap: true,
    emptyOutDir: true
  }
})
