// Helper server-only para criar notificações in-app.
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function criarNotificacao(input: {
  userId: string
  tipo: string
  titulo: string
  mensagem?: string
  link?: string
}): Promise<void> {
  const { error } = await supabaseAdmin
    .from('notificacoes')
    .insert({
      user_id:  input.userId,
      tipo:     input.tipo,
      titulo:   input.titulo,
      mensagem: input.mensagem ?? null,
      link:     input.link ?? null,
    })
  if (error) console.error('[criarNotificacao] falhou:', input.tipo, error.message)
}
