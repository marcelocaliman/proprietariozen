'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Upload, FileText, ImageIcon, Trash2, Eye, Download,
  Paperclip, Loader2, File,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoDoc = 'contrato' | 'laudo_entrada' | 'laudo_saida' | 'comprovante' | 'foto' | 'outro'

const TIPO_LABELS: Record<TipoDoc, string> = {
  contrato:      'Contrato',
  laudo_entrada: 'Laudo de entrada',
  laudo_saida:   'Laudo de saída',
  comprovante:   'Comprovante',
  foto:          'Foto',
  outro:         'Outro',
}

interface Documento {
  id: string
  tipo: TipoDoc
  nome_arquivo: string
  tamanho: string
  tamanho_bytes: number
  mime_type: string
  descricao: string | null
  url: string
  criado_em: string
}

interface Props {
  aluguelId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sel =
  'h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus:border-ring disabled:cursor-not-allowed disabled:opacity-50'

function IconeArquivo({ mimeType, className }: { mimeType: string; className?: string }) {
  if (mimeType === 'application/pdf') return <FileText className={cn('text-red-500', className)} />
  if (mimeType.startsWith('image/')) return <ImageIcon className={cn('text-blue-500', className)} />
  return <File className={cn('text-slate-400', className)} />
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function DocumentosAluguel({ aluguelId }: Props) {
  const [docs, setDocs]                     = useState<Documento[]>([])
  const [loading, setLoading]               = useState(true)
  const [isDragging, setIsDragging]         = useState(false)
  const [fileParaConfirmar, setFileParaConfirmar] = useState<File | null>(null)
  const [tipo, setTipo]                     = useState<TipoDoc | ''>('')
  const [descricao, setDescricao]           = useState('')
  const [uploading, setUploading]           = useState(false)
  const [progresso, setProgresso]           = useState(0)
  const [deletando, setDeletando]           = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const buscarDocs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/documentos/aluguel/${aluguelId}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setDocs(json.documentos ?? [])
    } catch {
      toast.error('Erro ao carregar documentos')
    } finally {
      setLoading(false)
    }
  }, [aluguelId])

  useEffect(() => { buscarDocs() }, [buscarDocs])

  // ── Validação local do arquivo ─────────────────────────────────────────────

  function handleFileSelected(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10 MB.')
      return
    }
    const aceitos = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!aceitos.includes(file.type)) {
      toast.error('Tipo não permitido. Use PDF, JPG ou PNG.')
      return
    }
    setFileParaConfirmar(file)
    setTipo('')
    setDescricao('')
  }

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelected(file)
  }

  // ── Upload com progresso ───────────────────────────────────────────────────

  async function handleUploadConfirmar() {
    if (!fileParaConfirmar || !tipo) return
    setUploading(true)
    setProgresso(0)

    const formData = new FormData()
    formData.append('file', fileParaConfirmar)
    formData.append('tipo', tipo)
    if (descricao.trim()) formData.append('descricao', descricao.trim())

    try {
      const novoDoc = await new Promise<Documento>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgresso(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status === 201) {
            try {
              const json = JSON.parse(xhr.responseText)
              resolve(json.documento)
            } catch {
              reject(new Error('Resposta inválida do servidor'))
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText)
              reject(new Error(err.error ?? 'Erro ao enviar'))
            } catch {
              reject(new Error('Erro ao enviar'))
            }
          }
        }
        xhr.onerror = () => reject(new Error('Erro de rede'))
        xhr.open('POST', `/api/documentos/aluguel/${aluguelId}`)
        xhr.send(formData)
      })

      setDocs(prev => [novoDoc, ...prev])
      toast.success('Documento enviado com sucesso!')
      setFileParaConfirmar(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar documento')
    } finally {
      setUploading(false)
      setProgresso(0)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDeletar(doc: Documento) {
    if (!confirm(`Remover "${doc.nome_arquivo}"? Esta ação não pode ser desfeita.`)) return
    setDeletando(doc.id)
    try {
      const res = await fetch(`/api/documentos/aluguel/${aluguelId}/${doc.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error ?? 'Erro ao remover')
        return
      }
      setDocs(prev => prev.filter(d => d.id !== doc.id))
      toast.success('Documento removido')
    } catch {
      toast.error('Erro ao remover documento')
    } finally {
      setDeletando(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-[14px] text-[#0F172A] leading-tight">Documentos do período</p>
            <p className="text-xs text-[#94A3B8]">Contrato, laudos e comprovantes</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Zona de upload */}
          <div
            role="button"
            tabIndex={0}
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
              isDragging
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-[#D1D5DB] hover:border-emerald-400 hover:bg-slate-50',
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          >
            <Upload className="h-6 w-6 text-[#94A3B8] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#475569]">
              Arraste ou{' '}
              <span className="text-emerald-600 font-semibold">clique para selecionar</span>
            </p>
            <p className="text-xs text-[#94A3B8] mt-1">PDF, JPG, PNG — máx. 10 MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFileSelected(f)
              e.target.value = ''
            }}
          />

          {/* Lista de documentos */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[#94A3B8]" />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-1.5">
              <Paperclip className="h-8 w-8 text-slate-200" />
              <p className="text-sm text-[#94A3B8]">Nenhum documento anexado ainda</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#F1F5F9]">
              {docs.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <IconeArquivo mimeType={doc.mime_type} className="h-5 w-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate leading-snug">
                      {doc.nome_arquivo}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      {TIPO_LABELS[doc.tipo]} · {doc.tamanho}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => window.open(doc.url, '_blank')}
                      className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A] transition-colors"
                      title="Visualizar"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={doc.url}
                      download={doc.nome_arquivo}
                      className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A] transition-colors"
                      title="Baixar"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    <button
                      onClick={() => handleDeletar(doc)}
                      disabled={deletando === doc.id}
                      className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-50 text-[#94A3B8] hover:text-red-600 transition-colors disabled:opacity-40"
                      title="Remover"
                    >
                      {deletando === doc.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Modal de confirmação de upload ──────────────────────────────────── */}
      <Dialog
        open={!!fileParaConfirmar}
        onOpenChange={(o) => { if (!o && !uploading) setFileParaConfirmar(null) }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar documento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Prévia do arquivo */}
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-[#E2E8F0] px-3 py-2.5">
              <IconeArquivo mimeType={fileParaConfirmar?.type ?? ''} className="h-5 w-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#0F172A] truncate leading-snug">
                  {fileParaConfirmar?.name}
                </p>
                <p className="text-xs text-[#94A3B8]">
                  {fileParaConfirmar
                    ? fileParaConfirmar.size >= 1024 * 1024
                      ? `${(fileParaConfirmar.size / (1024 * 1024)).toFixed(1)} MB`
                      : `${Math.round(fileParaConfirmar.size / 1024)} KB`
                    : ''}
                </p>
              </div>
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label htmlFor="tipo-doc-aluguel">
                Tipo de documento <span className="text-red-500">*</span>
              </Label>
              <select
                id="tipo-doc-aluguel"
                className={sel}
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoDoc)}
              >
                <option value="" disabled>Selecione o tipo</option>
                {(Object.entries(TIPO_LABELS) as [TipoDoc, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label htmlFor="descricao-doc-aluguel">
                Descrição{' '}
                <span className="text-[#94A3B8] font-normal">(opcional)</span>
              </Label>
              <Input
                id="descricao-doc-aluguel"
                placeholder="Ex: Contrato assinado em 01/06/2025"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                maxLength={200}
              />
            </div>

            {/* Progress */}
            {uploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#64748B]">
                  <span>Enviando...</span>
                  <span>{progresso}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-150 rounded-full"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setFileParaConfirmar(null)}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#059669] hover:bg-[#047857]"
              onClick={handleUploadConfirmar}
              disabled={!tipo || uploading}
            >
              {uploading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
                : 'Enviar documento'
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
