import { Calendar, Tag, AlertCircle, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  STATUS_LABELS, PRIORIDADE_LABELS, CATEGORIA_LABELS,
  type TicketStatus, type TicketPrioridade, type TicketCategoria,
} from '@/lib/suporte'
import { formatDataHora } from './format'

// Tema visual do hero baseado no status
const HERO_THEME: Record<TicketStatus, {
  gradient: string
  glow: string
  glowSecondary: string
  accentText: string
  accentLabel: string
  badgeBg: string
}> = {
  open: {
    gradient: 'linear-gradient(135deg, #022C22 0%, #064E3B 50%, #059669 100%)',
    glow: 'rgba(110, 231, 183, 0.20)',
    glowSecondary: 'rgba(52, 211, 153, 0.10)',
    accentText: '#A7F3D0',
    accentLabel: '#6EE7B7',
    badgeBg: 'bg-emerald-500/30 border-emerald-300/40',
  },
  em_andamento: {
    gradient: 'linear-gradient(135deg, #0C4A6E 0%, #0369A1 50%, #0284C7 100%)',
    glow: 'rgba(125, 211, 252, 0.20)',
    glowSecondary: 'rgba(56, 189, 248, 0.10)',
    accentText: '#BAE6FD',
    accentLabel: '#7DD3FC',
    badgeBg: 'bg-sky-500/30 border-sky-300/40',
  },
  aguardando_usuario: {
    gradient: 'linear-gradient(135deg, #78350F 0%, #B45309 50%, #D97706 100%)',
    glow: 'rgba(252, 211, 77, 0.20)',
    glowSecondary: 'rgba(251, 191, 36, 0.10)',
    accentText: '#FDE68A',
    accentLabel: '#FCD34D',
    badgeBg: 'bg-amber-500/30 border-amber-300/40',
  },
  resolvido: {
    gradient: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #475569 100%)',
    glow: 'rgba(148, 163, 184, 0.20)',
    glowSecondary: 'rgba(100, 116, 139, 0.10)',
    accentText: '#CBD5E1',
    accentLabel: '#94A3B8',
    badgeBg: 'bg-slate-500/30 border-slate-300/40',
  },
  fechado: {
    gradient: 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #475569 100%)',
    glow: 'rgba(148, 163, 184, 0.20)',
    glowSecondary: 'rgba(100, 116, 139, 0.10)',
    accentText: '#CBD5E1',
    accentLabel: '#94A3B8',
    badgeBg: 'bg-slate-500/30 border-slate-300/40',
  },
}

interface Props {
  assunto: string
  status: TicketStatus
  prioridade: TicketPrioridade
  categoria: TicketCategoria
  criadoEm: string
  // Apenas pro admin view: dados do solicitante
  usuario?: {
    nome: string | null
    email: string | null
    plano: string | null
  } | null
}

export function TicketHero({ assunto, status, prioridade, categoria, criadoEm, usuario }: Props) {
  const theme = HERO_THEME[status]

  return (
    <div
      className="rounded-2xl p-7 sm:p-8 relative overflow-hidden text-white shadow-lg"
      style={{
        background: theme.gradient,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: theme.glow, filter: 'blur(80px)', transform: 'translate(40%, -40%)' }} />
      <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full pointer-events-none" style={{ background: theme.glowSecondary, filter: 'blur(60px)' }} />

      <div className="relative z-10 space-y-4">
        {/* Status + categoria + prioridade */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            'inline-flex items-center rounded-md border backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
            theme.badgeBg, 'text-white',
          )}>
            {STATUS_LABELS[status]}
          </span>
          {prioridade !== 'normal' && (
            <span className={cn(
              'inline-flex items-center gap-1 rounded-md backdrop-blur-sm px-2 py-1 text-[10px] font-bold uppercase tracking-wide',
              prioridade === 'urgente' || prioridade === 'alta'
                ? 'bg-red-500/30 border border-red-300/40 text-white'
                : 'bg-white/10 border border-white/20 text-white/80',
            )}>
              <AlertCircle className="h-2.5 w-2.5" />
              {PRIORIDADE_LABELS[prioridade]}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: theme.accentText }}>
            <Tag className="h-3 w-3 opacity-70" />
            {CATEGORIA_LABELS[categoria]}
          </span>
        </div>

        {/* Título */}
        <h1
          className="font-extrabold leading-tight"
          style={{
            fontSize: 'clamp(24px, 3vw, 36px)',
            letterSpacing: '-0.025em',
            background: `linear-gradient(135deg, #FFFFFF 0%, ${theme.accentText} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {assunto}
        </h1>

        {/* Footer com info contextual */}
        <div className="flex items-center gap-4 flex-wrap text-xs" style={{ color: theme.accentText }}>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 opacity-70" />
            Aberto em {formatDataHora(criadoEm)}
          </span>
          {usuario && (
            <>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 opacity-70" />
                <span className="font-bold text-white">{usuario.nome ?? '—'}</span>
                <span className="opacity-70">{usuario.email ?? ''}</span>
                {usuario.plano && (
                  <span
                    className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
                    style={{ background: 'rgba(255,255,255,0.15)', color: theme.accentText }}
                  >
                    {usuario.plano}
                  </span>
                )}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
