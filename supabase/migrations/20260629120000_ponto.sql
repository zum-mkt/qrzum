-- =========================================================
-- Registro de Ponto Digital
-- =========================================================

-- 1. Novo tipo de QR
ALTER TABLE public.qr_links DROP CONSTRAINT IF EXISTS qr_links_type_check;
ALTER TABLE public.qr_links ADD CONSTRAINT qr_links_type_check
  CHECK (type IN ('link','file','vcard','whatsapp','wifi','video','links','flow','pdf','pix','calendar','ponto'));

-- 2. Funcionários (vinculados ao dono da conta)
CREATE TABLE public.employees (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  role        text,
  pin         varchar(6) NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, pin)
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY employees_owner_all ON public.employees
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;

CREATE INDEX employees_user_idx ON public.employees(user_id);

-- 3. Registros de ponto
CREATE TABLE public.time_punches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  qr_id       uuid NOT NULL REFERENCES public.qr_links(id) ON DELETE CASCADE,
  punched_at  timestamptz NOT NULL DEFAULT now(),
  type        text NOT NULL CHECK (type IN ('in', 'out')),
  lat         double precision,
  lng         double precision,
  accuracy    double precision,
  ip          text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.time_punches ENABLE ROW LEVEL SECURITY;

-- Dono da conta vê todos os registros dos seus QRs
CREATE POLICY time_punches_owner_select ON public.time_punches
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.qr_links
    WHERE qr_links.id = time_punches.qr_id
      AND qr_links.user_id = auth.uid()
  ));

GRANT SELECT ON public.time_punches TO authenticated;
GRANT ALL ON public.time_punches TO service_role;

CREATE INDEX time_punches_employee_idx ON public.time_punches(employee_id);
CREATE INDEX time_punches_qr_idx ON public.time_punches(qr_id);
CREATE INDEX time_punches_at_idx ON public.time_punches(punched_at DESC);

-- 4. RPC pública: resolve ponto QR + retorna info básica do local
CREATE OR REPLACE FUNCTION public.resolve_ponto(p_short_id text)
RETURNS TABLE (
  qr_id   uuid,
  title   text,
  active  boolean,
  user_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, active, user_id
  FROM public.qr_links
  WHERE short_id = p_short_id
    AND type = 'ponto'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_ponto(text) TO anon, authenticated;

-- 5. RPC pública: busca funcionário pelo PIN dentro de uma conta
CREATE OR REPLACE FUNCTION public.resolve_employee_by_pin(p_user_id uuid, p_pin text)
RETURNS TABLE (
  id    uuid,
  name  text,
  role  text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, role
  FROM public.employees
  WHERE user_id = p_user_id
    AND pin = p_pin
    AND active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_employee_by_pin(uuid, text) TO anon, authenticated;

-- 6. RPC pública: último punch do funcionário (para determinar in/out)
CREATE OR REPLACE FUNCTION public.last_punch(p_employee_id uuid)
RETURNS TABLE (type text, punched_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT type, punched_at
  FROM public.time_punches
  WHERE employee_id = p_employee_id
  ORDER BY punched_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.last_punch(uuid) TO anon, authenticated;
