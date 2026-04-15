'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, TrendingUp, Building2,
  Activity, Settings, LogOut, ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

const navItems = [
  { href: '/admin/visao-geral',  label: 'Visão geral',       icon: LayoutDashboard },
  { href: '/admin/usuarios',     label: 'Usuários',           icon: Users },
  { href: '/admin/financeiro',   label: 'Financeiro',         icon: TrendingUp },
  { href: '/admin/imoveis',      label: 'Imóveis & Aluguéis', icon: Building2 },
  { href: '/admin/logs',         label: 'Logs & Atividade',   icon: Activity },
  { href: '/admin/configuracoes',label: 'Configurações',      icon: Settings },
]

interface AdminSidebarProps {
  adminNome: string
  adminEmail: string
  onClose?: () => void
}

export function AdminSidebar({ adminNome, adminEmail, onClose }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Sessão encerrada')
    router.push('/login')
    router.refresh()
  }

  const initials = adminNome
    .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-300">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <ShieldAlert className="h-6 w-6 text-red-400 shrink-0" />
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-base tracking-tight">PropZen</span>
          <Badge className="bg-red-500 hover:bg-red-500 text-white text-[10px] h-4 px-1.5 font-bold tracking-wide">
            ADMIN
          </Badge>
        </div>
      </div>

      <div className="h-px bg-slate-700/60 mx-3" />

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const ativo = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                ativo
                  ? 'bg-slate-700/70 text-white'
                  : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-200',
              )}
            >
              {ativo && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-red-400" />
              )}
              <Icon className={cn('h-4 w-4 shrink-0', ativo ? 'text-red-400' : 'text-slate-500')} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="h-px bg-slate-700/60 mx-3" />

      {/* Rodapé */}
      <div className="px-3 py-4 space-y-1">
        {/* Link voltar ao app */}
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-700/40 hover:text-slate-200 transition-colors"
        >
          <LayoutDashboard className="h-4 w-4 text-slate-500" />
          Voltar ao app
        </Link>

        <div className="h-px bg-slate-700/40 my-1" />

        {/* Admin info */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-red-500/20 text-red-400 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{adminNome}</p>
            <p className="text-xs text-slate-500 truncate">{adminEmail}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start gap-3 px-3 text-slate-400 hover:text-white hover:bg-slate-700/40"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  )
}
