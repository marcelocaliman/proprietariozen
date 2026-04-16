import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { gerarUrlAssinada, formatarTamanho, deletarDocumento } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const TIPOS_VALIDOS = ['contrato', 'laudo_entrada', 'laudo_saida', 'comprovante', 'foto', 'outro']

type Params = { params: Promise<{ aluguelId: string }> }

async function verificarOwnership(aluguelId: string, userId: string) {
  const admin = createAdminClient()
  const { data: aluguel } = await admin
    .from('alugueis')
    .select('imovel_id')
    .eq('id', aluguelId)
    .single()
  if (!aluguel?.imovel_id) return false
  const { data: imovel } = await admin
    .from('imoveis')
    .select('id')
    .eq('id', aluguel.imovel_id)
    .eq('user_id', userId)
    .maybeSingle()
  return !!imovel
}

// ── GET — listar documentos do aluguel ────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { aluguelId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const ok = await verificarOwnership(aluguelId, user.id)
  if (!ok) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const admin = createAdminClient()
  const { data: docs, error } = await admin
    .from('documentos_aluguel')
    .select('id, tipo, nome_arquivo, tamanho_bytes, mime_type, descricao, storage_path, criado_em')
    .eq('aluguel_id', aluguelId)
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const lista = await Promise.all(
    (docs ?? []).map(async (doc) => {
      let url = ''
      try { url = await gerarUrlAssinada(doc.storage_path) } catch { /* continua */ }
      return {
        id:            doc.id,
        tipo:          doc.tipo,
        nome_arquivo:  doc.nome_arquivo,
        tamanho_bytes: doc.tamanho_bytes,
        tamanho:       formatarTamanho(doc.tamanho_bytes),
        mime_type:     doc.mime_type,
        descricao:     doc.descricao,
        url,
        criado_em:     doc.criado_em,
      }
    }),
  )

  return NextResponse.json({ documentos: lista })
}

// ── POST — salvar metadados após upload direto ao Supabase Storage ────────────
// O arquivo já foi enviado diretamente pelo browser via URL assinada (/upload-token).
// Este endpoint apenas insere o registro no banco de dados.
export async function POST(req: NextRequest, { params }: Params) {
  const { aluguelId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const ok = await verificarOwnership(aluguelId, user.id)
  if (!ok) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  let body: {
    path?: string; tipo?: string; descricao?: string
    nome_arquivo?: string; tamanho_bytes?: number; mime_type?: string
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })
  }

  const { path, tipo, descricao, nome_arquivo, tamanho_bytes, mime_type } = body

  if (!path || !nome_arquivo || !tamanho_bytes || !mime_type)
    return NextResponse.json({ error: 'Metadados incompletos.' }, { status: 422 })
  if (!tipo || !TIPOS_VALIDOS.includes(tipo))
    return NextResponse.json({ error: 'Tipo de documento inválido.' }, { status: 422 })

  // Garante que o path pertence a este usuário e aluguel
  const pathEsperado = `usuarios/${user.id}/alugueis/${aluguelId}/`
  if (!path.startsWith(pathEsperado))
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const tipoValido = tipo as 'contrato' | 'laudo_entrada' | 'laudo_saida' | 'comprovante' | 'foto' | 'outro'

  const admin = createAdminClient()
  const { data: doc, error: dbErr } = await admin
    .from('documentos_aluguel')
    .insert({
      user_id:       user.id,
      aluguel_id:    aluguelId,
      tipo:          tipoValido,
      nome_arquivo,
      tamanho_bytes,
      mime_type,
      storage_path:  path,
      descricao:     descricao || null,
    })
    .select('id, tipo, nome_arquivo, tamanho_bytes, mime_type, descricao, storage_path, criado_em')
    .single()

  if (dbErr) {
    console.error('[documentos-aluguel] db insert error:', dbErr.message)
    try { await deletarDocumento(path) } catch { /* ignora */ }
    return NextResponse.json({ error: `Erro ao salvar metadados: ${dbErr.message}` }, { status: 500 })
  }

  const url = await gerarUrlAssinada(path).catch(() => '')

  return NextResponse.json({
    documento: {
      id:            doc!.id,
      tipo:          doc!.tipo,
      nome_arquivo:  doc!.nome_arquivo,
      tamanho_bytes: doc!.tamanho_bytes,
      tamanho:       formatarTamanho(doc!.tamanho_bytes),
      mime_type:     doc!.mime_type,
      descricao:     doc!.descricao,
      url,
      criado_em:     doc!.criado_em,
    },
  }, { status: 201 })
}
