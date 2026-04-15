'use strict'

const mongoose = require('mongoose')

/**
 * Representa uma cobrança de aluguel emitida no Asaas para um mês específico.
 *
 * Uma cobrança pertence a um contrato (Contract) e é gerada:
 *   - Automaticamente pelo scheduler todo dia 1 (contratos billingMode=AUTOMATIC)
 *   - Manualmente pelo proprietário via POST /api/charges/manual
 *
 * O campo asaasChargeId é a referência para operações na API Asaas (cancelar,
 * buscar status, pegar QR Code). Nunca sobrescrever sem cancelar a anterior.
 */
const rentalChargeSchema = new mongoose.Schema(
  {
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract',
      required: [true, 'contractId é obrigatório'],
      index: true,
    },

    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'landlordId é obrigatório'],
      index: true,
    },

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'tenantId é obrigatório'],
    },

    // ID da cobrança no Asaas (ex: "pay_abc123")
    asaasChargeId: {
      type: String,
      required: [true, 'asaasChargeId é obrigatório'],
      unique: true,
      trim: true,
      index: true,
    },

    // ID do cliente (inquilino) na subconta do proprietário no Asaas
    asaasCustomerId: {
      type: String,
      required: [true, 'asaasCustomerId é obrigatório'],
      trim: true,
    },

    amount: {
      type: Number,
      required: [true, 'amount é obrigatório'],
      min: [0.01, 'Valor mínimo R$ 0,01'],
    },

    dueDate: {
      type: Date,
      required: [true, 'dueDate é obrigatório'],
    },

    // Formato YYYY-MM — chave de idempotência junto com contractId
    referenceMonth: {
      type: String,
      required: [true, 'referenceMonth é obrigatório'],
      match: [/^\d{4}-\d{2}$/, 'referenceMonth deve ter formato YYYY-MM'],
    },

    status: {
      type: String,
      enum: {
        values: ['PENDING', 'RECEIVED', 'OVERDUE', 'CANCELLED', 'REFUNDED'],
        message: 'Status inválido: {VALUE}',
      },
      default: 'PENDING',
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: ['BOLETO', 'PIX', 'CREDIT_CARD', 'UNDEFINED', null],
      default: null,
    },

    // Código Pix copia-e-cola — preenchido quando disponível na resposta do Asaas
    pixQrCode: {
      type: String,
      default: null,
    },

    // URL do PDF do boleto
    boletoUrl: {
      type: String,
      default: null,
    },

    // URL da fatura no painel Asaas — link enviado ao inquilino para pagar
    invoiceUrl: {
      type: String,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    // Valor efetivamente pago (pode diferir de amount em cobranças com desconto/juros)
    paidAmount: {
      type: Number,
      default: null,
    },

    // Controle interno: quantas tentativas de sincronização de status falharam
    syncFailCount: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

// ── Índice composto de idempotência ───────────────────────────────────────────
// Garante que não existam duas cobranças para o mesmo contrato no mesmo mês
rentalChargeSchema.index({ contractId: 1, referenceMonth: 1 }, { unique: true })

// ── Índice para buscas do proprietário ───────────────────────────────────────
rentalChargeSchema.index({ landlordId: 1, status: 1, dueDate: -1 })

const RentalCharge = mongoose.model('RentalCharge', rentalChargeSchema)

module.exports = RentalCharge
