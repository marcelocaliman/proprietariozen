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
import { criarInquilinoComContrato, editarInquilino } from '@/app/(dashboard)/inquilinos/actions'
import type { Inquilino } from '@/types'
import { cn } from '@/lib/utils'

// ─── Helpers de vigência ──────────────────────────────────────────────────────

function calcularDataFim(inicio: string, meses: number): string {
  const d = new Date(inicio + 'T00:00:00')
  d.setMonth(d.getMonth() + meses)
  return d.toISOString().split('T')[0]
}

function formatarDataLonga(dataStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(dataStr + 'T00:00:00'))
}

function diasEntre(dataStr: string): number {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(dataStr + 'T00:00:00')
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}

const sel = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"

const schema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  imovel_id: z.string().min(1, 'Selecione um imóvel'),
  telefone: z.string().optional(),
  email: z.union([z.string().email('E-mail inválido'), z.literal('')]).optional(),
  cpf: z.string().optional(),
  // Contract fields (validated conditionally in onSubmit)
  valor_aluguel: z.string().optional(),
  dia_vencimento: z.string().optional(),
  data_inicio_contrato: z.string().optional(),
  data_proximo_reajuste: z.string().optional(),
  indice_reajuste: z.enum(['igpm', 'ipca', 'fixo']).optional(),
  percentual_fixo: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface InquilinoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inquilino: Inquilino | null
  imoveis: { id: string; apelido: string }[]
  imovelIdPrefill?: string | null
}

