'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase'

const schema = z.object({
  nome: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmacao: z.string(),
}).refine(d => d.senha === d.confirmacao, {
  message: 'As senhas não coincidem',
  path: ['confirmacao'],
})

type FormData = z.infer<typeof schema>

export function CadastroForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.senha,
        options: {
          data: { nome: data.nome },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
        },
      })

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Este e-mail já está cadastrado')
        } else {
          toast.error(error.message)
        }
        return
      }

      toast.success('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome completo</Label>
        <Input
          id="nome"
          placeholder="João Silva"
          autoComplete="name"
          {...register('nome')}
        />
        {errors.nome && (
          <p className="text-destructive text-xs">{errors.nome.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-destructive text-xs">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="senha">Senha</Label>
        <Input
          id="senha"
          type="password"
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
          {...register('senha')}
        />
        {errors.senha && (
          <p className="text-destructive text-xs">{errors.senha.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmacao">Confirmar senha</Label>
        <Input
          id="confirmacao"
          type="password"
          placeholder="Repita a senha"
          autoComplete="new-password"
          {...register('confirmacao')}
        />
        {errors.confirmacao && (
          <p className="text-destructive text-xs">{errors.confirmacao.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full mt-2" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Criar conta grátis
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  )
}
