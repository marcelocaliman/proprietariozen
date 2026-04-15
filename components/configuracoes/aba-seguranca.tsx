'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Eye, EyeOff, Monitor, Trash2, Download, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import {
  alterarSenha,
  encerrarOutrasSessoes,
  exportarDados,
  excluirConta,
} from '@/app/(dashboard)/configuracoes/actions'

// ── Força da senha ────────────────────────────────────────────────────────────

function calcularForcaSenha(senha: string): { score: number; label: string; cor: string } {
  if (!senha) return { score: 0, label: '', cor: '' }
  let score = 0
  if (senha.length >= 8) score++
  if (senha.length >= 12) score++
  if (/[A-Z]/.test(senha)) score++
  if (/[0-9]/.test(senha)) score++
  if (/[^A-Za-z0-9]/.test(senha)) score++

  if (score <= 1) return { score: 20, label: 'Fraca', cor: 'bg-destructive' }
  if (score <= 3) return { score: 60, label: 'Média', cor: 'bg-yellow-500' }
  return { score: 100, label: 'Forte', cor: 'bg-green-500' }
}

// ── Schema senha ─────────────────────────────────────────────────────────────

const schemaSenha = z
  .object({
    novaSenha: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmar: z.string(),
  })
  .refine(d => d.novaSenha === d.confirmar, {
    message: 'As senhas não coincidem',
    path: ['confirmar'],
  })

type FormSenha = z.infer<typeof schemaSenha>

interface Props {
  email: string
}

