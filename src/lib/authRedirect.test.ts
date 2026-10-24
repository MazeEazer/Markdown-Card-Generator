import { describe, expect, it } from 'vitest'
import { emailRedirectUrl } from './authRedirect'

describe('emailRedirectUrl: ссылка из письма возвращает туда, где регистрировались', () => {
  it.each([
    ['https://markdown-card-generator.vercel.app', 'https://markdown-card-generator.vercel.app/'],
    ['https://markdown-card-generator-git-vkr-ilya070105-gmailcoms-projects.vercel.app', 'https://markdown-card-generator-git-vkr-ilya070105-gmailcoms-projects.vercel.app/'],
    ['http://localhost:5173', 'http://localhost:5173/'],
  ])('%s → корень того же адреса', (origin, expected) => {
    expect(emailRedirectUrl({ origin })).toBe(expected)
  })
})
