'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Send, Lock, Shield, User, FileText, ChevronDown, MessageSquare, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { responderTicket, fecharTicket } from '@/app/(dashboard)/suporte/actions'
import { responderTicketAdmin } from '@/app/admin/suporte/actions'
import { formatDataHora } from './format'
import type { TicketStatus } from '@/lib/suporte'
import type { SupportTemplate } from '@/lib/system-settings'

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
  templates?: SupportTemplate[]
  // Nome a mostrar nas mensagens do user (admin view precisa, user view nao)
  userNome?: string | null
}

export function TicketThread({
  ticketId, ticketStatus, mensagens, currentUserId, isAdminView, templates, userNome,
}: Props) {
  const [conteudo, setConteudo]    = useState('')
  const [notaInterna, setNotaInterna] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
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
    if (!confirm('Marcar como resolvido? Você ainda pode reabrir respondendo de novo.')) return
    startFechar(async () => {
      const result = await fecharTicket(ticketId)
      if (result.error) { toast.error(result.error); return }
      toast.success('Ticket fechado.')
    })
  }

  return (
    <div className="space-y-4">
      {/* Thread */}
      <div className="space-y-3">
        {mensagens.map((m, idx) => (
          <Mensagem
            key={m.id}
            m={m}
            currentUserId={currentUserId}
            userNome={userNome}
            isFirst={idx === 0}
          />
        ))}
      </div>

      {/* Composer / fechado */}
      {fechado ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8 text-center">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-slate-200 mb-3">
            <CheckCircle2 className="h-5 w-5 text-slate-500" />
          </div>
          <p className="text-sm font-bold text-slate-700">Ticket fechado</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Caso precise continuar a conversa, abra um novo ticket.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleResponder}
          className={cn(
            'rounded-2xl border bg-white shadow-sm overflow-hidden',
            notaInterna ? 'border-amber-200' : 'border-slate-200',
          )}
        >
          {/* Header do composer */}
          <div className={cn(
            'px-5 py-3 border-b flex items-center justify-between',
            notaInterna ? 'border-amber-100 bg-amber-50/40' : 'border-slate-100 bg-slate-50/40',
          )}>
            <div className="flex items-center gap-2">
              <div className={cn(
                'h-7 w-7 rounded-lg flex items-center justify-center',
                notaInterna ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
              )}>
                {notaInterna ? <Lock className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
              </div>
              <p className="text-sm font-bold text-slate-900">
                {isAdminView
                  ? (notaInterna ? 'Nota interna (privada)' : 'Responder ao usuário')
                  : 'Sua resposta'}
              </p>
            </div>
            {isAdminView && templates && templates.length > 0 && (
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplatesOpen(o => !o)}
                  className="text-xs gap-1 h-7"
                >
                  <FileText className="h-3 w-3" />
                  Template
                  <ChevronDown className="h-3 w-3" />
                </Button>
                {templatesOpen && (
                  <div className="absolute top-full mt-1 right-0 w-80 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl z-10">
                    {templates.map((t, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setConteudo(prev => (prev ? prev + '\n\n' : '') + t.conteudo)
                          setTemplatesOpen(false)
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
                        <p className="text-xs font-bold text-slate-900">{t.titulo}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{t.conteudo}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <textarea
            value={conteudo}
            onChange={e => setConteudo(e.target.value)}
            placeholder={
              isAdminView
                ? (notaInterna ? 'Anote algo só para o time…' : 'Escreva uma resposta clara e útil…')
                : 'Escreva sua resposta com o máximo de detalhes possível…'
            }
            rows={5}
            maxLength={5000}
            className={cn(
              'w-full px-5 py-4 text-sm bg-white focus:outline-none leading-relaxed resize-none',
              notaInterna && 'bg-amber-50/20',
            )}
            disabled={pending}
          />

          <div className={cn(
            'px-5 py-3 border-t flex items-center justify-between gap-3 flex-wrap',
            notaInterna ? 'border-amber-100 bg-amber-50/30' : 'border-slate-100 bg-slate-50/40',
          )}>
            <div className="flex items-center gap-3">
              {isAdminView && (
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notaInterna}
                    onChange={e => setNotaInterna(e.target.checked)}
                    className="rounded h-3.5 w-3.5 cursor-pointer"
                  />
                  <Lock className="h-3 w-3" />
                  Nota interna
                </label>
              )}
              <p className="text-[10px] text-slate-400 tabular-nums">{conteudo.length}/5000</p>
            </div>
            <div className="flex items-center gap-2">
              {!isAdminView && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleFechar}
                  disabled={pendingFechar || pending}
                  className="text-xs text-slate-500 hover:text-emerald-700 gap-1"
                >
                  {pendingFechar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Marcar como resolvido
                </Button>
              )}
              <Button
                type="submit"
                disabled={pending || conteudo.trim().length < 1}
                className={cn(
                  'gap-1.5 text-sm font-semibold h-9 px-4',
                  notaInterna ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700',
                )}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {notaInterna ? 'Salvar nota' : 'Enviar resposta'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

function Mensagem({
  m, currentUserId, userNome,
}: {
  m: Mensagem; currentUserId: string; userNome?: string | null; isFirst: boolean
}) {
  const isMine = m.autor_id === currentUserId
  const isAdmin = m.autor_role === 'admin'
  const isNota = m.is_nota_interna

  // Nome a exibir
  const nomeAutor = isAdmin ? 'Suporte' : (userNome ?? 'Usuário')
  const initials = isAdmin
    ? 'SP'
    : (userNome ?? 'US').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className={cn('flex gap-3', isMine && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={cn(
        'shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-[11px] font-bold border',
        isAdmin
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : isMine
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-slate-100 text-slate-700 border-slate-200',
      )}>
        {isAdmin ? <Shield className="h-4 w-4" /> : (isMine ? <User className="h-4 w-4" /> : initials)}
      </div>

      {/* Bubble */}
      <div className={cn(
        'flex-1 min-w-0 max-w-[85%] rounded-2xl border shadow-sm overflow-hidden',
        isNota
          ? 'border-amber-200 bg-amber-50'
          : isAdmin
            ? 'border-emerald-100 bg-white'
            : 'border-slate-200 bg-white',
      )}>
        {/* Header da mensagem */}
        <div className={cn(
          'px-4 py-2 border-b flex items-center justify-between gap-2 text-xs',
          isNota
            ? 'border-amber-200 bg-amber-100/40'
            : isAdmin
              ? 'border-emerald-100 bg-emerald-50/50'
              : 'border-slate-100 bg-slate-50/40',
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              'font-bold truncate',
              isAdmin ? 'text-emerald-800' : 'text-slate-800',
            )}>
              {nomeAutor}
            </span>
            {isAdmin && !isNota && (
              <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wide bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">
                Suporte
              </span>
            )}
            {isNota && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                <Lock className="h-2.5 w-2.5" /> Nota interna
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
            {formatDataHora(m.criado_em)}
          </span>
        </div>

        {/* Conteúdo */}
        <div className="px-4 py-3">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
            {m.conteudo}
          </p>
        </div>
      </div>
    </div>
  )
}
