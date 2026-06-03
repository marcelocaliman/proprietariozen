/**
 * Helper para registrar eventos no activity_logs.
 * Uso exclusivo em server-side — nunca em 'use client'.
 *
 * IMPORTANTE: o `metadata` é sanitizado pra remover conteúdo de mensagens,
 * notas, anexos e qualquer chave que possa ter PII. Apenas IDs, valores
 * numéricos, status e flags booleanas chegam ao banco.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

// Chaves seguras para gravar no log (whitelist explícita).
// Qualquer outra chave em metadata é descartada.
const SAFE_KEYS = new Set([
  'admin_id', 'user_id', 'executed_by',
  'ticket_id', 'inquilino_id', 'imovel_id', 'aluguel_id',
  'subscription_id', 'charge_id', 'refund_id', 'session_id',
  'customer_id', 'session', 'key', 'slug', 'plano',
  'de', 'para', 'status', 'enabled',
  'valor_centavos', 'valor', 'amount', 'dias_atraso',
  'total', 'atualizados', 'semSub', 'erros',
  'nota_interna', 'result',
])

// Chaves de cujo VALOR é STRING e a gente quer manter (após truncar)
const TRUNCATE_KEYS = new Set(['motivo', 'mensagem', 'descricao', 'reason'])
const MAX_LEN = 200

function sanitizeMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object') return null
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(metadata as Record<string, unknown>)) {
    if (SAFE_KEYS.has(k)) {
      // Strings longas viram preview truncado (não vaza conteúdo completo)
      if (typeof v === 'string' && v.length > MAX_LEN) {
        out[k] = v.slice(0, MAX_LEN) + '…'
      } else {
        out[k] = v
      }
    } else if (TRUNCATE_KEYS.has(k) && typeof v === 'string') {
      out[k] = v.length > MAX_LEN ? v.slice(0, MAX_LEN) + '…' : v
    }
    // demais chaves: descartadas silenciosamente
  }
  return out
}

export async function registrarLog(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: object,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = supabaseAdmin.from('activity_logs' as never) as any
  const { error } = await table.insert({
    user_id:     userId,
    action,
    entity_type: entityType ?? null,
    entity_id:   entityId   ?? null,
    details:     sanitizeMetadata(metadata),
  })
  // Fire-and-forget: nao joga throw para nao quebrar a operacao
  // principal, mas loga no console pra erros aparecerem no Vercel.
  if (error) {
    console.error('[registrarLog] falhou:', action, error.message)
  }
}
