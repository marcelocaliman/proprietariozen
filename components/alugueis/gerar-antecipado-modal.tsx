'use client'

import { useState } from 'react'
import { X, Info, Loader2, Plus, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatarMoeda } from '@/lib/helpers'
import type { ImovelVigencia } from './calendario-anual'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcularVencimento(mesRef: string, diaVenc: number): string {
  const [anoStr, mesStr] = mesRef.split('-')
  const ano = parseInt(anoStr)
  const mes = parseInt(mesStr)
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const dia = Math.min(diaVenc, ultimoDia)
  return `${String(ano)}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function labelMesLongo(mesRef: string): string {
  const [ano, mes] = mesRef.split('-').map(Number)
  const s = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(ano, mes - 1, 1))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function labelDataLonga(dataStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(dataStr + 'T00:00:00'))
}

function iniciais(nome: string): string {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type GerarAntecipadoItem = ImovelVigencia & {
  apelido: string
  endereco: string
  dia_vencimento: number
  inquilinos?: { id: string; nome: string; ativo: boolean }[] | null
}

interface Props {
  mes: string | null         // 'YYYY-MM' ou null = fechado
  imoveis: GerarAntecipadoItem[]
  onClose: () => void
  onConfirmado: (mes: string, registros: { valor: number; mesReferencia: string }[]) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GerarAntecipadoModal({ mes, imoveis, onClose, onConfirmado }: Props) {
  const [loading, setLoading] = useState(false)

  if (!mes) return null

  const mesRef = `${mes}-01`  // 'YYYY-MM-01'
  const mesLabel = labelMesLongo(mes)

  // Imóveis com vigência ativa no mês selecionado
  const imoveisMes = imoveis.filter(im => {
    if (!im.data_inicio_contrato) return false
    const inicio = im.data_inicio_contrato.slice(0, 7)
    if (mes < inicio) return false
    if (im.contrato_indeterminado) return true
    if (!im.data_fim_contrato) return false
    return mes <= im.data_fim_contrato.slice(0, 7)
  })

  if (!imoveisMes.length) return null

  async function handleConfirmar() {
    setLoading(true)
    const registrosCriados: { valor: number; mesReferencia: string }[] = []
    let erros = 0

    for (const imovel of imoveisMes) {
      const inquilinoAtivo = imovel.inquilinos?.find(i => i.ativo) ?? null
      const dataVencimento = calcularVencimento(mesRef, imovel.dia_vencimento)

      try {
        const res = await fetch('/api/alugueis/gerar-antecipado', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imovelId: imovel.id,
            inquilinoId: inquilinoAtivo?.id ?? null,
            mesReferencia: mesRef,
            valor: imovel.valor_aluguel,
            dataVencimento,
          }),
        })
        const json = await res.json()
        if (!res.ok) {
          if (res.status === 409) {
            // Já existe — considerar sucesso silencioso
            registrosCriados.push({ valor: imovel.valor_aluguel, mesReferencia: mesRef })
          } else {
            console.error(`[gerar-antecipado] ${imovel.apelido}:`, json.error)
            erros++
          }
        } else {
          registrosCriados.push({ valor: imovel.valor_aluguel, mesReferencia: mesRef })
        }
      } catch {
        erros++
      }
    }

    setLoading(false)

    if (registrosCriados.length > 0) {
      const plural = registrosCriados.length > 1
      toast.success(
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">
            {plural
              ? `${registrosCriados.length} cobranças de ${mesLabel} criadas!`
              : `Cobrança de ${mesLabel} criada!`}
          </span>
          <span className="text-xs text-slate-500">
            Acesse a lista para enviar o Pix ou boleto.
          </span>
          <Link
            href={`/alugueis?mes=${mes}`}
            className="text-xs font-medium text-emerald-600 underline mt-0.5"
          >
            Ver em {mesLabel.split(' ')[0]} →
          </Link>
        </div>,
      )
      onConfirmado(mes!, registrosCriados)
    }

    if (erros > 0 && registrosCriados.length === 0) {
      toast.error('Erro ao criar cobrança. Tente novamente.')
    }

    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-50 shrink-0">
              <CalendarClock className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">{mesLabel}</p>
              <p className="text-xs text-slate-500">Cobrança antecipada</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-7 w-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[60dvh] overflow-y-auto">
          {/* Aviso informativo */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              Você está gerando a cobrança com antecedência. O registro será criado agora e
              aparecerá na lista de aluguéis para você enviar o Pix ou boleto.
            </p>
          </div>

          {/* Card(s) de imóvel */}
          {imoveisMes.map(imovel => {
            const inquilinoAtivo = imovel.inquilinos?.find(i => i.ativo)
            const dataVenc = calcularVencimento(mesRef, imovel.dia_vencimento)
            const nomeInq = inquilinoAtivo?.nome ?? 'Sem inquilino'

            return (
              <div
                key={imovel.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
              >
                {/* Inquilino */}
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-[11px] font-bold text-emerald-700">
                    {iniciais(nomeInq)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 leading-tight truncate">{nomeInq}</p>
                    <p className="text-xs text-slate-500 truncate">{imovel.apelido}</p>
                    <p className="text-[11px] text-slate-400 truncate">{imovel.endereco}</p>
                  </div>
                </div>

                {/* Valor + Vencimento */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Valor</p>
                    <p className="text-base font-bold text-slate-800">{formatarMoeda(imovel.valor_aluguel)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Vencimento</p>
                    <p className="text-sm font-medium text-slate-700">{labelDataLonga(dataVenc)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex flex-col gap-2">
          <Button
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
            onClick={handleConfirmar}
            disabled={loading}
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Plus className="h-4 w-4" />}
            Gerar cobrança de {mesLabel.split(' ')[0]}
          </Button>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
