import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { criarCobrancaAsaasInterno } from '@/lib/asaas/charge'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { aluguelId?: string }
  if (!body.aluguelId) return NextResponse.json({ error: 'aluguelId obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const result = await criarCobrancaAsaasInterno(admin, {
    aluguelId: body.aluguelId,
    userId: user.id,
  })

  if (!result.ok) {
    // Mapeia código → status HTTP apropriado
    const status =
      result.code === 'aluguel_nao_encontrado' ? 404 :
      result.code === 'plano_insuficiente' ? 403 :
      result.code === 'asaas_falha_comunicacao' ? 502 :
      result.code === 'persist_falhou' || result.code === 'erro_interno' ? 500 :
      400
    return NextResponse.json({ error: result.error, code: result.code }, { status })
  }

  return NextResponse.json({
    chargeId: result.chargeId,
    pixQrcode: result.pixQrcode,
    pixCopiaECola: result.pixCopiaECola,
    boletoUrl: result.boletoUrl,
  })
}
