
# Roadmap de melhorias — QRFlow

Comparei o que já temos (Link, Arquivo, vCard, cor, cliques totais) com o relatório do qr-code.io e organizei as melhorias em 3 fases por impacto/esforço. Sugiro implementar uma fase por vez.

---

## Fase 1 — Quick wins (alto impacto, baixo esforço)

Fechar lacunas básicas de paridade competitiva.

### 1.1 Novos tipos de QR Code
Adicionar abas em `/create` e suporte no redirector:
- **WhatsApp** — número + mensagem pré-preenchida → `https://wa.me/<num>?text=<msg>`
- **WiFi** — SSID + senha + tipo de criptografia → string `WIFI:T:WPA;S:...;P:...;;` (QR estático no conteúdo, sem redirect)
- **Lista de Links (link-in-bio)** — título + array de `{label, url}` → página pública `/links/$shortId`
- **Vídeo** — URL do YouTube/Vimeo (reaproveita tipo `link`, só atalho de UX)

### 1.2 Status Ativo/Inativo
- Coluna `active boolean default true` em `qr_links`
- RPC `resolve_qr` retorna 404 / página "QR pausado" quando inativo
- Toggle no dashboard

### 1.3 Busca, filtros e ordenação no dashboard
- Input de busca por título
- Filtros: tipo (link/arquivo/vcard/whatsapp/wifi/links), status (ativo/inativo)
- Ordenação: mais recentes / mais escaneados

### 1.4 Edição completa do QR
- Hoje só edita `destination_url`. Adicionar diálogo de edição completo: título, conteúdo do tipo (campos vCard, WhatsApp etc.), cor.

---

## Fase 2 — Personalização visual

Diferencial de marca, esperado em produtos pagos.

### 2.1 Logo no centro do QR
- Upload de imagem (bucket `qr_files`) ou usar URL
- `qrcode.react` aceita `imageSettings={{ src, height, width, excavate: true }}`
- Mantém `errorCorrectionLevel="H"` para tolerar a oclusão

### 2.2 Moldura com CTA
- Wrapper SVG ao redor do QR com texto "Scan Me" (e variações: "Aponte a câmera", "Cardápio", custom)
- Seletor de estilo (sem moldura / arredondada / quadrada)
- Export PNG/SVG já inclui a moldura

### 2.3 Download em PDF
- Adicionar botão PDF (gerar com `jspdf` no client a partir do canvas)

### 2.4 Cor de fundo + presets
- Hoje só cor do QR (fg). Adicionar `bg_color` + paleta de presets clicáveis.

---

## Fase 3 — Analytics

Maior diferencial premium do benchmark.

### 3.1 Tabela de eventos
Nova tabela `qr_scans`:
- `id`, `qr_link_id` (FK), `created_at`, `country`, `region`, `city`, `os`, `device`, `unique_visitor_id` (hash de IP+UA salgado)
- RLS: owner do `qr_link_id` lê via join

### 3.2 Captura no redirect
Mover `resolve_qr` para um **server route** `/api/public/q/$shortId`:
- Lê headers (`cf-ipcountry`, `user-agent`) — Cloudflare Workers já fornece geo gratuitamente
- Faz UA parsing simples (regex para SO/dispositivo)
- Insere em `qr_scans` via `supabaseAdmin`
- Faz 302 para destino

### 3.3 Página de Analytics
Rota `/_authenticated/analytics`:
- Métricas: total scans / scans únicos / por período
- Filtros: intervalo de datas, QR específico
- Gráfico de linha (recharts) — scans/dia
- Breakdown: por SO, por país, top cidades
- Botão "Exportar CSV"

---

## Fora deste plano (a discutir depois)

- **Pastas/tags** — útil mas baixa prioridade até ter muitos QRs
- **Monetização (planos pagos / trial)** — decisão de produto separada (Stripe/Lovable Payments)
- **App mobile / Apps store redirect** — pouco usado
- **Cupom / Menu / Business** — reaproveitam "Lista de Links" + landing customizada; só vale a pena com demanda real

---

## Detalhes técnicos resumidos

- Migration por fase (não tudo de uma vez)
- Tipos novos: adicionar a `qr_links.type` (text livre, sem CHECK constraint) + tabs novas em `create.tsx`
- WiFi é o único QR **estático** (conteúdo direto no QR, sem redirect) — não passa por `/q/$shortId`
- Analytics: usar `request.cf?.country` no server route (TanStack Start em Cloudflare Workers)
- UA parsing inline (~20 linhas) — evitar `ua-parser-js` (peso desnecessário no edge)

---

## Próximo passo

Confirme se quer começar pela **Fase 1 completa**, ou se prefere recortar (ex.: só WhatsApp + WiFi + busca, deixando o resto pra depois). Me diga e eu implemento.
