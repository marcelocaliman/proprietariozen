import { RecuperarSenhaForm } from '@/components/auth/recuperar-senha-form'

export default function RecuperarSenhaPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Recuperar senha</h2>
        <p className="text-muted-foreground text-sm">
          Enviaremos um link para você redefinir sua senha.
        </p>
      </div>
      <RecuperarSenhaForm />
    </div>
  )
}
