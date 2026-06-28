-- Pricing plans system: plans, features, and values per plan

CREATE TABLE public.pricing_plans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  slug         text NOT NULL UNIQUE,
  tagline      text NOT NULL DEFAULT '',
  price_label  text,
  cta_label    text NOT NULL DEFAULT 'Começar agora',
  highlighted  boolean NOT NULL DEFAULT false,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pricing_features (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text NOT NULL DEFAULT '',
  label       text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0
);

CREATE TABLE public.pricing_plan_features (
  plan_id     uuid NOT NULL REFERENCES public.pricing_plans(id) ON DELETE CASCADE,
  feature_id  uuid NOT NULL REFERENCES public.pricing_features(id) ON DELETE CASCADE,
  value       text NOT NULL DEFAULT '',
  available   boolean NOT NULL DEFAULT true,
  PRIMARY KEY (plan_id, feature_id)
);

-- RLS: public read, only authenticated admin writes
ALTER TABLE public.pricing_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_features      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plan_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can read plans"
  ON public.pricing_plans FOR SELECT USING (true);
CREATE POLICY "public can read features"
  ON public.pricing_features FOR SELECT USING (true);
CREATE POLICY "public can read plan features"
  ON public.pricing_plan_features FOR SELECT USING (true);

CREATE POLICY "authenticated can manage plans"
  ON public.pricing_plans FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated can manage features"
  ON public.pricing_features FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated can manage plan features"
  ON public.pricing_plan_features FOR ALL USING (auth.role() = 'authenticated');

-- ─── Seed: Plans ────────────────────────────────────────────────────────────

INSERT INTO public.pricing_plans (id, name, slug, tagline, price_label, cta_label, highlighted, sort_order) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Starter', 'starter',
   'Profissionais autônomos e pequenos negócios testando a ferramenta.',
   'Grátis', 'Criar conta grátis', false, 1),
  ('11111111-0000-0000-0000-000000000002', 'Pro', 'pro',
   'Agências de marketing, restaurantes, eventos e médias empresas.',
   NULL, 'Falar com vendas', true, 2),
  ('11111111-0000-0000-0000-000000000003', 'Enterprise', 'enterprise',
   'Indústrias, grandes operações de campo, facilities e corporações.',
   NULL, 'Falar com vendas', false, 3);

-- ─── Seed: Features ─────────────────────────────────────────────────────────

INSERT INTO public.pricing_features (id, category, label, sort_order) VALUES
  -- QR Codes
  ('22222222-0000-0000-0000-000000000001', 'QR Codes', 'Limite de QR Codes dinâmicos', 1),
  ('22222222-0000-0000-0000-000000000002', 'QR Codes', 'Tipos básicos (Link, WhatsApp, vCard, Wi-Fi, Texto)', 2),
  ('22222222-0000-0000-0000-000000000003', 'QR Codes', 'Tipos avançados (PDF, Arquivo, Vídeo, Lista de Links, PIX, Evento)', 3),
  -- Visual
  ('22222222-0000-0000-0000-000000000004', 'Visual & Organização', 'Personalização visual (cores, molduras, logo)', 4),
  ('22222222-0000-0000-0000-000000000005', 'Visual & Organização', 'Organização por pastas e tags', 5),
  -- Analytics
  ('22222222-0000-0000-0000-000000000006', 'Analytics', 'Histórico de analytics', 6),
  ('22222222-0000-0000-0000-000000000007', 'Analytics', 'Integração de pixels (Meta, GA4, TikTok, etc.)', 7),
  ('22222222-0000-0000-0000-000000000008', 'Analytics', 'UTM automático', 8),
  ('22222222-0000-0000-0000-000000000009', 'Analytics', 'Criação em lote via CSV', 9),
  -- Automação
  ('22222222-0000-0000-0000-000000000010', 'Automação Operacional', 'Fluxo operacional (formulários)', 10),
  ('22222222-0000-0000-0000-000000000011', 'Automação Operacional', 'Portão GPS e portão de senha', 11),
  ('22222222-0000-0000-0000-000000000012', 'Automação Operacional', 'Prova de presença certificada (HMAC-SHA256)', 12),
  ('22222222-0000-0000-0000-000000000013', 'Automação Operacional', 'Roteamento contextual (horário, local, perfil)', 13),
  -- Integrações
  ('22222222-0000-0000-0000-000000000014', 'Integrações & Dados', 'Inteligência artificial — chatbot Gemini', 14),
  ('22222222-0000-0000-0000-000000000015', 'Integrações & Dados', 'Webhooks e integração API (CRM/ERP)', 15),
  ('22222222-0000-0000-0000-000000000016', 'Integrações & Dados', 'Exportação de dados CSV', 16);

-- ─── Seed: Plan × Feature values ────────────────────────────────────────────

INSERT INTO public.pricing_plan_features (plan_id, feature_id, value, available) VALUES
  -- Starter
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','Até 5', true),
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000002','Sim', true),
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000003','Não', false),
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000004','Básica (sem logo)', true),
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000005','Não', false),
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000006','7 dias', true),
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000007','Não', false),
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000008','Não', false),
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000009','Não', false),
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000010','Não', false),
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000011','Não', false),
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000012','Não', false),
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000013','Não', false),
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000014','Não', false),
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000015','Não', false),
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000016','Não', false),
  -- Pro
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000001','Até 100', true),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000002','Sim', true),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000003','Sim', true),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000004','Completa (com logo)', true),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000005','Sim', true),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000006','30 dias', true),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000007','Até 2 pixels por QR', true),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000008','Sim', true),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000009','Até 50 por vez', true),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000010','100 respostas/mês', true),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000011','Não', false),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000012','Não', false),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000013','Não', false),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000014','Não', false),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000015','Não', false),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000016','Sim', true),
  -- Enterprise
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000001','Ilimitado', true),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000002','Sim', true),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000003','Sim', true),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000004','Completa (com logo)', true),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000005','Sim', true),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000006','90+ dias', true),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000007','Todos (7 pixels)', true),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000008','Sim', true),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000009','Ilimitado', true),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000010','Respostas ilimitadas', true),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000011','Sim', true),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000012','Sim', true),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000013','Sim', true),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000014','Até 20 docs por QR', true),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000015','Sim', true),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000016','Sim', true);
