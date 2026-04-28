'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { configurarCobranca } from '@/app/(dashboard)/imoveis/actions'
import type { Imovel } from '@/types'
import type { PlanoTipo } from '@/lib/stripe'
import { cn } from '@/lib/utils'

const numericNonNegative = (msg = 'Inválido') => z.string().refine(
  v => !v || (!isNaN(Number(v)) && Number(v) >= 0),
  msg,
)

const schema = z.object({
  billing_mode: z.enum(['MANUAL', 'AUTOMATIC']),
  multa_percentual: numericNonNegative(),
  juros_percentual: numericNonNegative(),
  desconto_percentual: numericNonNegative(),
  iptu_mensal: numericNonNegative(),
  condominio_mensal: numericNonNegative(),
  outros_encargos: numericNonNegative(),
  outros_encargos_descricao: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  imovel: Imovel | null
  plano: PlanoTipo
}

export function CobrancaConfigModal({ open, onOpenChange, imovel, plano }: Props) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      billing_mode: 'MANUAL',
      multa_percentual: '2',
      juros_percentual: '1',
      desconto_percentual: '0',
      iptu_mensal: '0',
      condominio_mensal: '0',
      outros_encargos: '0',
      outros_encargos_descricao: '',
    },
  })

  const billingMode = watch('billing_mode')
  const iptuMensal = watch('iptu_mensal')
  const condominioMensal = watch('condominio_mensal')
  const outrosEncargos = watch('outros_encargos')
  const totalEncargos =
    (Number(iptuMensal) || 0) +
    (Number(condominioMensal) || 0) +
    (Number(outrosEncargos) || 0)
  const aluguelTotal = (imovel?.valor_aluguel ?? 0) + totalEncargos

  useEffect(() => {
    if (!open || !imovel) return
    reset({
      billing_mode: imovel.billing_mode ?? 'MANUAL',
      multa_percentual: String(imovel.multa_percentual ?? 2),
      juros_percentual: String(imovel.juros_percentual ?? 1),
      desconto_percentual: String(imovel.desconto_percentual ?? 0),
      iptu_mensal: imovel.iptu_mensal ? String(imovel.iptu_mensal) : '0',
      condominio_mensal: imovel.condominio_mensal ? String(imovel.condominio_mensal) : '0',
      outros_encargos: imovel.outros_encargos ? String(imovel.outros_encargos) : '0',
      outros_encargos_descricao: imovel.outros_encargos_descricao ?? '',
    })
  }, [open, imovel, reset])

  async function onSubmit(data: FormData) {
    if (!imovel) return
    setLoading(true)
    try {
      const result = await configurarCobranca(imovel.id, {
        billing_mode: data.billing_mode,
        multa_percentual: Number(data.multa_percentual),
        juros_percentual: Number(data.juros_percentual),
        desconto_percentual: Number(data.desconto_percentual),
        iptu_mensal: Number(data.iptu_mensal) || 0,
        condominio_mensal: Number(data.condominio_mensal) || 0,
        outros_encargos: Number(data.outros_encargos) || 0,
        outros_encargos_descricao: data.outros_encargos_descricao || null,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Configurações de cobrança salvas!')
        onOpenChange(false)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!imovel) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar cobrança — {imovel.apelido}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* Modo de cobrança */}
          <div className="space-y-2">
            <Label>Modo de cobrança</Label>
            <div className="space-y-2">
              <label className={cn(
                'flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors',
                billingMode === 'MANUAL'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300',
              )}>
                <input
                  type="radio"
                  value="MANUAL"
                  {...register('billing_mode')}
                  className="mt-0.5 accent-emerald-600"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Manual</p>
                  <p className="text-xs text-slate-500 mt-0.5">Você confirma cada pagamento no app</p>
                </div>
              </label>

              <label className={cn(
                'flex items-start gap-3 rounded-lg border p-3.5 transition-colors',
                plano === 'gratis'
                  ? 'cursor-not-allowed opacity-60 border-slate-200'
                  : 'cursor-pointer',
                billingMode === 'AUTOMATIC' && plano !== 'gratis'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300',
              )}>
                <input
                  type="radio"
                  value="AUTOMATIC"
                  {...register('billing_mode')}
                  disabled={plano === 'gratis'}
                  className="mt-0.5 accent-emerald-600"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">Automático via Asaas</p>
                    {plano === 'gratis' && (
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                        Master / Elite
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {plano === 'gratis' ? (
                      <>
                        Disponível no plano Master.{' '}
                        <a href="/planos" className="underline font-medium text-emerald-600">Fazer upgrade</a>
                      </>
                    ) : (
                      'Pix e boleto gerados automaticamente pelo Asaas'
                    )}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Condições de pagamento */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Condições de pagamento</Label>
              <p className="text-xs text-slate-400 mt-0.5">Deixe em branco para usar os padrões</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="multa" className="text-xs">Multa por atraso (%)</Label>
                <Input
                  id="multa"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="2"
                  {...register('multa_percentual')}
                />
                {errors.multa_percentual && (
                  <p className="text-destructive text-xs">{errors.multa_percentual.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="juros" className="text-xs">Juros ao mês (%)</Label>
                <Input
                  id="juros"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="1"
                  {...register('juros_percentual')}
                />
                {errors.juros_percentual && (
                  <p className="text-destructive text-xs">{errors.juros_percentual.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desconto" className="text-xs">Desconto (%)</Label>
                <Input
                  id="desconto"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  {...register('desconto_percentual')}
                />
                {errors.desconto_percentual && (
                  <p className="text-destructive text-xs">{errors.desconto_percentual.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Encargos extras mensais */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Encargos extras mensais</Label>
              <p className="text-xs text-slate-400 mt-0.5">Valores que serão somados ao aluguel base na cobrança</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="iptu" className="text-xs">IPTU mensal (R$)</Label>
                <Input id="iptu" type="number" step="0.01" min="0" placeholder="0" {...register('iptu_mensal')} />
                {errors.iptu_mensal && <p className="text-destructive text-xs">{errors.iptu_mensal.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="condominio" className="text-xs">Condomínio (R$)</Label>
                <Input id="condominio" type="number" step="0.01" min="0" placeholder="0" {...register('condominio_mensal')} />
                {errors.condominio_mensal && <p className="text-destructive text-xs">{errors.condominio_mensal.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="outros" className="text-xs">Outros (R$)</Label>
                <Input id="outros" type="number" step="0.01" min="0" placeholder="0" {...register('outros_encargos')} />
                {errors.outros_encargos && <p className="text-destructive text-xs">{errors.outros_encargos.message}</p>}
              </div>
            </div>
            {(Number(outrosEncargos) || 0) > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="outros-desc" className="text-xs">Descrição de &quot;outros&quot;</Label>
                <Input id="outros-desc" placeholder="Ex: água, luz, IPTU rateado" {...register('outros_encargos_descricao')} />
              </div>
            )}
            {totalEncargos > 0 && imovel && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Aluguel base</span>
                  <span>R$ {imovel.valor_aluguel?.toFixed(2) ?? '0.00'}</span>
                </div>
                <div className="flex justify-between text-slate-600 mt-1">
                  <span>+ Encargos</span>
                  <span>R$ {totalEncargos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-900 mt-1.5 pt-1.5 border-t border-emerald-200">
                  <span>Total mensal</span>
                  <span>R$ {aluguelTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="-mx-4 -mb-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar configurações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
