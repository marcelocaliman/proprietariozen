import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

export const metadata = { title: 'Painel Admin — ProprietárioZen' }

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Dupla verificação no layout (middleware já bloqueia, mas defense-in-depth)
  const ok = await isAdmin(user.id)
  if (!ok) redirect('/dashboard?acesso=negado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, email')
    .eq('id', user.id)
    .single()

  const nome  = profile?.nome  ?? user.email?.split('@')[0] ?? 'Admin'
  const email = profile?.email ?? user.email ?? ''

  return (
    <div className="flex h-screen bg-[#0F172A]">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-700/60">
        <AdminSidebar adminNome={nome} adminEmail={email} />
      </aside>

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
        {/* Header mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-700/60 bg-[#0F172A]">
          <span className="text-white font-bold">PropZen</span>
          <span className="inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white tracking-wide">
            ADMIN
          </span>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
