'use strict'

require('dotenv').config()

/**
 * Serviço de e-mail para notificações ao inquilino.
 *
 * Em desenvolvimento (sem EMAIL_HOST configurado): apenas loga no console.
 * Em produção: usa nodemailer com SMTP configurado via variáveis de ambiente.
 *
 * Na fase White Label do Asaas, o Asaas enviará seus próprios e-mails por
 * padrão. Quando migrar para White Label, desligar os e-mails do Asaas na
 * configuração da subconta e deixar este serviço assumir todos os envios.
 */

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  if (!process.env.EMAIL_HOST) {
    return null  // modo de desenvolvimento
  }

  const nodemailer = require('nodemailer')
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

  return transporter
}

/**
 * Formata valor em reais para exibição no e-mail.
 * @param {number} value
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Formata data para exibição no e-mail (DD/MM/YYYY).
 * @param {Date|string} date
 */
function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

/**
 * Gera o HTML do e-mail de cobrança enviado ao inquilino.
 */
function buildChargeEmailHtml({ tenantName, amount, dueDate, invoiceUrl, referenceMonth }) {
  const [year, month] = referenceMonth.split('-').map(Number)
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1))

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cobrança de Aluguel — ${monthName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
             line-height: 1.6; color: #1e293b; max-width: 520px; margin: 0 auto; padding: 24px;">

  <div style="text-align: center; margin-bottom: 32px;">
    <span style="font-size: 24px; font-weight: 800; color: #1e293b;">Proprie</span><span style="font-size: 24px; font-weight: 800; color: #059669;">Zen</span>
  </div>

  <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">
    Olá, ${tenantName}!
  </h1>
  <p style="color: #475569; margin-bottom: 24px;">
    Sua cobrança de aluguel referente a <strong>${monthName}</strong> foi gerada.
  </p>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span style="color: #64748b; font-size: 14px;">Valor</span>
      <span style="font-weight: 700; font-size: 18px; color: #059669;">${formatCurrency(amount)}</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span style="color: #64748b; font-size: 14px;">Vencimento</span>
      <span style="font-weight: 600;">${formatDate(dueDate)}</span>
    </div>
  </div>

  <a href="${invoiceUrl}"
     style="display: block; text-align: center; background: #059669; color: #ffffff;
            font-weight: 700; font-size: 16px; padding: 14px 24px; border-radius: 10px;
            text-decoration: none; margin-bottom: 16px;">
    Pagar agora →
  </a>

  <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 8px;">
    Você pode pagar por <strong>Pix</strong>, <strong>Boleto</strong> ou <strong>Cartão de Crédito</strong>
    diretamente na fatura acima.
  </p>
  <p style="font-size: 13px; color: #94a3b8; text-align: center;">
    O pagamento é identificado automaticamente — não é necessário enviar comprovante.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
  <p style="font-size: 12px; color: #cbd5e1; text-align: center;">
    ProprietárioZen · Este é um e-mail automático, por favor não responda.
  </p>
</body>
</html>
  `.trim()
}

/**
 * Envia e-mail de nova cobrança para o inquilino.
 *
 * @param {Object} params
 * @param {string} params.tenantName
 * @param {string} params.tenantEmail
 * @param {number} params.amount
 * @param {Date}   params.dueDate
 * @param {string} params.invoiceUrl
 * @param {string} params.referenceMonth  YYYY-MM
 */
async function sendChargeCreatedEmail(params) {
  const { tenantName, tenantEmail, amount, dueDate, invoiceUrl, referenceMonth } = params
  const transport = getTransporter()

  const subject = (() => {
    const [year, month] = referenceMonth.split('-').map(Number)
    const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' })
      .format(new Date(year, month - 1, 1))
    return `Cobrança de aluguel — ${monthName} de ${year} — ${formatCurrency(amount)}`
  })()

  if (!transport) {
    // Desenvolvimento: log estruturado
    console.info('[Email] Cobrança criada (mock):', {
      to: tenantEmail,
      subject,
      amount: formatCurrency(amount),
      dueDate: formatDate(dueDate),
      invoiceUrl,
    })
    return
  }

  const html = buildChargeEmailHtml({ tenantName, amount, dueDate, invoiceUrl, referenceMonth })

  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'ProprietárioZen <noreply@proprietariezen.com.br>',
    to: tenantEmail,
    subject,
    html,
  })

  console.info(`[Email] Cobrança enviada para ${tenantEmail} — ${subject}`)
}

module.exports = { sendChargeCreatedEmail }
