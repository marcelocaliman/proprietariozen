'use strict'

const cron = require('node-cron')
const Contract = require('../models/Contract')
const Tenant = require('../models/Tenant')
const { createMonthlyCharge } = require('../services/rentalChargeService')

/**
 * Inicia o scheduler de geração automática de cobranças.
 *
 * Dispara no dia 1 de cada mês às 08:00 horário de Brasília.
 * Processa apenas contratos com billingMode=MANUAL — os contratos AUTOMATIC
 * têm suas cobranças geradas diretamente pelo Asaas via assinatura recorrente.
 *
 * A função é idempotente por design: mesmo que rode duas vezes no mesmo dia,
 * o createMonthlyCharge não cria duplicatas (índice único contractId+referenceMonth).
 */
function startChargeScheduler() {
  cron.schedule('0 8 1 * *', async () => {
    const now = new Date()
    const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    console.info(`[Scheduler] Iniciando geração de cobranças — ${referenceMonth}`)

    let contracts
    try {
      contracts = await Contract.find({ isActive: true, billingMode: 'MANUAL' })
    } catch (err) {
      console.error('[Scheduler] Falha ao buscar contratos:', err.message)
      return
    }

    console.info(`[Scheduler] ${contracts.length} contrato(s) MANUAL a processar.`)

    let successCount = 0
    let errorCount = 0

    for (const contract of contracts) {
      try {
        const tenant = await Tenant.findById(contract.tenantId).select('+asaasCustomerIds')
        if (!tenant) {
          console.error(`[Scheduler] Inquilino não encontrado — contrato ${contract._id}`)
          errorCount++
          continue
        }

        await createMonthlyCharge(contract, tenant, referenceMonth)
        successCount++
      } catch (err) {
        errorCount++
        console.error(`[Scheduler] Erro no contrato ${contract._id}:`, err.message)
      }
    }

    console.info(
      `[Scheduler] ${referenceMonth} concluído — ${successCount} criadas, ${errorCount} erro(s).`
    )
  }, {
    timezone: 'America/Sao_Paulo',
  })

  console.info('[Scheduler] Agendamento de cobranças ativo (dia 1, 08:00 BRT).')
}

module.exports = { startChargeScheduler }
