-- ============================================================
-- Migration: Sistema de tickets de suporte + notificações in-app
-- ============================================================

-- ── tickets ─────────────────────────────────────────────────
create table if not exists public.tickets (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  assunto             text not null,
  status              text not null default 'open'
                        check (status in ('open', 'em_andamento', 'aguardando_usuario', 'resolvido', 'fechado')),
  prioridade          text not null default 'normal'
                        check (prioridade in ('baixa', 'normal', 'alta', 'urgente')),
  categoria           text not null default 'duvida'
                        check (categoria in ('bug', 'financeiro', 'conta', 'sugestao', 'duvida', 'outro')),
  assigned_to         uuid references public.profiles(id) on delete set null,
  notas_internas      text,
  first_response_at   timestamptz,
  resolved_at         timestamptz,
  closed_at           timestamptz,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);

create index if not exists idx_tickets_user_id     on public.tickets(user_id);
create index if not exists idx_tickets_status_pri  on public.tickets(status, prioridade);
create index if not exists idx_tickets_assigned_to on public.tickets(assigned_to) where assigned_to is not null;
create index if not exists idx_tickets_criado_em   on public.tickets(criado_em desc);

-- Trigger para atualizar atualizado_em
create or replace function public.touch_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_tickets_touch on public.tickets;
create trigger trg_tickets_touch before update on public.tickets
  for each row execute function public.touch_atualizado_em();

-- ── ticket_mensagens ────────────────────────────────────────
create table if not exists public.ticket_mensagens (
  id                  uuid primary key default gen_random_uuid(),
  ticket_id           uuid not null references public.tickets(id) on delete cascade,
  autor_id            uuid references public.profiles(id) on delete set null,
  autor_role          text not null check (autor_role in ('user', 'admin')),
  conteudo            text not null,
  is_nota_interna     boolean not null default false,
  anexos              jsonb,
  criado_em           timestamptz not null default now()
);

create index if not exists idx_ticket_mensagens_ticket_id on public.ticket_mensagens(ticket_id, criado_em);

-- ── notificacoes ────────────────────────────────────────────
create table if not exists public.notificacoes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  tipo        text not null,
  titulo      text not null,
  mensagem    text,
  link        text,
  lida        boolean not null default false,
  criado_em   timestamptz not null default now()
);

create index if not exists idx_notificacoes_user_unread on public.notificacoes(user_id, criado_em desc) where lida = false;
create index if not exists idx_notificacoes_user_all    on public.notificacoes(user_id, criado_em desc);

-- ============================================================
-- RLS
-- ============================================================
alter table public.tickets           enable row level security;
alter table public.ticket_mensagens  enable row level security;
alter table public.notificacoes      enable row level security;

-- ── tickets policies ────────────────────────────────────────
drop policy if exists tickets_user_select on public.tickets;
drop policy if exists tickets_user_insert on public.tickets;
drop policy if exists tickets_user_update on public.tickets;
drop policy if exists tickets_admin_all   on public.tickets;

create policy tickets_user_select on public.tickets
  for select using (user_id = auth.uid());

create policy tickets_user_insert on public.tickets
  for insert with check (user_id = auth.uid());

-- User só pode atualizar próprios tickets (campo notas_internas é protegido na app)
create policy tickets_user_update on public.tickets
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy tickets_admin_all on public.tickets
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ── ticket_mensagens policies ───────────────────────────────
drop policy if exists ticket_mensagens_user_select on public.ticket_mensagens;
drop policy if exists ticket_mensagens_user_insert on public.ticket_mensagens;
drop policy if exists ticket_mensagens_admin_all   on public.ticket_mensagens;

-- User vê thread do próprio ticket EXCETO notas internas
create policy ticket_mensagens_user_select on public.ticket_mensagens
  for select using (
    is_nota_interna = false
    and exists (
      select 1 from public.tickets
      where tickets.id = ticket_mensagens.ticket_id
      and tickets.user_id = auth.uid()
    )
  );

-- User pode inserir mensagem em próprio ticket (apenas autor_role='user' e nunca nota interna)
create policy ticket_mensagens_user_insert on public.ticket_mensagens
  for insert with check (
    is_nota_interna = false
    and autor_role = 'user'
    and autor_id = auth.uid()
    and exists (
      select 1 from public.tickets
      where tickets.id = ticket_mensagens.ticket_id
      and tickets.user_id = auth.uid()
    )
  );

create policy ticket_mensagens_admin_all on public.ticket_mensagens
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ── notificacoes policies ───────────────────────────────────
drop policy if exists notificacoes_user_select on public.notificacoes;
drop policy if exists notificacoes_user_update on public.notificacoes;
drop policy if exists notificacoes_admin_all   on public.notificacoes;

create policy notificacoes_user_select on public.notificacoes
  for select using (user_id = auth.uid());

create policy notificacoes_user_update on public.notificacoes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notificacoes_admin_all on public.notificacoes
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- Storage bucket para anexos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('support-attachments', 'support-attachments', false)
on conflict (id) do nothing;

-- Policies do bucket: user só vê arquivos de tickets seus; admin vê tudo
drop policy if exists support_attachments_user_select on storage.objects;
drop policy if exists support_attachments_user_insert on storage.objects;
drop policy if exists support_attachments_admin_all   on storage.objects;

create policy support_attachments_user_select on storage.objects for select
  using (
    bucket_id = 'support-attachments'
    and exists (
      select 1 from public.tickets
      where tickets.id::text = (storage.foldername(name))[1]
      and tickets.user_id = auth.uid()
    )
  );

-- User pode upload em pasta do próprio ticket (path: {ticket_id}/{filename})
create policy support_attachments_user_insert on storage.objects for insert
  with check (
    bucket_id = 'support-attachments'
    and exists (
      select 1 from public.tickets
      where tickets.id::text = (storage.foldername(name))[1]
      and tickets.user_id = auth.uid()
    )
  );

create policy support_attachments_admin_all on storage.objects for all
  using (
    bucket_id = 'support-attachments'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

comment on table public.tickets is 'Tickets de suporte criados por usuários — moderados pelo super admin';
comment on table public.ticket_mensagens is 'Thread de respostas de cada ticket. is_nota_interna=true é visível só para admin';
comment on table public.notificacoes is 'Central de notificações in-app — genérica, atualmente usada para suporte mas serve para outros fluxos';
