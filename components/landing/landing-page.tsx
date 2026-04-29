'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LogoColor, LogoWhite } from '@/components/ui/logo'
import {
  MockupImovelDetalhe, MockupCobranca, MockupDocumentos, MockupTimeline,
} from '@/components/landing/mockups'

// ─── Browser + Dashboard Mockup ──────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div
      className="rounded-[12px] overflow-hidden border border-slate-200/80 w-full"
      style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.12)' }}
      role="img"
      aria-label="Interface do dashboard ProprietárioZen mostrando painel de gestão de imóveis com recebimentos, pendências e inquilinos"
    >
      {/* Browser chrome */}
      <div className="bg-[#F1F5F9] px-4 py-2.5 flex items-center gap-3 border-b border-slate-200">
        <div className="flex gap-1.5 shrink-0" aria-hidden="true">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28CA41]" />
        </div>
        <div className="flex-1 bg-white rounded-md px-3 py-1 text-[11px] text-slate-400 font-mono text-center border border-slate-200" aria-hidden="true">
          proprietariozen.com.br
        </div>
      </div>
      {/* Dashboard UI */}
      <div className="bg-[#F8FAFC] p-4" aria-hidden="true">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Dashboard</p>
            <p className="text-[14px] font-bold text-slate-900 leading-tight">Abril 2025</p>
          </div>
          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-[9px] font-bold text-emerald-700">MC</span>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Recebido', value: 'R$ 7.200', sub: '↑ 3 pagos', subColor: '#059669', topColor: '#D1FAE5' },
            { label: 'Pendente', value: 'R$ 1.800', sub: '1 aguardando', subColor: '#D97706', topColor: '#FEF3C7' },
            { label: 'Imóveis',  value: '4',        sub: 'ativos',      subColor: '#0284C7', topColor: '#DBEAFE' },
          ].map(({ label, value, sub, subColor, topColor }) => (
            <div key={label} className="bg-white rounded-lg p-2.5 border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg" style={{ background: topColor }} />
              <p className="text-[8px] text-slate-400 font-semibold uppercase tracking-wide mb-1 mt-0.5">{label}</p>
              <p className="text-[13px] font-bold text-slate-900 leading-none mb-1">{value}</p>
              <p className="text-[8px] font-medium" style={{ color: subColor }}>{sub}</p>
            </div>
          ))}
        </div>
        {/* Recent list */}
        <div className="bg-white rounded-lg border border-slate-100">
          <p className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider px-3 pt-2 pb-1.5">Registros do mês</p>
          {[
            { initials: 'MC', bg: '#D1FAE5', color: '#059669', name: 'Maria Costa',  sub: 'Apto 101 · R$ 2.400', badge: 'Pago',    badgeBg: '#D1FAE5', badgeColor: '#065F46' },
            { initials: 'JS', bg: '#FEF3C7', color: '#D97706', name: 'João Silva',   sub: 'Casa 2 · R$ 3.200',   badge: 'Pendente', badgeBg: '#FEF3C7', badgeColor: '#92400E' },
            { initials: 'AL', bg: '#D1FAE5', color: '#059669', name: 'Ana Lima',     sub: 'Apto 203 · R$ 1.600', badge: 'Pago',    badgeBg: '#D1FAE5', badgeColor: '#065F46' },
          ].map(({ initials, bg, color, name, sub, badge, badgeBg, badgeColor }) => (
            <div key={name} className="flex items-center px-3 py-2 gap-2.5 border-t border-slate-50 first:border-t-0">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold" style={{ background: bg, color }}>{initials}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-slate-800 leading-none mb-0.5">{name}</p>
                <p className="text-[9px] text-slate-400">{sub}</p>
              </div>
              <div className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: badgeBg, color: badgeColor }}>{badge}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Feature cards data ───────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
    title: 'Cobrança Pix + boleto automática',
    desc: 'Integração Asaas: dia 1 do mês o app gera a cobrança e envia pro inquilino com PIX QR Code, copia-e-cola e link do boleto.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/></svg>,
    title: 'Lembrete 3 dias antes do vencimento',
    desc: 'Inquilino recebe email com o PIX em mãos. Você recebe um aviso de acompanhamento. Sem precisar cobrar pessoalmente.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    title: 'Garantia, fiador e seguro fiança',
    desc: 'Cadastre o tipo de garantia de cada contrato — caução, fiador, seguro fiança ou título de capitalização. Tudo organizado.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    title: 'IPTU, condomínio e encargos extras',
    desc: 'Some IPTU, condomínio e outros encargos ao aluguel base — tudo numa única cobrança mensal, com snapshot histórico para o IR.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
    title: 'Documentos do imóvel e do inquilino',
    desc: 'Contrato, escritura, plantas, IPTU, fotos, RG, comprovante de renda. Upload por arrastar e soltar, organizado por categoria.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    title: 'Linha do tempo de cada imóvel',
    desc: 'Veja todo o histórico em uma timeline visual: pagamentos, atrasos, reajustes, renovações. Exporta em PDF para arquivo.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    title: 'Adimplência e pontualidade calculadas',
    desc: 'Veja em % quanto cada inquilino é pontual. Identifique padrões antes que viram problema.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11H1l8-8 8 8h-8v10"/><path d="M21 14l-8 8-8-8h8V4"/></svg>,
    title: 'Trocar inquilino sem perder histórico',
    desc: 'Saiu um, entra outro: encerra o contrato, mantém todos os pagamentos antigos e vincula o novo num fluxo guiado.',
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    title: 'Recibo PDF em 1 clique',
    desc: 'PDF profissional com todos os dados legais. Envie por email ou WhatsApp direto do app.',
  },
]

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=56&h=56&fit=crop&crop=face',
    name: 'Carla Mendes',
    role: 'Proprietária · 2 apartamentos · São Paulo, SP',
    text: 'Eu cobrava aluguel pelo WhatsApp há 6 anos. Tinha vergonha de cobrar de novo quando atrasava. Agora o app manda, não eu. Mudou minha relação com os inquilinos.',
  },
  {
    photo: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=56&h=56&fit=crop&crop=face',
    name: 'Roberto Farias',
    role: 'Proprietário · 3 imóveis · Rio de Janeiro, RJ',
    text: 'Herdei 3 imóveis do meu pai e não sabia como gerenciar. O ProprietárioZen me deu controle total em menos de uma semana. Inclusive o reajuste pelo IGPM que eu sempre esquecia.',
  },
  {
    photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=56&h=56&fit=crop&crop=face',
    name: 'Fernanda Santos',
    role: 'Proprietária · 1 kitnet · Curitiba, PR',
    text: 'Tenho só uma kitnet mas perdia muito tempo com isso. Agora recebo o recibo no email, o inquilino recebe o dele e eu não preciso fazer nada. Vale muito os R$ 49,90.',
  },
]

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: 'Como gerenciar imóveis sem imobiliária?',
    a: 'Com o ProprietárioZen, você faz toda a gestão de imóveis diretamente no app, sem depender de imobiliária. Centralize contratos de locação, cobranças automáticas de aluguel, reajustes e recibos PDF num único painel.',
  },
  {
    q: 'O app funciona para proprietário de apartamento para alugar?',
    a: 'Sim! O ProprietárioZen é o app ideal para proprietário de apartamento, casa ou qualquer imóvel para alugar. Você gerencia um ou vários imóveis no mesmo painel, com dashboards individuais por propriedade.',
  },
  {
    q: 'Como cobrar aluguel automaticamente pelo celular?',
    a: 'Basta cadastrar o contrato e a data de vencimento. O app para proprietários envia notificações automáticas por e-mail para o locatário antes do vencimento e em caso de inadimplência — sem você precisar fazer nada.',
  },
  {
    q: 'Qual é o melhor app para controlar aluguel no Brasil?',
    a: 'O ProprietárioZen está entre os mais completos softwares para proprietário de imóvel no mercado. Gestão de imóveis grátis para começar, controle de inadimplência, reajuste automático por IGPM/IPCA, app de aluguel Brasil — tudo em um lugar.',
  },
]

