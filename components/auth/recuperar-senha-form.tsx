'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
})

type FormData = z.infer<typeof schema>

export function RecuperarSenhaForm() {
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      })
      if (error) {
        toast.error(error.message)
        return
      }
      setEnviado(true)
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[#D1FAE5] flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-[#059669]" />
          </div>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-xl font-bold text-[#0F172A]">E-mail enviado!</h3>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
          </p>
        </div>
        <Link
          href="/login"
          className="auth-btn-google inline-flex w-full items-center justify-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">Recuperar senha</h2>
        <p className="text-sm text-[#94A3B8]">Enviaremos um link para redefinir sua senha.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-[#0F172A]">E-mail cadastrado</label>
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

        <button type="submit" disabled={loading} className="auth-btn">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Enviar link de recuperação
        </button>
      </form>

      <Link
        href="/login"
        className="auth-btn-google inline-flex w-full items-center justify-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao login
      </Link>
    </div>
  )
}
