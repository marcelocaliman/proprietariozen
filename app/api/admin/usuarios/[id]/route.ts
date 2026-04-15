import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/usuarios/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminRequest()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const admin = createAdminSupabaseClient()

  const agora = new Date()
  const ha6Meses = new Date(agora.getFullYear(), agora.getMonth() - 5, 1)
  const ha6MesesStr = `${ha6Meses.getFullYear()}-${String(ha6Meses.getMonth() + 1).padStart(2, '0')}-01`

  // ── Buscar perfil + imóveis + inquilinos ──────────────────────────────────
  const [
    { data: profile, error: profileErr },
    { data: imoveis },
    { data: inquilinos },
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('id', id).single(),
    admin.from('imoveis')
      .select('id, apelido, endereco, tipo, valor_aluguel, ativo, criado_em, billing_mode')
      .eq('user_id', id)
      .order('criado_em', { ascending: false }),
    admin.from('inquilinos')
      .select('id, nome, email, cpf, ativo, criado_em')
      .eq('user_id', id)
      .order('criado_em', { ascending: false }),
  ])

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  }

  // ── Aluguéis (via imovel_id) ─────────────────────────────────────────────
  const imovelIds = (imoveis ?? []).map((im: { id: string }) => im.id)
  let alugueis: { imovel_id: string; mes_referencia: string; valor: number; status: string; valor_pago: number | null }[] = []

  if (imovelIds.length > 0) {
    const { data } = await admin
      .from('alugueis')
      .select('imovel_id, mes_referencia, valor, status, valor_pago')
      .in('imovel_id', imovelIds)
      .gte('mes_referencia', ha6MesesStr)
      .order('mes_referencia', { ascending: false })
    alugueis = (data ?? []) as typeof alugueis
  }

  // ── Activity logs (graceful fallback se tabela não existir) ─────────────
  type ActivityRow = { id: string; action: string; details: unknown; ip_address: string | null; created_at: string }
  let recentActivity: ActivityRow[] = []
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = admin.from('activity_logs' as never) as any
    const res: { data: ActivityRow[] | null } = await q
      .select('id, action, details, ip_address, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
    recentActivity = res.data ?? []
  } catch {
    // tabela não existe ainda
  }

  // ── Agregar aluguéis por mês ──────────────────────────────────────────────
  const byMes: Record<string, { total_valor: number; total_pago: number; count: number }> = {}
  for (const a of alugueis) {
    const mes = a.mes_referencia.slice(0, 7)
    if (!byMes[mes]) byMes[mes] = { total_valor: 0, total_pago: 0, count: 0 }
    byMes[mes].total_valor += a.valor ?? 0
    byMes[mes].total_pago  += a.status === 'pago' ? (a.valor_pago ?? a.valor ?? 0) : 0
    byMes[mes].count       += 1
  }

  const aluguel_history = Array.from({ length: 6 }, (_, i) => {
    const d   = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      .replace('.', '').replace(' de ', '/')
      .replace(/^(\w)/, (c: string) => c.toUpperCase())
    return { mes: key, label, ...(byMes[key] ?? { total_valor: 0, total_pago: 0, count: 0 }) }
  })

  return NextResponse.json({
    profile,
    imoveis:         imoveis ?? [],
    inquilinos:      inquilinos ?? [],
    aluguel_history,
    recent_activity: recentActivity,
  })
}
