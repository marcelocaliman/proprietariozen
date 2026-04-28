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

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// TIMELINE PDF \u2014 Hist\u00f3rico cronol\u00f3gico de eventos do im\u00f3vel
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

interface TimelineEventoPDF {
  data: string
  tipo: string
  titulo: string
  descricao?: string | null
  futuro?: boolean
}

interface DadosTimeline {
  imovel: { apelido: string; endereco: string }
  inquilino_atual?: string | null
  eventos: TimelineEventoPDF[]
}

function formatarDataPDF(data: string): string {
  return new Date(data + 'T00:00:00')
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace('.', '')
}

const TITULO_TIPO_PDF: Record<string, string> = {
  contrato_iniciado: 'Contrato iniciado',
  contrato_renovado: 'Contrato renovado',
  contrato_encerrado: 'Contrato encerrado',
  inquilino_ativo: 'Inquilino ativo',
  inquilino_anterior: 'Inquilino anterior',
  pagamento: 'Pagamento',
  atraso: 'Atraso',
  cancelamento: 'Cancelamento',
  reajuste_aplicado: 'Reajuste aplicado',
  reajuste_previsto: 'Reajuste previsto',
  fim_contrato: 'Fim do contrato',
  fim_contrato_previsto: 'Fim previsto',
}

export function gerarTimelinePDF({ imovel, inquilino_atual, eventos }: DadosTimeline): void {
  const doc = new jsPDF()
  const preta: [number, number, number] = [15, 23, 42]
  const cinza: [number, number, number] = [100, 116, 139]
  const verde: [number, number, number] = [5, 150, 105]
  const mEsq = 16
  const mDir = 194  // 210 - 16

  // \u2500\u2500 Cabe\u00e7alho \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  doc.setFillColor(...verde)
  doc.rect(0, 0, 210, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Hist\u00f3rico do im\u00f3vel', mEsq, 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(imovel.apelido, mEsq, 22)
  doc.setFontSize(9)
  doc.setTextColor(220, 252, 231)
  doc.text(imovel.endereco, mEsq, 27)

  // \u2500\u2500 Info inicial \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  let y = 40
  doc.setTextColor(...cinza)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Gerado em ${formatarDataPDF(new Date().toISOString().slice(0, 10))}`, mEsq, y)
  if (inquilino_atual) {
    doc.text(`Inquilino atual: ${inquilino_atual}`, mDir, y, { align: 'right' })
  }
  y += 8

  // Linha divis\u00f3ria
  doc.setDrawColor(226, 232, 240)
  doc.line(mEsq, y, mDir, y)
  y += 6

  // Separar futuros e passados
  const futuros = eventos.filter(e => e.futuro)
  const passados = eventos.filter(e => !e.futuro)

  function ensureSpace(neededMm: number) {
    if (y + neededMm > 280) {
      doc.addPage()
      y = 16
    }
  }

  function renderSecao(titulo: string, lista: TimelineEventoPDF[]) {
    if (!lista.length) return
    ensureSpace(18)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...preta)
    doc.text(titulo, mEsq, y)
    y += 2
    doc.setDrawColor(226, 232, 240)
    doc.line(mEsq, y, mDir, y)
    y += 6

    for (const evento of lista) {
      ensureSpace(14)
      // Data + t\u00edtulo
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...preta)
      doc.text(evento.titulo, mEsq, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...cinza)
      doc.text(formatarDataPDF(evento.data), mDir, y, { align: 'right' })
      y += 4

      // Descri\u00e7\u00e3o
      if (evento.descricao) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8)
        doc.setTextColor(...cinza)
        const linhas = doc.splitTextToSize(evento.descricao, mDir - mEsq)
        for (const linha of linhas) {
          ensureSpace(4)
          doc.text(linha, mEsq, y)
          y += 4
        }
      }

      // Pequena marca de tipo (r\u00f3tulo cinza)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(TITULO_TIPO_PDF[evento.tipo] ?? evento.tipo, mEsq, y)
      y += 6
    }
    y += 2
  }

  if (futuros.length) renderSecao('PR\u00d3XIMOS EVENTOS', futuros)
  if (passados.length) renderSecao('HIST\u00d3RICO', passados)

  if (!eventos.length) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...cinza)
    doc.text('Nenhum evento registrado ainda.', mEsq, y)
  }

  // \u2500\u2500 Rodap\u00e9 \u2500\u2500
  const totalPaginas = doc.internal.pages.length - 1
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Propriet\u00e1rioZen \u2014 ${imovel.apelido} \u00b7 ${i}/${totalPaginas}`,
      105, 290, { align: 'center' },
    )
  }

  const slug = imovel.apelido.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')
  const dataStr = new Date().toISOString().slice(0, 10)
  doc.save(`historico_${slug}_${dataStr}.pdf`)
}
