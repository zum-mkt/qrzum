## Fase 3 + Pixels de Tracking (entrega combinada)

Analytics interno completo + integração de pixels externos por QR, via página intermediária que dispara eventos e adiciona UTMs antes de redirecionar.

### 1. Banco — duas mudanças

**Tabela nova `qr_scans`** (analytics interno):
- `id uuid PK`, `qr_id uuid FK qr_links(id) ON DELETE CASCADE`
- `scanned_at timestamptz default now()`
- `country text`, `city text`, `device text` (mobile/desktop/tablet), `os text`, `browser text`, `referrer text`
- Índice em `(qr_id, scanned_at DESC)`
- RLS: SELECT só se o `qr_id` pertence a `auth.uid()`; INSERT via `service_role`
- GRANTs: `SELECT` para `authenticated`, `ALL` para `service_role`

**Colunas novas em `qr_links`** (pixels por QR — todos opcionais, text nullable):
- `ga4_id` (G-XXXXXX), `gtm_id` (GTM-XXXXX)
- `meta_pixel_id`, `tiktok_pixel_id`, `linkedin_partner_id`
- `twitter_pixel_id`, `pinterest_tag_id`
- `add_utm boolean default false` — quando true, injeta `utm_source=qr&utm_medium=<type>&utm_campaign=<short_id>` em destinos URL

### 2. Página intermediária `/r/$shortId` (substitui `/q/`, `/links/`, `/vcard/`)

Rota SSR pública nova que:
1. Chama server fn `resolveScan({ shortId })` → retorna destino + pixels + tipo
2. Dispara pixels client-side via `<Helmet>`/scripts inline (todos os IDs configurados)
3. Faz `INSERT` em `qr_scans` (fire-and-forget via server fn separado)
4. Aguarda ~400ms para garantir envio dos eventos
5. Faz `window.location.replace(destino_final)` (com UTM se aplicável)

UI: logo do app + spinner + "Redirecionando..." (≤500ms perceptível).

Rotas antigas (`/q/`, `/links/`, `/vcard/`) viram redirects 301 para `/r/$shortId` (compat).

### 3. Configuração de pixels no form `/create` + edição `/dashboard`

Componente novo `<PixelFields />` (collapsible "Tracking & Pixels"):
- 7 inputs opcionais (GA4, GTM, Meta, TikTok, LinkedIn, X, Pinterest) com validação de formato (regex por plataforma) e helper text "deixe em branco para não rastrear"
- Switch "Adicionar UTMs ao destino" (só aparece para tipos URL: link, vídeo, etc.)
- Compartilhado entre `/create` e dialog de edit em `/dashboard`

### 4. Página `/analytics` (lista geral)

- 4 stat cards: scans 30d, scans hoje, top QR, crescimento %
- Gráfico de linha (recharts) — scans/dia últimos 30 dias
- Tabela top 10 QRs por scans com filtro de range (7d/30d/90d)

### 5. Página `/analytics/$qrId` (drilldown)

- Header: título do QR, preview, tipo, total scans
- Linha temporal por dia
- Pizza/barras por país, device, OS
- Tabela últimos 50 scans
- Botão "Exportar CSV" (client-side)

### 6. Navegação

- Sidebar: novo item "Analytics" (`BarChart3`)
- Dashboard rows: botão "Ver analytics" → `/analytics/$qrId`

### Detalhes técnicos

- **Captura de metadata** (server fn `recordScan`): UA parser (já disponível em `navigator`-ish via header `user-agent`), país/cidade via headers Cloudflare (`cf-ipcountry`, `cf-ipcity`) com fallback null. Sem IP armazenado (LGPD-friendly).
- **Pixels**: snippets oficiais de cada plataforma carregados condicionalmente. Evento padrão "qr_scan" em GA4 e custom "QRScan" no Meta. Carregamento via `<script async>` injetado em useEffect.
- **UTM injection**: helper `injectUtm(url, type, shortId)` — só roda se destino é URL parseável; vCard/WiFi/WhatsApp passam direto.
- **Sem secrets** — todos os IDs de pixel são públicos por design, ficam em `qr_links` e são servidos ao client.
- **Server fns**: `resolveScan` (público, usa `supabaseAdmin`), `recordScan` (público, INSERT fire-and-forget), `listScans` / `qrScanStats` (autenticadas via `requireSupabaseAuth`).
- **resolve_qr existente**: continua incrementando `clicks` para não quebrar dashboards atuais.

### Fora de escopo
- Heatmap de scans, eventos pós-scan (conversão), filtros UTM no analytics interno, A/B testing, Server-Side GTM, CAPI do Meta.
