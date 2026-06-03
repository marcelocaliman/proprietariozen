import { defineConfig, devices } from '@playwright/test'

// Smoke tests E2E rodam contra um Next dev/build local.
// Em CI usa o build de produção. Local usa dev pra reload rápido.

const IS_CI = !!process.env.CI
const PORT = 3000
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  workers: IS_CI ? 1 : undefined,
  reporter: IS_CI ? [['github'], ['list']] : 'list',
  timeout: 30_000,

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Sobe o app local se o BASE_URL não estiver disponível.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: IS_CI ? 'npm run build && npm run start' : 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: !IS_CI,
        timeout: 180_000,
        // Env stubs apenas pra subir o servidor — testes públicos não
        // dependem desses valores serem reais.
        env: {
          NEXT_PUBLIC_SUPABASE_URL: 'https://stub.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'stub',
          SUPABASE_SERVICE_ROLE_KEY: 'stub',
          STRIPE_SECRET_KEY: 'sk_test_stub',
          STRIPE_WEBHOOK_SECRET: 'whsec_stub',
          RESEND_API_KEY: 're_stub',
          ASAAS_API_KEY_ROOT: 'stub',
          ASAAS_ENCRYPTION_KEY: 'a'.repeat(43),
          ASAAS_WEBHOOK_TOKEN: 'stub',
          CRON_SECRET: 'stub',
          NEXT_PUBLIC_APP_URL: BASE_URL,
        },
      },
})