export function AbaSeguranca({ email }: Props) {
  const router = useRouter()
  const [mostrarNova, setMostrarNova] = useState(false)
  const [mostrarConf, setMostrarConf] = useState(false)
  const [loadingSenha, setLoadingSenha] = useState(false)
  const [loadingSessoes, setLoadingSessoes] = useState(false)
  const [loadingExportar, setLoadingExportar] = useState(false)
  const [excluirOpen, setExcluirOpen] = useState(false)
  const [emailConfirm, setEmailConfirm] = useState('')
  const [entendo, setEntendo] = useState(false)
  const [loadingExcluir, setLoadingExcluir] = useState(false)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormSenha>({
    resolver: zodResolver(schemaSenha),
    defaultValues: { novaSenha: '', confirmar: '' },
  })

  const novaSenha = watch('novaSenha') ?? ''
  const forca = calcularForcaSenha(novaSenha)

  // ── Alterar senha ───────────────────────────────────────────────────────────

  async function handleAlterarSenha(data: FormSenha) {
    setLoadingSenha(true)
    try {
      const result = await alterarSenha(data.novaSenha)
      if (result.error) toast.error(result.error)
      else {
        toast.success('Senha alterada com sucesso!')
        reset()
      }
    } finally {
      setLoadingSenha(false)
    }
  }

  // ── Encerrar sessões ────────────────────────────────────────────────────────

  async function handleEncerrarSessoes() {
    setLoadingSessoes(true)
    try {
      const result = await encerrarOutrasSessoes()
      if (result.error) toast.error(result.error)
      else toast.success('Outras sessões encerradas!')
    } finally {
      setLoadingSessoes(false)
    }
  }

  // ── Exportar dados ──────────────────────────────────────────────────────────

  async function handleExportar() {
    setLoadingExportar(true)
    try {
      const result = await exportarDados()
      if (result.error || !result.dados) { toast.error(result.error ?? 'Erro ao exportar'); return }
      const blob = new Blob([JSON.stringify(result.dados, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proprietariozen_dados_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Dados exportados!')
    } finally {
      setLoadingExportar(false)
    }
  }

  // ── Excluir conta ───────────────────────────────────────────────────────────

  async function handleExcluir() {
    if (emailConfirm !== email) { toast.error('E-mail não confere'); return }
    if (!entendo) { toast.error('Confirme que entende a ação'); return }
    setLoadingExcluir(true)
    try {
      const result = await excluirConta()
      if (result.error) { toast.error(result.error); return }
      toast.success('Conta excluída.')
      router.push('/login')
    } finally {
      setLoadingExcluir(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Alterar senha */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Alterar senha</CardTitle>
          <CardDescription>
            Escolha uma senha forte com pelo menos 8 caracteres
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleAlterarSenha)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="novaSenha">Nova senha</Label>
              <div className="relative">
                <Input
                  id="novaSenha"
                  type={mostrarNova ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  {...register('novaSenha')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarNova(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
                >
                  {mostrarNova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.novaSenha && <p className="text-xs text-destructive">{errors.novaSenha.message}</p>}

              {/* Barra de força */}
              {novaSenha && (
                <div className="space-y-1.5 pt-1">
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div
                      className={`h-full transition-all ${forca.cor}`}
                      style={{ width: `${forca.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    Força: <span className="font-medium text-[#0F172A]">{forca.label}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmar">Confirmar nova senha</Label>
              <div className="relative">
                <Input
                  id="confirmar"
                  type={mostrarConf ? 'text' : 'password'}
                  placeholder="Repita a nova senha"
                  {...register('confirmar')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarConf(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
                >
                  {mostrarConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmar && <p className="text-xs text-destructive">{errors.confirmar.message}</p>}
            </div>

            <Button type="submit" disabled={loadingSenha} className="gap-2 bg-[#059669] hover:bg-[#047857]">
              {loadingSenha && <Loader2 className="h-4 w-4 animate-spin" />}
              Alterar senha
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sessões ativas */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Sessões ativas</CardTitle>
          <CardDescription>Gerencie os dispositivos com acesso à sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Navegador atual</p>
                <p className="text-xs text-[#94A3B8]">Sessão ativa agora</p>
              </div>
            </div>
            <Badge className="text-xs bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5] font-semibold">Este dispositivo</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={loadingSessoes}
            onClick={handleEncerrarSessoes}
            className="gap-2 text-destructive hover:text-destructive"
          >
            {loadingSessoes && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Encerrar todas as outras sessões
          </Button>
        </CardContent>
      </Card>

      {/* Zona de perigo */}
      <Card className="border-destructive/40">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Zona de perigo
          </CardTitle>
          <CardDescription>
            Ações irreversíveis — proceda com cuidado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">Exportar meus dados</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Baixar um JSON com todos os imóveis, inquilinos e histórico de pagamentos
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={loadingExportar}
              onClick={handleExportar}
              className="shrink-0 gap-2"
            >
              {loadingExportar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Exportar
            </Button>
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-destructive">Excluir minha conta</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Apaga permanentemente todos os dados. Esta ação não pode ser desfeita.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setExcluirOpen(true)}
              className="shrink-0 gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir conta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal confirmação de exclusão */}
      <Dialog open={excluirOpen} onOpenChange={setExcluirOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Excluir conta permanentemente?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-1.5">
              <p className="text-sm font-medium text-destructive">Esta ação é irreversível.</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Todos os imóveis e inquilinos serão apagados</li>
                <li>O histórico de aluguéis será removido</li>
                <li>Sua assinatura Master será cancelada (se ativa)</li>
                <li>Não será possível recuperar os dados</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emailConfirm">
                Digite seu e-mail <span className="font-semibold">{email}</span> para confirmar
              </Label>
              <Input
                id="emailConfirm"
                type="email"
                placeholder={email}
                value={emailConfirm}
                onChange={e => setEmailConfirm(e.target.value)}
              />
            </div>

            <div className="flex items-start gap-3">
              <Switch
                id="entendo"
                checked={entendo}
                onCheckedChange={setEntendo}
                className="mt-0.5"
              />
              <Label htmlFor="entendo" className="text-sm cursor-pointer leading-relaxed">
                Entendo que todos os dados serão apagados permanentemente e que esta ação não pode ser desfeita
              </Label>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => { setExcluirOpen(false); setEmailConfirm(''); setEntendo(false) }}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={loadingExcluir || emailConfirm !== email || !entendo}
                onClick={handleExcluir}
                className="gap-2"
              >
                {loadingExcluir && <Loader2 className="h-4 w-4 animate-spin" />}
                Excluir conta permanentemente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
