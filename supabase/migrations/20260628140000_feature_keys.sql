-- Add machine-readable key to pricing_features for programmatic gating

ALTER TABLE public.pricing_features ADD COLUMN IF NOT EXISTS key text;

UPDATE public.pricing_features SET key = 'qr_limit'           WHERE id = '22222222-0000-0000-0000-000000000001';
UPDATE public.pricing_features SET key = 'qr_basic_types'     WHERE id = '22222222-0000-0000-0000-000000000002';
UPDATE public.pricing_features SET key = 'qr_advanced_types'  WHERE id = '22222222-0000-0000-0000-000000000003';
UPDATE public.pricing_features SET key = 'qr_customization'   WHERE id = '22222222-0000-0000-0000-000000000004';
UPDATE public.pricing_features SET key = 'folders_tags'       WHERE id = '22222222-0000-0000-0000-000000000005';
UPDATE public.pricing_features SET key = 'analytics_history'  WHERE id = '22222222-0000-0000-0000-000000000006';
UPDATE public.pricing_features SET key = 'pixel_integrations' WHERE id = '22222222-0000-0000-0000-000000000007';
UPDATE public.pricing_features SET key = 'utm_auto'           WHERE id = '22222222-0000-0000-0000-000000000008';
UPDATE public.pricing_features SET key = 'bulk_create'        WHERE id = '22222222-0000-0000-0000-000000000009';
UPDATE public.pricing_features SET key = 'operational_flow'   WHERE id = '22222222-0000-0000-0000-000000000010';
UPDATE public.pricing_features SET key = 'gps_gate'           WHERE id = '22222222-0000-0000-0000-000000000011';
UPDATE public.pricing_features SET key = 'proof_of_presence'  WHERE id = '22222222-0000-0000-0000-000000000012';
UPDATE public.pricing_features SET key = 'contextual_routing' WHERE id = '22222222-0000-0000-0000-000000000013';
UPDATE public.pricing_features SET key = 'ai_chatbot'         WHERE id = '22222222-0000-0000-0000-000000000014';
UPDATE public.pricing_features SET key = 'webhooks'           WHERE id = '22222222-0000-0000-0000-000000000015';
UPDATE public.pricing_features SET key = 'csv_export'         WHERE id = '22222222-0000-0000-0000-000000000016';
