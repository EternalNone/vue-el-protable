import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      'vue-el-protable/style.css': fileURLToPath(new URL('./src/styles/index.css', import.meta.url)),
      'vue-el-protable': fileURLToPath(new URL('./src/index.ts', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.spec.ts', 'tests/**/*.test.ts'],
    css: false,
    restoreMocks: true
  }
})
