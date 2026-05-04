import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { NovoTicketForm } from '@/components/suporte/novo-ticket-form'

export const metadata = { title: 'Novo ticket — ProprietárioZen' }

export default function NovoTicketPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <Link
          href="/suporte"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar para suporte
        </Link>
        <h1
          className="font-extrabold tracking-tight text-slate-900 leading-[1.05]"
          style={{ letterSpacing: '-0.025em', fontSize: 'clamp(24px, 2.5vw, 32px)' }}
        >
          Novo ticket de suporte
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Descreva o que está acontecendo. Nossa equipe responde em até 24h úteis por aqui e por e-mail.
        </p>
      </div>

      <NovoTicketForm />
    </div>
  )
}
