import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Тесты Edge Functions — для Deno: npm run test:functions
    exclude: [...configDefaults.exclude, 'supabase/**'],
    // Без кэшей: fsModuleCache хранит модули с уже раскрытым import.meta.glob, и тест не видел новых файлов
    // правил (criteria.test.ts молча проходил по старому списку кодов). Проект маленький — холодный старт дёшев.
    fsModuleCache: false,
    cache: false,
  },
})
