import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { CobrancaIssue } from '@/lib/cobranca-health'

const TITULO: Record<CobrancaIssue['tipo'], string> = {
  plano_insuficiente: 'Cobrança automática requer plano Master',
  asaas_nao_vinculado: 'Conta Asaas ainda não vinculada',
  sem_chave_pix: 'Chave PIX não configurada',
  inquilino_sem_cpf: 'Inquilino sem CPF cadastrado',
  inquilino_sem_email: 'Inquilino sem e-mail cadastrado',
}

const DETALHE: Record<CobrancaIssue['tipo'], string> = {
  plano_insuficiente: 'Imóveis em modo automático precisam de plano pago para gerar cobrança via Asaas.',
  asaas_nao_vinculado: 'Sem a conta Asaas vinculada, imóveis em modo automático não conseguem gerar PIX/boleto.',
  sem_chave_pix: 'Sem PIX cadastrado, imóveis em modo manual não geram QR Code para o inquilino.',
  inquilino_sem_cpf: 'O Asaas exige CPF para criar a cobrança. Sem ele, o aluguel desse imóvel falha.',
  inquilino_sem_email: 'Sem e-mail cadastrado, o inquilino não recebe a cobrança automaticamente.',
}

export function CobrancaHealthCard({ issues }: { issues: CobrancaIssue[] }) {
  if (!issues.length) return null

  return (
    <Card className="border-amber-200 bg-amber-50/60">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2 shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-900">
              {issues.length} pendência{issues.length !== 1 ? 's' : ''} para suas cobranças funcionarem 100%
            </h3>
            <p className="text-xs text-amber-700 mt-0.5">
              Resolva os itens abaixo para que a geração e envio de aluguéis aconteça sem interrupção.
            </p>
          </div>
        </div>

        <ul className="space-y-2">
          {issues.map((issue, idx) => {
            const escopo = 'imovelApelido' in issue
              ? `${issue.imovelApelido}${issue.inquilinoNome ? ` · ${issue.inquilinoNome}` : ''}`
              : null

            return (
              <li
                key={`${issue.tipo}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {TITULO[issue.tipo]}
                  </p>
                  {escopo && (
                    <p className="text-xs text-slate-600 mt-0.5">{escopo}</p>
                  )}
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {DETALHE[issue.tipo]}
                  </p>
                </div>
                <Link
                  href={issue.cta.href}
                  className="inline-flex items-center gap-1 shrink-0 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium px-3 py-1.5 transition-colors"
                >
                  {issue.cta.label}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
