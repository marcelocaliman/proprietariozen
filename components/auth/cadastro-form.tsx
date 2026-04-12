'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const schema = z.object({
  nome: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmacao: z.string(),
  termos: z.literal(true, { message: 'Você deve aceitar os termos' }),
}).refine(d => d.senha === d.confirmacao, {
  message: 'As senhas não coincidem',
  path: ['confirmacao'],
})

type FormData = z.infer<typeof schema>

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.017 17.64 11.71 17.64 9.2Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A9 9 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

export function CadastroForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConf, setMostrarConf] = useState(false)

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
        toast.error(
          error.message.includes('already registered')
            ? 'Este e-mail já está cadastrado'
            : error.message
        )
        return
      }
      toast.success('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoadingGoogle(true)
    try {
      const supabase = createClient()
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/api/auth/callback` },
      })
    } finally {
      setLoadingGoogle(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Badge + Heading */}
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D1FAE5] px-3 py-1 text-xs font-semibold text-[#065F46]">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1 5L3.5 7.5L9 2" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          14 dias grátis — sem cartão
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">Crie sua conta grátis</h2>
        <p className="text-sm text-[#94A3B8]">Comece a gerenciar seus imóveis hoje mesmo.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        {/* Nome */}
        <div className="space-y-1.5">
          <label htmlFor="nome" className="block text-sm font-medium text-[#0F172A]">Nome completo</label>
          <input
            id="nome"
            type="text"
            placeholder="João Silva"
            autoComplete="name"
            className="auth-input"
            {...register('nome')}
          />
          {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-[#0F172A]">E-mail</label>
          <input
            id="email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            className="auth-input"
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>

        {/* Senha */}
        <div className="space-y-1.5">
          <label htmlFor="senha" className="block text-sm font-medium text-[#0F172A]">Senha</label>
          <div className="relative">
            <input
              id="senha"
              type={mostrarSenha ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              className="auth-input pr-10"
              {...register('senha')}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] transition-colors"
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.senha && <p className="text-xs text-red-500">{errors.senha.message}</p>}
        </div>

        {/* Confirmação */}
        <div className="space-y-1.5">
          <label htmlFor="confirmacao" className="block text-sm font-medium text-[#0F172A]">Confirmar senha</label>
          <div className="relative">
            <input
              id="confirmacao"
              type={mostrarConf ? 'text' : 'password'}
              placeholder="Repita a senha"
              autoComplete="new-password"
              className="auth-input pr-10"
              {...register('confirmacao')}
            />
            <button
              type="button"
              onClick={() => setMostrarConf(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] transition-colors"
              aria-label={mostrarConf ? 'Ocultar confirmação' : 'Mostrar confirmação'}
            >
              {mostrarConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmacao && <p className="text-xs text-red-500">{errors.confirmacao.message}</p>}
        </div>

        {/* Terms */}
        <div className="flex items-start gap-2.5 pt-0.5">
          <input
            id="termos"
            type="checkbox"
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-[#E2E8F0] accent-[#059669]"
            {...register('termos')}
          />
          <label htmlFor="termos" className="text-xs text-[#475569] cursor-pointer leading-relaxed">
            Concordo com os{' '}
            <Link href="/termos" className="text-[#059669] hover:underline font-medium">Termos de Uso</Link>
            {' '}e a{' '}
            <Link href="/privacidade" className="text-[#059669] hover:underline font-medium">Política de Privacidade</Link>
          </label>
        </div>
        {errors.termos && <p className="text-xs text-red-500 -mt-1">{errors.termos.message}</p>}

        <button type="submit" disabled={loading} className="auth-btn mt-1">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar conta grátis
        </button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E2E8F0]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 text-[#94A3B8]">ou continue com</span>
        </div>
      </div>

      {/* Google */}
      <button
        type="button"
        disabled={loadingGoogle}
        onClick={handleGoogle}
        className="auth-btn-google"
      >
        {loadingGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        Continuar com Google
      </button>

      <p className="text-center text-sm text-[#94A3B8]">
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold text-[#059669] hover:text-[#047857] transition-colors">
          Entrar
        </Link>
      </p>
    </div>
  )
}
