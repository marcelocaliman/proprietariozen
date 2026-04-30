import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'ProprietárioZen — Gestão de imóveis sem complicação'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: 'linear-gradient(135deg, #022C22 0%, #064E3B 50%, #059669 100%)',
          fontFamily: 'sans-serif',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 800,
              color: '#022C22',
            }}
          >
            P
          </div>
          <span
            style={{
              fontSize: '32px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            ProprietárioZen
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h1
            style={{
              fontSize: '76px',
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              margin: 0,
              maxWidth: '1000px',
            }}
          >
            Gestão de imóveis sem complicação
          </h1>
          <p
            style={{
              fontSize: '30px',
              lineHeight: 1.4,
              color: '#A7F3D0',
              margin: 0,
              maxWidth: '900px',
            }}
          >
            Aluguéis, cobranças automáticas Pix + boleto, contratos e documentos em um só lugar.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            fontSize: '22px',
            color: '#6EE7B7',
            fontWeight: 600,
          }}
        >
          <span>proprietariozen.com.br</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span>Plano gratuito disponível</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
