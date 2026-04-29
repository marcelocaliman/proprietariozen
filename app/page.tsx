import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LandingPage } from '@/components/landing/landing-page'

// ── SEO Metadata ──────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  // Title: 53 chars as specified — do not alter
  title: 'ProprietárioZen | Gestão de Imóveis Simplificada para Proprietários',
  // Description: max 155 chars
  description: 'Gerencie imóveis, contratos e cobranças em um só app. Cobrança automática Pix + boleto, garantia, encargos e documentos. Plano gratuito disponível.',
  authors: [{ name: 'ProprietárioZen' }],
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
  },
  alternates: {
    canonical: 'https://proprietariozen.com.br',
  },
  openGraph: {
    type: 'website',
    url: 'https://proprietariozen.com.br',
    title: 'ProprietárioZen — Gestão de Imóveis sem Complicação',
    description: 'Controle aluguéis, contratos e cobranças em um único app. Cobrança automática Pix + boleto, encargos, documentos e timeline. Comece grátis hoje.',
    images: [
      {
        url: 'https://proprietariozen.com.br/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ProprietárioZen — Dashboard de gestão de imóveis',
      },
    ],
    siteName: 'ProprietárioZen',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@proprietariozenbr',
    title: 'ProprietárioZen — Gestão de Imóveis Simplificada',
    description: 'Gerencie seus imóveis, contratos e cobranças sem planilhas e sem stress. Experimente grátis.',
    images: ['https://proprietariozen.com.br/og-image.png'],
  },
  other: {
    language: 'pt-BR',
  },
}

// ── JSON-LD Structured Data ───────────────────────────────────────────────────

const jsonLdSoftware = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ProprietárioZen',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Android, iOS, Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'BRL',
    description: 'Plano gratuito disponível',
  },
  description:
    'App brasileiro de gestão de imóveis para proprietários. Controle de aluguéis, contratos digitais, cobranças automáticas e relatórios financeiros.',
  url: 'https://proprietariozen.com.br',
  inLanguage: 'pt-BR',
  featureList: [
    'Gestão de contratos de locação',
    'Cobrança automática de aluguel',
    'Controle de inadimplência',
    'Dashboard financeiro',
    'Notificações de vencimento',
    'Relatórios em PDF',
    'Histórico de inquilinos',
  ],
}

const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'ProprietárioZen é gratuito?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sim, há um plano gratuito permanente que permite gerenciar 1 imóvel e 1 inquilino sem custo nem cartão de crédito.',
      },
    },
    {
      '@type': 'Question',
      name: 'Posso gerenciar vários imóveis no mesmo app?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sim, com dashboards individuais por propriedade e relatórios consolidados.',
      },
    },
    {
      '@type': 'Question',
      name: 'O app envia cobrança automática para o inquilino?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sim, envia notificações por e-mail e WhatsApp antes do vencimento e em caso de inadimplência.',
      },
    },
    {
      '@type': 'Question',
      name: 'O ProprietárioZen é seguro para dados de contratos?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sim, todos os dados são criptografados e armazenados em servidores no Brasil, em conformidade com a LGPD.',
      },
    },
  ],
}

const jsonLdOrg = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ProprietárioZen',
  url: 'https://proprietariozen.com.br',
  logo: 'https://proprietariozen.com.br/logo.png',
  sameAs: [
    'https://www.instagram.com/proprietariozenbr',
    'https://www.linkedin.com/company/proprietariozenbr',
    'https://twitter.com/proprietariozenbr',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    availableLanguage: 'Portuguese',
    areaServed: 'BR',
  },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage({
  searchParams,
}: {
  searchParams: { code?: string; error?: string; error_description?: string }
}) {
  // Supabase às vezes redireciona o código OAuth para a raiz (Site URL fallback)
  // em vez de /api/auth/callback — reencaminhamos aqui
  if (searchParams.code) {
    redirect(`/api/auth/callback?code=${encodeURIComponent(searchParams.code)}`)
  }

  if (searchParams.error) {
    redirect(`/login?error=${encodeURIComponent(searchParams.error_description ?? searchParams.error)}`)
  }

  return (
    <>
      {/* JSON-LD Schema 1 — SoftwareApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
      />
      {/* JSON-LD Schema 2 — FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      {/* JSON-LD Schema 3 — Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
      />
      <LandingPage />
    </>
  )
}
