import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { criarCobrancaAsaasInterno } from '@/lib/asaas/charge'
import { enviarCobrancaParaInquilino } from '@/lib/email'

// GET /api/cron/gerar-alugueis
// Gera registros mensais de aluguel para todos os imóveis ativos.
// Para imóveis em modo AUTOMATIC, também cria a cobrança Asaas e envia email
// ao inquilino — entregando "automático" de verdade.
// Dispara dia 1 de cada mês às 08:00 BRT (11:00 UTC) via Vercel Cron.
// Protegido por CRON_SECRET.

function calcularVencimento(mesReferencia: string, diaVencimento: number): string {
  const [anoStr, mesStr] = mesReferencia.split('-')
  const ano = parseInt(anoStr)
  const mes = parseInt(mesStr)
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const dia = Math.min(diaVencimento, ultimoDia)
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

type ImovelRow = {
  id: string
  user_id: string
  apelido: string
  valor_aluguel: number
  dia_vencimento: number
  data_inicio_contrato: string | null
  billing_mode: 'MANUAL' | 'AUTOMATIC' | null
  inquilinos: { id: string; ativo: boolean }[]
}

type AluguelGerado = {
  id: string
  imovel_id: string
}

export async function GET(req: NextRequest) {
  // ── Autenticação ──
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
  const hoje = new Date()
  const mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
  const mesStr = mesReferencia.slice(0, 7)

  const { data: imoveis, error: errImoveis } = await admin
    .from('imoveis')
    .select('id, user_id, apelido, valor_aluguel, dia_vencimento, data_inicio_contrato, billing_mode, inquilinos(id, ativo)')
    .eq('ativo', true) as unknown as { data: ImovelRow[] | null; error: unknown }

  if (errImoveis || !imoveis) {
    return NextResponse.json({ error: 'Falha ao buscar imóveis', detail: String(errImoveis) }, { status: 500 })
  }

  const imoveisValidos = imoveis.filter(imovel => {
    if (!imovel.data_inicio_contrato) return true
    return imovel.data_inicio_contrato.slice(0, 7) <= mesStr
  })

  if (!imoveisValidos.length) {
    return NextResponse.json({ ok: true, mes: mesStr, criados: 0, message: 'Nenhum imóvel elegível' })
  }

  const imovelIds = imoveisValidos.map(i => i.id)
  const { data: existentes } = await admin
    .from('alugueis')
    .select('imovel_id')
    .in('imovel_id', imovelIds)
    .eq('mes_referencia', mesReferencia)

  const existentesSet = new Set(existentes?.map(a => a.imovel_id) ?? [])

  const novosPayload = imoveisValidos
    .filter(imovel => !existentesSet.has(imovel.id))
    .map(imovel => {
      const inquilinoAtivo = imovel.inquilinos?.find(i => i.ativo)
      return {
        imovel_id: imovel.id,
        inquilino_id: inquilinoAtivo?.id ?? null,
        mes_referencia: mesReferencia,
        valor: imovel.valor_aluguel,
        data_vencimento: calcularVencimento(mesStr, imovel.dia_vencimento),
        status: 'pendente' as const,
      }
    })

  if (!novosPayload.length) {
    return NextResponse.json({ ok: true, mes: mesStr, criados: 0, message: 'Todos os aluguéis já existem' })
  }

  // Insert com retorno de ids para podermos disparar cobrança Asaas em seguida
  const { data: novos, error: errInsert } = await admin
    .from('alugueis')
    .insert(novosPayload)
    .select('id, imovel_id') as unknown as { data: AluguelGerado[] | null; error: unknown }

  if (errInsert || !novos) {
    return NextResponse.json({ error: 'Falha ao inserir aluguéis', detail: String(errInsert) }, { status: 500 })
  }

  // ── Processamento de imóveis AUTOMATIC ──
  // Para cada novo aluguel cujo imóvel está em modo AUTOMATIC, gera cobrança
  // Asaas e dispara email com PIX/boleto. Erros em um imóvel não bloqueiam os outros.

  const imoveisById = new Map(imoveisValidos.map(i => [i.id, i]))
  const automaticos = novos.filter(a => imoveisById.get(a.imovel_id)?.billing_mode === 'AUTOMATIC')

  // Cache de profile por user_id para reduzir queries
  const userIds = Array.from(new Set(automaticos.map(a => imoveisById.get(a.imovel_id)?.user_id).filter(Boolean) as string[]))
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, nome')
    .in('id', userIds)
  const nomeProprietarioById = new Map((profiles ?? []).map(p => [p.id, p.nome ?? 'Proprietário']))

  let asaasOk = 0
  let asaasErro = 0
  let emailOk = 0
  let emailErro = 0
  const erros: { aluguelId: string; codigo: string; detalhe: string }[] = []

  for (const aluguelGerado of automaticos) {
    const imovel = imoveisById.get(aluguelGerado.imovel_id)
    if (!imovel) continue

    const result = await criarCobrancaAsaasInterno(admin, {
      aluguelId: aluguelGerado.id,
      userId: imovel.user_id,
    })

    if (!result.ok) {
      asaasErro++
      erros.push({ aluguelId: aluguelGerado.id, codigo: result.code, detalhe: result.error })
      console.warn(`[cron/gerar-alugueis] Asaas falhou para aluguel ${aluguelGerado.id}: ${result.code} — ${result.error}`)
      continue
    }
    asaasOk++

    // Email automático ao inquilino com instruções de pagamento
    const { data: aluguelFull } = await admin
      .from('alugueis')
      .select(`
        valor, data_vencimento, mes_referencia,
        inquilino:inquilinos(nome, email)
      `)
      .eq('id', aluguelGerado.id)
      .single()

    const inq = (Array.isArray(aluguelFull?.inquilino) ? aluguelFull?.inquilino[0] : aluguelFull?.inquilino) as
      { nome: string; email: string | null } | null

    if (!inq?.email) continue

    try {
      await enviarCobrancaParaInquilino({
        para: inq.email,
        nomeInquilino: inq.nome,
        nomeProprietario: nomeProprietarioById.get(imovel.user_id) ?? 'Proprietário',
        nomeImovel: imovel.apelido,
        valor: aluguelFull?.valor as number,
        mesReferencia: aluguelFull?.mes_referencia as string,
        dataVencimento: aluguelFull?.data_vencimento as string,
        pixKey: null,
        pixKeyTipo: null,
        asaasPixCopiaECola: result.pixCopiaECola,
        assasBoletoUrl: result.boletoUrl,
      })

      await admin.from('alugueis')
        .update({ lembrete_enviado_em: new Date().toISOString() })
        .eq('id', aluguelGerado.id)
      emailOk++
    } catch (err) {
      emailErro++
      console.error(`[cron/gerar-alugueis] Email falhou para aluguel ${aluguelGerado.id}:`, err)
    }
  }

  return NextResponse.json({
    ok: true,
    executado_em: new Date().toISOString(),
    mes: mesStr,
    criados: novos.length,
    elegiveis: imoveisValidos.length,
    ja_existiam: existentesSet.size,
    automaticos: {
      total: automaticos.length,
      asaas_gerado: asaasOk,
      asaas_falhou: asaasErro,
      email_enviado: emailOk,
      email_falhou: emailErro,
    },
    erros: erros.length ? erros : undefined,
  })
}
