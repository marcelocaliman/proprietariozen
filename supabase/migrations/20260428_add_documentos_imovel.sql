-- ============================================================
-- Migration: documentos por imóvel (contrato, escritura, plantas,
-- IPTU, fotos, vistorias gerais)
-- ============================================================

create table if not exists public.documentos_imovel (
  id            uuid        default gen_random_uuid() primary key,
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  imovel_id     uuid        not null references public.imoveis(id) on delete cascade,
  tipo          text        not null
    check (tipo in ('contrato', 'escritura', 'planta', 'iptu', 'foto', 'vistoria', 'outro')),
  nome_arquivo  text        not null,
  tamanho_bytes bigint      not null,
  mime_type     text        not null,
  storage_path  text        not null,
  descricao     text,
  criado_em     timestamptz default now()
);

create index if not exists idx_documentos_imovel_imovel_id
  on public.documentos_imovel(imovel_id);

create index if not exists idx_documentos_imovel_user_id
  on public.documentos_imovel(user_id);

-- RLS: só o dono do imóvel acessa
alter table public.documentos_imovel enable row level security;

create policy "documentos_imovel_select_own" on public.documentos_imovel
  for select using (auth.uid() = user_id);

create policy "documentos_imovel_insert_own" on public.documentos_imovel
  for insert with check (auth.uid() = user_id);

create policy "documentos_imovel_update_own" on public.documentos_imovel
  for update using (auth.uid() = user_id);

create policy "documentos_imovel_delete_own" on public.documentos_imovel
  for delete using (auth.uid() = user_id);

comment on table public.documentos_imovel is
  'Documentos vinculados ao imóvel (não a um aluguel específico). Storage em usuarios/{user_id}/imoveis/{imovel_id}/';
