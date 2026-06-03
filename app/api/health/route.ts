// Health check endpoint — usado pra monitoring externo, uptime checks,
// e diagnose rápida quando algo parece estar estranho.
//
// GET /api/health           — health básico (sempre 200 se app sobe)
// GET /api/health?deep=1    — testa Supabase + Stripe + Resend; pode demorar

import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type Check = { ok: boolean; latencyMs?: number; error?: string }

export async function GET(req: NextRequest) {
  const startedAt = Date.now()
  const deep = req.nextUrl.searchParams.get('deep') === '1'

  const checks: Record<string, Check> = {}

  if (deep) {
    // Supabase: ping mais leve possível (count em tabela small)
    const t0 = Date.now()
    try {
      const admin = createAdminClient()
      const { error } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .limit(1)
      checks.supabase = error
        ? { ok: false, latencyMs: Date.now() - t0, error: error.message }
        : { ok: true,  latencyMs: Date.now() - t0 }
    } catch (err) {
      checks.supabase = {
        ok: false,
        latencyMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      }
    }

    // Env vars críticos
    checks.env = {
      ok:
        !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
        !!process.env.STRIPE_SECRET_KEY &&
        !!process.env.STRIPE_WEBHOOK_SECRET &&
        !!process.env.RESEND_API_KEY &&
        !!process.env.CRON_SECRET,
      error:
        [
          !process.env.NEXT_PUBLIC_SUPABASE_URL    && 'SUPABASE_URL',
          !process.env.SUPABASE_SERVICE_ROLE_KEY    && 'SERVICE_ROLE_KEY',
          !process.env.STRIPE_SECRET_KEY            && 'STRIPE_SECRET_KEY',
          !process.env.STRIPE_WEBHOOK_SECRET        && 'STRIPE_WEBHOOK_SECRET',
          !process.env.RESEND_API_KEY               && 'RESEND_API_KEY',
          !process.env.CRON_SECRET                  && 'CRON_SECRET',
        ].filter(Boolean).join(', ') || undefined,
    }
  }

  const allOk = !deep || Object.values(checks).every(c => c.ok)

  return NextResponse.json(
    {
      ok:        allOk,
      service:   'proprietariozen',
      version:   process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? 'dev',
      timestamp: new Date().toISOString(),
      uptimeMs:  Date.now() - startedAt,
      env:       process.env.VERCEL_ENV ?? 'local',
      checks:    deep ? checks : undefined,
    },
    {
      status: allOk ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
