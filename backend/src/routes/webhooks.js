'use strict'

require('dotenv').config()
const express = require('express')
const { handleWebhookEvent } = require('../services/asaas/webhookService')

const router = express.Router()

// ── POST /api/webhooks/asaas ──────────────────────────────────────────────────
/**
 * Recebe eventos do Asaas.
 *
 * IMPORTANTE: Esta rota deve usar express.raw() ou express.json() ANTES
 * do bodyParser global se for necessário validar assinatura HMAC futuramente.
 *
 * Sempre retorna HTTP 200 — o Asaas para as tentativas de reenvio após
 * falhas consecutivas, o que causaria perda de eventos.
 */
router.post('/asaas', async (req, res) => {
  // ── 1. Validar token de autenticação ────────────────────────────────────
  const receivedToken = req.headers['asaas-access-token']
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN

  if (!expectedToken) {
    console.error('[Webhook] ASAAS_WEBHOOK_TOKEN não configurado.')
    // Retornar 200 mesmo assim para não perder eventos durante configuração
    return res.status(200).json({ received: true })
  }

  if (!receivedToken || receivedToken !== expectedToken) {
    console.warn(
      '[Webhook] Token inválido recebido. ' +
      `IP: ${req.ip} | Token: ${receivedToken?.slice(0, 8)}...`,
    )
    // Retornar 401 para tokens inválidos — pode ser tentativa externa
    return res.status(401).json({ error: 'Token inválido.' })
  }

  // ── 2. Validar estrutura básica do payload ───────────────────────────────
  const event = req.body
  if (!event?.event) {
    console.warn('[Webhook] Payload sem campo "event":', JSON.stringify(event))
    return res.status(200).json({ received: true, warning: 'Payload sem event type.' })
  }

  // ── 3. Processar o evento de forma assíncrona ───────────────────────────
  // Responder imediatamente e processar em background para não causar timeout
  res.status(200).json({ received: true })

  // Processar após resposta enviada
  handleWebhookEvent(event).catch(err => {
    console.error('[Webhook] Erro não capturado em handleWebhookEvent:', err.message)
  })
})

module.exports = router
