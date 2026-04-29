import type { Metadata } from 'next'
import { LogoWhite, LogoColor } from '@/components/ui/logo'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const ANO_ATUAL = new Date().getFullYear()

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[55fr_45fr]">
      {/* ── Left panel — branding ── */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #022C22 0%, #064E3B 50%, #022C22 100%)' }}
      >
        {/* Glow effects */}
        <div className="auth-blob-1" />
        <div className="auth-blob-2" />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
          aria-hidden="true"
        />

        {/* Logo */}
        <div className="relative z-10">
          <LogoWhite iconSize={36} />
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-10 max-w-[520px]">
          <div className="space-y-5">
            <h1
              className="font-extrabold leading-[0.95] text-white"
              style={{ letterSpacing: '-0.035em', fontSize: 'clamp(36px, 4.5vw, 56px)' }}
            >
              Gestão de aluguéis,{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #6EE7B7 0%, #34D399 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                de verdade.
              </span>
            </h1>
            <p className="text-emerald-100/80 leading-relaxed" style={{ fontSize: 18 }}>
              Cobrança automática Pix + boleto, controle de garantia, encargos, documentos e linha do tempo. Tudo num lugar.
            </p>
          </div>

          {/* Feature tags */}
          <div className="flex flex-wrap gap-2">
            {['Asaas', 'Multa & juros', 'IPTU + condomínio', 'Fiador & seguro', 'Recibo PDF'].map(tag => (
              <span
                key={tag}
                className="text-[12px] font-medium px-3 py-1.5 rounded-full text-emerald-100"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(110, 231, 183, 0.2)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Mini dashboard mockup */}
          <div
            className="rounded-2xl p-5 backdrop-blur-sm"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
              border: '1px solid rgba(110, 231, 183, 0.15)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-emerald-300/60 uppercase tracking-widest font-semibold">Painel · Hoje</span>
              <span className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"
                  style={{ animation: 'auth-blink 2s ease-in-out infinite' }}
                />
                Ao vivo
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'Imóveis', value: '12' },
                { label: 'Inquilinos', value: '10' },
                { label: 'Recebido', value: 'R$ 14k' },
              ].map(stat => (
                <div
                  key={stat.label}
                  className="rounded-xl p-3 text-center"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <p className="text-[10px] text-emerald-200/50 uppercase tracking-wide font-medium">{stat.label}</p>
                  <p
                    className="text-lg font-extrabold mt-0.5"
                    style={{
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #6EE7B7 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* List */}
            <div className="space-y-1.5">
              {[
                { name: 'Apt Alto Leblon', sub: 'Maio · R$ 3.000', tag: 'Pago', tone: 'emerald' as const },
                { name: 'Casa Praia', sub: 'Maio · R$ 2.400', tag: 'Vence em 3d', tone: 'amber' as const },
                { name: 'Studio Centro', sub: 'Maio · R$ 1.800', tag: 'PIX enviado', tone: 'blue' as const },
              ].map(item => {
                const tones = {
                  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
                  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
                  blue: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
                } as const
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-white/85 font-medium truncate">{item.name}</p>
                      <p className="text-[10px] text-emerald-200/40">{item.sub}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ml-2 ${tones[item.tone]}`}>
                      {item.tag}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-emerald-200/40">
          <p className="text-xs">© {ANO_ATUAL} ProprietárioZen</p>
          <p className="text-xs">100% brasileiro · LGPD</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex items-center justify-center p-8 sm:p-12 bg-white min-h-screen">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-12 lg:hidden">
            <LogoColor iconSize={32} href="/" />
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
