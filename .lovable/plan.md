## Próximos passos (continuação Fase 1 polish)

A infraestrutura já está pronta (migração com `folders`, `tags`, `qr_link_tags`, `qr_links.folder_id/style/frame_text`, `qr_scans.visitor_hash`, RPC `qr_unique_visitors`, PWA, bulk CSV, criação com pasta/tags). Falta conectar isso à UI e entregar os recursos visuais. Esta rodada cobre os itens restantes na ordem abaixo.

---

### 1. Dashboard: filtros por pasta e tag + sidebar de pastas

- `src/routes/_authenticated/dashboard.tsx`: novo painel lateral (coluna esquerda em desktop, `Sheet` em mobile) listando pastas do usuário com contagem de QRs e item "Todas / Sem pasta".
- Ações inline na sidebar: criar pasta, renomear (duplo-clique), excluir (confirm). Sem drag-and-drop.
- Barra superior do dashboard ganha filtro multi-tag (popover com checkboxes) + busca por título já existente.
- Lista de QRs aplica filtros combinados (pasta selecionada + tags + busca). Consulta com `.in('folder_id', ...)` quando aplicável e `qr_link_tags!inner(tag_id)` para tags.
- Em cada card/linha de QR: badge de pasta + chips de tags. Menu de ações ganha "Mover para pasta…" e "Editar tags…" usando `FolderTagPicker`.

### 2. Scans únicos nos analytics

- `analytics.tsx`: novo card "Visitantes únicos (Xd)" via `supabase.rpc('qr_unique_visitors', { p_days: range })`.
- Gráfico ganha segunda linha "Únicos" (recalculada client-side a partir de `visitor_hash` distinto por dia, retornando esse campo no `.select`).
- `analytics.$qrId.tsx`: mesma métrica filtrada pelo QR (RPC aceita parâmetro opcional `p_qr_id`; se a RPC atual só aceita range, calculo client-side a partir de `visitor_hash` distinto).

### 3. Customização visual avançada

Dependências novas: `qr-code-styling`, `html-to-image`.

- Substituir `qrcode` por `qr-code-styling` em `QRCodePreview.tsx` (preview e geração de PNG/SVG para download).
- `QRStyleFields.tsx` reorganizado em abas (Cores, Pontos, Cantos, Background, Moldura):
  - **Cores**: solid / linear / radial; até 2 stops + rotação para gradientes.
  - **Pontos**: `square | rounded | dots | classy | classy-rounded | extra-rounded`.
  - **Cantos**: estilos para `cornersSquare` e `cornersDot`.
  - **Background**: sólido ou transparente (toggle); persistido em `style.bgType`.
  - **Moldura**: amplia `frame_style` para `none | label-bottom | scan-me | tap-to-pay | url-pill | rounded-card` + campo `frame_text` (CTA livre, default por estilo).
- Render da moldura como wrapper SVG em volta do canvas do QR. Download PNG usa `html-to-image` off-screen para incluir moldura.
- **Ajuste automático de contraste do logo**: ao definir `logo_url`, calcular brilho médio dos cantos no client; se baixo contraste contra `bg_color`, desenhar halo circular branco/preto atrás do logo. Toggle "Ajuste automático" persistido em `style.logoBackground` (default `true`).
- Tudo persiste em `qr_links.style` (jsonb já criado). Sem migração nova.

### 4. Finalização do tipo PDF

- `create.tsx`: garantir validação do MIME (`application/pdf`) e tamanho (limite atual do bucket). Ícone PDF no dashboard.
- Edição: permitir trocar o arquivo sem mudar o `short_id` (upload novo + update do `destination_url`).

### 5. Smoke test final

1. Criar pasta, criar tag, criar QR de cada tipo (link/file/pdf/vcard/whatsapp/wifi/video/links) atribuindo pasta e tags.
2. Filtrar dashboard por pasta e por tag; mover QR entre pastas.
3. Importar 5 linhas via `/bulk` com pasta e tags resolvidas, baixar zip.
4. Editar visual: gradiente linear + pontos `rounded` + moldura `scan-me` com CTA custom, logo com contraste auto.
5. Escanear via `/r/<id>` 3x em dispositivos diferentes; conferir card "Únicos" e linha no gráfico.
6. Instalar PWA no published e abrir offline (deve mostrar última navegação cacheada).

---

### Detalhes técnicos

- **Filtros do dashboard**: consulta principal usa `select('*, qr_link_tags(tag_id)')` e filtra client-side por tag para evitar joins complexos quando há múltiplas tags selecionadas (volume esperado pequeno por usuário). Pasta vai no servidor via `.eq('folder_id', id)` ou `.is('folder_id', null)`.
- **RPC `qr_unique_visitors`**: já criada com `p_days int`. Para drilldown por QR, se faltar parâmetro, faço fallback client-side com `select('visitor_hash, scanned_at').eq('qr_id', id)` e `new Set()` por dia.
- **`qr-code-styling`**: instanciado em `useEffect`, append ao container ref; `update()` ao mudar opções; `getRawData('png')` para download. Mantém fallback se a lib falhar (try/catch + warning).
- **Moldura**: SVG fixo com `<foreignObject>` envolvendo o canvas, ou composição em `<div>` capturada por `html-to-image.toPng`. Texto da moldura editável; defaults: `scan-me` → "SCAN ME", `tap-to-pay` → "TAP TO PAY", `url-pill` → host do destino.
- **Halo do logo**: canvas off-screen 24x24 amostrando 4 cantos do logo carregado; comparando luminância com `bg_color`; injeta `<circle>` ou `<rect rounded>` atrás do logo no preview e no download.
- **Sem mudanças em**: `src/integrations/supabase/client.ts`, `auth-middleware.ts`, migrações antigas, `resolve_qr`, `r.$shortId.tsx`, `/api/public/scan`.

Quando aprovar, executo na ordem 1 → 4 e faço o smoke test no final.
