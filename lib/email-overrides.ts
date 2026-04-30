// Funções SERVER-ONLY (usam service_role). Não importar em 'use client'.
// Para constantes seguras (slugs, vars, labels), importe de
// '@/lib/email-templates-meta' direto.

import { createAdminSupabaseClient } from './supabase-admin'
import { EMAIL_SLUGS, type EmailSlug } from './email-templates-meta'

export { EMAIL_SLUGS, type EmailSlug } from './email-templates-meta'
export { TEMPLATE_VARS, TEMPLATE_LABELS } from './email-templates-meta'

export type EmailOverrideRow = {
  slug: string
  enabled: boolean
  subject_override: string | null
  html_override: string | null
  updated_at: string | null
  updated_by: string | null
}

// Cache em memória para reduzir hits no DB durante o dispatch de emails
type CacheEntry = { row: EmailOverrideRow | null; expires: number }
const cache = new Map<EmailSlug, CacheEntry>()
const TTL_MS = 60_000 // 1 minuto

export async function getEmailOverride(slug: EmailSlug): Promise<EmailOverrideRow | null> {
  const cached = cache.get(slug)
  if (cached && cached.expires > Date.now()) return cached.row

  try {
    const admin = createAdminSupabaseClient()
    const { data } = await admin
      .from('email_template_overrides')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    const row = (data as EmailOverrideRow | null) ?? null
    cache.set(slug, { row, expires: Date.now() + TTL_MS })
    return row
  } catch {
    return null
  }
}

// Substitui {{var}} no template
export function applyVars(tpl: string, vars: Record<string, string | number | null | undefined>): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key]
    if (v === null || v === undefined) return ''
    return String(v)
  })
}

// Resolve template final: aplica override se houver, ou usa defaults.
// Retorna null se template estiver desabilitado.
export async function resolveTemplate(
  slug: EmailSlug,
  defaults: { subject: string; html: string },
  vars: Record<string, string | number | null | undefined>,
): Promise<{ subject: string; html: string } | null> {
  const override = await getEmailOverride(slug)
  if (override && override.enabled === false) return null

  const subject = override?.subject_override
    ? applyVars(override.subject_override, vars)
    : defaults.subject

  const html = override?.html_override
    ? applyVars(override.html_override, vars)
    : defaults.html

  return { subject, html }
}

export function clearEmailOverridesCache() {
  cache.clear()
}

// Validação simples para uso em server actions
export function isValidEmailSlug(slug: string): slug is EmailSlug {
  return (EMAIL_SLUGS as readonly string[]).includes(slug)
}
