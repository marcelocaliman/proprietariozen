import jsPDF from 'jspdf'
import { formatarData, formatarMoeda, formatarMesReferencia, formatarCPF } from './helpers'

interface DadosRecibo {
  pagamento: {
    id: string
    valor: number
    mes_referencia: string
    data_vencimento: string
    data_pagamento: string | null
    status: string
    observacao: string | null
    imovel: {
      apelido: string
      endereco: string
    }
    inquilino: {
      nome: string
      cpf: string | null
      email: string | null
      telefone: string | null
    }
  }
  proprietario: {
    nome: string
    email: string
    telefone: string | null
  }
}

// Número estável do recibo baseado no UUID (não muda entre gerações)
function numeroRecibo(id: string): string {
  const ano = new Date().getFullYear()
  const codigo = id.replace(/-/g, '').slice(-8).toUpperCase()
  return `REC-${ano}-${codigo}`
}

export function gerarReciboPDF({ pagamento, proprietario }: DadosRecibo): void {
  const doc = new jsPDF()
  const { imovel, inquilino } = pagamento

  const mEsq  = 20   // margem esquerda
  const mDir  = 190  // margem direita
  const lUtil = 170  // largura útil
  const azul  = [30, 64, 175] as const   // blue-800
  const cinza = [107, 114, 128] as const // gray-500
  const preta = [17, 24, 39] as const    // gray-900

  // ── Cabeçalho ───────────────────────────────────────────────
  doc.setFillColor(...azul)
  doc.rect(0, 0, 210, 36, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text('RECIBO DE ALUGUEL', 105, 16, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(200, 210, 240)
  doc.text('ProprietárioZen — Gestão de Imóveis', 105, 24, { align: 'center' })

  // ── Número e data de emissão ─────────────────────────────────
  let y = 46
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...preta)
  doc.text(`Nº ${numeroRecibo(pagamento.id)}`, mEsq, y)
  doc.text(`Emitido em: ${formatarData(new Date())}`, mDir, y, { align: 'right' })

  // ── Caixa de destaque — valor + referência ───────────────────
  y += 8
  doc.setFillColor(239, 246, 255)  // blue-50
  doc.setDrawColor(...azul)
  doc.setLineWidth(0.5)
  doc.roundedRect(mEsq, y, lUtil, 22, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...azul)
  doc.text(`Valor Pago: ${formatarMoeda(pagamento.valor)}`, 105, y + 9, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...cinza)
  doc.text(`Referência: ${formatarMesReferencia(pagamento.mes_referencia)}`, 105, y + 17, { align: 'center' })

  // ── Divisória ────────────────────────────────────────────────
  y += 30
  doc.setDrawColor(229, 231, 235)  // gray-200
  doc.setLineWidth(0.3)
  doc.line(mEsq, y, mDir, y)

  // Função auxiliar para seção
  function secao(titulo: string, yPos: number): number {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...azul)
    doc.text(titulo, mEsq, yPos)
    doc.setLineWidth(0.2)
    doc.setDrawColor(...azul)
    doc.line(mEsq, yPos + 1.5, mEsq + 30, yPos + 1.5)
    return yPos + 6
  }

  function linha(label: string, valor: string, yPos: number): number {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...cinza)
    doc.text(label, mEsq, yPos)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...preta)
    doc.text(valor, mEsq + 32, yPos)
    return yPos + 6
  }

  // ── LOCATÁRIO ────────────────────────────────────────────────
  y += 8
  y = secao('LOCATÁRIO', y)
  y = linha('Nome:', inquilino.nome, y)
  if (inquilino.cpf) y = linha('CPF:', formatarCPF(inquilino.cpf), y)
  if (inquilino.email) y = linha('E-mail:', inquilino.email, y)
  if (inquilino.telefone) y = linha('Telefone:', inquilino.telefone, y)

  // ── IMÓVEL ───────────────────────────────────────────────────
  y += 4
  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.3)
  doc.line(mEsq, y, mDir, y)
  y += 8
  y = secao('IMÓVEL', y)
  y = linha('Apelido:', imovel.apelido, y)
  y = linha('Endereço:', imovel.endereco, y)

  // ── DADOS DO PAGAMENTO ───────────────────────────────────────
  y += 4
  doc.line(mEsq, y, mDir, y)
  y += 8
  y = secao('DADOS DO PAGAMENTO', y)
  y = linha('Referência:', formatarMesReferencia(pagamento.mes_referencia), y)
  y = linha('Vencimento:', formatarData(pagamento.data_vencimento), y)
  if (pagamento.data_pagamento)
    y = linha('Pagamento:', formatarData(pagamento.data_pagamento), y)
  y = linha('Status:', pagamento.status.toUpperCase(), y)
  if (pagamento.observacao) y = linha('Observação:', pagamento.observacao, y)

  // ── LOCADOR ──────────────────────────────────────────────────
  y += 4
  doc.line(mEsq, y, mDir, y)
  y += 8
  y = secao('LOCADOR', y)
  y = linha('Nome:', proprietario.nome, y)
  y = linha('E-mail:', proprietario.email, y)
  if (proprietario.telefone) y = linha('Telefone:', proprietario.telefone, y)

  // ── Declaração ───────────────────────────────────────────────
  y += 4
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.4)
  doc.line(mEsq, y, mDir, y)
  y += 8

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  const declaracao =
    `Declaro que recebi a quantia de ${formatarMoeda(pagamento.valor)} referente ao aluguel do imóvel ` +
    `"${imovel.apelido}" (${imovel.endereco}), relativo ao período de ` +
    `${formatarMesReferencia(pagamento.mes_referencia)}, dando plena quitação.`
  const linhasDecl = doc.splitTextToSize(declaracao, lUtil)
  doc.text(linhasDecl, mEsq, y)

  // ── Assinatura ───────────────────────────────────────────────
  y += linhasDecl.length * 5 + 14
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.line(mEsq, y, mEsq + 75, y)
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...preta)
  doc.text(proprietario.nome, mEsq, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...cinza)
  doc.text('Locador', mEsq, y)

  // ── Rodapé ───────────────────────────────────────────────────
  doc.setFillColor(249, 250, 251)  // gray-50
  doc.rect(0, 275, 210, 22, 'F')
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Este recibo foi gerado eletronicamente pelo ProprietárioZen.', 105, 282, { align: 'center' })
  doc.text(`Emitido em ${formatarData(new Date())} — ${numeroRecibo(pagamento.id)}`, 105, 288, { align: 'center' })

  // Nome do arquivo seguro
  const inquilinoSlug = inquilino.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')
  doc.save(`recibo_${pagamento.mes_referencia}_${inquilinoSlug}.pdf`)
}
