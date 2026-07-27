-- Add "Registro de Ponto" as a gated feature

INSERT INTO public.pricing_features (id, category, label, sort_order)
VALUES ('22222222-0000-0000-0000-000000000017', 'Automação Operacional', 'Registro de Ponto (geofence + biometria)', 17)
ON CONFLICT (id) DO NOTHING;

-- Set machine-readable key so FeatureGate("ponto") works
ALTER TABLE public.pricing_features ADD COLUMN IF NOT EXISTS key text;
UPDATE public.pricing_features SET key = 'ponto' WHERE id = '22222222-0000-0000-0000-000000000017';

-- Plan × Feature: Starter = not available, Pro = available, Enterprise = available
INSERT INTO public.pricing_plan_features (plan_id, feature_id, value, available) VALUES
  ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000017', 'Não', false),
  ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000017', 'Sim', true),
  ('11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000017', 'Sim', true)
ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value, available = EXCLUDED.available;
