import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type SystemSettingKey =
  | 'maintenance_mode'
  | 'global_banner'
  | 'announcement_free'
  | 'announcement_master'
  | 'announcement_elite'
  | 'support_templates'

export type MaintenanceMode = {
  enabled: boolean
  message?: string
}

export type GlobalBanner = {
  enabled: boolean
  text: string
  color: 'emerald' | 'amber' | 'red' | 'blue'
  link?: string
  link_label?: string
}

export type Announcement = {
  enabled: boolean
  text: string
  link?: string
  link_label?: string
}

export type SupportTemplate = {
  titulo: string
  conteudo: string
}

export type SupportTemplates = {
  items: SupportTemplate[]
}

export type SystemSettings = {
  maintenance_mode: MaintenanceMode
  global_banner: GlobalBanner
  announcement_free: Announcement
  announcement_master: Announcement
  announcement_elite: Announcement
  support_templates: SupportTemplates
}

const DEFAULTS: SystemSettings = {
  maintenance_mode: { enabled: false, message: '' },
  global_banner: { enabled: false, text: '', color: 'amber' },
  announcement_free: { enabled: false, text: '' },
  announcement_master: { enabled: false, text: '' },
  announcement_elite: { enabled: false, text: '' },
  support_templates: {
    items: [
      {
        titulo: 'Recebido — vamos analisar',
        conteudo: 'Oi! Recebemos sua solicitação e já estamos analisando. Volto aqui em breve com novidades. Obrigado pela paciência.',
      },
      {
        titulo: 'Pedindo mais detalhes',
        conteudo: 'Pra ajudar melhor, você poderia me passar:\n\n1. Em que página/tela isso aconteceu?\n2. Que mensagem de erro apareceu (se alguma)?\n3. Se possível, um print da tela.\n\nAssim que tiver isso, sigo com a investigação.',
      },
      {
        titulo: 'Bug confirmado — em correção',
        conteudo: 'Confirmamos o problema, é um bug do nosso lado. A correção já está em andamento e te aviso assim que for ao ar. Obrigado por reportar!',
      },
      {
        titulo: 'Resolvido — pode testar?',
        conteudo: 'Tudo certo, deve estar funcionando agora. Você consegue testar e me confirmar? Qualquer coisa, é só responder aqui que reabrimos.',
      },
    ],
  },
}

/** Carrega todas as configurações de sistema, com defaults para chaves não setadas. */
export async function getSystemSettings(admin: SupabaseClient): Promise<SystemSettings> {
  try {
    const { data } = await admin
      .from('system_settings')
      .select('key, value')

    const result = { ...DEFAULTS }
    for (const row of data ?? []) {
      const key = row.key as keyof SystemSettings
      if (key in result) {
        result[key] = { ...result[key], ...(row.value as object) } as never
      }
    }
    return result
  } catch {
    return DEFAULTS
  }
}

/** Atualiza uma configuração específica. */
export async function setSystemSetting<K extends SystemSettingKey>(
  admin: SupabaseClient,
  key: K,
  value: SystemSettings[K],
  userId: string,
): Promise<{ error?: string }> {
  const { error } = await admin
    .from('system_settings')
    .upsert({
      key,
      value: value as Record<string, unknown>,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }, { onConflict: 'key' })

  if (error) return { error: error.message }
  return {}
}
