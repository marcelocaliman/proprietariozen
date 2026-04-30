import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export const viewport: Viewport = {
  themeColor: '#10B981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://proprietariozen.com.br'),
  title: {
    default: 'ProprietárioZen — Gestão de Imóveis',
    template: '%s | ProprietárioZen',
  },
  description: 'Gerencie seus imóveis, inquilinos e aluguéis de forma simples e eficiente.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PropZen',
  },
  icons: {
    apple: [{ url: '/icons/icon.svg', sizes: '180x180' }],
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Preconnect for Google Fonts — next/font/google also sets these automatically */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* DNS prefetch for analytics */}
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />
        {/* Favicon — SVG para browsers modernos, ICO como fallback */}
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon.svg" />
        {/* Manifest é injetado automaticamente via metadata.manifest */}
        {/* Standard moderno (substitui apple-mobile-web-app-capable, mantido pelo Next via appleWebApp) */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Google Tag Manager — replace GTM-P56LPWJR with your actual GTM container ID */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-P56LPWJR');`,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        {/* Skip-to-content link — must be first element in body */}
        <a href="#main-content" className="skip-link">Pular para o conteúdo principal</a>
        {/* Google Tag Manager noscript fallback */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-P56LPWJR"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
        {children}
        <Toaster richColors position="top-right" />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-X55QKPQLD7"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-X55QKPQLD7');`}
        </Script>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}`,
          }}
        />
      </body>
    </html>
  )
}
