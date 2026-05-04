import Link from 'next/link'
import { ChevronLeft, MessageSquare } from 'lucide-react'
import { NovoTicketForm } from '@/components/suporte/novo-ticket-form'

export const metadata = { title: 'Novo ticket — ProprietárioZen' }

export default function NovoTicketPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link
        href="/suporte"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Voltar para suporte
      </Link>

      {/* Hero compacto */}
      <div
        className="rounded-2xl p-7 relative overflow-hidden text-white"
        style={{
          background: 'linear-gradient(135deg, #022C22 0%, #064E3B 50%, #059669 100%)',
          boxShadow: '0 8px 32px rgba(5, 150, 105, 0.20)',
        }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'rgba(110, 231, 183, 0.20)', filter: 'blur(80px)', transform: 'translate(40%, -40%)' }} />
        <div className="relative z-10 flex items-start gap-4">
          <div className="shrink-0 h-12 w-12 rounded-xl bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-emerald-200" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest font-semibold text-emerald-200">Suporte</p>
            <h1
              className="font-extrabold mt-1 leading-tight"
              style={{
                fontSize: 'clamp(24px, 2.5vw, 32px)',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #6EE7B7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.025em',
              }}
            >
              Novo ticket
            </h1>
            <p className="text-sm text-emerald-100/80 mt-1.5 max-w-lg leading-relaxed">
              Descreva o que está acontecendo. Nossa equipe responde em até 24h úteis por aqui e por e-mail.
            </p>
          </div>
        </div>
      </div>

      <NovoTicketForm />
    </div>
  )
}
