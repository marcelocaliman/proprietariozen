import type { Metadata } from 'next'
import { Wrench } from 'lucide-react'
import { LogoColor } from '@/components/ui/logo'
import { createAdminClient } from '@/lib/supabase-server'
import { getSystemSettings } from '@/lib/system-settings'

export const metadata: Metadata = {
  title: 'Em manutenção — ProprietárioZen',
  robots: { index: false, follow: false },
}

export default async function ManutencaoPage() {
  const admin = createAdminClient()
  const settings = await getSystemSettings(admin)
  const mensagem = settings.maintenance_mode.message
    || 'Estamos fazendo melhorias no sistema. Voltamos em breve.'

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <LogoColor iconSize={48} href="/" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8 space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
            <Wrench className="h-8 w-8 text-amber-600" />
          </div>
          <h1
            className="font-extrabold tracking-tight text-slate-900 leading-[1.1]"
            style={{ letterSpacing: '-0.025em', fontSize: 'clamp(24px, 3vw, 32px)' }}
          >
            Estamos em manutenção
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {mensagem}
          </p>
          <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
            Tente recarregar a página em alguns minutos.
          </p>
        </div>
      </div>
    </main>
  )
}
