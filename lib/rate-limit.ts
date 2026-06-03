// Rate limiter in-memory simples por IP/chave.
// Limitação conhecida: roda por instância Vercel (não compartilha entre
// edge regions). Pra produção em larga escala, trocar por Upstash Redis.
// Pra MVP com poucos usuários, in-memory já bloqueia brute force óbvio.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

// Limpeza periódica pra não vazar memória. Roda em qualquer requisição.
let lastCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5min

function maybeCleanup(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  buckets.forEach((v, k) => {
    if (v.resetAt < now) buckets.delete(k)
  })
}

// Verifica se a chave pode prosseguir; consome 1 ponto do bucket.
// Retorna { ok: true, remaining } ou { ok: false, retryAfterSec }.
export function rateLimit(input: {
  key: string                // ex: ip + ':' + endpoint
  windowMs: number           // janela em ms (ex: 60_000 = 1min)
  max: number                // requisições permitidas por janela
}): { ok: true; remaining: number } | { ok: false; retryAfterSec: number } {
  maybeCleanup()
  const now = Date.now()
  const bucket = buckets.get(input.key)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(input.key, { count: 1, resetAt: now + input.windowMs })
    return { ok: true, remaining: input.max - 1 }
  }

  if (bucket.count >= input.max) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count += 1
  return { ok: true, remaining: input.max - bucket.count }
}

// Helper pra extrair IP de NextRequest (Vercel coloca em x-forwarded-for)
export function getClientIp(req: Request | { headers: Headers }): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}
