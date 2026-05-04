'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Send, X, Lock, Shield, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { responderTicket, fecharTicket } from '@/app/(dashboard)/suporte/actions'
import { responderTicketAdmin } from '@/app/admin/suporte/actions'
import { formatDataHora } from './format'
import type { TicketStatus } from '@/lib/suporte'

type Mensagem = {
  id: string
  autor_id: string | null
  autor_role: 'user' | 'admin'
  conteudo: string
  is_nota_interna: boolean
  criado_em: string
}

interface Props {
  ticketId: string
  ticketStatus: TicketStatus
  mensagens: Mensagem[]
  currentUserId: string
  isAdminView: boolean
}

export function TicketThread({
  ticketId, ticketStatus, mensagens, currentUserId, isAdminView,
}: Props) {
  const [conteudo, setConteudo]    = useState('')
  const [notaInterna, setNotaInterna] = useState(false)
  const [pending, startResponder]  = useTransition()
  const [pendingFechar, startFechar] = useTransition()

  const fechado = ticketStatus === 'fechado'

  function handleResponder(e: React.FormEvent) {
    e.preventDefault()
    const texto = conteudo.trim()
    if (texto.length < 1) return

    startResponder(async () => {
      const result = isAdminView
        ? await responderTicketAdmin({ ticketId, conteudo: texto, isNotaInterna: notaInterna })
        : await responderTicket({ ticketId, conteudo: texto })
      if (result.error) { toast.error(result.error); return }
      setConteudo('')
      setNotaInterna(false)
      toast.success(notaInterna ? 'Nota interna salva.' : 'Resposta enviada.')
    })
  }

  function handleFechar() {
    if (!confirm('Fechar este ticket? Você pode abrir um novo se precisar.')) return
    startFechar(async () => {
      const result = await fecharTicket(ticketId)
      if (result.error) { toast.error(result.error); return }
      toast.success('Ticket fechado.')
    })
  }

  return (
    <div className="space-y-3">
      {/* Thread */}
      <div className="space-y-2">
        {mensagens.map(m => (
          <Mensagem key={m.id} m={m} currentUserId={currentUserId} />
        ))}
      </div>

      {/* Composer / fechado */}
      {fechado ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/40 px-5 py-4 text-center">
          <Lock className="h-4 w-4 text-slate-400 mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-slate-600">Ticket fechado</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Abra um novo ticket se precisar continuar a conversa.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleResponder}
          className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3"
        >
          <textarea
            value={conteudo}
            onChange={e => setConteudo(e.target.value)}
            placeholder={
              isAdminView
                ? (notaInterna ? 'Nota interna (só admins veem)…' : 'Responda para o usuário…')
                : 'Digite sua resposta…'
            }
            rows={4}
            maxLength={5000}
            className={cn(
              'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 leading-relaxed',
              notaInterna ? 'focus:ring-amber-500/30 bg-amber-50/30' : 'focus:ring-emerald-500/30',
            )}
            disabled={pending}
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {isAdminView && (
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notaInterna}
                    onChange={e => setNotaInterna(e.target.checked)}
                    className="rounded"
                  />
                  <Lock className="h-3 w-3" />
                  Nota interna
                </label>
              )}
              {!isAdminView && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleFechar}
                  disabled={pendingFechar}
                  className="text-xs text-slate-500 hover:text-red-600 gap-1"
                >
                  {pendingFechar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  Marcar como resolvido
                </Button>
              )}
            </div>
            <Button
              type="submit"
              disabled={pending || conteudo.trim().length < 1}
              size="sm"
              className={cn(
                'gap-1.5 text-sm font-semibold',
                notaInterna ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700',
              )}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {notaInterna ? 'Salvar nota' : 'Enviar resposta'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function Mensagem({ m, currentUserId }: { m: Mensagem; currentUserId: string }) {
  const isMine = m.autor_id === currentUserId
  const isAdmin = m.autor_role === 'admin'
  const isNota = m.is_nota_interna

  return (
    <div className={cn('flex gap-3', isMine && 'flex-row-reverse')}>
      <div className={cn(
        'shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold border',
        isAdmin
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-600 border-slate-200',
      )}>
        {isAdmin ? <Shield className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
      </div>
      <div className={cn(
        'flex-1 min-w-0 max-w-[85%] rounded-2xl border px-4 py-3 shadow-sm',
        isNota
          ? 'border-amber-200 bg-amber-50/60'
          : isAdmin
            ? 'border-emerald-100 bg-emerald-50/40'
            : 'border-slate-100 bg-white',
      )}>
        <div className={cn('flex items-center gap-2 mb-1.5', isMine && 'flex-row-reverse')}>
          <p className="text-[11px] font-semibold text-slate-700">
            {isAdmin ? 'Suporte' : 'Você'}
          </p>
          {isNota && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
              <Lock className="h-2.5 w-2.5" /> Nota interna
            </span>
          )}
          <span className="text-[10px] text-slate-400 ml-auto whitespace-nowrap">
            {formatDataHora(m.criado_em)}
          </span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
          {m.conteudo}
        </p>
      </div>
    </div>
  )
}
