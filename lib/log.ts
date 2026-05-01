/**
 * Helper para registrar eventos no activity_logs.
 * Uso exclusivo em server-side — nunca em 'use client'.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

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
    details:     metadata   ?? null,
  })
  // Fire-and-forget: nao joga throw para nao quebrar a operacao
  // principal, mas loga no console pra erros aparecerem no Vercel.
  if (error) {
    console.error('[registrarLog] falhou:', action, error.message)
  }
}
