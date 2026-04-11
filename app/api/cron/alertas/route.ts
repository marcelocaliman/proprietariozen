import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import {
  enviarLembreteVencimento,
  enviarAlertaAtraso,
  enviarAlertaReajuste,
} from '@/lib/email'

// GET /api/cron/alertas
// Verifica e envia todos os alertas pendentes do dia.
// Protegido por CRON_SECRET (header Authorization: Bearer <secret> ou ?secret=<secret>).
//
// Regras:
//   Vencimento: status = pendente E data_vencimento = hoje + 3 dias
//   Atraso:     status = atrasado E data_vencimento = hoje - 1 dia
//   Reajuste:   ativo = true  E data_proximo_reajuste = hoje + 30 dias

type AluguelAlerta = {
  id: string
  valor: number
  data_vencimento: string
  mes_referencia: string
  imovel_id: string
  imoveis: { apelido: string; user_id: string } | null
  inquilinos: { nome: string } | null
}

type ImovelAlerta = {
  id: string
  apelido: string
  user_id: string
  valor_aluguel: number
  indice_reajuste: string
  percentual_fixo: number | null
  data_proximo_reajuste: string
}

type Profile = { id: string; nome: string; email: string }

function dateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function diasAtraso(dataVencimento: string): number {
  const venc = new Date(dataVencimento + 'T00:00:00')
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((hoje.getTime() - venc.getTime()) / 86_400_000))
}

export async function GET(req: NextRequest) {
  // ── Autenticação ────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = req.headers.get('authorization') ?? ''
    const querySecret = req.nextUrl.searchParams.get('secret') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : querySecret
    if (token !== secret) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
  }

  const admin = createAdminClient()
  const resultados = { vencimento: 0, atraso: 0, reajuste: 0, erros: 0 }

  // ── Carrega perfis (uma vez) ─────────────────────────────────────────────────
  async function getProfiles(userIds: string[]): Promise<Map<string, Profile>> {
    if (!userIds.length) return new Map()
    const { data } = await admin
      .from('profiles')
      .select('id, nome, email')
      .in('id', userIds)
    const map = new Map<string, Profile>()
    for (const p of data ?? []) map.set(p.id, p as Profile)
    return map
  }

  // ── 1. Lembretes de vencimento (3 dias antes) ────────────────────────────────
  const { data: vencimentos } = await admin
    .from('alugueis')
    .select(`
      id, valor, data_vencimento, mes_referencia,
      imoveis!inner(apelido, user_id),
      inquilinos(nome)
    `)
    .eq('status', 'pendente')
    .eq('data_vencimento', dateOffset(3)) as unknown as { data: AluguelAlerta[] | null }

  if (vencimentos?.length) {
    const userIds = Array.from(new Set(vencimentos.map(a => a.imoveis?.user_id).filter(Boolean) as string[]))
    const profiles = await getProfiles(userIds)

    for (const aluguel of vencimentos) {
      const userId = aluguel.imoveis?.user_id
      const profile = userId ? profiles.get(userId) : undefined
      if (!profile?.email) continue
      try {
        await enviarLembreteVencimento({
          para: profile.email,
          nomeProprietario: profile.nome,
          nomeImovel: aluguel.imoveis?.apelido ?? 'Imóvel',
          nomeInquilino: aluguel.inquilinos?.nome ?? null,
          valor: aluguel.valor,
          dataVencimento: aluguel.data_vencimento,
          mesReferencia: aluguel.mes_referencia,
        })
        resultados.vencimento++
      } catch {
        resultados.erros++
      }
    }
  }

  // ── 2. Alertas de atraso (1 dia depois do vencimento) ───────────────────────
  const { data: atrasados } = await admin
    .from('alugueis')
    .select(`
      id, valor, data_vencimento, mes_referencia,
      imoveis!inner(apelido, user_id),
      inquilinos(nome)
    `)
    .eq('status', 'atrasado')
    .eq('data_vencimento', dateOffset(-1)) as unknown as { data: AluguelAlerta[] | null }

  if (atrasados?.length) {
    const userIds = Array.from(new Set(atrasados.map(a => a.imoveis?.user_id).filter(Boolean) as string[]))
    const profiles = await getProfiles(userIds)

    for (const aluguel of atrasados) {
      const userId = aluguel.imoveis?.user_id
      const profile = userId ? profiles.get(userId) : undefined
      if (!profile?.email) continue
      try {
        await enviarAlertaAtraso({
          para: profile.email,
          nomeProprietario: profile.nome,
          nomeImovel: aluguel.imoveis?.apelido ?? 'Imóvel',
          nomeInquilino: aluguel.inquilinos?.nome ?? null,
          valor: aluguel.valor,
          dataVencimento: aluguel.data_vencimento,
          diasAtraso: diasAtraso(aluguel.data_vencimento),
          mesReferencia: aluguel.mes_referencia,
        })
        resultados.atraso++
      } catch {
        resultados.erros++
      }
    }
  }

  // ── 3. Alertas de reajuste (30 dias antes) ───────────────────────────────────
  const { data: reajustes } = await admin
    .from('imoveis')
    .select('id, apelido, user_id, valor_aluguel, indice_reajuste, percentual_fixo, data_proximo_reajuste')
    .eq('ativo', true)
    .eq('data_proximo_reajuste', dateOffset(30)) as unknown as { data: ImovelAlerta[] | null }

  if (reajustes?.length) {
    const userIds = Array.from(new Set(reajustes.map(i => i.user_id)))
    const profiles = await getProfiles(userIds)

    for (const imovel of reajustes) {
      const profile = profiles.get(imovel.user_id)
      if (!profile?.email) continue
      try {
        await enviarAlertaReajuste({
          para: profile.email,
          nomeProprietario: profile.nome,
          nomeImovel: imovel.apelido,
          valorAtual: imovel.valor_aluguel,
          indiceReajuste: imovel.indice_reajuste,
          percentualFixo: imovel.percentual_fixo,
          dataReajuste: imovel.data_proximo_reajuste,
        })
        resultados.reajuste++
      } catch {
        resultados.erros++
      }
    }
  }

  return NextResponse.json({
    ok: true,
    executado_em: new Date().toISOString(),
    enviados: resultados,
    total: resultados.vencimento + resultados.atraso + resultados.reajuste,
  })
}
