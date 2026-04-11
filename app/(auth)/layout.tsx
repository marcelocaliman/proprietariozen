export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex flex-col justify-between bg-[oklch(0.24_0.06_277.4)] text-white p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-bold text-lg">
            PZ
          </div>
          <span className="text-xl font-semibold tracking-tight">ProprietárioZen</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            Gerencie seus imóveis com tranquilidade
          </h1>
          <p className="text-[oklch(0.75_0.04_277.4)] text-lg leading-relaxed">
            Controle aluguéis, inquilinos e recibos em um só lugar. Simples, rápido e eficiente.
          </p>
        </div>

        <div className="flex gap-6 text-sm text-[oklch(0.65_0.04_277.4)]">
          <span>✦ Recibos em PDF</span>
          <span>✦ Cobranças automáticas</span>
          <span>✦ Reajuste por IGPM/IPCA</span>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white text-sm">
              PZ
            </div>
            <span className="text-lg font-semibold">ProprietárioZen</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
