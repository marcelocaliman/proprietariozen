import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  titulo: string
  descricao: string
}

export function EmptyState({ icon: Icon, titulo, descricao }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
      <div className="p-3 rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{titulo}</p>
        <p className="text-xs text-muted-foreground max-w-[220px]">{descricao}</p>
      </div>
    </div>
  )
}
