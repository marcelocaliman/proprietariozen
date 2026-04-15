'use strict'

const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleware/auth')
const Contract = require('../models/Contract')
const Tenant = require('../models/Tenant')
const RentalCharge = require('../models/RentalCharge')
const {
  createMonthlyCharge,
  getChargeStatus,
  cancelRentalCharge,
  generatePixQrCode,
} = require('../services/rentalChargeService')

// ── POST /api/charges/manual ──────────────────────────────────────────────────
// Cria uma cobrança avulsa para um contrato e mês específico.
router.post('/manual', authMiddleware, async (req, res) => {
  try {
    const { contractId, referenceMonth } = req.body

    if (!contractId || !referenceMonth || !/^\d{4}-\d{2}$/.test(referenceMonth)) {
      return res.status(400).json({
        error: 'contractId e referenceMonth (YYYY-MM) são obrigatórios.',
      })
    }

    const contract = await Contract.findOne({
      _id: contractId,
      landlordId: req.userId,
      isActive: true,
    })
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado.' })

    const tenant = await Tenant.findById(contract.tenantId).select('+asaasCustomerIds')
    if (!tenant) return res.status(404).json({ error: 'Inquilino não encontrado.' })

    const rentalCharge = await createMonthlyCharge(contract, tenant, referenceMonth)
    res.status(201).json(rentalCharge)
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message })
    console.error('[Charges] POST /manual:', err.message)
    res.status(500).json({ error: 'Erro ao criar cobrança.' })
  }
})

// ── GET /api/charges ──────────────────────────────────────────────────────────
// Lista cobranças do proprietário autenticado com filtros e paginação.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, contractId, page = '1', limit = '20' } = req.query
    const filter = { landlordId: req.userId }

    if (status) filter.status = status
    if (contractId) filter.contractId = contractId

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(100, Math.max(1, Number(limit)))
    const skip = (pageNum - 1) * limitNum

    const [charges, total] = await Promise.all([
      RentalCharge.find(filter).sort({ dueDate: -1 }).skip(skip).limit(limitNum),
      RentalCharge.countDocuments(filter),
    ])

    res.json({
      data: charges,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    })
  } catch (err) {
    console.error('[Charges] GET /:', err.message)
    res.status(500).json({ error: 'Erro ao buscar cobranças.' })
  }
})

// ── GET /api/charges/:id/status ───────────────────────────────────────────────
// Sincroniza o status com o Asaas e retorna a cobrança atualizada.
router.get('/:id/status', authMiddleware, async (req, res) => {
  try {
    const rentalCharge = await getChargeStatus(req.userId, req.params.id)
    res.json(rentalCharge)
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message })
    console.error('[Charges] GET /:id/status:', err.message)
    res.status(500).json({ error: 'Erro ao sincronizar status.' })
  }
})

// ── DELETE /api/charges/:id ───────────────────────────────────────────────────
// Cancela uma cobrança no Asaas e atualiza o banco.
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const rentalCharge = await cancelRentalCharge(req.userId, req.params.id)
    res.json(rentalCharge)
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message })
    console.error('[Charges] DELETE /:id:', err.message)
    res.status(500).json({ error: 'Erro ao cancelar cobrança.' })
  }
})

// ── GET /api/charges/:id/pix ──────────────────────────────────────────────────
// Retorna o QR Code Pix da cobrança (com cache no documento).
router.get('/:id/pix', authMiddleware, async (req, res) => {
  try {
    const qrData = await generatePixQrCode(req.userId, req.params.id)
    res.json(qrData)
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message })
    console.error('[Charges] GET /:id/pix:', err.message)
    res.status(500).json({ error: 'Erro ao gerar QR Code Pix.' })
  }
})

module.exports = router
