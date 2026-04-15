import { redirect } from 'next/navigation'

// /admin → redireciona para a visão geral
export default function AdminPage() {
  redirect('/admin/visao-geral')
}
