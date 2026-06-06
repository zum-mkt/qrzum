## Diagnóstico (a causa real)

A criação de QR não falha por causa de RLS nem porque pixels são obrigatórios. A migração da Fase 3 só atualizou a função `resolve_qr` e **nunca aplicou as mudanças de schema**. Consequências encontradas no banco agora:

1. `qr_links` **não tem** as colunas `ga4_id`, `gtm_id`, `meta_pixel_id`, `tiktok_pixel_id`, `linkedin_partner_id`, `twitter_pixel_id`, `pinterest_tag_id`, `add_utm`. O `insert` do `create.tsx` envia esses campos → PostgREST devolve "column does not exist" e o QR não é criado, mesmo deixando tudo em branco.
2. `qr_links_type_check` ainda só aceita `('link','file','vcard')`. Os tipos `whatsapp`, `wifi`, `video`, `links` falham na inserção independente de pixels.
3. A tabela `qr_scans` **não existe**, então o endpoint `/api/public/scan` está logando erros silenciosamente e a Fase 3 (analytics) não tem onde gravar.
4. A função `resolve_qr` referencia colunas inexistentes → qualquer scan que chegue ao `/r/$shortId` quebra a RPC.

Resumo: o problema "não aceita criar sem pixels" é um sintoma; a verdadeira correção é aplicar o schema da Fase 3 e remover a restrição de `type` herdada da Fase 1.

## O que vou entregar

### 1. Migração única (corrige a Fase 3 e desbloqueia a criação)

- `ALTER TABLE qr_links ADD COLUMN ... IF NOT EXISTS` para as 7 colunas de pixel (`text NULL`) e `add_utm boolean NOT NULL DEFAULT false`.
- `DROP CONSTRAINT qr_links_type_check` e recria com `CHECK (type IN ('link','file','vcard','whatsapp','wifi','video','links'))`.
- `CREATE TABLE public.qr_scans` com `id`, `qr_id` (FK → qr_links ON DELETE CASCADE), `scanned_at`, `country`, `city`, `device`, `os`, `browser`, `referrer`. Index em `(qr_id, scanned_at DESC)`.
- GRANTs: `SELECT` para `authenticated` (com policy de dono via subquery em qr_links), `ALL` para `service_role`. Sem grant para `anon`.
- RLS: dono lê seus próprios scans (`EXISTS (SELECT 1 FROM qr_links WHERE qr_links.id = qr_scans.qr_id AND qr_links.user_id = auth.uid())`). `service_role` insere (já bypassa RLS).
- A função `resolve_qr` já está alinhada com as novas colunas, então só passa a funcionar.

Sem isso, nenhuma mudança de código resolve.

### 2. Página `/analytics` (visão geral)

Nova rota `src/routes/_authenticated/analytics.tsx`:
- 4 cards: scans últimos 30d, scans hoje, top QR (mais escaneado em 30d), variação % vs 30d anteriores.
- Gráfico de linha (recharts) com scans/dia nos últimos 30 dias.
- Tabela top 10 QRs por scans com link para o drilldown.
- Filtro de range (7d / 30d / 90d).
- Empty state amigável quando ainda não há scans.

### 3. Página `/analytics/$qrId` (drilldown)

Nova rota `src/routes/_authenticated/analytics.$qrId.tsx`:
- Header com título do QR, tipo, short_id, status ativo, total de scans.
- Gráfico de linha por dia.
- Dois gráficos pizza/bar: por país e por device/OS.
- Tabela dos últimos 50 scans (data, país, cidade, device, OS, browser, referrer).
- Botão "Exportar CSV" (gera no cliente).

### 4. Ajustes de navegação e dashboard

- Adicionar item "Analytics" na sidebar (`BarChart3`).
- Em cada linha do dashboard, botão "Ver analytics" indo para `/analytics/<qrId>`.
- Diálogo de edição do dashboard ganha o `<PixelFields />` (já pronto) para editar pixels e o toggle UTM sem precisar recriar o QR.

### 5. Higiene

- Tornar o `Field` reutilizável aceitar `required={false}` continua igual; nada nos forms muda.
- Garantir que `/api/public/scan` continua "fire-and-forget" (não bloqueia o redirect mesmo se o insert falhar).
- O endpoint já trunca `short_id` e `referrer`; mantém-se.

## O que NÃO entra agora

- Configuração global de pixels por conta (continua só por QR, como você escolheu).
- Server-side GTM / CAPI / heatmap / eventos pós-scan / filtros de UTM dentro do analytics interno.
- Edição de pixels via API pública.

## Ordem de execução

1. Rodar a migração (passo 1) — destrava criação imediatamente.
2. Adicionar páginas de analytics e navegação (passos 2–4).
3. Pixels editáveis no dashboard (passo 4).
