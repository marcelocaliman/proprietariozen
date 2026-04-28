import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import {
  enviarLembreteVencimento,
  enviarLembreteInquilino,
  enviarAlertaAtraso,
  enviarAlertaReajuste,
  enviarAlertaVencimentoContrato,
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

type AluguelAlertaCompleto = {
  id: string
  valor: number
  data_vencimento: string
  mes_referencia: string
  asaas_pix_copiaecola: string | null
  asaas_boleto_url: string | null
  imoveis: { apelido: string; user_id: string; billing_mode: 'MANUAL' | 'AUTOMATIC' | null } | null
  inquilinos: { nome: string; email: string | null } | null
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

type ImovelContrato = {
  id: string
  apelido: string
  user_id: string
  data_fim_contrato: string
  inquilinos: { nome: string; ativo: boolean }[] | null
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
  const resultados = {
    atualizados: 0,
    vencimento: 0,
    lembreteInquilino: 0,
    atraso: 0,
    reajuste: 0,
    contrato: 0,
    erros: 0,
  }

  // ── 0. Marcar como atrasado todos os pendentes com vencimento passado ────────
  const hoje = dateOffset(0)
  const { data: pendentesVencidos, error: errUpdate } = await admin
    .from('alugueis')
    .update({ status: 'atrasado' })
    .eq('status', 'pendente')
    .lt('data_vencimento', hoje)
    .select('id')

  if (!errUpdate) resultados.atualizados = pendentesVencidos?.length ?? 0

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
  // Envia DOIS emails: um pro proprietário (acompanhamento) e um pro inquilino
  // (lembrete com PIX/boleto), pra que o inquilino tenha o método de pagamento
  // disponível mesmo que não tenha guardado o email inicial do início do mês.
  const { data: vencimentos } = await admin
    .from('alugueis')
    .select(`
      id, valor, data_vencimento, mes_referencia,
      asaas_pix_copiaecola, asaas_boleto_url,
      imoveis!inner(apelido, user_id, billing_mode),
      inquilinos(nome, email)
    `)
    .eq('status', 'pendente')
    .eq('data_vencimento', dateOffset(3)) as unknown as { data: AluguelAlertaCompleto[] | null }

  if (vencimentos?.length) {
    const userIds = Array.from(new Set(vencimentos.map(a => a.imoveis?.user_id).filter(Boolean) as string[]))
    const profiles = await getProfiles(userIds)

    // Para imóveis em modo MANUAL precisamos da chave PIX do proprietário,
    // que vive em user_metadata. Carregamos uma vez por user.
    const pixByUser = new Map<string, { key: string | null; tipo: string | null }>()
    await Promise.all(userIds.map(async userId => {
      try {
        const { data } = await admin.auth.admin.getUserById(userId)
        pixByUser.set(userId, {
          key: (data?.user?.user_metadata?.pix_key as string | null) ?? null,
          tipo: (data?.user?.user_metadata?.pix_key_tipo as string | null) ?? null,
        })
      } catch {
        pixByUser.set(userId, { key: null, tipo: null })
      }
    }))

    for (const aluguel of vencimentos) {
      const userId = aluguel.imoveis?.user_id
      const profile = userId ? profiles.get(userId) : undefined
      if (!profile?.email) continue

      // 1a — Lembrete pro proprietário (acompanhamento)
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

      // 1b — Lembrete pro inquilino com PIX/boleto pra evitar atraso
      const inquilino = aluguel.inquilinos
      if (!inquilino?.email) continue

      const isAutomatic = aluguel.imoveis?.billing_mode === 'AUTOMATIC'
      const pixInfo = userId ? pixByUser.get(userId) : null

      try {
        await enviarLembreteInquilino({
          para: inquilino.email,
          nomeInquilino: inquilino.nome,
          nomeProprietario: profile.nome,
          nomeImovel: aluguel.imoveis?.apelido ?? 'Imóvel',
          valor: aluguel.valor,
          mesReferencia: aluguel.mes_referencia,
          dataVencimento: aluguel.data_vencimento,
          pixKey:             isAutomatic ? null : (pixInfo?.key ?? null),
          asaasPixCopiaECola: isAutomatic ? aluguel.asaas_pix_copiaecola : null,
          assasBoletoUrl:     isAutomatic ? aluguel.asaas_boleto_url : null,
        })
        resultados.lembreteInquilino++
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

  // ── 4. Alertas de vencimento de contrato (≤ 60 dias) ─────────────────────────
  const em60Dias = dateOffset(60)
  const { data: contratosVencendo } = await admin
    .from('imoveis')
    .select('id, apelido, user_id, data_fim_contrato, inquilinos(nome, ativo)')
    .eq('ativo', true)
    .eq('contrato_indeterminado', false)
    .eq('alerta_vencimento_enviado', false)
    .not('data_fim_contrato', 'is', null)
    .lte('data_fim_contrato', em60Dias)
    .gte('data_fim_contrato', hoje) as unknown as { data: ImovelContrato[] | null }

  if (contratosVencendo?.length) {
    const userIds = Array.from(new Set(contratosVencendo.map(i => i.user_id)))
    const profiles = await getProfiles(userIds)

    for (const imovel of contratosVencendo) {
      const profile = profiles.get(imovel.user_id)
      if (!profile?.email) continue
      const fim = new Date(imovel.data_fim_contrato + 'T00:00:00')
      const hoje2 = new Date(); hoje2.setHours(0, 0, 0, 0)
      const dias = Math.round((fim.getTime() - hoje2.getTime()) / 86_400_000)
      const inquilinoAtivo = imovel.inquilinos?.find(i => i.ativo)
      try {
        await enviarAlertaVencimentoContrato({
          para: profile.email,
          nomeProprietario: profile.nome,
          nomeImovel: imovel.apelido,
          nomeInquilino: inquilinoAtivo?.nome ?? null,
          dataFim: imovel.data_fim_contrato,
          diasRestantes: dias,
        })
        await admin.from('imoveis').update({ alerta_vencimento_enviado: true }).eq('id', imovel.id)
        resultados.contrato++
      } catch {
        resultados.erros++
      }
    }
  }

  return NextResponse.json({
    ok: true,
    executado_em: new Date().toISOString(),
    atualizados: resultados.atualizados,
    enviados: {
      vencimento: resultados.vencimento,
      lembrete_inquilino: resultados.lembreteInquilino,
      atraso: resultados.atraso,
      reajuste: resultados.reajuste,
      contrato: resultados.contrato,
    },
    total: resultados.vencimento + resultados.lembreteInquilino + resultados.atraso + resultados.reajuste + resultados.contrato,
    erros: resultados.erros,
  })
}
