-- AI Agents: configurable AI assistants with knowledge bases

CREATE TABLE public.ai_agents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  name         text NOT NULL,
  description  text NOT NULL DEFAULT '',
  system_prompt text NOT NULL DEFAULT '',
  model        text NOT NULL DEFAULT 'google/gemini-2.0-flash-exp:free',
  enabled      boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_agent_knowledge (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  title      text NOT NULL,
  content    text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: public read enabled agents, only authenticated admin writes
ALTER TABLE public.ai_agents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can read enabled agents"
  ON public.ai_agents FOR SELECT USING (enabled = true);
CREATE POLICY "public can read agent knowledge"
  ON public.ai_agent_knowledge FOR SELECT USING (true);
CREATE POLICY "authenticated can manage agents"
  ON public.ai_agents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated can manage agent knowledge"
  ON public.ai_agent_knowledge FOR ALL USING (auth.role() = 'authenticated');

-- Seed: two built-in agents
INSERT INTO public.ai_agents (slug, name, description, system_prompt, model) VALUES
  (
    'submissions_analyst',
    'Analista de Respostas',
    'Analisa dados de formulários de campo e gera insights operacionais.',
    'Você é um analista de dados operacionais especializado em interpretar respostas de formulários de campo coletados via QR Code. Analise os dados fornecidos e responda de forma objetiva, identificando padrões, anomalias, frequências e insights relevantes para a operação. Quando houver localização GPS, considere aspectos geográficos. Responda sempre em português.',
    'google/gemini-2.0-flash-exp:free'
  ),
  (
    'dashboard_assistant',
    'Assistente do Dashboard',
    'Ajuda os usuários a entender e usar a plataforma QRzum.',
    'Você é o assistente da plataforma QRzum, especializado em ajudar usuários a criar e gerenciar QR Codes dinâmicos para automação empresarial. Responda dúvidas sobre funcionalidades, sugira o melhor tipo de QR Code para cada caso de uso, explique como configurar fluxos operacionais, analytics, provas de presença e chatbots com IA. Seja objetivo, prático e amigável. Responda sempre em português.',
    'google/gemini-2.0-flash-exp:free'
  );
