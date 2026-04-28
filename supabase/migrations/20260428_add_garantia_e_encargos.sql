-- ============================================================
-- Migration: garantia/caução/fiador + encargos extras (IPTU,
-- condomínio, outros) por imóvel
-- ============================================================

-- ── Garantia do contrato ──────────────────────────────────────
-- Tipo de garantia que protege o proprietário em caso de
-- inadimplência. Cada tipo tem campos específicos.
alter table public.imoveis
  add column if not exists garantia_tipo text
    check (garantia_tipo in ('caucao', 'fiador', 'seguro_fianca', 'titulo_capitalizacao', 'sem_garantia')),
  add column if not exists garantia_valor numeric(10,2),
  add column if not exists garantia_observacao text,
  -- Fiador
  add column if not exists fiador_nome text,
  add column if not exists fiador_cpf text,
  add column if not exists fiador_telefone text,
  add column if not exists fiador_email text,
  -- Seguro fiança
  add column if not exists seguro_fianca_seguradora text,
  add column if not exists seguro_fianca_apolice text,
  add column if not exists seguro_fianca_validade date;

-- ── Encargos extras mensais ───────────────────────────────────
-- Valores que são somados ao aluguel base no momento de gerar a
-- cobrança mensal. Permite ao gestor cobrar IPTU mensalizado,
-- condomínio repassado, etc, mantendo separação contábil.
alter table public.imoveis
  add column if not exists iptu_mensal numeric(10,2) default 0,
  add column if not exists condominio_mensal numeric(10,2) default 0,
  add column if not exists outros_encargos numeric(10,2) default 0,
  add column if not exists outros_encargos_descricao text;

-- ── Aluguel: snapshot dos encargos no momento da geração ──────
-- Salva o valor de cada encargo no momento que o aluguel é
-- gerado, pra preservar histórico se os valores mudarem depois.
alter table public.alugueis
  add column if not exists valor_aluguel_base numeric(10,2),
  add column if not exists valor_iptu numeric(10,2) default 0,
  add column if not exists valor_condominio numeric(10,2) default 0,
  add column if not exists valor_outros_encargos numeric(10,2) default 0;

comment on column public.imoveis.garantia_tipo is
  'Tipo de garantia: caucao, fiador, seguro_fianca, titulo_capitalizacao, sem_garantia';
comment on column public.imoveis.iptu_mensal is
  'IPTU mensalizado, somado ao aluguel base na cobrança mensal';
comment on column public.alugueis.valor_aluguel_base is
  'Valor do aluguel sem encargos no momento da geração (snapshot histórico)';
