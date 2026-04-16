import { createAdminClient } from '@/lib/supabase-server'

export const BUCKET = 'documentos'
export const STORAGE_MAX_BYTES = 10 * 1024 * 1024 // 10 MB
export const STORAGE_MIME_ACEITOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

// ── Utilitários ───────────────────────────────────────────────────────────────

export function formatarTamanho(bytes: number): string {
  if (bytes >= 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

export function sanitizarNomeArquivo(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
}

// ── Storage helpers (server-side only) ───────────────────────────────────────

/**
 * Faz upload de um arquivo para o bucket "documentos".
 * Retorna o storage_path do arquivo salvo.
 * Lança erro descritivo se tipo inválido ou maior que 10 MB.
 */
export async function uploadDocumento(
  fileBody: File | Blob | ArrayBuffer,
  path: string,
  mimeType: string,
  sizeBytes: number,
): Promise<string> {
  if (sizeBytes > STORAGE_MAX_BYTES)
    throw new Error('Arquivo muito grande. Máximo 10MB.')
  if (!STORAGE_MIME_ACEITOS.includes(mimeType))
    throw new Error('Tipo de arquivo não permitido. Use PDF, JPG ou PNG.')

  const admin = createAdminClient()
  const { error } = await admin.storage.from(BUCKET).upload(path, fileBody, {
    contentType: mimeType,
    upsert: false,
  })
  if (error) throw new Error(`Falha ao fazer upload: ${error.message}`)
  return path
}

/**
 * Gera URL temporária assinada (padrão: 1 hora).
 * Usa admin client para bypassar RLS.
 */
export async function gerarUrlAssinada(
  storagePath: string,
  expiresIn = 3600,
): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn)
  if (error || !data?.signedUrl)
    throw new Error('Falha ao gerar URL assinada.')
  return data.signedUrl
}

/**
 * Remove o arquivo do Storage.
 * Não lança erro se o arquivo não existir.
 */
export async function deletarDocumento(storagePath: string): Promise<void> {
  const admin = createAdminClient()
  await admin.storage.from(BUCKET).remove([storagePath])
}
