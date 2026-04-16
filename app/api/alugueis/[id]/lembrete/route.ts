import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { enviarLembreteInquilino } from '@/lib/email'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const admin = createAdminClient()

    const { data: aluguel } = await admin
      .from('alugueis')
      .select(`
        id, valor, data_vencimento, mes_referencia, status,
        asaas_pix_copiaecola, asaas_boleto_url,
        imovel:imoveis!inner(apelido, user_id),
        inquilino:inquilinos(nome, email)
      `)
      .eq('id', params.id)
      .single()

    if (!aluguel) return NextResponse.json({ error: 'Aluguel não encontrado' }, { status: 404 })

    const imovel = aluguel.imovel as { apelido: string; user_id: string } | null
    if (imovel?.user_id !== user.id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const inquilino = aluguel.inquilino as { nome: string; email: string | null } | null
    if (!inquilino?.email) {
      return NextResponse.json({ error: 'Inquilino sem e-mail cadastrado' }, { status: 400 })
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('nome')
      .eq('id', user.id)
      .single()

    const pixKey = (user.user_metadata?.pix_key as string | null) ?? null

    await enviarLembreteInquilino({
      para: inquilino.email,
      nomeInquilino: inquilino.nome,
      nomeProprietario: profile?.nome ?? 'Proprietário',
      nomeImovel: imovel?.apelido ?? '',
      valor: aluguel.valor,
      mesReferencia: aluguel.mes_referencia,
      dataVencimento: aluguel.data_vencimento,
      pixKey,
      asaasPixCopiaECola: aluguel.asaas_pix_copiaecola ?? null,
      assasBoletoUrl: aluguel.asaas_boleto_url ?? null,
    })

    // Salva timestamp do lembrete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await admin
      .from('alugueis')
      .update({ lembrete_enviado_em: new Date().toISOString() } as any)
      .eq('id', params.id)

    return NextResponse.json({ ok: true, enviadoPara: inquilino.email })
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao enviar lembrete', detail: String(err) }, { status: 500 })
  }
}
