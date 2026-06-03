-- ============================================================
-- LGPD: soft delete em profiles
-- ============================================================
-- Para suportar o direito ao esquecimento (Art. 18, VI da LGPD) sem
-- quebrar integridade referencial nem destruir dados de outros usuários
-- (ex: aluguéis pagos antes da exclusão são fatos contábeis que devem
-- permanecer).
--
-- Estratégia:
-- 1. Marca o profile como deleted_at = now() (soft delete)
-- 2. Anonimiza nome/email/telefone/cpf via update no endpoint
-- 3. Auth user (auth.users) é excluído via stripe.auth.admin.deleteUser
-- 4. Imóveis/inquilinos viram inativos
-- 5. Aluguéis pagos ficam (com nome substituído)

alter table public.profiles
  add column if not exists deleted_at timestamptz;

create index if not exists idx_profiles_deleted_at
  on public.profiles(deleted_at)
  where deleted_at is not null;

comment on column public.profiles.deleted_at is
  'LGPD soft delete: data em que o usuário pediu exclusão. Quando setado, dados pessoais foram anonimizados e a conta auth foi removida.';
