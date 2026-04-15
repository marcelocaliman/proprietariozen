import Link from 'next/link'
import { ShieldOff, Mail } from 'lucide-react'

export const metadata = { title: 'Conta suspensa — ProprietárioZen' }

export default function BloqueadoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Ícone */}
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center">
            <ShieldOff className="h-8 w-8 text-red-500" />
          </div>
        </div>

        {/* Título */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#0F172A]">Conta suspensa</h1>
          <p className="text-[#475569] text-sm leading-relaxed">
            O acesso à sua conta foi temporariamente suspenso por nossa equipe de suporte.
            Se você acredita que isso foi um engano, entre em contato conosco.
          </p>
        </div>

        {/* Card de contato */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 text-left space-y-3">
          <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">
            Como resolver
          </p>
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#0F172A]">Envie um e-mail</p>
              <p className="text-xs text-[#64748B] mt-0.5">
                Explique a situação e aguarde nossa resposta em até 24 horas úteis.
              </p>
              <a
                href="mailto:suporte@proprietariozen.com.br"
                className="text-xs text-emerald-600 font-medium hover:underline mt-1 inline-block"
              >
                suporte@proprietariozen.com.br
              </a>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-2">
          <Link
            href="/login"
            className="w-full rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E293B] transition-colors text-center"
          >
            Entrar com outra conta
          </Link>
          <Link
            href="/"
            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors text-center"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
