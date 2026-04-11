import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  titulo: string
  valor: string
  descricao?: string
  icon: LucideIcon
  cor?: 'padrao' | 'verde' | 'vermelho' | 'amarelo' | 'azul'
}

const coresMap = {
  padrao:   { icon: 'bg-emerald-100 text-emerald-600' },
  verde:    { icon: 'bg-emerald-100 text-emerald-600' },
  vermelho: { icon: 'bg-red-100 text-red-600' },
  amarelo:  { icon: 'bg-amber-100 text-amber-600' },
  azul:     { icon: 'bg-blue-100 text-blue-600' },
}

export function StatCard({ titulo, valor, descricao, icon: Icon, cor = 'padrao' }: StatCardProps) {
  const cores = coresMap[cor]
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] min-h-[110px] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-500 text-[#475569] uppercase tracking-[0.05em]">{titulo}</p>
        <div className={cn('p-2 rounded-xl shrink-0', cores.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-[#0F172A]">{valor}</p>
        {descricao && <p className="text-xs text-[#94A3B8] mt-0.5">{descricao}</p>}
      </div>
    </div>
  )
}
