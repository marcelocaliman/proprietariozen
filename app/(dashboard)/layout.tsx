import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { getSystemSettings } from '@/lib/system-settings'
import { isAdmin } from '@/lib/admin'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}
import { Sidebar } from '@/components/dashboard/sidebar'
import { MobileNav } from '@/components/dashboard/mobile-nav'
import { UnauthorizedToast } from '@/components/dashboard/unauthorized-toast'
import { GlobalBannerView } from '@/components/dashboard/global-banner'
import type { Profile } from '@/types'
import { LogoColor } from '@/components/ui/logo'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Modo manutenção: redireciona não-admins
  const settings = await getSystemSettings(admin)
  if (settings.maintenance_mode.enabled) {
    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) redirect('/manutencao')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Determina anúncio de plano
  const userPlano = (profile as { plano?: string } | null)?.plano ?? 'gratis'
  const planoBanner =
    userPlano === 'gratis' ? settings.announcement_free :
    userPlano === 'pago'   ? settings.announcement_master :
    userPlano === 'elite'  ? settings.announcement_elite :
    null

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar desktop — fixa */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border">
        <Sidebar profile={profile as Profile | null} />
      </aside>

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-background">
          <MobileNav profile={profile as Profile | null} />
          <LogoColor iconSize={28} href="/dashboard" />
        </header>

        {/* Toast de acesso negado (vindo de /admin/* sem permissão) */}
        <Suspense>
          <UnauthorizedToast />
        </Suspense>

        {/* Conteúdo */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Banner global (todos os usuários) */}
          <GlobalBannerView banner={settings.global_banner} />

          {/* Anúncio específico do plano do usuário */}
          {planoBanner?.enabled && planoBanner.text && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 flex items-center justify-between gap-4 flex-wrap shadow-sm">
              <p className="text-sm font-medium text-emerald-900 leading-snug">{planoBanner.text}</p>
              {planoBanner.link && planoBanner.link_label && (
                <a
                  href={planoBanner.link}
                  target={planoBanner.link.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="text-sm font-bold underline text-emerald-700 shrink-0"
                >
                  {planoBanner.link_label} →
                </a>
              )}
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  )
}
