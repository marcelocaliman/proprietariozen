'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CalendarPlus, Loader2, Infinity as InfinityIcon, AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { renovarContrato } from '@/app/(dashboard)/imoveis/actions'
import type { Imovel } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  imovel: Imovel | null
  onRenovado?: () => void
}

type Preset = '6' | '12' | '24' | 'indeterminado' | 'custom'

function formatarData(s: string): string {
  return new Date(s + 'T00:00:00')
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace('.', '')
}

function adicionarMeses(base: string, meses: number): string {
  // base: YYYY-MM-DD
  const [y, m, d] = base.split('-').map(Number)
  const data = new Date(y, m - 1, d)
  data.setMonth(data.getMonth() + meses)
  return data.toISOString().slice(0, 10)
}

export function RenovarContratoModal({ open, onOpenChange, imovel, onRenovado }: Props) {
  const [preset, setPreset] = useState<Preset>('12')
  const [customData, setCustomData] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset state ao abrir
  useEffect(() => {
    if (!open) return
    setPreset('12')
    setCustomData('')
  }, [open])

  // Calcula a base pra adicionar meses: se o contrato ja venceu, parte de hoje;
  // senao parte da data_fim_contrato existente.
  const base = useMemo(() => {
    const hojeStr = new Date().toISOString().slice(0, 10)
    if (!imovel?.data_fim_contrato) return hojeStr
    return imovel.data_fim_contrato >= hojeStr ? imovel.data_fim_contrato : hojeStr
  }, [imovel?.data_fim_contrato])

  const novaData = useMemo(() => {
    if (preset === 'indeterminado') return null
    if (preset === 'custom') return customData || null
    return adicionarMeses(base, parseInt(preset))
  }, [preset, customData, base])

  if (!imovel) return null

  const fimAtualLabel = imovel.contrato_indeterminado
    ? 'Indeterminado'
    : imovel.data_fim_contrato
      ? formatarData(imovel.data_fim_contrato)
      : 'Sem data definida'

  async function onConfirm() {
    if (!imovel) return
    if (preset === 'custom' && !customData) {
      toast.error('Selecione uma data')
      return
    }
    setLoading(true)
    try {
      const result = await renovarContrato(imovel.id, novaData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(
        novaData
          ? `Contrato renovado até ${formatarData(novaData)}`
          : 'Contrato passou para vigência indeterminada',
      )
      onRenovado?.()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const presets: { id: Preset; label: string; sub?: string }[] = [
    { id: '6',  label: '+ 6 meses',  sub: novaData && preset === '6' ? formatarData(adicionarMeses(base, 6)) : undefined },
    { id: '12', label: '+ 12 meses', sub: novaData && preset === '12' ? formatarData(adicionarMeses(base, 12)) : undefined },
    { id: '24', label: '+ 24 meses', sub: novaData && preset === '24' ? formatarData(adicionarMeses(base, 24)) : undefined },
  ]

  const baseEhHoje = !!imovel.data_fim_contrato && imovel.data_fim_contrato < new Date().toISOString().slice(0, 10)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-emerald-600" />
            Renovar contrato — {imovel.apelido}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Estado atual */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Vigência atual</p>
            <p className="font-semibold text-slate-900 mt-0.5">{fimAtualLabel}</p>
            {baseEhHoje && (
              <p className="text-[11px] text-amber-700 flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" />
                Contrato vencido — extensão começa a contar de hoje
              </p>
            )}
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <Label className="text-sm">Estender por</Label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left transition-colors',
                    preset === p.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <p className="text-sm font-semibold text-slate-900">{p.label}</p>
                  {p.sub && <p className="text-[10px] text-slate-500 mt-0.5">até {p.sub}</p>}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPreset('custom')}
              className={cn(
                'w-full rounded-lg border p-3 text-left transition-colors',
                preset === 'custom'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300',
              )}
            >
              <p className="text-sm font-semibold text-slate-900">Data específica</p>
              {preset === 'custom' && (
                <Input
                  type="date"
                  value={customData}
                  onChange={e => setCustomData(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  min={new Date().toISOString().slice(0, 10)}
                  className="mt-2"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setPreset('indeterminado')}
              className={cn(
                'w-full rounded-lg border p-3 text-left transition-colors flex items-center gap-2',
                preset === 'indeterminado'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300',
              )}
            >
              <InfinityIcon className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Tornar indeterminado</p>
                <p className="text-[11px] text-slate-500">Sem data de fim — comum em renovações automáticas</p>
              </div>
            </button>
          </div>

          {/* Resumo */}
          {novaData && preset !== 'indeterminado' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              Nova data de fim: <strong>{formatarData(novaData)}</strong>
            </div>
          )}
          {preset === 'indeterminado' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              Contrato sem prazo definido — você pode encerrar a qualquer momento.
            </div>
          )}
        </div>

        <div className="-mx-4 -mb-4 mt-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={loading || (preset === 'custom' && !customData)}
            onClick={onConfirm}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar renovação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
