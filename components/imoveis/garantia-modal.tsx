'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Shield, AlertCircle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { configurarGarantia } from '@/app/(dashboard)/imoveis/actions'
import type { Imovel } from '@/types'
import { cn } from '@/lib/utils'

const schema = z.object({
  garantia_tipo: z.enum(['caucao', 'fiador', 'seguro_fianca', 'titulo_capitalizacao', 'sem_garantia']),
  garantia_valor: z.string().optional(),
  garantia_observacao: z.string().optional(),
  fiador_nome: z.string().optional(),
  fiador_cpf: z.string().optional(),
  fiador_telefone: z.string().optional(),
  fiador_email: z.string().optional(),
  seguro_fianca_seguradora: z.string().optional(),
  seguro_fianca_apolice: z.string().optional(),
  seguro_fianca_validade: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  imovel: Imovel | null
}

const TIPOS: { value: FormData['garantia_tipo']; label: string; descricao: string }[] = [
  { value: 'sem_garantia', label: 'Sem garantia', descricao: 'Contrato sem garantia formal' },
  { value: 'caucao', label: 'Caução', descricao: 'Depósito antecipado (até 3 alugueis)' },
  { value: 'fiador', label: 'Fiador', descricao: 'Pessoa física que assume o débito em caso de inadimplência' },
  { value: 'seguro_fianca', label: 'Seguro fiança', descricao: 'Seguradora cobre inadimplência via apólice' },
  { value: 'titulo_capitalizacao', label: 'Título de capitalização', descricao: 'Título depositado como garantia' },
]

export function GarantiaModal({ open, onOpenChange, imovel }: Props) {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { garantia_tipo: 'sem_garantia' },
  })

  const tipo = watch('garantia_tipo')

  useEffect(() => {
    if (!open || !imovel) return
    reset({
      garantia_tipo: (imovel.garantia_tipo as FormData['garantia_tipo']) ?? 'sem_garantia',
      garantia_valor: imovel.garantia_valor != null ? String(imovel.garantia_valor) : '',
      garantia_observacao: imovel.garantia_observacao ?? '',
      fiador_nome: imovel.fiador_nome ?? '',
      fiador_cpf: imovel.fiador_cpf ?? '',
      fiador_telefone: imovel.fiador_telefone ?? '',
      fiador_email: imovel.fiador_email ?? '',
      seguro_fianca_seguradora: imovel.seguro_fianca_seguradora ?? '',
      seguro_fianca_apolice: imovel.seguro_fianca_apolice ?? '',
      seguro_fianca_validade: imovel.seguro_fianca_validade ?? '',
    })
  }, [open, imovel, reset])

  async function onSubmit(data: FormData) {
    if (!imovel) return
    setLoading(true)
    try {
      const result = await configurarGarantia(imovel.id, {
        garantia_tipo: data.garantia_tipo,
        garantia_valor: data.garantia_valor ? Number(data.garantia_valor) : null,
        garantia_observacao: data.garantia_observacao || null,
        fiador_nome: data.fiador_nome || null,
        fiador_cpf: data.fiador_cpf || null,
        fiador_telefone: data.fiador_telefone || null,
        fiador_email: data.fiador_email || null,
        seguro_fianca_seguradora: data.seguro_fianca_seguradora || null,
        seguro_fianca_apolice: data.seguro_fianca_apolice || null,
        seguro_fianca_validade: data.seguro_fianca_validade || null,
      })
      if (result.error) toast.error(result.error)
      else {
        toast.success('Garantia salva!')
        onOpenChange(false)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!imovel) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            Garantia — {imovel.apelido}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* Tipo de garantia */}
          <div className="space-y-2">
            <Label>Tipo de garantia</Label>
            <div className="space-y-2">
              {TIPOS.map(t => (
                <label key={t.value} className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                  tipo === t.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300',
                )}>
                  <input type="radio" value={t.value} {...register('garantia_tipo')} className="mt-0.5 accent-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.descricao}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Caução: valor */}
          {tipo === 'caucao' && (
            <div className="space-y-1.5">
              <Label htmlFor="caucao-valor">Valor da caução (R$)</Label>
              <Input
                id="caucao-valor"
                type="number"
                step="0.01"
                placeholder="3000"
                {...register('garantia_valor')}
              />
              {errors.garantia_valor && <p className="text-destructive text-xs">{errors.garantia_valor.message}</p>}
            </div>
          )}

          {/* Fiador: dados completos */}
          {tipo === 'fiador' && (
            <div className="space-y-3 rounded-lg border border-slate-200 p-4 bg-slate-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <AlertCircle className="h-4 w-4" />
                Dados do fiador
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="fiador-nome" className="text-xs">Nome completo</Label>
                  <Input id="fiador-nome" placeholder="João Silva" {...register('fiador_nome')} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="fiador-cpf" className="text-xs">CPF</Label>
                    <Input id="fiador-cpf" placeholder="000.000.000-00" {...register('fiador_cpf')} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="fiador-telefone" className="text-xs">Telefone</Label>
                    <Input id="fiador-telefone" placeholder="(11) 99999-9999" {...register('fiador_telefone')} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fiador-email" className="text-xs">E-mail</Label>
                  <Input id="fiador-email" type="email" placeholder="fiador@exemplo.com" {...register('fiador_email')} />
                </div>
              </div>
            </div>
          )}

          {/* Seguro fiança */}
          {tipo === 'seguro_fianca' && (
            <div className="space-y-3 rounded-lg border border-slate-200 p-4 bg-slate-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <AlertCircle className="h-4 w-4" />
                Apólice de seguro
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="seg-seguradora" className="text-xs">Seguradora</Label>
                  <Input id="seg-seguradora" placeholder="Porto Seguro" {...register('seguro_fianca_seguradora')} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="seg-apolice" className="text-xs">Nº da apólice</Label>
                    <Input id="seg-apolice" placeholder="123456" {...register('seguro_fianca_apolice')} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="seg-validade" className="text-xs">Validade</Label>
                    <Input id="seg-validade" type="date" {...register('seguro_fianca_validade')} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Título de capitalização: valor + obs */}
          {tipo === 'titulo_capitalizacao' && (
            <div className="space-y-1.5">
              <Label htmlFor="titulo-valor">Valor do título (R$)</Label>
              <Input id="titulo-valor" type="number" step="0.01" placeholder="5000" {...register('garantia_valor')} />
            </div>
          )}

          {/* Observação geral */}
          {tipo !== 'sem_garantia' && (
            <div className="space-y-1.5">
              <Label htmlFor="garantia-obs" className="text-xs">Observação (opcional)</Label>
              <Input
                id="garantia-obs"
                placeholder="Detalhes adicionais sobre a garantia"
                {...register('garantia_observacao')}
              />
            </div>
          )}

          <div className="-mx-4 -mb-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar garantia
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
