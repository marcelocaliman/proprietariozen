-- ============================================================
-- Migration: rastreamento de status de assinatura Stripe em profiles
-- ============================================================
-- Objetivo: ter MRR/churn precisos e poder bloquear acesso de
-- usuários cujo Stripe foi cancelado mas o customer_id continua
-- gravado.

alter table public.profiles
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_subscription_status text,
  add column if not exists stripe_subscription_current_period_end timestamptz,
  add column if not exists stripe_subscription_cancel_at_period_end boolean not null default false,
  add column if not exists stripe_price_id text;

comment on column public.profiles.stripe_subscription_id is
  'ID da subscription Stripe atual (sub_...)';
comment on column public.profiles.stripe_subscription_status is
  'Status: active, trialing, past_due, canceled, unpaid, incomplete, incomplete_expired, paused';
comment on column public.profiles.stripe_subscription_current_period_end is
  'Data de fim do período atual (renovação ou término efetivo se cancelando)';
comment on column public.profiles.stripe_subscription_cancel_at_period_end is
  'Se true, a assinatura será cancelada ao fim do período atual';
comment on column public.profiles.stripe_price_id is
  'Price ID do plano atual (price_... do Stripe)';

create index if not exists idx_profiles_stripe_sub_status
  on public.profiles(stripe_subscription_status)
  where stripe_subscription_status is not null;
