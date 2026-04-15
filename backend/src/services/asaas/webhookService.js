'use strict'

require('dotenv').config()
const { createClient } = require('./asaasClient')
const { AsaasIntegrationError } = require('./AsaasIntegrationError')
const AsaasAccount = require('../../models/AsaasAccount')

// ── Configuração de webhooks ──────────────────────────────────────────────────

const WEBHOOK_EVENTS = [
  'PAYMENT_RECEIVED',       // Pagamento confirmado (Pix/Boleto)
  'PAYMENT_OVERDUE',        // Cobrança vencida sem pagamento
  'PAYMENT_DELETED',        // Cobrança cancelada
  'ACCOUNT_STATUS_UPDATED', // Status da conta alterado (aprovação/rejeição)
]

/**
 * Registra os webhooks necessários na SUBCONTA do proprietário.
 * Usa a apiKey da subconta — não da conta raiz.
 *
 * Idempotente: se o webhook já existir (409), considera sucesso silencioso.
 *
 * @param {string} asaasId    ID da subconta no Asaas
 * @param {string} decryptedApiKey  apiKey da subconta já descriptografada
 * @returns {Promise<void>}
 */
async function setupWebhook(asaasId, decryptedApiKey) {
  const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/webhooks/asaas`

  if (!process.env.WEBHOOK_BASE_URL) {
    console.warn(
      '[Asaas] WEBHOOK_BASE_URL não configurada. ' +
      'Webhook não será registrado. Use ngrok em desenvolvimento.',
    )
    return
  }

  const subClient = createClient(decryptedApiKey)

  const payload = {
    url: webhookUrl,
    email: null,            // Opcional: e-mail para receber notificações
    enabled: true,
    interrupted: false,
    sendType: 'SEQUENTIALLY',
    events: WEBHOOK_EVENTS,
    authToken: process.env.ASAAS_WEBHOOK_TOKEN,
  }

  try {
    await subClient.post('/webhook', payload)
    console.info(`[Asaas] Webhook registrado para subconta ${asaasId}`)
  } catch (error) {
    // Webhook já existente não é erro — apenas logar
    if (error.asaasCode === 'webhookAlreadyExists' || error.statusCode === 409) {
      console.info(
        `[Asaas] Webhook já existente para subconta ${asaasId} — nenhuma ação necessária.`,
      )
      return
    }
    // Outros erros são propagados, mas sem bloquear o onboarding
    console.error(
      `[Asaas] Falha ao registrar webhook para subconta ${asaasId}:`,
      error.message,
    )
    throw error
  }
}

// ── Processamento de eventos recebidos ────────────────────────────────────────

/**
 * Envia notificação push via Firebase Admin SDK.
 * Falha silenciosa — não bloqueia o processamento do webhook.
 *
 * @param {string} userId
 * @param {string} title
 * @param {string} body
 * @param {Object} [data]  Dados extras para o app
 */
async function sendPushNotification(userId, title, body, data = {}) {
  try {
    const admin = require('firebase-admin')

    // Buscar o FCM token do usuário no banco
    // Adaptar conforme o modelo User da aplicação
    const User = require('../../models/User')
    const user = await User.findById(userId).select('fcmToken')

    if (!user?.fcmToken) {
      console.debug(`[Firebase] Usuário ${userId} sem FCM token. Notificação não enviada.`)
      return
    }

    await admin.messaging().send({
      token: user.fcmToken,
      notification: { title, body },
      data: {
        ...data,
        userId: String(userId),
      },
      android: {
        priority: 'high',
        notification: { channelId: 'pagamentos' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    })
  } catch (err) {
    console.error('[Firebase] Falha ao enviar notificação push:', err.message)
  }
}

/**
 * Processa evento ACCOUNT_STATUS_UPDATED.
 * Atualiza o status local e notifica o proprietário.
 *
 * @param {Object} event  Payload do Asaas
 */
async function handleAccountStatusUpdated(event) {
  const { account } = event

  if (!account?.id) {
    console.warn('[Asaas Webhook] ACCOUNT_STATUS_UPDATED sem account.id')
    return
  }

  const asaasAccount = await AsaasAccount.findOne({ asaasId: account.id })
  if (!asaasAccount) {
    console.warn(
      `[Asaas Webhook] ACCOUNT_STATUS_UPDATED: subconta ${account.id} não encontrada.`,
    )
    return
  }

  const newStatus = account.accountStatus ?? account.status
  const previousStatus = asaasAccount.accountStatus

  await AsaasAccount.updateOne(
    { asaasId: account.id },
    {
      accountStatus: newStatus,
      onboardingCompleted: newStatus === 'ACTIVE',
      approvedAt: newStatus === 'ACTIVE' && previousStatus !== 'ACTIVE'
        ? new Date()
        : asaasAccount.approvedAt,
    },
  )

  console.info(
    `[Asaas Webhook] Conta ${account.id}: ${previousStatus} → ${newStatus}`,
  )

  // Notificações por status
  const userId = asaasAccount.userId

  if (newStatus === 'ACTIVE' && previousStatus !== 'ACTIVE') {
    await sendPushNotification(
      userId,
      '🎉 Conta aprovada!',
      'Sua conta foi aprovada. Agora você já pode receber aluguéis diretamente.',
      { type: 'ACCOUNT_APPROVED', asaasId: account.id },
    )
  } else if (newStatus === 'REJECTED') {
    await sendPushNotification(
      userId,
      'Conta não aprovada',
      'Sua conta Asaas não foi aprovada. Entre em contato com o suporte para mais informações.',
      { type: 'ACCOUNT_REJECTED', asaasId: account.id },
    )
  } else if (newStatus === 'BLOCKED') {
    await sendPushNotification(
      userId,
      'Conta bloqueada',
      'Sua conta Asaas foi bloqueada temporariamente. Acesse o painel Asaas para mais detalhes.',
      { type: 'ACCOUNT_BLOCKED', asaasId: account.id },
    )
  }
}

/**
 * Processa evento PAYMENT_RECEIVED.
 * Atualiza status da cobrança no banco e notifica o proprietário.
 *
 * @param {Object} event
 */
async function handlePaymentReceived(event) {
  const { payment } = event

  if (!payment?.id) {
    console.warn('[Asaas Webhook] PAYMENT_RECEIVED sem payment.id')
    return
  }

  // Localizar a subconta via walletId ou asaasId
  // A cobrança foi criada na subconta; o walletId identifica o dono
  const asaasAccount = await AsaasAccount.findOne({
    $or: [
      { walletId: payment.transferredBy?.walletId },
      { asaasId: payment.asaasAccount },
    ],
  })

  if (!asaasAccount) {
    console.warn(
      `[Asaas Webhook] PAYMENT_RECEIVED: subconta não identificada. payment.id=${payment.id}`,
    )
    return
  }

  console.info(
    `[Asaas Webhook] Pagamento ${payment.id} recebido. ` +
    `Valor: R$ ${payment.value} | Tipo: ${payment.billingType}`,
  )

  // Atualizar o registro de aluguel no banco da aplicação
  // Adaptar conforme o modelo de cobrança utilizado
  try {
    const Charge = require('../../models/Charge')
    await Charge.findOneAndUpdate(
      { asaasChargeId: payment.id },
      {
        status: 'RECEIVED',
        paidAt: payment.paymentDate ?? new Date(),
        paidValue: payment.value,
      },
    )
  } catch {
    // Modelo pode não existir ainda — log e continua
    console.debug('[Asaas Webhook] Modelo Charge não encontrado. Pulando atualização local.')
  }

  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(payment.value)

  await sendPushNotification(
    asaasAccount.userId,
    '💸 Aluguel recebido!',
    `Pagamento de ${valorFormatado} confirmado via ${payment.billingType === 'PIX' ? 'Pix' : 'Boleto'}.`,
    {
      type: 'PAYMENT_RECEIVED',
      chargeId: payment.id,
      value: String(payment.value),
    },
  )
}

/**
 * Processa evento PAYMENT_OVERDUE.
 *
 * @param {Object} event
 */
async function handlePaymentOverdue(event) {
  const { payment } = event
  if (!payment?.id) return

  const asaasAccount = await AsaasAccount.findOne({
    $or: [
      { walletId: payment.transferredBy?.walletId },
      { asaasId: payment.asaasAccount },
    ],
  })
  if (!asaasAccount) return

  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(payment.value)

  console.info(
    `[Asaas Webhook] Pagamento vencido: ${payment.id} | Valor: R$ ${payment.value}`,
  )

  await sendPushNotification(
    asaasAccount.userId,
    '⚠️ Aluguel em atraso',
    `Cobrança de ${valorFormatado} venceu sem pagamento. Considere notificar o inquilino.`,
    {
      type: 'PAYMENT_OVERDUE',
      chargeId: payment.id,
      value: String(payment.value),
    },
  )
}

/**
 * Processa evento PAYMENT_DELETED.
 *
 * @param {Object} event
 */
async function handlePaymentDeleted(event) {
  const { payment } = event
  if (!payment?.id) return

  console.info(`[Asaas Webhook] Cobrança ${payment.id} cancelada/excluída.`)

  try {
    const Charge = require('../../models/Charge')
    await Charge.findOneAndUpdate(
      { asaasChargeId: payment.id },
      { status: 'DELETED', deletedAt: new Date() },
    )
  } catch {
    console.debug('[Asaas Webhook] Modelo Charge não encontrado. Pulando.')
  }
}

/**
 * Handler principal do webhook.
 * Roteia o evento para o handler correto.
 *
 * Sempre resolve (nunca rejeita) para garantir HTTP 200 ao Asaas.
 * O Asaas para as tentativas de reenvio após falhas consecutivas.
 *
 * @param {Object} event  Payload completo do webhook
 * @returns {Promise<void>}
 */
async function handleWebhookEvent(event) {
  const { event: eventType } = event

  console.info(`[Asaas Webhook] Evento recebido: ${eventType}`)

  try {
    switch (eventType) {
      case 'ACCOUNT_STATUS_UPDATED':
        await handleAccountStatusUpdated(event)
        break

      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        await handlePaymentReceived(event)
        break

      case 'PAYMENT_OVERDUE':
        await handlePaymentOverdue(event)
        break

      case 'PAYMENT_DELETED':
        await handlePaymentDeleted(event)
        break

      default:
        console.debug(`[Asaas Webhook] Evento ignorado: ${eventType}`)
    }
  } catch (err) {
    // Logar mas não relançar — garantir sempre HTTP 200
    console.error(`[Asaas Webhook] Erro ao processar ${eventType}:`, err.message)
  }
}

module.exports = {
  setupWebhook,
  handleWebhookEvent,
  // Exportados para testes
  handleAccountStatusUpdated,
  handlePaymentReceived,
  handlePaymentOverdue,
  handlePaymentDeleted,
  sendPushNotification,
}
