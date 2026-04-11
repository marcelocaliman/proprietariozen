import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  titulo: string
  valor: string
  descricao?: string
  icon: LucideIcon
  cor?: 'padrao' | 'verde' | 'vermelho' | 'amarelo'
}

const coresMap = {
  padrao:   { icon: 'bg-primary/10 text-primary',           card: '' },
  verde:    { icon: 'bg-emerald-100 text-emerald-600',       card: '' },
  vermelho: { icon: 'bg-red-100 text-red-600',               card: '' },
  amarelo:  { icon: 'bg-amber-100 text-amber-600',           card: '' },
}

export function StatCard({ titulo, valor, descricao, icon: Icon, cor = 'padrao' }: StatCardProps) {
  const cores = coresMap[cor]

  return (
    <Card className="border bg-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium">{titulo}</p>
            <p className="text-2xl font-bold tracking-tight truncate">{valor}</p>
            {descricao && (
              <p className="text-xs text-muted-foreground">{descricao}</p>
            )}
          </div>
          <div className={cn('p-2.5 rounded-xl shrink-0', cores.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
