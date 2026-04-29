'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'
import { setSystemSetting, type SystemSettingKey, type SystemSettings } from '@/lib/system-settings'
import { registrarLog } from '@/lib/log'

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }
  const ok = await isAdmin(user.id)
  if (!ok) return { error: 'Acesso negado' }
  return { userId: user.id }
}

export async function atualizarSetting<K extends SystemSettingKey>(
  key: K,
  value: SystemSettings[K],
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createAdminClient()
  const result = await setSystemSetting(admin, key, value, auth.userId)
  if (result.error) return result

  await registrarLog(auth.userId, 'ADMIN_SETTING_UPDATED', 'system_settings', key, {
    key,
    value,
  })

  revalidatePath('/admin/configuracoes')
  revalidatePath('/dashboard')
  revalidatePath('/')
  return {}
}

export async function executarCronAlertas(): Promise<{ error?: string; result?: unknown }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const secret = process.env.CRON_SECRET
  if (!secret) return { error: 'CRON_SECRET não configurado' }

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://proprietariozen.com.br'}/api/cron/alertas`
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error ?? 'Erro ao executar' }

    await registrarLog(auth.userId, 'ADMIN_CRON_TRIGGERED', 'cron', 'alertas', { result: data })
    revalidatePath('/admin/configuracoes')
    return { result: data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Falha na requisição' }
  }
}

export async function executarCronGerarAlugueis(): Promise<{ error?: string; result?: unknown }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const secret = process.env.CRON_SECRET
  if (!secret) return { error: 'CRON_SECRET não configurado' }

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://proprietariozen.com.br'}/api/cron/gerar-alugueis`
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error ?? 'Erro ao executar' }

    await registrarLog(auth.userId, 'ADMIN_CRON_TRIGGERED', 'cron', 'gerar-alugueis', { result: data })
    revalidatePath('/admin/configuracoes')
    return { result: data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Falha na requisição' }
  }
}
