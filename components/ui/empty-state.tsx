import { type LucideIcon } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  primaryCta?: {
    label: string
    onClick?: () => void
    href?: string
    icon?: LucideIcon
  }
  secondaryCta?: {
    label: string
    onClick?: () => void
    href?: string
  }
  steps?: { title: string; desc: string }[]
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryCta,
  secondaryCta,
  steps,
  className,
}: EmptyStateProps) {
  const PrimaryIcon = primaryCta?.icon

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-100 bg-gradient-to-br from-white via-white to-emerald-50/30 px-6 py-12 sm:py-16',
        className,
      )}
    >
      <div className="max-w-xl mx-auto text-center flex flex-col items-center gap-5">
        <div className="h-16 w-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <Icon className="h-8 w-8 text-emerald-600" />
        </div>

        <div className="space-y-2">
          <h2
            className="font-extrabold tracking-tight text-slate-900 leading-tight"
            style={{ letterSpacing: '-0.025em', fontSize: 'clamp(20px, 2vw, 26px)' }}
          >
            {title}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
            {description}
          </p>
        </div>

        {(primaryCta || secondaryCta) && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {primaryCta && (
              primaryCta.href ? (
                <a
                  href={primaryCta.href}
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors"
                >
                  {PrimaryIcon && <PrimaryIcon className="h-4 w-4" />}
                  {primaryCta.label}
                </a>
              ) : (
                <Button
                  onClick={primaryCta.onClick}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 px-5 h-10 text-sm font-semibold"
                >
                  {PrimaryIcon && <PrimaryIcon className="h-4 w-4" />}
                  {primaryCta.label}
                </Button>
              )
            )}
            {secondaryCta && (
              secondaryCta.href ? (
                <a
                  href={secondaryCta.href}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline px-3 py-2"
                >
                  {secondaryCta.label}
                </a>
              ) : (
                <button
                  onClick={secondaryCta.onClick}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline px-3 py-2"
                >
                  {secondaryCta.label}
                </button>
              )
            )}
          </div>
        )}

        {steps && steps.length > 0 && (
          <div className="w-full pt-6 mt-2 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
              Como funciona
            </p>
            <ol className="grid gap-3 sm:grid-cols-3 text-left">
              {steps.map((s, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 flex flex-col gap-1"
                >
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold mb-1">
                    {i + 1}
                  </span>
                  <p className="text-xs font-bold text-slate-900">{s.title}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
