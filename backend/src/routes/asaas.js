'use strict'

const express = require('express')
const { authMiddleware } = require('../middleware/auth')
const { createSubAccount, getAccountStatus } = require('../services/asaas/accountService')
const { setupWebhook } = require('../services/asaas/webhookService')
const { AsaasIntegrationError } = require('../services/asaas/AsaasIntegrationError')
const AsaasAccount = require('../models/AsaasAccount')

const router = express.Router()

// Todas as rotas exigem autenticação JWT
router.use(authMiddleware)

// ── POST /api/asaas/onboarding ────────────────────────────────────────────────
/**
 * Inicia o onboarding Asaas para o proprietário autenticado.
 *
 * 1. Verifica duplicata
 * 2. Cria a subconta no Asaas
 * 3. Registra webhooks na subconta
 * 4. Retorna instruções para o proprietário
 *
 * Body: dados do proprietário (ver createSubAccount para schema completo)
 */
router.post('/onboarding', async (req, res) => {
  try {
    const userId = req.userId

    // ── 1. Verificar se já existe subconta ──────────────────────────────────
    const existing = await AsaasAccount.findOne({ userId })
    if (existing) {
      return res.status(409).json({
        error: 'Você já possui uma conta Asaas vinculada.',
        accountStatus: existing.accountStatus,
        onboardingCompleted: existing.onboardingCompleted,
      })
    }

    // ── 2. Buscar dados do proprietário ─────────────────────────────────────
    // Adaptar para o modelo User da aplicação
    let proprietarioData
    try {
      const User = require('../models/User')
      const user = await User.findById(userId)
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' })
      proprietarioData = req.body    // Frontend envia os dados complementares
    } catch {
      // Se não houver modelo User, usar diretamente o body
      proprietarioData = req.body
    }

    // ── 3. Validação mínima ──────────────────────────────────────────────────
    const required = ['name', 'email', 'cpfCnpj', 'mobilePhone', 'address',
                      'addressNumber', 'province', 'postalCode']
    const missing = required.filter(f => !proprietarioData[f])
    if (missing.length > 0) {
      return res.status(422).json({
        error: `Campos obrigatórios ausentes: ${missing.join(', ')}`,
      })
    }

    // ── 4. Criar subconta no Asaas ───────────────────────────────────────────
    const result = await createSubAccount(userId, proprietarioData)

    // ── 5. Registrar webhooks na subconta ────────────────────────────────────
    // Buscar a apiKey descriptografada para configurar o webhook
    try {
      const { getDecryptedApiKey } = require('../services/asaas/accountService')
      const decryptedKey = await getDecryptedApiKey(userId)
      // Não bloquear o onboarding se o webhook falhar
      setupWebhook(result.asaasId, decryptedKey).catch(err => {
        console.error('[Asaas] Falha ao registrar webhook pós-onboarding:', err.message)
      })
    } catch (err) {
      console.error('[Asaas] Não foi possível obter apiKey para webhook:', err.message)
    }

    // ── 6. Resposta de sucesso ───────────────────────────────────────────────
    return res.status(201).json({
      message:
        'Conta criada com sucesso! Você receberá um e-mail do Asaas para ' +
        'definir sua senha e enviar os documentos necessários. ' +
        'Após a aprovação (geralmente 1-2 dias úteis), você já poderá ' +
        'receber aluguéis diretamente na sua conta.',
      asaasId: result.asaasId,
      accountStatus: result.accountStatus,
      nextStep: 'Verifique seu e-mail para completar o cadastro no painel Asaas.',
    })
  } catch (error) {
    if (error instanceof AsaasIntegrationError) {
      return res.status(error.statusCode).json(error.toJSON())
    }
    console.error('[Asaas] Erro inesperado no onboarding:', error.message)
    return res.status(500).json({ error: 'Erro interno ao criar conta Asaas.' })
  }
})

// ── GET /api/asaas/status ─────────────────────────────────────────────────────
/**
 * Consulta o status da subconta Asaas do proprietário autenticado.
 * Usado para polling durante o processo de aprovação.
 */
router.get('/status', async (req, res) => {
  try {
    const status = await getAccountStatus(req.userId)
    return res.json(status)
  } catch (error) {
    if (error instanceof AsaasIntegrationError) {
      return res.status(error.statusCode).json(error.toJSON())
    }
    return res.status(500).json({ error: 'Erro ao consultar status da conta.' })
  }
})

// ── GET /api/asaas/account ────────────────────────────────────────────────────
/**
 * Retorna os dados da conta Asaas vinculada (sem a apiKey).
 */
router.get('/account', async (req, res) => {
  try {
    const account = await AsaasAccount.findOne({ userId: req.userId })
    if (!account) {
      return res.status(404).json({ error: 'Conta Asaas não encontrada.' })
    }
    return res.json(account.toSafeObject())
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar conta.' })
  }
})

module.exports = router
