'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { registrarLog } from '@/lib/log'
import type { ContratoInput } from '@/app/(dashboard)/imoveis/actions'

/** Revoga todos os tokens ativos de um inquilino (usa admin para bypassar RLS). */
async function revogarTokensInquilino(inquilinoId: string) {
  const admin = createAdminClient()
  await admin
    .from('inquilino_tokens')
    .update({ ativo: false })
    .eq('inquilino_id', inquilinoId)
    .eq('ativo', true)
}

export type InquilinoInput = {
  imovel_id: string
  nome: string
  telefone: string | null
  email: string | null
  cpf: string | null
}

export async function criarInquilino(input: InquilinoInput): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: inserted, error } = await supabase
    .from('inquilinos')
    .insert({ user_id: user.id, ...input })
    .select('id')
    .single()
  if (error) return { error: error.message }
  await registrarLog(user.id, 'INQUILINO_CRIADO', 'inquilino', inserted?.id, { nome: input.nome })
  revalidatePath('/inquilinos')
  revalidatePath('/imoveis')
  return {}
}

export async function criarInquilinoComContrato(
  inquilinoInput: InquilinoInput,
  contratoInput: ContratoInput,
): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: inserted, error } = await supabase
    .from('inquilinos')
    .insert({ user_id: user.id, ...inquilinoInput })
    .select('id')
    .single()
  if (error) return { error: error.message }

  const { error: errContrato } = await supabase
    .from('imoveis')
    .update(contratoInput)
    .eq('id', inquilinoInput.imovel_id)
    .eq('user_id', user.id)
  if (errContrato) return { error: errContrato.message }

  await registrarLog(user.id, 'INQUILINO_CRIADO', 'inquilino', inserted?.id, { nome: inquilinoInput.nome })
  revalidatePath('/inquilinos')
  revalidatePath('/imoveis')
  revalidatePath('/dashboard')
  return {}
}

export async function editarInquilino(id: string, input: InquilinoInput): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Verifica se o imóvel está sendo alterado (inquilino sai do imóvel atual)
  const { data: atual } = await supabase
    .from('inquilinos')
    .select('imovel_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from('inquilinos')
    .update(input)
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  // Se o imóvel mudou, revoga tokens — o link antigo não faz mais sentido
  if (atual && atual.imovel_id !== input.imovel_id) {
    await revogarTokensInquilino(id)
  }

  revalidatePath('/inquilinos')
  revalidatePath('/imoveis')
  return {}
}

export async function desativarInquilino(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('inquilinos')
    .update({ ativo: false })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  // Revoga tokens de acesso público ao desativar o inquilino
  await revogarTokensInquilino(id)

  revalidatePath('/inquilinos')
  revalidatePath('/imoveis')
  return {}
}

/**
 * Desvincula um inquilino do imóvel.
 * - Marca ativo=false
 * - Revoga tokens de acesso
 * - Opcionalmente remove cobranças futuras pendentes/atrasadas (mês corrente é mantido)
 *
 * Mantém imovel_id e o histórico todo. O cadastro do inquilino fica salvo
 * pra eventualmente ser reaproveitado em outro imóvel via "Editar inquilino".
 */
export async function desvincularInquilino(
  id: string,
  opcoes: { encerrarCobrancasFuturas: boolean },
): Promise<{ error?: string; cobrancasRemovidas?: number }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Carrega inquilino + imovel pra log
  const { data: inq } = await supabase
    .from('inquilinos')
    .select('nome, imovel_id, imovel:imoveis(apelido)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!inq) return { error: 'Inquilino não encontrado' }

  // 1. Desativa
  const { error: errUpdate } = await supabase
    .from('inquilinos')
    .update({ ativo: false })
    .eq('id', id)
    .eq('user_id', user.id)
  if (errUpdate) return { error: errUpdate.message }

  // 2. Revoga tokens
  await revogarTokensInquilino(id)

  // 3. Opcionalmente, remove cobranças futuras pendentes/atrasadas
  let cobrancasRemovidas = 0
  if (opcoes.encerrarCobrancasFuturas && inq.imovel_id) {
    const admin = createAdminClient()
    const hoje = new Date()
    const mesAtualRef = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`

    const { data: aRemover } = await admin
      .from('alugueis')
      .select('id')
      .eq('imovel_id', inq.imovel_id)
      .in('status', ['pendente', 'atrasado'])
      .gt('mes_referencia', mesAtualRef)

    if (aRemover && aRemover.length > 0) {
      const ids = aRemover.map(a => a.id)
      const { error: errDel } = await admin.from('alugueis').delete().in('id', ids)
      if (errDel) return { error: errDel.message }
      cobrancasRemovidas = ids.length
    }
  }

  await registrarLog(user.id, 'INQUILINO_DESVINCULADO', 'inquilino', id, {
    nome: inq.nome,
    encerrou_cobrancas: opcoes.encerrarCobrancasFuturas,
    cobrancas_removidas: cobrancasRemovidas,
  })

  revalidatePath('/inquilinos')
  revalidatePath(`/inquilinos/${id}`)
  revalidatePath('/imoveis')
  if (inq.imovel_id) revalidatePath(`/imoveis/${inq.imovel_id}`)
  revalidatePath('/dashboard')
  return { cobrancasRemovidas }
}

// Exclui inquilino permanentemente APENAS se não houver aluguéis
// vinculados. Caso contrário, sugere desativar/desvincular.
export async function excluirInquilino(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: inq } = await supabase
    .from('inquilinos')
    .select('id, nome, imovel_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!inq) return { error: 'Inquilino não encontrado.' }

  // Bloqueia se há QUALQUER aluguel com inquilino_id = id
  const { count: countAlugueis } = await supabase
    .from('alugueis')
    .select('id', { count: 'exact', head: true })
    .eq('inquilino_id', id)
  if ((countAlugueis ?? 0) > 0) {
    return {
      error: `Esse inquilino tem ${countAlugueis} aluguel(éis) no histórico e não pode ser excluído. Use "Desativar" para mantê-lo no histórico ou "Desvincular" para liberá-lo do imóvel.`,
    }
  }

  const admin = createAdminClient()

  // 1. Documentos do inquilino (storage + linhas)
  const { data: docs } = await admin
    .from('documentos_inquilino')
    .select('id, storage_path')
    .eq('inquilino_id', id)
  if (docs && docs.length > 0) {
    const paths = docs.map(d => d.storage_path).filter(Boolean) as string[]
    if (paths.length > 0) {
      await admin.storage.from('documentos-inquilino').remove(paths)
    }
    await admin.from('documentos_inquilino').delete().eq('inquilino_id', id)
  }

  // 2. Tokens
  await admin.from('inquilino_tokens').delete().eq('inquilino_id', id)

  // 3. Inquilino
  const { error: errDel } = await admin
    .from('inquilinos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (errDel) return { error: errDel.message }

  await registrarLog(user.id, 'INQUILINO_EXCLUIDO', 'inquilino', id, { nome: inq.nome })

  revalidatePath('/inquilinos')
  revalidatePath('/imoveis')
  if (inq.imovel_id) revalidatePath(`/imoveis/${inq.imovel_id}`)
  revalidatePath('/dashboard')
  return {}
}
