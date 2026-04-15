-- Colunas para banimento de usuários no painel admin

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned         BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_reason  TEXT,
  ADD COLUMN IF NOT EXISTS banned_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Índice parcial: só indexa linhas banidas (sparse, eficiente)
CREATE INDEX IF NOT EXISTS idx_profiles_banned
  ON public.profiles(banned)
  WHERE banned = true;

-- Comentários
COMMENT ON COLUMN public.profiles.banned        IS 'Usuário impedido de acessar o app';
COMMENT ON COLUMN public.profiles.banned_at     IS 'Quando foi banido';
COMMENT ON COLUMN public.profiles.banned_reason IS 'Motivo registrado pelo admin';
COMMENT ON COLUMN public.profiles.banned_by     IS 'ID do admin que executou o banimento';
