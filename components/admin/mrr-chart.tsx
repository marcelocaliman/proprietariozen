'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

export type MrrMonth = {
  mes: string
  mes_label: string
  mrr_bruto: number
  mrr_liquido: number
  churn_valor: number
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

type TipProps = { active?: boolean; payload?: { dataKey?: string; value?: number }[]; label?: string }

function CustomTooltip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null
  const bruto   = payload.find(p => p.dataKey === 'mrr_bruto')?.value ?? 0
  const liquido = payload.find(p => p.dataKey === 'mrr_liquido')?.value ?? 0
  const churn   = payload.find(p => p.dataKey === 'churn_valor')?.value ?? 0
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-xs shadow-lg space-y-1">
      <p className="font-semibold text-[#475569] mb-1.5">{label}</p>
      <p className="text-emerald-600">MRR: <span className="font-bold text-[#0F172A]">{fmt(Number(bruto))}</span></p>
      {Number(churn) > 0 && (
        <p className="text-red-600">Churn: <span className="font-bold text-[#0F172A]">-{fmt(Number(churn))}</span></p>
      )}
      <p className="text-amber-600">Líquido: <span className="font-bold text-[#0F172A]">{fmt(Number(liquido))}</span></p>
    </div>
  )
}

export function MrrChart({ data }: { data: MrrMonth[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="mes_label"
          tick={{ fill: '#64748b', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 12 }}
          formatter={(value) =>
            value === 'mrr_bruto' ? 'MRR Bruto' : value === 'mrr_liquido' ? 'MRR Líquido' : value
          }
        />
        <Bar dataKey="mrr_bruto" fill="#10b981" opacity={0.8} radius={[3, 3, 0, 0]} />
        <Line
          type="monotone"
          dataKey="mrr_liquido"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ r: 3, fill: '#f59e0b' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
