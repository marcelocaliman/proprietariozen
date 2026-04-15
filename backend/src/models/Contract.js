'use strict'

const mongoose = require('mongoose')

/**
 * Contrato de locação entre proprietário e inquilino.
 *
 * Este modelo é a fonte de verdade para geração de cobranças mensais.
 * O scheduler usa `billingMode` para decidir o que automatizar.
 */
const contractSchema = new mongoose.Schema(
  {
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },

    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },

    // Endereço denormalizado para usar na descrição das cobranças
    // sem precisar popular o join em todos os casos
    propertyAddress: {
      type: String,
      required: true,
    },

    rentAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    // Dia do mês do vencimento (1–28 para evitar problemas com fevereiro)
    dueDay: {
      type: Number,
      required: true,
      min: 1,
      max: 28,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // MANUAL  → o scheduler cria cobranças avulsas todo mês
    // AUTOMATIC → usa assinatura recorrente do Asaas (subscription)
    billingMode: {
      type: String,
      enum: ['MANUAL', 'AUTOMATIC'],
      default: 'MANUAL',
    },

    // ID da assinatura no Asaas — preenchido quando billingMode=AUTOMATIC
    asaasSubscriptionId: {
      type: String,
      default: null,
      trim: true,
    },

    // Configurações de multa/juros (podem sobrescrever os padrões do sistema)
    finePercent: {
      type: Number,
      default: 2,    // 2% de multa
    },

    interestPercent: {
      type: Number,
      default: 1,    // 1% ao mês de juros
    },

    discountPercent: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

contractSchema.index({ landlordId: 1, isActive: 1 })

const Contract = mongoose.model('Contract', contractSchema)

module.exports = Contract
