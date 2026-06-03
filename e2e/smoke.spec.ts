import { test, expect } from '@playwright/test'

// Smoke tests — só rotas públicas, sem auth.
// Valida que páginas críticas renderizam sem erro e que o conteúdo
// essencial (título, CTAs, links jurídicos) está presente.

test.describe('Smoke - rotas públicas', () => {
  test('landing page carrega e mostra o nome do produto', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    // Texto de marca em algum lugar da página
    await expect(page.locator('body')).toContainText(/ProprietárioZen/i)
  })

  test('login carrega sem erro', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('body')).toContainText(/entrar|login|e-?mail/i)
    // Não deve ter o overlay de erro do Next
    await expect(page.locator('text=Application error')).toHaveCount(0)
  })

  test('cadastro carrega sem erro', async ({ page }) => {
    await page.goto('/cadastro')
    await expect(page.locator('body')).toContainText(/cadastr|criar|conta/i)
    await expect(page.locator('text=Application error')).toHaveCount(0)
  })

  test('recuperar senha carrega sem erro', async ({ page }) => {
    await page.goto('/recuperar-senha')
    await expect(page.locator('text=Application error')).toHaveCount(0)
  })

  test('planos carrega', async ({ page }) => {
    await page.goto('/planos')
    await expect(page.locator('body')).toContainText(/Master|Elite|grátis|gratis/i)
  })

  test('política de privacidade carrega e menciona LGPD + canais de exercício', async ({ page }) => {
    await page.goto('/politica-de-privacidade')
    await expect(page.locator('body')).toContainText(/LGPD|Lei.*13\.?709/i)
    await expect(page.locator('body')).toContainText(/Configura.+Segurança/i)
  })

  test('termos de uso carrega', async ({ page }) => {
    await page.goto('/termos-de-uso')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })
})

test.describe('Smoke - proteção de rotas', () => {
  test('GET /dashboard sem auth redireciona pra login', async ({ page }) => {
    const response = await page.goto('/dashboard')
    // Aceita 200 (depois do redirect) ou 307/302; o que importa é
    // que a URL final é /login
    expect(response?.ok() || (response?.status() ?? 0) >= 300).toBeTruthy()
    await expect(page).toHaveURL(/\/login/)
  })

  test('GET /admin/usuarios sem auth redireciona', async ({ page }) => {
    await page.goto('/admin/usuarios')
    await expect(page).toHaveURL(/\/login/)
  })

  test('GET /suporte sem auth redireciona', async ({ page }) => {
    await page.goto('/suporte')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Smoke - health check', () => {
  test('GET /api/health responde 200', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.service).toBe('proprietariozen')
  })
})

test.describe('Smoke - webhooks rejeitam sem auth', () => {
  test('POST /api/webhooks/stripe sem assinatura retorna 400', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', { data: {} })
    expect(res.status()).toBe(400)
  })

  test('GET /api/cron/alertas sem CRON_SECRET retorna 401', async ({ request }) => {
    const res = await request.get('/api/cron/alertas')
    // Pode retornar 401 ou 403 dependendo do handler
    expect([401, 403]).toContain(res.status())
  })
})

test.describe('Smoke - rate limit', () => {
  test('endpoint de token público rate-limita após 30 reqs', async ({ request }) => {
    // Token de 64 chars (formato esperado mas inválido)
    const fakeToken = 'f'.repeat(64)
    // Faz 32 requests; alguma deve dar 429
    let got429 = false
    for (let i = 0; i < 32; i++) {
      const res = await request.get(`/api/inquilino/pagina/${fakeToken}`)
      if (res.status() === 429) {
        got429 = true
        break
      }
    }
    expect(got429).toBe(true)
  })
})
