import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { NovoTicketForm } from '@/components/suporte/novo-ticket-form'

export const metadata = { title: 'Novo ticket — ProprietárioZen' }

export default function NovoTicketPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/suporte"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mb-3"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Voltar para suporte
      </Link>

      <h1
        className="font-bold text-slate-900 leading-tight mb-1"
        style={{ fontSize: 'clamp(20px, 2.2vw, 26px)', letterSpacing: '-0.015em' }}
      >
        Novo ticket
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        Descreva o que está acontecendo. Nossa equipe responde em até 24h úteis por aqui e por e-mail.
      </p>

      <NovoTicketForm />
    </div>
  )
}
