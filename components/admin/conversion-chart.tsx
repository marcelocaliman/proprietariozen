'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

export type ConversionPoint = {
  mes_label: string
  taxa_conversao: number
  total: number
  pro: number
}

type TipProps = { active?: boolean; payload?: { dataKey?: string; value?: number }[]; label?: string }

function CustomTooltip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null
  const taxa  = payload.find(p => p.dataKey === 'taxa_conversao')?.value ?? 0
  const total = payload.find(p => p.dataKey === 'total')?.value ?? 0
  const pro   = payload.find(p => p.dataKey === 'pro')?.value ?? 0
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-xs shadow-lg space-y-1">
      <p className="font-semibold text-[#475569] mb-1.5">{label}</p>
      <p className="text-indigo-600">Conversão: <span className="font-bold text-[#0F172A]">{Number(taxa).toFixed(1)}%</span></p>
      <p className="text-[#64748B]">Cadastros: <span className="text-[#0F172A]">{total}</span></p>
      <p className="text-emerald-600">Master: <span className="text-[#0F172A]">{pro}</span></p>
    </div>
  )
}

export function ConversionChart({ data, meta = 10 }: { data: ConversionPoint[]; meta?: number }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
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
          tickFormatter={v => `${v}%`}
          domain={[0, 'auto']}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={meta}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          label={{ value: `Meta ${meta}%`, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
        />
        {/* Hidden lines for tooltip data */}
        <Line type="monotone" dataKey="total" hide />
        <Line type="monotone" dataKey="pro" hide />
        <Line
          type="monotone"
          dataKey="taxa_conversao"
          stroke="#818cf8"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#818cf8', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
