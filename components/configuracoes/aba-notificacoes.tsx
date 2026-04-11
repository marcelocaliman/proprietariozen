'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Bell, Clock, TrendingUp, CalendarClock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  salvarNotificacoes,
} from '@/app/(dashboard)/configuracoes/actions'
import { type NotificacoesConfig, NOTIFICACOES_PADRAO } from '@/app/(dashboard)/configuracoes/types'

const sel =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus:border-ring'

interface ItemSwitchProps {
  id: string
  label: string
  descricao?: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}

function ItemSwitch({ id, label, descricao, checked, onCheckedChange }: ItemSwitchProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">{label}</Label>
        {descricao && <p className="text-xs text-muted-foreground mt-0.5">{descricao}</p>}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5 shrink-0"
      />
    </div>
  )
}

interface Props {
  config: NotificacoesConfig
}

export function AbaNotificacoes({ config: configInicial }: Props) {
  const [config, setConfig] = useState<NotificacoesConfig>({
    ...NOTIFICACOES_PADRAO,
    ...configInicial,
  })
  const [saving, setSaving] = useState(false)

  function set<K extends keyof NotificacoesConfig>(key: K, value: NotificacoesConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  async function handleSalvar() {
    setSaving(true)
    try {
      const result = await salvarNotificacoes(config)
      if (result.error) toast.error(result.error)
      else toast.success('Preferências salvas!')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Vencimentos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            Alertas de vencimento
          </CardTitle>
          <CardDescription>
            Receba lembretes antes do vencimento dos aluguéis
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          <ItemSwitch
            id="venc_5_dias"
            label="Lembrete 5 dias antes"
            descricao="E-mail enviado 5 dias antes da data de vencimento"
            checked={config.venc_5_dias}
            onCheckedChange={v => set('venc_5_dias', v)}
          />
          <ItemSwitch
            id="venc_3_dias"
            label="Lembrete 3 dias antes"
            descricao="E-mail enviado 3 dias antes da data de vencimento"
            checked={config.venc_3_dias}
            onCheckedChange={v => set('venc_3_dias', v)}
          />
          <ItemSwitch
            id="venc_1_dia"
            label="Lembrete 1 dia antes"
            descricao="E-mail enviado no dia anterior ao vencimento"
            checked={config.venc_1_dia}
            onCheckedChange={v => set('venc_1_dia', v)}
          />
        </CardContent>
      </Card>

      {/* Atrasos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-red-500" />
            Alertas de atraso
          </CardTitle>
          <CardDescription>
            Notificações quando pagamentos ficam em aberto
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          <ItemSwitch
            id="atraso_notificar"
            label="Notificar quando aluguel atrasa"
            descricao="E-mail enviado no dia seguinte ao vencimento se não pago"
            checked={config.atraso_notificar}
            onCheckedChange={v => set('atraso_notificar', v)}
          />
          <div className="flex items-start justify-between gap-4 py-3">
            <div className="flex-1 min-w-0">
              <Label className="text-sm font-medium">Repetir alerta de atraso a cada</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Reenvia o alerta enquanto o pagamento continuar em aberto
              </p>
            </div>
            <select
              value={config.atraso_repetir_dias}
              onChange={e => set('atraso_repetir_dias', Number(e.target.value))}
              disabled={!config.atraso_notificar}
              className={`${sel} w-24 shrink-0`}
            >
              <option value={3}>3 dias</option>
              <option value={5}>5 dias</option>
              <option value={7}>7 dias</option>
              <option value={15}>15 dias</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Reajuste */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            Alertas de reajuste
          </CardTitle>
          <CardDescription>
            Lembretes antes das datas de reajuste dos contratos
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          <ItemSwitch
            id="reajuste_60_dias"
            label="Lembrete 60 dias antes"
            checked={config.reajuste_60_dias}
            onCheckedChange={v => set('reajuste_60_dias', v)}
          />
          <ItemSwitch
            id="reajuste_30_dias"
            label="Lembrete 30 dias antes"
            descricao="Recomendado para preparar o cálculo do novo valor"
            checked={config.reajuste_30_dias}
            onCheckedChange={v => set('reajuste_30_dias', v)}
          />
          <ItemSwitch
            id="reajuste_15_dias"
            label="Lembrete 15 dias antes"
            checked={config.reajuste_15_dias}
            onCheckedChange={v => set('reajuste_15_dias', v)}
          />
        </CardContent>
      </Card>

      {/* Resumo mensal */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-green-500" />
            Resumo mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ItemSwitch
            id="resumo_mensal"
            label="Receber resumo mensal todo dia 1"
            descricao="Um e-mail com total recebido, pendente e inadimplentes do mês anterior"
            checked={config.resumo_mensal}
            onCheckedChange={v => set('resumo_mensal', v)}
          />
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSalvar} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar preferências
        </Button>
      </div>
    </div>
  )
}
