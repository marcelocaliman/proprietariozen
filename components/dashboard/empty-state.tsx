import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  titulo: string
  descricao: string
  acao?: React.ReactNode
}

export function EmptyState({ icon: Icon, titulo, descricao, acao }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
      <div className="p-3 rounded-full bg-[#F1F5F9]">
        <Icon className="h-6 w-6 text-[#94A3B8]" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#0F172A]">{titulo}</p>
        <p className="text-xs text-[#94A3B8] max-w-[240px]">{descricao}</p>
      </div>
      {acao && <div className="mt-1">{acao}</div>}
    </div>
  )
}
