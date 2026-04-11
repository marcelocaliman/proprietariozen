import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Entrar na conta</h2>
        <p className="text-muted-foreground text-sm">
          Bem-vindo de volta. Informe seus dados abaixo.
        </p>
      </div>
      <LoginForm />
    </div>
  )
}