export function InquilinoModal({ open, onOpenChange, inquilino, imoveis, imovelIdPrefill }: InquilinoModalProps) {
  const [loading, setLoading] = useState(false)
  const [vigenciaMeses, setVigenciaMeses] = useState<number | null>(null)
  const editando = !!inquilino

  const { register, handleSubmit, watch, reset, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { indice_reajuste: 'fixo' },
  })

  const imovelIdSelecionado = watch('imovel_id')
  const indice = watch('indice_reajuste')

  useEffect(() => {
    if (!open) return
    if (inquilino) {
      reset({
        nome: inquilino.nome,
        imovel_id: inquilino.imovel_id,
        telefone: inquilino.telefone ?? '',
        email: inquilino.email ?? '',
        cpf: inquilino.cpf ?? '',
        indice_reajuste: 'fixo',
      })
      setVigenciaMeses(null)
    } else {
      reset({
        nome: '', imovel_id: imovelIdPrefill ?? '',
        telefone: '', email: '', cpf: '',
        valor_aluguel: '', dia_vencimento: '10',
        data_inicio_contrato: '', data_proximo_reajuste: '',
        indice_reajuste: 'fixo', percentual_fixo: '',
      })
      setVigenciaMeses(null)
    }
  }, [open, inquilino, imovelIdPrefill, reset])

  async function onSubmit(data: FormData) {
    const inquilinoInput = {
      imovel_id: data.imovel_id,
      nome: data.nome,
      telefone: data.telefone || null,
      email: data.email || null,
      cpf: data.cpf || null,
    }

    if (editando) {
      setLoading(true)
      try {
        const result = await editarInquilino(inquilino!.id, inquilinoInput)
        if (result.error) { toast.error(result.error); return }
        toast.success('Inquilino atualizado!')
        onOpenChange(false)
      } finally {
        setLoading(false)
      }
      return
    }

    // Criar: validar contrato se imóvel selecionado
    const valor = Number(data.valor_aluguel)
    const dia   = Number(data.dia_vencimento)

    if (!data.valor_aluguel || isNaN(valor) || valor <= 0) {
      setError('valor_aluguel', { message: 'Informe o valor do aluguel' })
      return
    }
    if (!data.dia_vencimento || isNaN(dia) || dia < 1 || dia > 31) {
      setError('dia_vencimento', { message: 'Deve ser entre 1 e 31' })
      return
    }
    if (data.indice_reajuste === 'fixo') {
      const pct = Number(data.percentual_fixo)
      if (!data.percentual_fixo || isNaN(pct) || pct <= 0) {
        setError('percentual_fixo', { message: 'Informe o percentual fixo' })
        return
      }
    }

    const dataFimContrato = vigenciaMeses != null && data.data_inicio_contrato
      ? calcularDataFim(data.data_inicio_contrato, vigenciaMeses)
      : null

    const contratoInput = {
      valor_aluguel: valor,
      dia_vencimento: dia,
      data_inicio_contrato: data.data_inicio_contrato || null,
      data_proximo_reajuste: data.data_proximo_reajuste || null,
      indice_reajuste: (data.indice_reajuste ?? 'fixo') as 'igpm' | 'ipca' | 'fixo',
      percentual_fixo: data.indice_reajuste === 'fixo' && data.percentual_fixo
        ? Number(data.percentual_fixo)
        : null,
      vigencia_meses: vigenciaMeses,
      data_fim_contrato: dataFimContrato,
      contrato_indeterminado: vigenciaMeses === null,
      alerta_vencimento_enviado: false,
    }

    setLoading(true)
    try {
      const result = await criarInquilinoComContrato(inquilinoInput, contratoInput)
      if (result.error) { toast.error(result.error); return }
      toast.success('Inquilino cadastrado!')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const mostrarContrato = !editando && !!imovelIdSelecionado

  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar inquilino' : 'Novo inquilino'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* ── Dados pessoais ── */}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" placeholder="João da Silva" {...register('nome')} />
            {errors.nome && <p className="text-destructive text-xs">{errors.nome.message}</p>}
          </div>

          {/* ── Imóvel ── */}
          <div className="space-y-1.5">
            <Label htmlFor="imovel_id">Vincular a um imóvel</Label>
            <select id="imovel_id" className={sel} {...register('imovel_id')}>
              <option value="">Selecione um imóvel</option>
              {imoveis.map(i => (
                <option key={i.id} value={i.id}>{i.apelido}</option>
              ))}
            </select>
            {errors.imovel_id && <p className="text-destructive text-xs">{errors.imovel_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" placeholder="(11) 99999-9999" {...register('telefone')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" placeholder="000.000.000-00" {...register('cpf')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="joao@email.com" {...register('email')} />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>

          {/* ── Contrato (apenas ao criar com imóvel selecionado) ── */}
          {mostrarContrato && (
            <div className="space-y-4 pt-1 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-800 mt-3">Condições do contrato</p>
                <p className="text-xs text-slate-400 mt-0.5">Preenchidas agora e salvas no imóvel</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="valor_aluguel">Valor do aluguel (R$)</Label>
                  <Input id="valor_aluguel" type="number" step="0.01" placeholder="1500.00" {...register('valor_aluguel')} />
                  {errors.valor_aluguel && <p className="text-destructive text-xs">{errors.valor_aluguel.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dia_vencimento">Dia de vencimento</Label>
                  <Input id="dia_vencimento" type="number" min={1} max={31} placeholder="10" {...register('dia_vencimento')} />
                  {errors.dia_vencimento && <p className="text-destructive text-xs">{errors.dia_vencimento.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="indice_reajuste">Índice de reajuste</Label>
                  <select id="indice_reajuste" className={sel} {...register('indice_reajuste')}>
                    <option value="fixo">Percentual fixo</option>
                    <option value="igpm">IGPM</option>
                    <option value="ipca">IPCA</option>
                  </select>
                </div>
                {indice === 'fixo' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="percentual_fixo">Percentual fixo (%)</Label>
                    <Input id="percentual_fixo" type="number" step="0.01" placeholder="3.00" {...register('percentual_fixo')} />
                    {errors.percentual_fixo && <p className="text-destructive text-xs">{errors.percentual_fixo.message}</p>}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="data_inicio_contrato">Início do contrato</Label>
                  <Input id="data_inicio_contrato" type="date" {...register('data_inicio_contrato')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="data_proximo_reajuste">Próximo reajuste</Label>
                  <Input id="data_proximo_reajuste" type="date" {...register('data_proximo_reajuste')} />
                </div>
              </div>

              {/* Duração do contrato */}
              <div className="space-y-3">
                <Label>Duração do contrato</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { value: 12,   label: '12 meses',  sub: '1 ano' },
                    { value: 24,   label: '24 meses',  sub: '2 anos' },
                    { value: 30,   label: '30 meses',  sub: '2,5 anos' },
                    { value: 36,   label: '36 meses',  sub: '3 anos' },
                    { value: null, label: 'Indeterminado', sub: 'Sem data fim' },
                  ].map(op => (
                    <button
                      key={String(op.value)}
                      type="button"
                      onClick={() => setVigenciaMeses(op.value)}
                      className={cn(
                        'rounded-lg border px-3 py-2.5 text-left transition-colors',
                        vigenciaMeses === op.value
                          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-400'
                          : 'border-slate-200 hover:border-slate-300 bg-white',
                      )}
                    >
                      <p className={cn('text-sm font-semibold leading-tight', vigenciaMeses === op.value ? 'text-emerald-700' : 'text-slate-700')}>
                        {op.label}
                      </p>
                      {op.sub && <p className={cn('text-xs leading-tight mt-0.5', vigenciaMeses === op.value ? 'text-emerald-500' : 'text-slate-400')}>{op.sub}</p>}
                    </button>
                  ))}
                </div>

                {/* Preview card */}
                {(() => {
                  const inicioVal = watch('data_inicio_contrato')
                  if (!inicioVal) return null
                  if (vigenciaMeses === null) {
                    return (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500 italic">
                        Contrato sem data de encerramento
                      </div>
                    )
                  }
                  const dataFim = calcularDataFim(inicioVal, vigenciaMeses)
                  const dias = diasEntre(dataFim)
                  const vencido = dias < 0
                  return (
                    <div className={cn(
                      'rounded-lg border px-3.5 py-2.5 space-y-1',
                      vencido ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50',
                    )}>
                      <p className={cn('text-xs font-medium', vencido ? 'text-red-700' : 'text-emerald-700')}>
                        {vencido
                          ? `Contrato vencido em ${formatarDataLonga(dataFim)}.`
                          : `Contrato de ${formatarDataLonga(inicioVal)} até ${formatarDataLonga(dataFim)}`
                        }
                      </p>
                      <p className={cn('text-xs', vencido ? 'text-red-500' : 'text-emerald-600')}>
                        {vencido
                          ? `Vencido há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? 's' : ''}`
                          : dias <= 60
                            ? `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`
                            : `${Math.round(dias / 30)} meses restantes`
                        }
                      </p>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          <div className="-mx-4 -mb-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {editando ? 'Salvar alterações' : 'Cadastrar inquilino'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
