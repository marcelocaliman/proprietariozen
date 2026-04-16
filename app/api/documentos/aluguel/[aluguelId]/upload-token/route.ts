import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { sanitizarNomeArquivo, STORAGE_MAX_BYTES, STORAGE_MIME_ACEITOS, BUCKET } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const TIPOS_VALIDOS = ['contrato', 'laudo_entrada', 'laudo_saida', 'comprovante', 'foto', 'outro']
const MAX_DOCS_ALUGUEL = 20

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

// GET — gera URL assinada para upload direto ao Supabase Storage (sem passar pelo Next.js)
export async function GET(req: NextRequest, { params }: Params) {
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

  const { searchParams } = new URL(req.url)
  const filename = searchParams.get('filename') ?? 'file'
  const mimeType = searchParams.get('mimeType') ?? ''
  const size     = parseInt(searchParams.get('size') ?? '0', 10)
  const tipo     = searchParams.get('tipo') ?? ''

  if (!tipo || !TIPOS_VALIDOS.includes(tipo))
    return NextResponse.json({ error: 'Tipo de documento inválido.' }, { status: 422 })
  if (size > STORAGE_MAX_BYTES)
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10 MB.' }, { status: 422 })
  if (!STORAGE_MIME_ACEITOS.includes(mimeType))
    return NextResponse.json(
      { error: `Tipo não permitido (${mimeType}). Use PDF, JPG ou PNG.` },
      { status: 422 },
    )

  const nomeSeguro  = sanitizarNomeArquivo(filename)
  const storagePath = `usuarios/${user.id}/alugueis/${aluguelId}/${Date.now()}_${nomeSeguro}`

  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(storagePath)
  if (error || !data?.signedUrl)
    return NextResponse.json({ error: 'Erro ao gerar URL de upload.' }, { status: 500 })

  return NextResponse.json({ signedUrl: data.signedUrl, path: storagePath })
}