// ─── Main component ───────────────────────────────────────────────────────────

export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled]     = useState(false)
  const [faqOpen, setFaqOpen]       = useState<number | null>(null)

  useEffect(() => {
    // Fade-in on scroll
    const els = document.querySelectorAll('.lp-fade')
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('lp-visible'); obs.unobserve(e.target) }
      })
    }, { threshold: 0.1 })
    els.forEach(el => obs.observe(el))

    // Navbar shadow on scroll
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => { obs.disconnect(); window.removeEventListener('scroll', onScroll) }
  }, [])

  return (
    <>
      <style>{`
        html { scroll-behavior: smooth; }
        .lp-fade { opacity: 0; transform: translateY(22px); transition: opacity .6s ease, transform .6s ease; }
        .lp-fade.lp-visible { opacity: 1; transform: translateY(0); }
        .lp-delay-1 { transition-delay: .1s; }
        .lp-delay-2 { transition-delay: .2s; }
        .lp-delay-3 { transition-delay: .3s; }
        .lp-delay-4 { transition-delay: .4s; }
        .lp-delay-5 { transition-delay: .5s; }
        @keyframes lp-float-card { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        .lp-float-1 { animation: lp-float-card 3s ease-in-out infinite; }
        .lp-float-2 { animation: lp-float-card 3s ease-in-out 1.5s infinite; }
        @keyframes lp-blink { 0%,100% { opacity:1; } 50% { opacity:.25; } }
        .lp-blink { animation: lp-blink 2s ease-in-out infinite; }
        @keyframes lp-blob { 0%,100% { transform:translate(0,0) scale(1); } 33% { transform:translate(24px,-24px) scale(1.06); } 66% { transform:translate(-16px,12px) scale(.97); } }
        .lp-blob-1 { animation: lp-blob 8s ease-in-out infinite; }
        .lp-blob-2 { animation: lp-blob 11s ease-in-out reverse infinite; }
        .lp-feat-card { transition: transform .2s ease, box-shadow .2s ease; }
        .lp-feat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(5,150,105,.10); }
        .lp-card { transition: transform .25s ease, box-shadow .25s ease; }
        .lp-card:hover { transform: translateY(-4px); box-shadow: 0 16px 44px rgba(5,150,105,.12); }
        .faq-row { transition: background-color .15s ease; cursor: pointer; }
        .faq-row:hover { background-color: #F0FDF4; }
      `}</style>

      {/* ── HEADER / NAVBAR ── */}
      <header role="banner">
        <nav
          aria-label="Navegação principal"
          className={`sticky top-0 z-50 bg-white/96 backdrop-blur-md border-b border-[#D1FAE5] transition-shadow duration-200 ${scrolled ? 'shadow-[0_1px_12px_rgba(0,0,0,0.08)]' : ''}`}
        >
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <LogoColor href="/" iconSize={36} />
            <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
              {[['#funcionalidades','Funcionalidades'],['#como-funciona','Como funciona'],['#depoimentos','Depoimentos'],['#precos','Preços']].map(([href,label]) => (
                <li key={href}><a href={href} className="text-[#374151] hover:text-[#059669] font-medium text-sm transition-colors">{label}</a></li>
              ))}
            </ul>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="text-sm font-semibold text-[#374151] hover:text-[#059669] px-4 py-2 transition-colors">Entrar</Link>
              <Link href="/cadastro" className="bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:-translate-y-px shadow-sm">Começar grátis</Link>
            </div>
            <button
              className="md:hidden p-2 rounded-lg hover:bg-[#F0FDF4]"
              onClick={() => setMobileOpen(v => !v)}
              aria-label={mobileOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
              aria-expanded={mobileOpen}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
          {mobileOpen && (
            <div className="md:hidden border-t border-[#D1FAE5] bg-white px-6 py-4 flex flex-col gap-1">
              {[['#funcionalidades','Funcionalidades'],['#como-funciona','Como funciona'],['#depoimentos','Depoimentos'],['#precos','Preços']].map(([href,label]) => (
                <a key={href} href={href} onClick={() => setMobileOpen(false)} className="text-[#374151] font-medium py-2.5 text-base">{label}</a>
              ))}
              <div className="flex gap-3 mt-3 pt-3 border-t border-[#F1F5F9]">
                <Link href="/login" className="flex-1 text-center border border-[#D1FAE5] text-[#059669] font-semibold py-2.5 rounded-xl text-sm">Entrar</Link>
                <Link href="/cadastro" className="flex-1 text-center bg-[#059669] text-white font-semibold py-2.5 rounded-xl text-sm">Começar grátis</Link>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main id="main-content">

        {/* ── HERO ── */}
        <section id="hero" aria-labelledby="hero-title" className="relative overflow-hidden bg-white" style={{ padding: '80px 0 100px' }}>
          {/* Subtle bg gradient */}
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 60% 40%, rgba(209,250,229,0.35) 0%, transparent 70%)' }} aria-hidden="true" />

          <div className="max-w-6xl mx-auto px-6 relative">
            <div className="grid lg:grid-cols-[55fr_45fr] gap-12 lg:gap-16 items-center">

              {/* ── Left: Text ── */}
              <div>
                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 mb-6 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 font-medium" style={{ fontSize: 13, padding: '6px 14px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  Mais de 2.400 proprietários confiam
                </div>

                {/* Headline */}
                <h1 id="hero-title" className="font-extrabold leading-[1.1] mb-6" style={{ letterSpacing: '-0.02em' }}>
                  <span className="block text-slate-900" style={{ fontSize: 'clamp(36px, 4.5vw, 56px)' }}>O app completo para</span>
                  <span className="block text-emerald-600" style={{ fontSize: 'clamp(36px, 4.5vw, 56px)' }}>quem aluga imóveis.</span>
                </h1>

                {/* Subheadline */}
                <p className="text-slate-500 font-normal leading-relaxed mb-10 max-w-[480px]" style={{ fontSize: 20 }}>
                  Cobrança automática Pix + boleto, controle de garantia, encargos, documentos, timeline — tudo num lugar. O que era planilha agora é gestão profissional.
                </p>

                {/* CTA */}
                <div className="mb-8">
                  <Link
                    href="/cadastro"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all hover:-translate-y-0.5"
                    style={{ padding: '16px 32px', fontSize: 16, borderRadius: 10, boxShadow: '0 4px 16px rgba(5,150,105,0.25)' }}
                  >
                    Criar conta grátis agora
                  </Link>
                  <p className="mt-2.5 text-slate-400" style={{ fontSize: 12 }}>Sem cartão de crédito · Cancele quando quiser</p>
                </div>

                {/* Social proof inline */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex" aria-hidden="true">
                    {[
                      { src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face', alt: '' },
                      { src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face', alt: '' },
                      { src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face', alt: '' },
                      { src: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face', alt: '' },
                      { src: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face', alt: '' },
                    ].map(({ src, alt }, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={src}
                        alt={alt}
                        width={32}
                        height={32}
                        loading="lazy"
                        className="w-8 h-8 rounded-full border-2 border-white object-cover"
                        style={{ marginLeft: i > 0 ? -8 : 0 }}
                      />
                    ))}
                  </div>
                  <p style={{ fontSize: 13 }} className="text-slate-600">
                    <span className="text-amber-400">★★★★★</span>
                    <span className="ml-1">Avaliado por proprietários em todo o Brasil</span>
                  </p>
                </div>
              </div>

              {/* ── Right: Visual ── */}
              <div className="relative flex justify-center lg:justify-end mt-10 lg:mt-0">
                <div className="relative w-full max-w-[480px]">

                  {/* Floating card 1 — payment received */}
                  <div className="lp-float-1 absolute -top-5 -right-4 hidden lg:flex bg-white rounded-[12px] z-10 items-center gap-3 px-4 py-3" style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.12)', borderRadius: 12 }} aria-hidden="true">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-900 leading-none mb-1">Pagamento recebido</p>
                      <p className="text-[12px] text-slate-500 leading-none">Marcelo · Apto Alto Leblon · R$ 3.000</p>
                    </div>
                  </div>

                  {/* Floating card 2 — monthly stat */}
                  <div className="lp-float-2 absolute -bottom-5 -left-4 hidden lg:flex bg-white rounded-[12px] z-10 flex-col px-4 py-3" style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.12)', borderRadius: 12 }} aria-hidden="true">
                    <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium mb-1">Este mês</p>
                    <p className="text-[20px] font-bold text-emerald-600 leading-none mb-1">R$ 9.400</p>
                    <p className="text-[12px] text-slate-500">↑ 3 imóveis pagos</p>
                  </div>

                  {/* Browser mockup */}
                  <DashboardMockup />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF ── */}
        <section aria-label="Mais de 2.400 proprietários de imóveis confiam no ProprietárioZen" className="bg-[#F0FDF4]">
          <div className="max-w-6xl mx-auto px-6 pt-8 pb-10">
            <div className="border-b border-slate-200 mb-6" />
            <p className="text-center text-[13px] text-slate-400 mb-8">Proprietários de todo o Brasil já usam o ProprietárioZen</p>
            <div className="flex flex-wrap items-center justify-center gap-10 opacity-50" aria-hidden="true">
              {[
                [<svg key="v" width="16" height="16" viewBox="0 0 24 24" fill="#374151"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21" stroke="#374151" strokeWidth="2"/><line x1="12" y1="17" x2="12" y2="21" stroke="#374151" strokeWidth="2"/></svg>,'VivaReal'],
                [<svg key="z" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>,'ZAP Imóveis'],
                [<svg key="s" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,'Stripe'],
                [<svg key="m" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,'Mailgun'],
                [<svg key="sp" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,'Supabase'],
              ].map(([icon, name]) => (
                <div key={name as string} className="flex items-center gap-2 font-bold text-[17px] text-[#374151]">{icon}{name}</div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="funcionalidades" aria-labelledby="funcionalidades-title" className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-16 lp-fade">
              <span className="text-xs font-semibold text-[#059669] uppercase tracking-widest">Funcionalidades</span>
              <h2 id="funcionalidades-title" className="text-[36px] lg:text-[40px] font-bold text-[#1F2937] leading-[1.2] mt-3 mb-4">
                Tudo que você precisa.<br />Nada que você não precisa.
              </h2>
              <p className="text-[17px] text-[#6B7280] max-w-lg leading-relaxed">
                Feito para quem tem 1 a 5 imóveis e não quer virar gerente de imobiliária.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map(({ icon, title, desc }, i) => (
                <div key={title} className={`lp-fade lp-delay-${i % 3 === 0 ? 0 : i % 3} lp-feat-card bg-white rounded-2xl border border-[#E5F7F0] p-8 cursor-default`}>
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-5 shrink-0">{icon}</div>
                  <h3 className="font-semibold text-[#1F2937] text-[16px] mb-2 leading-snug">{title}</h3>
                  <p className="text-sm text-[#6B7280] leading-[1.75]">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SPOTLIGHTS — Telas reais do app ── */}
        <section aria-labelledby="spotlights-title" className="py-24 bg-gradient-to-b from-white to-emerald-50/40">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16 lp-fade">
              <span className="text-xs font-semibold text-[#059669] uppercase tracking-widest">Por dentro do app</span>
              <h2 id="spotlights-title" className="text-[36px] lg:text-[44px] font-bold text-[#1F2937] leading-[1.15] mt-3 max-w-2xl mx-auto">
                Cada imóvel ganha uma página completa
              </h2>
              <p className="text-[17px] text-[#6B7280] mt-4 max-w-xl mx-auto leading-relaxed">
                Veja tudo o que importa de cada propriedade num lugar só — financeiro, contrato, inquilino, garantia, documentos e histórico.
              </p>
            </div>

            <div className="space-y-24">
              {/* Spotlight 1 — Detalhe do imóvel */}
              <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                <div className="lp-fade order-2 lg:order-1">
                  <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded mb-4">Página de detalhe do imóvel</span>
                  <h3 className="text-[28px] lg:text-[34px] font-bold text-slate-900 leading-tight mb-4">
                    Tudo do imóvel <br/>numa única tela
                  </h3>
                  <p className="text-slate-600 text-[17px] leading-relaxed mb-6">
                    Stats financeiros, contrato vigente, dados do inquilino, garantia, encargos, histórico e configurações organizados em abas.
                  </p>
                  <ul className="space-y-2 text-slate-700">
                    {[
                      'Adimplência calculada nos últimos 12 meses',
                      'Banner de alerta quando contrato está vencendo',
                      'Composição do aluguel: base + IPTU + condomínio',
                      'Botão "Cobrar agora" sempre acessível',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-2 text-[15px]">
                        <svg className="shrink-0 mt-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lp-fade lp-delay-1 order-1 lg:order-2">
                  <MockupImovelDetalhe />
                </div>
              </div>

              {/* Spotlight 2 — Cobrança automática */}
              <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                <div className="lp-fade">
                  <MockupCobranca />
                </div>
                <div className="lp-fade lp-delay-1">
                  <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded mb-4">Cobrança automática Pix + boleto</span>
                  <h3 className="text-[28px] lg:text-[34px] font-bold text-slate-900 leading-tight mb-4">
                    O app cobra. <br/>Você só recebe.
                  </h3>
                  <p className="text-slate-600 text-[17px] leading-relaxed mb-6">
                    Integração nativa com Asaas. Dia 1 do mês a cobrança é gerada e o inquilino recebe email com PIX QR Code, copia-e-cola e link do boleto. Tudo sem você tocar.
                  </p>
                  <ul className="space-y-2 text-slate-700">
                    {[
                      'PIX QR Code + boleto bancário em uma cobrança',
                      'Webhook atualiza status quando inquilino paga',
                      'Lembrete automático 3 dias antes do vencimento',
                      'Botão "Cobrar todos" pra disparar em massa',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-2 text-[15px]">
                        <svg className="shrink-0 mt-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Spotlight 3 — Documentos */}
              <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                <div className="lp-fade order-2 lg:order-1">
                  <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded mb-4">Documentos digitais</span>
                  <h3 className="text-[28px] lg:text-[34px] font-bold text-slate-900 leading-tight mb-4">
                    Adeus pasta <br/>de papel
                  </h3>
                  <p className="text-slate-600 text-[17px] leading-relaxed mb-6">
                    Contrato, escritura, plantas, IPTU, fotos, RG do inquilino, comprovante de renda. Tudo em PDF ou imagem, organizado por categoria, com upload por arrastar e soltar.
                  </p>
                  <ul className="space-y-2 text-slate-700">
                    {[
                      'Documentos por imóvel e por inquilino',
                      'Visualização in-line + download em 1 clique',
                      'Categorização automática por tipo',
                      'Armazenamento seguro com criptografia',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-2 text-[15px]">
                        <svg className="shrink-0 mt-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lp-fade lp-delay-1 order-1 lg:order-2">
                  <MockupDocumentos />
                </div>
              </div>

              {/* Spotlight 4 — Timeline */}
              <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                <div className="lp-fade">
                  <MockupTimeline />
                </div>
                <div className="lp-fade lp-delay-1">
                  <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded mb-4">Histórico cronológico</span>
                  <h3 className="text-[28px] lg:text-[34px] font-bold text-slate-900 leading-tight mb-4">
                    Toda a história <br/>do imóvel, visual
                  </h3>
                  <p className="text-slate-600 text-[17px] leading-relaxed mb-6">
                    Linha do tempo completa: pagamentos com pontualidade, atrasos, renovações, reajustes previstos, fim de contrato. Exporta em PDF para arquivar ou enviar pro contador.
                  </p>
                  <ul className="space-y-2 text-slate-700">
                    {[
                      'Eventos passados e futuros no mesmo lugar',
                      'Indica pontualidade ("pago 2d antes", "no prazo")',
                      'Exportação em PDF com 1 clique',
                      'Audit trail completo de cada imóvel',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-2 text-[15px]">
                        <svg className="shrink-0 mt-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── APP COMPLETO — Checklist ── */}
        <section aria-labelledby="completo-title" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14 lp-fade">
              <span className="text-xs font-semibold text-[#059669] uppercase tracking-widest">Solução completa</span>
              <h2 id="completo-title" className="text-[36px] lg:text-[44px] font-bold text-[#1F2937] leading-[1.15] mt-3">
                Tudo que um gestor profissional precisa
              </h2>
              <p className="text-[17px] text-[#6B7280] mt-4 max-w-xl mx-auto">
                Não é uma planilha turbinada. É uma plataforma de gestão imobiliária pensada de ponta a ponta.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 lp-fade">
              {[
                {
                  titulo: 'Cobrança',
                  items: [
                    'Cobrança Pix + boleto via Asaas',
                    'Geração automática dia 1 do mês',
                    'Email automático ao inquilino',
                    'Lembrete 3 dias antes do vencimento',
                    'Multa, juros e desconto configuráveis',
                    'Webhook atualiza status do pagamento',
                  ],
                },
                {
                  titulo: 'Contratos',
                  items: [
                    'Vigência com prazos pré-definidos',
                    'Renovação em 1 clique (+6/+12/+24 meses)',
                    'Reajuste IGP-M, IPCA ou percentual fixo',
                    'Encerramento de contrato guiado',
                    'Alerta de fim configurável por imóvel',
                    'Trocar inquilino sem perder histórico',
                  ],
                },
                {
                  titulo: 'Garantia',
                  items: [
                    'Caução com valor cadastrado',
                    'Fiador com dados completos',
                    'Seguro fiança com apólice',
                    'Título de capitalização',
                    'Aviso de validade do seguro',
                    'Sem garantia (registrado)',
                  ],
                },
                {
                  titulo: 'Financeiro',
                  items: [
                    'IPTU mensalizado',
                    'Condomínio repassado',
                    'Outros encargos extras',
                    'Snapshot histórico para IR',
                    'Relatório de IR pronto',
                    'Adimplência calculada por imóvel',
                  ],
                },
                {
                  titulo: 'Documentos',
                  items: [
                    'Contrato em PDF',
                    'Escritura / matrícula',
                    'Plantas e fotos',
                    'IPTU do imóvel',
                    'RG, CPF e comprovantes do inquilino',
                    'Drag-and-drop por categoria',
                  ],
                },
                {
                  titulo: 'Visibilidade',
                  items: [
                    'Dashboard com pendências críticas',
                    'Card por imóvel com status do mês',
                    'Card por inquilino com adimplência',
                    'Linha do tempo cronológica',
                    'Exportação de histórico em PDF',
                    'Recibo profissional em 1 clique',
                  ],
                },
              ].map(({ titulo, items }) => (
                <div key={titulo} className="bg-emerald-50/30 rounded-2xl border border-emerald-100 p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4">{titulo}</p>
                  <ul className="space-y-2.5">
                    {items.map(it => (
                      <li key={it} className="flex items-start gap-2 text-[14px] text-slate-700">
                        <svg className="shrink-0 mt-1" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="como-funciona" aria-labelledby="como-funciona-title" className="py-24 bg-[#F0FDF4]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16 lp-fade">
              <span className="text-xs font-semibold text-[#059669] uppercase tracking-widest">Como funciona</span>
              <h2 id="como-funciona-title" className="text-[36px] lg:text-[40px] font-bold text-[#1F2937] leading-[1.2] mt-3">Comece a usar em minutos</h2>
              <p className="text-[17px] text-[#6B7280] mt-3 max-w-md mx-auto">Sem instalação, sem configuração complicada.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  n: '1',
                  icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
                  title: 'Crie sua conta em 2 minutos',
                  desc: 'Só precisa do seu e-mail — sem cartão de crédito. Começa grátis, começa agora.',
                },
                {
                  n: '2',
                  icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
                  title: 'Cadastre seus imóveis e inquilinos',
                  desc: 'Adicione os imóveis, os inquilinos e os valores. O app organiza tudo automaticamente.',
                },
                {
                  n: '3',
                  icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>,
                  title: 'Relaxe — o app faz o resto',
                  desc: 'Cobranças automáticas, lembretes, recibos PDF. Você só confirma o recebimento.',
                },
              ].map(({ n, icon, title, desc }, i) => (
                <div key={n} className={`lp-fade lp-delay-${i} relative`}>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-10 left-[calc(50%+44px)] w-[calc(100%-44px)] overflow-hidden" style={{ height: '2px', background: 'repeating-linear-gradient(90deg,#10B981 0,#10B981 6px,transparent 6px,transparent 14px)' }} aria-hidden="true" />
                  )}
                  <div className="bg-emerald-50 rounded-2xl p-8 text-center h-full">
                    <div className="relative flex justify-center mb-5">
                      <div className="w-[72px] h-[72px] bg-white rounded-full border-[3px] border-[#10B981] flex items-center justify-center shadow-sm">
                        {icon}
                      </div>
                      <span className="absolute -top-1 left-[calc(50%+26px)] w-7 h-7 rounded-full bg-[#059669] text-white text-xs font-bold flex items-center justify-center shadow" aria-hidden="true">{n}</span>
                    </div>
                    <h3 className="text-[17px] font-semibold text-[#1F2937] mb-2">{title}</h3>
                    <p className="text-[14px] text-[#6B7280] leading-relaxed max-w-[200px] mx-auto">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-12 lp-fade lp-delay-3">
              <Link href="/cadastro" className="text-[#059669] font-semibold text-[15px] hover:underline">
                Pronto para começar? →
              </Link>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section id="depoimentos" aria-labelledby="depoimentos-title" className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16 lp-fade">
              <span className="text-xs font-semibold text-[#059669] uppercase tracking-widest">Depoimentos</span>
              <h2 id="depoimentos-title" className="text-[36px] lg:text-[40px] font-bold text-[#1F2937] leading-[1.2] mt-3">O que dizem nossos proprietários</h2>
              <p className="text-[17px] text-[#6B7280] mt-3">Pessoas reais. Imóveis reais. Resultados reais.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map(({ photo, name, role, text }, i) => (
                <article key={name} className={`lp-fade lp-delay-${i} lp-card bg-white rounded-[16px] border border-slate-100 flex flex-col`} style={{ padding: 28 }}>
                  <div className="flex gap-0.5 mb-4" aria-label="Avaliação 5 estrelas" role="img">
                    {Array.from({ length: 5 }).map((_, j) => <span key={j} className="text-amber-400 text-base" aria-hidden="true">★</span>)}
                  </div>
                  <div className="relative mb-5 flex-1">
                    <span className="text-emerald-200 font-serif leading-none float-left mr-1" style={{ fontSize: 64, lineHeight: 0.8 }} aria-hidden="true">&ldquo;</span>
                    <p className="text-[15px] text-slate-700 leading-[1.7] italic">{text}</p>
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo}
                      alt={`Foto de ${name}, ${role}`}
                      width={48}
                      height={48}
                      loading="lazy"
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                    <div>
                      <p className="text-sm font-bold text-[#1F2937]">{name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{role}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMPARISON ── */}
        <section aria-labelledby="comparacao-title" className="py-24 bg-[#F8FAFC]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16 lp-fade">
              <span className="text-xs font-semibold text-[#059669] uppercase tracking-widest">Diferenciais</span>
              <h2 id="comparacao-title" className="text-[36px] lg:text-[40px] font-bold text-[#1F2937] leading-[1.2] mt-3">Chega de improvisar</h2>
              <p className="text-[17px] text-[#6B7280] mt-3 max-w-md mx-auto">Veja por que proprietários trocam planilhas e imobiliárias pelo ProprietárioZen.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left — old way */}
              <div className="lp-fade rounded-2xl overflow-hidden border border-slate-200">
                <div className="bg-slate-100 px-8 py-5 flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  <h3 className="text-base font-bold text-slate-500">Do jeito antigo</h3>
                </div>
                <div className="bg-[#F8FAFC] p-8 space-y-4">
                  {[
                    'Cobrar pelo WhatsApp e ficar sem resposta',
                    'Planilha desatualizada toda hora',
                    'Esquecer o reajuste anual',
                    'Recibo feito no Word, sem padrão',
                    'Não saber quanto recebeu no mês',
                    'Constrangimento ao cobrar atrasado',
                  ].map(item => (
                    <div key={item} className="flex items-start gap-3">
                      <svg className="shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      <span className="text-[14px] text-slate-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — with ProprietárioZen */}
              <div className="lp-fade lp-delay-1 rounded-2xl overflow-hidden border-2 border-emerald-500" style={{ boxShadow: '0 8px 30px rgba(5,150,105,0.15)' }}>
                <div className="bg-emerald-600 px-8 py-5 flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  <h3 className="text-base font-bold text-white">Com ProprietárioZen</h3>
                  <span className="ml-auto text-[11px] font-bold bg-white text-emerald-700 px-2 py-0.5 rounded-full">Novo</span>
                </div>
                <div className="bg-white p-8 space-y-4">
                  {[
                    'Cobrança automática por Pix ou boleto',
                    'Dashboard atualizado em tempo real',
                    'Reajuste calculado e aplicado pelo app',
                    'Recibo PDF gerado em 1 clique',
                    'Resumo financeiro sempre disponível',
                    'Inquilino recebe o lembrete — não você',
                  ].map(item => (
                    <div key={item} className="flex items-start gap-3">
                      <svg className="shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                      <span className="text-[14px] text-slate-800">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" aria-labelledby="faq-title" className="py-24 bg-white">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-14 lp-fade">
              <span className="text-xs font-semibold text-[#059669] uppercase tracking-widest">Dúvidas frequentes</span>
              <h2 id="faq-title" className="text-[36px] font-bold text-[#1F2937] leading-[1.2] mt-3">Perguntas frequentes</h2>
              <p className="text-[16px] text-[#6B7280] mt-3">Tudo que você precisa saber sobre o ProprietárioZen.</p>
            </div>
            <dl className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
              {FAQ.map(({ q, a }, i) => (
                <div key={q} className={`lp-fade lp-delay-${i % 3}`}>
                  <button
                    type="button"
                    className="faq-row w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    aria-expanded={faqOpen === i}
                  >
                    <dt className="text-[15px] font-medium text-slate-800">{q}</dt>
                    <span className="shrink-0 text-emerald-600 font-bold text-xl leading-none" aria-hidden="true">{faqOpen === i ? '−' : '+'}</span>
                  </button>
                  {faqOpen === i && (
                    <dd className="px-6 pb-5">
                      <p className="text-[14px] text-slate-600 leading-[1.7]">{a}</p>
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="precos" aria-labelledby="precos-title" className="py-24 bg-[#F8FAFC]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16 lp-fade">
              <span className="text-xs font-semibold text-[#059669] uppercase tracking-widest">Preços</span>
              <h2 id="precos-title" className="text-[36px] lg:text-[40px] font-bold text-[#1F2937] leading-[1.2] mt-3">Simples e transparente</h2>
              <p className="text-[17px] text-[#6B7280] mt-3">Sem taxa de adesão. Sem fidelidade. Cancele quando quiser.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">

              {/* Free */}
              <div className="lp-fade lp-card bg-white rounded-2xl border-2 border-[#E5F7F0] p-8 flex flex-col">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-1">Grátis</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[38px] font-bold text-[#1F2937]">R$ 0</span>
                  <span className="text-sm text-[#6B7280]">/mês</span>
                </div>
                <p className="text-sm text-emerald-600 font-medium mb-5">Para sempre grátis</p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {[['1 imóvel · 1 inquilino',true],['Histórico de aluguéis',true],['Recibos PDF',false],['Alertas por e-mail',false],['Reajuste automático',false]].map(([f,ok]) => (
                    <li key={f as string} className={`flex items-center gap-2.5 text-sm ${ok ? 'text-[#374151]' : 'text-[#9CA3AF]'}`}>
                      {ok
                        ? <div className="w-4 h-4 rounded-full bg-[#D1FAE5] flex items-center justify-center shrink-0" aria-hidden="true"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                        : <div className="w-4 h-4 rounded-full bg-[#F1F5F9] flex items-center justify-center shrink-0" aria-hidden="true"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
                      }
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/cadastro" className="block text-center border-2 border-[#10B981] text-[#059669] font-semibold py-3 rounded-xl hover:bg-[#F0FDF4] transition-colors text-sm">
                  Criar conta gratuita
                </Link>
              </div>

              {/* Master */}
              <div className="lp-fade lp-delay-1 lp-card bg-white rounded-2xl border-2 border-[#10B981] p-8 relative flex flex-col shadow-[0_8px_32px_rgba(16,185,129,0.18)]">
                <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 bg-[#059669] text-white text-xs font-bold px-4 py-1 rounded-full">Mais popular</div>
                <p className="text-xs font-semibold text-[#059669] uppercase tracking-widest mb-1">Master</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[38px] font-bold text-[#059669]">R$ 49</span>
                  <span className="text-[22px] font-bold text-[#059669]">,90</span>
                  <span className="text-sm text-[#6B7280]">/mês</span>
                </div>
                <p className="text-sm text-emerald-600 font-medium mb-5">Menos de R$ 2 por dia</p>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {['3 imóveis · 3 inquilinos','Recibos PDF','Alertas por e-mail','Reajuste IGPM/IPCA'].map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-[#374151]">
                      <div className="w-4 h-4 rounded-full bg-[#D1FAE5] flex items-center justify-center shrink-0" aria-hidden="true"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-slate-100 pt-3 mb-3">
                  <p className="text-center text-[11px] text-slate-400">🔒 Pagamento seguro · Cancele quando quiser</p>
                </div>
                <Link href="/cadastro" className="block text-center bg-[#059669] hover:bg-[#047857] text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                  Assinar Master — R$ 49,90/mês
                </Link>
              </div>

              {/* Elite */}
              <div className="lp-fade lp-delay-2 lp-card bg-white rounded-2xl border-2 border-[#8B5CF6] p-8 relative flex flex-col shadow-[0_8px_32px_rgba(139,92,246,0.15)]">
                <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 bg-[#7C3AED] text-white text-xs font-bold px-4 py-1 rounded-full">Premium</div>
                <p className="text-xs font-semibold text-[#7C3AED] uppercase tracking-widest mb-1">Elite</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[38px] font-bold text-[#7C3AED]">R$ 99</span>
                  <span className="text-[22px] font-bold text-[#7C3AED]">,90</span>
                  <span className="text-sm text-[#6B7280]">/mês</span>
                </div>
                <p className="text-sm text-purple-600 font-medium mb-5">Para gestão em escala</p>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {['10 imóveis · inquilinos ilimitados','Recibos PDF','Alertas + cobrança automática','Reajuste IGPM/IPCA','5 GB armazenamento','Suporte prioritário'].map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-[#374151]">
                      <div className="w-4 h-4 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0" aria-hidden="true"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-slate-100 pt-3 mb-3">
                  <p className="text-center text-[11px] text-slate-400">🔒 Pagamento seguro · Cancele quando quiser</p>
                </div>
                <Link href="/cadastro" className="block text-center bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                  Assinar Elite — R$ 99,90/mês
                </Link>
              </div>
            </div>
            <p className="text-center mt-8 text-sm text-[#9CA3AF] lp-fade">
              ✓ Cancele quando quiser &nbsp;·&nbsp; ✓ Sem taxa de adesão &nbsp;·&nbsp; ✓ Pagamento seguro via Stripe
            </p>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section aria-labelledby="cta-title" className="relative overflow-hidden py-28 text-center" style={{ background: 'linear-gradient(135deg,#065F46 0%,#0F172A 100%)' }}>
          <div className="lp-blob-1 absolute w-80 h-80 rounded-full -top-20 -left-20 pointer-events-none" style={{ background: 'rgba(52,211,153,0.1)', filter: 'blur(72px)' }} aria-hidden="true" />
          <div className="lp-blob-2 absolute w-64 h-64 rounded-full -bottom-16 -right-16 pointer-events-none" style={{ background: 'rgba(16,185,129,0.09)', filter: 'blur(64px)' }} aria-hidden="true" />
          <div className="max-w-6xl mx-auto px-6 relative z-10 lp-fade">
            <h2 id="cta-title" className="font-bold leading-[1.12] mb-4" style={{ fontSize: 'clamp(36px, 4vw, 48px)' }}>
              <span className="block text-white">Pare de improvisar.</span>
              <span className="block text-emerald-300">Comece a controlar.</span>
            </h2>
            <p className="mb-10 text-emerald-100" style={{ fontSize: 18 }}>Grátis por 14 dias. Sem cartão de crédito.</p>
            <Link
              href="/cadastro"
              className="inline-flex items-center gap-2 bg-white hover:bg-[#F0FDF4] text-emerald-800 font-bold transition-all hover:-translate-y-1 hover:shadow-2xl"
              style={{ padding: '18px 40px', fontSize: 16, borderRadius: 10 }}
            >
              Criar conta grátis agora →
            </Link>
            <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
              {[
                { icon: '🔒', label: 'Dados seguros' },
                { icon: '✓',  label: 'Cancele quando quiser' },
                { icon: '⚡', label: 'Ativa em 2 minutos' },
              ].map(({ icon, label }) => (
                <span key={label} className="text-emerald-200 flex items-center gap-1.5" style={{ fontSize: 13 }}>
                  <span aria-hidden="true">{icon}</span>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer role="contentinfo" className="bg-[#111827] pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-12">
            <div>
              <LogoWhite iconSize={36} className="mb-3" />
              <p className="text-sm leading-relaxed max-w-[260px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Software para proprietário de imóvel — gestão de imóveis simples e eficiente para proprietários brasileiros.
              </p>
            </div>
            {[
              ['Produto', [['#funcionalidades','Funcionalidades'],['#como-funciona','Como funciona'],['#precos','Preços'],['/cadastro','Criar conta']]],
              ['Suporte', [['#','Central de ajuda'],['#','Fale conosco'],['#','Status do sistema']]],
              ['Legal',   [['/termos-de-uso','Termos de uso'],['/politica-de-privacidade','Privacidade'],['/politica-de-privacidade#seus-direitos','LGPD']]],
            ].map(([col, links]) => (
              <div key={col as string}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>{col}</p>
                <ul className="space-y-2.5">
                  {(links as [string,string][]).map(([href,label]) => (
                    <li key={label}><a href={href} className="text-sm transition-colors hover:text-[#10B981]" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>© 2025 ProprietárioZen. Todos os direitos reservados.</p>
              <a href="/termos-de-uso" className="text-xs transition-colors hover:text-[#10B981]" style={{ color: 'rgba(255,255,255,0.25)' }}>Termos de Uso</a>
              <a href="/politica-de-privacidade" className="text-xs transition-colors hover:text-[#10B981]" style={{ color: 'rgba(255,255,255,0.25)' }}>Privacidade</a>
            </div>
            <div className="flex gap-3">
              {[
                ['Instagram', <svg key="ig" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>],
                ['LinkedIn',  <svg key="li" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>],
                ['YouTube',   <svg key="yt" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.95C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>],
              ].map(([label, icon]) => (
                <a key={label as string} href="#" aria-label={`ProprietárioZen no ${label}`} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-[#059669]" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}>
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
