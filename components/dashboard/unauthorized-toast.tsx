'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

/**
 * Componente montado no layout do dashboard.
 * Se a URL contiver ?acesso=negado (vindo do middleware /admin/*),
 * exibe o toast e limpa o parâmetro da URL.
 */
export function UnauthorizedToast() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('acesso') === 'negado') {
      toast.error('Acesso não autorizado', {
        description: 'Você não tem permissão para acessar o painel administrativo.',
      })
      // Remove o parâmetro da URL sem recarregar a página
      const url = new URL(window.location.href)
      url.searchParams.delete('acesso')
      router.replace(url.pathname + (url.search || ''), { scroll: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
