import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type AdminStats = {
  usuarios: {
    total: number
    pro: number
    novos_30d: number
  }
  imoveis: {
    total: number
    ativos: number
    automatic: number
  }
  alugueis: {
    total_mes: number
    pagos_mes: number
    atrasados_mes: number
    receita_mes: number
    taxa_adimplencia: number
  }
  asaas: {
    contas_vinculadas: number
    contas_aprovadas: number
  }
}

// ── isAdmin ───────────────────────────────────────────────────────────────────

/**
 * Verifica se o usuário tem role = 'admin'.
 * Usa o admin client (service_role) para ignorar RLS.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return data?.role === 'admin'
}

// ── requireAdmin ──────────────────────────────────────────────────────────────

/**
 * Lança um erro 403 se o usuário não for admin.
 * Usar em server actions e server components de rotas admin.
 */
export async function requireAdmin(userId: string): Promise<void> {
  const ok = await isAdmin(userId)
  if (!ok) {
    throw Object.assign(new Error('Acesso restrito a administradores.'), { status: 403 })
  }
}

// ── verifyAdminRequest ────────────────────────────────────────────────────────

/**
 * Para uso exclusivo em Next.js API Route Handlers (/api/admin/*).
 *
 * 1. Verifica a sessão Supabase via cookies
 * 2. Verifica role = 'admin'
 * 3. Retorna { userId } ou uma NextResponse 401/403
 *
 * Uso:
 *   const result = await verifyAdminRequest()
 *   if (result instanceof NextResponse) return result
 *   const { userId } = result
 */
export async function verifyAdminRequest(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const ok = await isAdmin(user.id)
  if (!ok) {
    return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 })
  }

  return { userId: user.id }
}

// ── getAdminStats ─────────────────────────────────────────────────────────────

/**
 * Retorna as métricas principais do painel admin.
 * Usa service_role para ter visão completa sem restrição de RLS.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const admin = createAdminClient()

  const agora = new Date()
  const inicioMes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01`
  const ha30Dias = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsuarios },
    { count: usuariosPro },
    { count: novos30d },
    { count: totalImoveis },
    { count: imoveisAtivos },
    { count: imoveisAutomatic },
    { count: totalAlugueisMes },
    { count: pagosCount },
    { count: atrasadosCount },
    { data: receitaData },
    { count: contasAsaas },
    { count: contasAprovadas },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('plano', 'pago'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('criado_em', ha30Dias),
    admin.from('imoveis').select('*', { count: 'exact', head: true }),
    admin.from('imoveis').select('*', { count: 'exact', head: true }).eq('ativo', true),
    admin.from('imoveis').select('*', { count: 'exact', head: true }).eq('billing_mode', 'AUTOMATIC'),
    admin.from('alugueis').select('*', { count: 'exact', head: true }).gte('mes_referencia', inicioMes),
    admin.from('alugueis').select('*', { count: 'exact', head: true }).gte('mes_referencia', inicioMes).eq('status', 'pago'),
    admin.from('alugueis').select('*', { count: 'exact', head: true }).gte('mes_referencia', inicioMes).eq('status', 'atrasado'),
    admin.from('alugueis').select('valor').gte('mes_referencia', inicioMes).eq('status', 'pago'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).not('asaas_account_id', 'is', null),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('asaas_account_status', 'APPROVED'),
  ])

  const receitaMes = (receitaData ?? []).reduce((s, r) => s + (r.valor ?? 0), 0)
  const pagos = pagosCount ?? 0
  const totalMes = totalAlugueisMes ?? 0
  const taxaAdimplencia = totalMes > 0 ? Math.round((pagos / totalMes) * 100) : 0

  return {
    usuarios: {
      total:     totalUsuarios ?? 0,
      pro:       usuariosPro ?? 0,
      novos_30d: novos30d ?? 0,
    },
    imoveis: {
      total:     totalImoveis ?? 0,
      ativos:    imoveisAtivos ?? 0,
      automatic: imoveisAutomatic ?? 0,
    },
    alugueis: {
      total_mes:        totalMes,
      pagos_mes:        pagos,
      atrasados_mes:    atrasadosCount ?? 0,
      receita_mes:      receitaMes,
      taxa_adimplencia: taxaAdimplencia,
    },
    asaas: {
      contas_vinculadas: contasAsaas ?? 0,
      contas_aprovadas:  contasAprovadas ?? 0,
    },
  }
}
