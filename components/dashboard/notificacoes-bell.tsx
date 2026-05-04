'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { Bell, Check, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { marcarNotificacoesLidas } from '@/app/(dashboard)/suporte/actions'

type Notificacao = {
  id: string
  tipo: string
  titulo: string
  mensagem: string | null
  link: string | null
  lida: boolean
  criado_em: string
}

const POLL_INTERVAL_MS = 30_000

export function NotificacoesBell() {
  const [items, setItems]   = useState<Notificacao[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen]     = useState(false)
  const [pending, startMark] = useTransition()

  const fetchNotificacoes = useCallback(async () => {
    try {
      const res = await fetch('/api/notificacoes', { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      setItems(json.items ?? [])
      setUnread(json.unread ?? 0)
    } catch {
      // ignora
    }
  }, [])

  useEffect(() => {
    fetchNotificacoes()
    const id = setInterval(fetchNotificacoes, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchNotificacoes])

  // Quando abrir o dropdown, marca todas como lidas
  function handleToggle() {
    const novoOpen = !open
    setOpen(novoOpen)
    if (novoOpen && unread > 0) {
      startMark(async () => {
        await marcarNotificacoesLidas()
        setUnread(0)
        setItems(prev => prev.map(n => ({ ...n, lida: true })))
      })
    }
  }

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-notif-root]')) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" data-notif-root>
      <button
        onClick={handleToggle}
        aria-label="Notificações"
        className={cn(
          'relative inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors',
          'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
          open && 'bg-slate-100 text-slate-900',
        )}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Notificações</h3>
            {pending && <span className="text-[10px] text-slate-400">Marcando…</span>}
          </div>

          {items.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="h-7 w-7 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Nenhuma notificação por aqui.</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
              {items.map(n => (
                <NotificacaoItem key={n.id} n={n} onClick={() => setOpen(false)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NotificacaoItem({ n, onClick }: { n: Notificacao; onClick: () => void }) {
  const Wrapper = n.link
    ? ({ children }: { children: React.ReactNode }) => (
        <Link href={n.link!} onClick={onClick} className="block">{children}</Link>
      )
    : ({ children }: { children: React.ReactNode }) => <div>{children}</div>

  return (
    <Wrapper>
      <div className={cn(
        'px-4 py-3 hover:bg-slate-50 transition-colors',
        !n.lida && 'bg-emerald-50/40',
      )}>
        <div className="flex items-start gap-2">
          <div className={cn(
            'shrink-0 mt-1 h-1.5 w-1.5 rounded-full',
            n.lida ? 'bg-slate-300' : 'bg-emerald-500',
          )} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 leading-tight">{n.titulo}</p>
            {n.mensagem && (
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.mensagem}</p>
            )}
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              {formatRelativo(n.criado_em)}
              {n.link && <ExternalLink className="h-2.5 w-2.5" />}
            </p>
          </div>
          {n.lida && <Check className="h-3 w-3 text-slate-300 shrink-0 mt-1.5" />}
        </div>
      </div>
    </Wrapper>
  )
}

function formatRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d}d`
  return new Date(iso).toLocaleDateString('pt-BR', { dateStyle: 'short' })
}
