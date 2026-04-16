import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import {
  uploadDocumento, gerarUrlAssinada, sanitizarNomeArquivo,
  formatarTamanho, STORAGE_MAX_BYTES, STORAGE_MIME_ACEITOS,
} from '@/lib/storage'

export const dynamic = 'force-dynamic'

const TIPOS_VALIDOS = ['contrato', 'laudo_entrada', 'laudo_saida', 'comprovante', 'foto', 'outro']
const MAX_DOCS_ALUGUEL = 20

type Params = { params: Promise<{ aluguelId: string }> }

// ── Verificar ownership do aluguel ────────────────────────────────────────────
async function verificarOwnership(aluguelId: string, userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('alugueis')
    .select('id, imovel:imoveis!inner(user_id)')
    .eq('id', aluguelId)
    .single()
  if (!data) return false
  const imovel = Array.isArray(data.imovel) ? data.imovel[0] : data.imovel
  return (imovel as { user_id: string } | null)?.user_id === userId
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

// ── POST — upload de documento ────────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  const { aluguelId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const ok = await verificarOwnership(aluguelId, user.id)
  if (!ok) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const admin = createAdminClient()
  const { count } = await admin
    .from('documentos_aluguel')
    .select('id', { count: 'exact', head: true })
    .eq('aluguel_id', aluguelId)
  if ((count ?? 0) >= MAX_DOCS_ALUGUEL) {
    return NextResponse.json(
      { error: `Limite de ${MAX_DOCS_ALUGUEL} documentos por período atingido.` },
      { status: 422 },
    )
  }

  let formData: FormData
  try { formData = await req.formData() } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const tipo = formData.get('tipo') as string | null
  const descricao = (formData.get('descricao') as string | null) ?? null

  if (!file) return NextResponse.json({ error: 'Arquivo obrigatório.' }, { status: 422 })
  if (!tipo || !TIPOS_VALIDOS.includes(tipo))
    return NextResponse.json({ error: 'Tipo de documento inválido.' }, { status: 422 })
  if (file.size > STORAGE_MAX_BYTES)
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10MB.' }, { status: 422 })
  if (!STORAGE_MIME_ACEITOS.includes(file.type))
    return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use PDF, JPG ou PNG.' }, { status: 422 })

  const nomeSeguro = sanitizarNomeArquivo(file.name)
  const storagePath = `usuarios/${user.id}/alugueis/${aluguelId}/${Date.now()}_${nomeSeguro}`

  try {
    await uploadDocumento(file, storagePath, file.type, file.size)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao fazer upload.' },
      { status: 500 },
    )
  }

  const tipoValido = tipo as 'contrato' | 'laudo_entrada' | 'laudo_saida' | 'comprovante' | 'foto' | 'outro'

  const { data: doc, error: dbErr } = await admin
    .from('documentos_aluguel')
    .insert({
      user_id:       user.id,
      aluguel_id:    aluguelId,
      tipo:          tipoValido,
      nome_arquivo:  file.name,
      tamanho_bytes: file.size,
      mime_type:     file.type,
      storage_path:  storagePath,
      descricao:     descricao || null,
    })
    .select('id, tipo, nome_arquivo, tamanho_bytes, mime_type, descricao, storage_path, criado_em')
    .single()

  if (dbErr) {
    try { const { deletarDocumento: del } = await import('@/lib/storage'); await del(storagePath) } catch { /* ignora */ }
    return NextResponse.json({ error: 'Erro ao salvar metadados.' }, { status: 500 })
  }

  const url = await gerarUrlAssinada(storagePath).catch(() => '')

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
