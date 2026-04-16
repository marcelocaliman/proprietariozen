import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { sanitizarNomeArquivo, STORAGE_MAX_BYTES, STORAGE_MIME_ACEITOS, BUCKET } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const TIPOS_VALIDOS = ['rg', 'cpf', 'cnh', 'comprovante_renda', 'comprovante_residencia', 'outro']
const MAX_DOCS_INQUILINO = 10

type Params = { params: Promise<{ inquilinoId: string }> }

async function verificarOwnership(inquilinoId: string, userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('inquilinos')
    .select('id, user_id')
    .eq('id', inquilinoId)
    .single()
  return data?.user_id === userId
}

// GET — gera URL assinada para upload direto ao Supabase Storage
export async function GET(req: NextRequest, { params }: Params) {
  const { inquilinoId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const ok = await verificarOwnership(inquilinoId, user.id)
  if (!ok) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const admin = createAdminClient()
  const { count } = await admin
    .from('documentos_inquilino')
    .select('id', { count: 'exact', head: true })
    .eq('inquilino_id', inquilinoId)
  if ((count ?? 0) >= MAX_DOCS_INQUILINO) {
    return NextResponse.json(
      { error: `Limite de ${MAX_DOCS_INQUILINO} documentos por inquilino atingido.` },
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
  const storagePath = `usuarios/${user.id}/inquilinos/${inquilinoId}/${Date.now()}_${nomeSeguro}`

  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(storagePath)
  if (error || !data?.signedUrl)
    return NextResponse.json({ error: 'Erro ao gerar URL de upload.' }, { status: 500 })

  return NextResponse.json({ signedUrl: data.signedUrl, path: storagePath })
}
