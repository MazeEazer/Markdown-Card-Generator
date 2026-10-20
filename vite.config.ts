import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Тесты Edge Functions — для Deno: npm run test:functions
    exclude: [...configDefaults.exclude, 'supabase/**'],
  },
})
