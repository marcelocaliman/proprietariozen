'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Send, Lock, Shield, FileText, ChevronDown, CheckCircle2 } from 'lucide-react'
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
    <div className="space-y-0">
      {/* Feed de mensagens estilo Linear/Intercom */}
      <div className="divide-y divide-slate-100">
        {mensagens.map(m => (
          <Mensagem
            key={m.id}
            m={m}
            currentUserId={currentUserId}
            userNome={userNome}
          />
        ))}
      </div>

      {/* Composer */}
      {fechado ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-6 py-6 text-center">
          <CheckCircle2 className="h-5 w-5 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Ticket fechado</p>
          <p className="text-xs text-slate-500 mt-1">
            Caso precise continuar a conversa, abra um novo ticket.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleResponder}
          className={cn(
            'mt-6 rounded-xl border bg-white shadow-sm transition-colors',
            notaInterna ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100',
          )}
        >
          <textarea
            value={conteudo}
            onChange={e => setConteudo(e.target.value)}
            placeholder={
              isAdminView
                ? (notaInterna ? 'Anotação privada (apenas admins veem)…' : 'Responda ao usuário…')
                : 'Escreva sua resposta…'
            }
            rows={4}
            maxLength={5000}
            className={cn(
              'w-full px-4 py-3 text-sm bg-transparent focus:outline-none leading-relaxed resize-none rounded-t-xl',
              notaInterna && 'bg-amber-50/30',
            )}
            disabled={pending}
          />

          <div className={cn(
            'px-3 py-2 border-t flex items-center justify-between gap-2 flex-wrap',
            notaInterna ? 'border-amber-200 bg-amber-50/40' : 'border-slate-100 bg-slate-50/40',
          )}>
            <div className="flex items-center gap-2">
              {isAdminView && (
                <button
                  type="button"
                  onClick={() => setNotaInterna(v => !v)}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-colors',
                    notaInterna
                      ? 'bg-amber-200 text-amber-900 hover:bg-amber-300'
                      : 'text-slate-500 hover:bg-slate-200/60',
                  )}
                >
                  <Lock className="h-3 w-3" />
                  Nota interna
                </button>
              )}
              {isAdminView && templates && templates.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTemplatesOpen(o => !o)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md text-slate-500 hover:bg-slate-200/60 transition-colors"
                  >
                    <FileText className="h-3 w-3" />
                    Template
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {templatesOpen && (
                    <div className="absolute bottom-full mb-1 left-0 w-80 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl z-10">
                      {templates.map((t, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setConteudo(prev => (prev ? prev + '\n\n' : '') + t.conteudo)
                            setTemplatesOpen(false)
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        >
                          <p className="text-xs font-bold text-slate-900">{t.titulo}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{t.conteudo}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!isAdminView && (
                <button
                  type="button"
                  onClick={handleFechar}
                  disabled={pendingFechar || pending}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  {pendingFechar ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  Marcar como resolvido
                </button>
              )}
              <p className="text-[10px] text-slate-400 tabular-nums ml-1">{conteudo.length}/5000</p>
            </div>
            <Button
              type="submit"
              disabled={pending || conteudo.trim().length < 1}
              size="sm"
              className={cn(
                'gap-1.5 text-xs font-semibold h-8 px-4',
                notaInterna ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700',
              )}
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {notaInterna ? 'Salvar nota' : 'Enviar'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function Mensagem({
  m, currentUserId, userNome,
}: {
  m: Mensagem
  currentUserId: string
  userNome?: string | null
}) {
  const isMine = m.autor_id === currentUserId
  const isAdmin = m.autor_role === 'admin'
  const isNota = m.is_nota_interna

  const nomeAutor = isAdmin ? 'Suporte ProprietárioZen' : (userNome ?? 'Usuário')
  const initials = isAdmin
    ? 'SP'
    : (userNome ?? 'US').split(' ').filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase()

  const meuLabel = isMine ? ' (você)' : ''

  return (
    <div className={cn(
      'flex gap-3 py-4 first:pt-0',
      isNota && '-mx-3 px-3 bg-amber-50/50 rounded-md',
    )}>
      {/* Avatar pequeno */}
      <div className={cn(
        'shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold border',
        isAdmin
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-700 border-slate-200',
      )}>
        {isAdmin ? <Shield className="h-3.5 w-3.5" /> : initials}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-semibold text-slate-900">
            {nomeAutor}{meuLabel}
          </span>
          {isAdmin && !isNota && (
            <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
              Suporte
            </span>
          )}
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
