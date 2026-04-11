'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Users,
  Receipt,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types'

const navItems = [
  { href: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/imoveis',       label: 'Imóveis',       icon: Building2 },
  { href: '/inquilinos',    label: 'Inquilinos',    icon: Users },
  { href: '/alugueis',      label: 'Aluguéis',      icon: Receipt },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

interface SidebarProps {
  profile: Profile | null
  onClose?: () => void
}

export function Sidebar({ profile, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isPro = profile?.plano === 'pago'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Sessão encerrada')
    router.push('/login')
    router.refresh()
  }

  const initials = profile?.nome
    ? profile.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'PZ'

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-bold text-white text-sm shrink-0">
          PZ
        </div>
        <span className="font-semibold text-base tracking-tight">ProprietárioZen</span>
      </div>

      <Separator className="bg-sidebar-border" />

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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                ativo
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* Link para /planos — destaque para usuários Grátis */}
        {!isPro && (
          <Link
            href="/planos"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-1',
              pathname === '/planos'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                : 'text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/30',
            )}
          >
            <Zap className="h-4 w-4 shrink-0" />
            Fazer upgrade Pro
          </Link>
        )}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Usuário */}
      <div className="px-3 py-4 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium truncate">{profile?.nome ?? 'Usuário'}</p>
              {isPro && (
                <Badge className="bg-purple-600 hover:bg-purple-600 text-[10px] h-4 px-1.5 shrink-0">
                  Pro
                </Badge>
              )}
            </div>
            <p className="text-xs text-sidebar-foreground/50 truncate">{profile?.email}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start gap-3 px-3 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  )
}
