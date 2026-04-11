import { CadastroForm } from '@/components/auth/cadastro-form'

export default function CadastroPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Criar conta grátis</h2>
        <p className="text-muted-foreground text-sm">
          Comece a gerenciar seus imóveis hoje mesmo.
        </p>
      </div>
      <CadastroForm />
    </div>
  )
}
