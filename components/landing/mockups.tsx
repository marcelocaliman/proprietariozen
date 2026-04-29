'use client'

/**
 * Mockups das telas internas do app, usados nos spotlights da landing.
 * Cada um é uma representação fiel-o-bastante usando Tailwind, sem precisar
 * de PNGs externos ou screenshots.
 */

// ─── Helpers de browser chrome ────────────────────────────────────────────────

function BrowserChrome({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl overflow-hidden border border-slate-200 bg-white w-full"
      style={{ boxShadow: '0 24px 48px rgba(15, 23, 42, 0.10)' }}
    >
      <div className="bg-slate-100 px-3 py-2 flex items-center gap-2 border-b border-slate-200">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28CA41]" />
        </div>
        <div className="flex-1 bg-white rounded px-2 py-0.5 text-[10px] text-slate-400 font-mono text-center border border-slate-200 truncate">
          {url}
        </div>
      </div>
      <div className="bg-[#F8FAFC]">{children}</div>
    </div>
  )
}

// ─── 1. Detalhe do imóvel (com tabs) ─────────────────────────────────────────

export function MockupImovelDetalhe() {
  return (
    <BrowserChrome url="proprietariozen.com.br/imoveis/123">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-slate-900 leading-tight">Apartamento Alto Leblon</p>
            <p className="text-[10px] text-slate-500">Rua Timoteo da Costa, 1100</p>
            <div className="flex gap-1 mt-1.5">
              <span className="text-[9px] font-semibold bg-emerald-600 text-white px-1.5 py-0.5 rounded">Ocupado</span>
              <span className="text-[9px] font-medium border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Asaas</span>
              <span className="text-[9px] font-medium border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">🛡 Caução</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {[
            { label: 'ALUGUEL MENSAL', value: 'R$ 3.000', sub: '' },
            { label: 'RECEBIDO 2026', value: 'R$ 12.000', sub: 'de R$ 12.000', color: '#059669' },
            { label: 'ADIMPLÊNCIA', value: '100%', sub: '12 meses', color: '#059669' },
            { label: 'PRÓX. VENC.', value: 'Dia 5', sub: 'de cada mês' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded p-2 border border-slate-100">
              <p className="text-[7px] text-slate-400 font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="text-[12px] font-bold mt-0.5 leading-none" style={{ color: s.color ?? '#0F172A' }}>{s.value}</p>
              {s.sub && <p className="text-[7px] text-slate-400 mt-0.5">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-slate-100 border border-slate-200 rounded-lg p-0.5 inline-flex gap-0.5 mb-3">
          {[
            { label: 'Visão geral', active: true },
            { label: 'Pagamentos' },
            { label: 'Inquilino' },
            { label: 'Garantia' },
            { label: 'Documentos' },
            { label: 'Histórico' },
          ].map(t => (
            <span
              key={t.label}
              className={`text-[9px] font-medium px-2 py-1 rounded ${
                t.active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {t.label}
            </span>
          ))}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-lg p-2.5 border border-slate-100">
            <p className="text-[9px] font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
              Contrato
            </p>
            <div className="space-y-1">
              {[['Início', '15/04/26'], ['Fim', '15/04/27'], ['Restante', '11 meses']].map(([k, v]) => (
                <div key={k} className="flex justify-between text-[8px]">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-900 font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-slate-100">
            <p className="text-[9px] font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
              Composição do aluguel
            </p>
            <div className="space-y-1">
              {[
                ['Aluguel base', 'R$ 3.000'],
                ['IPTU', 'R$ 200'],
                ['Condomínio', 'R$ 350'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-[8px]">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-900 font-medium">{v}</span>
                </div>
              ))}
              <div className="flex justify-between text-[8px] pt-1 border-t border-slate-100">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="font-bold text-emerald-700">R$ 3.550</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  )
}

// ─── 2. Cobrança Asaas (modal com PIX + boleto) ──────────────────────────────

export function MockupCobranca() {
  return (
    <BrowserChrome url="proprietariozen.com.br/alugueis">
      <div className="p-4 relative" style={{ minHeight: 320 }}>
        {/* Background blurred list */}
        <div className="opacity-30 pointer-events-none">
          <p className="text-[10px] font-bold text-slate-900 mb-2">Aluguéis · Maio 2026</p>
          {[
            { name: 'Maria Costa', sub: 'Apto 101 · Pago' },
            { name: 'João Silva', sub: 'Casa 2 · Pendente' },
          ].map(r => (
            <div key={r.name} className="bg-white rounded-lg p-2 mb-1 border border-slate-100 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-slate-200" />
              <p className="text-[8px] font-medium text-slate-700">{r.name}</p>
              <p className="text-[7px] text-slate-400 ml-auto">{r.sub}</p>
            </div>
          ))}
        </div>

        {/* Modal floating */}
        <div className="absolute inset-2 bg-white rounded-xl border border-slate-200 shadow-xl flex flex-col" style={{ boxShadow: '0 12px 40px rgba(15,23,42,0.20)' }}>
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-900">Cobrar aluguel de João Silva</p>
            <p className="text-[8px] text-slate-500">Casa Praia · Maio 2026 · R$ 2.400</p>
            <div className="flex gap-1 mt-1">
              <span className="text-[7px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Cobrança ativa</span>
              <span className="text-[7px] font-medium px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">Automático · Asaas</span>
            </div>
          </div>

          {/* Body */}
          <div className="px-3 py-2.5 flex-1 flex gap-3 items-start">
            {/* QR Code mock */}
            <div className="shrink-0">
              <div className="w-16 h-16 rounded border border-slate-200 bg-white p-1 flex items-center justify-center">
                <div className="w-full h-full grid grid-cols-7 gap-px">
                  {Array.from({ length: 49 }).map((_, i) => (
                    <div key={i} className={(i * 13) % 3 === 0 ? 'bg-slate-900' : 'bg-white'} />
                  ))}
                </div>
              </div>
              <p className="text-[7px] text-slate-400 text-center mt-1">PIX QR</p>
            </div>

            {/* Info + buttons */}
            <div className="flex-1 space-y-1.5">
              <div className="bg-slate-50 rounded p-1.5 border border-slate-100">
                <p className="text-[7px] font-medium text-slate-500 mb-0.5">PIX Copia e Cola</p>
                <p className="text-[7px] text-slate-700 font-mono truncate">000201265861.../...A6304XA52</p>
              </div>
              <div className="bg-blue-50 rounded p-1.5 border border-blue-200 flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                <p className="text-[8px] text-blue-700 font-medium">Ver boleto bancário</p>
              </div>
              <div className="bg-emerald-600 rounded p-1.5 flex items-center gap-1.5 justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <p className="text-[8px] text-white font-semibold">Enviar para joao@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  )
}

// ─── 3. Documentos do imóvel (drag and drop) ─────────────────────────────────

export function MockupDocumentos() {
  return (
    <BrowserChrome url="proprietariozen.com.br/imoveis/123">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-1.5 mb-2">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          <p className="text-[10px] font-bold text-slate-900">Documentos do imóvel</p>
        </div>

        {/* Drop zone */}
        <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-lg p-3 text-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" className="mx-auto mb-1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p className="text-[9px] font-medium text-slate-600">Arraste ou <span className="text-emerald-600 font-semibold">clique para selecionar</span></p>
          <p className="text-[7px] text-slate-400 mt-0.5">PDF, JPG, PNG · máx. 10 MB</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 flex-wrap">
          {[
            { label: 'Todos', count: 6, active: true },
            { label: 'Contrato', count: 1 },
            { label: 'Escritura', count: 1 },
            { label: 'Planta', count: 1 },
            { label: 'IPTU', count: 1 },
            { label: 'Foto', count: 2 },
          ].map(t => (
            <span
              key={t.label}
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-medium ${
                t.active
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 text-slate-600'
              }`}
            >
              {t.label}
              <span className={`rounded-full px-1 text-[7px] ${t.active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>
            </span>
          ))}
        </div>

        {/* List */}
        <div className="bg-white rounded border border-slate-100 divide-y divide-slate-50">
          {[
            { tipo: 'Contrato', icon: 'pdf', name: 'contrato_assinado_2026.pdf', size: '1.2 MB' },
            { tipo: 'Escritura', icon: 'pdf', name: 'matricula_imovel.pdf', size: '450 KB' },
            { tipo: 'IPTU', icon: 'pdf', name: 'iptu_2026.pdf', size: '180 KB' },
            { tipo: 'Foto', icon: 'img', name: 'sala_principal.jpg', size: '2.1 MB' },
          ].map(d => (
            <div key={d.name} className="flex items-center gap-2 px-2 py-1.5">
              {d.icon === 'pdf' ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[8px] font-medium text-slate-800 truncate">{d.name}</p>
                <p className="text-[7px] text-slate-400">{d.tipo} · {d.size}</p>
              </div>
              <div className="flex gap-0.5">
                <div className="w-3.5 h-3.5 rounded hover:bg-slate-100 flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
                <div className="w-3.5 h-3.5 rounded hover:bg-slate-100 flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BrowserChrome>
  )
}

// ─── 4. Timeline de eventos ──────────────────────────────────────────────────

export function MockupTimeline() {
  const eventos = [
    { tipo: 'futuro', cor: 'amber', label: 'Reajuste previsto', desc: 'IGP-M', data: '15/04/27' },
    { tipo: 'futuro', cor: 'amber', label: 'Fim previsto do contrato', desc: '', data: '15/04/27' },
    { tipo: 'pagamento', cor: 'emerald', label: 'Pagamento Maio/26', desc: 'R$ 3.000 · pago 2d antes', data: '03/05/26' },
    { tipo: 'pagamento', cor: 'emerald', label: 'Pagamento Abril/26', desc: 'R$ 3.000 · no prazo', data: '05/04/26' },
    { tipo: 'renovado', cor: 'emerald', label: 'Contrato renovado', desc: 'Novo fim: 15/04/27', data: '20/03/26' },
    { tipo: 'inquilino', cor: 'emerald', label: 'Inquilino: Maria Costa', desc: '', data: '15/04/25' },
  ]

  return (
    <BrowserChrome url="proprietariozen.com.br/imoveis/123">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold text-slate-900">Linha do tempo</p>
            <p className="text-[8px] text-slate-500">{eventos.length} eventos</p>
          </div>
          <div className="bg-white border border-slate-200 rounded px-2 py-1 text-[8px] font-medium text-slate-700 flex items-center gap-1">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/></svg>
            Exportar PDF
          </div>
        </div>

        {/* Timeline */}
        <div className="relative pl-5 space-y-1.5">
          <div className="absolute left-[7px] top-1 bottom-1 w-px bg-slate-200" />
          {eventos.map((e, i) => {
            const colorMap: Record<string, string> = {
              amber: 'bg-amber-50 text-amber-700 border border-amber-200',
              emerald: 'bg-emerald-100 text-emerald-700',
            }
            return (
              <div key={i} className="relative">
                <div className={`absolute -left-5 h-4 w-4 rounded-full flex items-center justify-center ${colorMap[e.cor]}`}>
                  <div className="w-1 h-1 rounded-full bg-current" />
                </div>
                <div className="bg-white rounded p-1.5 border border-slate-100 ml-1">
                  <div className="flex justify-between gap-2">
                    <p className="text-[9px] font-medium text-slate-900">{e.label}</p>
                    <p className="text-[7px] text-slate-400 shrink-0">{e.data}</p>
                  </div>
                  {e.desc && <p className="text-[7px] text-slate-500">{e.desc}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </BrowserChrome>
  )
}
