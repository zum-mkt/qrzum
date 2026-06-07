## Escopo desta rodada

Conservo tudo que já está pronto (tipos de QR, pixels, analytics interno, dashboard, auth, redirector `/r/$shortId`). Esta rodada **polir a Fase 1** do roadmap e **ativar PWA com offline**. Planos pagos e gates ficam abertos (sem cobrança).

Fora do escopo agora: Fase 2 (Flow Builder, webhooks, conectores, API pública), Fase 3 (roteamento contextual, ScanAI, tradução, Proof of Presence), planos/pagamento.

---

## 1. Organização: Pastas e Tags

**Banco** (uma migração):
- `folders` (id, user_id, name, color, parent_id nullable, created_at). RLS dono.
- `tags` (id, user_id, name, color, unique(user_id,name)). RLS dono.
- `qr_link_tags` (qr_id, tag_id, PK composto). RLS via subquery em qr_links.
- `qr_links.folder_id uuid NULL` + FK ON DELETE SET NULL + index.
- GRANTs autenticated/service_role conforme padrão.

**UI**:
- Sidebar do dashboard ganha árvore de pastas (lista simples, sem drag-and-drop nesta rodada — só criar/renomear/excluir e mover QR via dropdown).
- Filtro por pasta e por tag(s) no topo do dashboard.
- Dialog de edição/criação do QR ganha selects de pasta e multi-tag (com criação inline).

---

## 2. Bulk Creation (CSV/Excel)

- Nova rota `/_authenticated/bulk` com upload `.csv` (parse client-side via `papaparse`).
- Template baixável com colunas: `title, type, destination_url, folder, tags, color, bg_color, ga4_id, gtm_id, meta_pixel_id, ...`.
- Preview tabular com validação por linha (tipo válido, URL bem-formada). Linhas inválidas viram avisos, válidas continuam.
- Botão "Criar N QRs" insere em lote via `supabase.from('qr_links').insert([...])` (server fn protegida com `requireSupabaseAuth` para gerar `short_id` único e validar). Tags/pastas resolvidas/criadas no servidor.
- Resultado: tabela com link público de cada QR + botão "Baixar todos como PNG (zip)" (usa `jszip` no cliente).

---

## 3. Tipo PDF nativo

- Adicionar `'pdf'` ao `qr_links_type_check`.
- No `create.tsx`: novo tipo "PDF" → upload no bucket `qr_files` (já existe), `destination_url` aponta para a URL pública do arquivo.
- Dashboard mostra ícone PDF e permite trocar o arquivo (mantendo o short_id).
- `resolve_qr` não muda (tipo `pdf` cai no caminho padrão de URL).

---

## 4. Customização visual avançada

**Gradientes e transparências**:
- Adicionar `qr_links.style jsonb DEFAULT '{}'` com forma:
  ```
  { fgType: 'solid'|'linear'|'radial', fgColors: ['#..','#..'], fgRotation: number,
    bgType: 'solid'|'transparent'|'linear', bgColors: [...],
    dotsStyle: 'square'|'rounded'|'dots'|'classy',
    cornersSquareStyle, cornersDotStyle, logoBackground: boolean }
  ```
- Trocar `qrcode` por `qr-code-styling` (suporta gradientes, formas de pontos, logo nativo). Manter fallback PNG para download.
- `QRStyleFields.tsx` ganha abas: Cores (solid/linear/radial + pickers), Estilo de pontos, Cantos, Background (sólido/transparente).

**Molduras inteligentes com CTAs**:
- `qr_links.frame_style` já existe; expandir para: `none | label-bottom | scan-me | tap-to-pay | url-pill | rounded-card`.
- `qr_links.frame_text text NULL` (CTA editável). Render no `QRCodePreview.tsx` via wrapper SVG envolvendo o canvas do QR. Download PNG inclui a moldura (render off-screen com `html-to-image`).

**Ajuste automático de contraste do logo**:
- Ao definir logo, calcular brilho médio dos 4 cantos do logo no client; se baixo contraste contra `bg_color`, desenhar automaticamente um "halo" branco/preto circular atrás do logo. Toggle "Ajuste automático" (default ligado).

---

## 5. Scans únicos

- `qr_scans.visitor_hash text NULL` (sha256 de `ip + user-agent + short_id` truncado, calculado no servidor em `/api/public/scan`).
- Página `/analytics` ganha card "Visitantes únicos (30d)" calculado por `count(distinct visitor_hash)` (RPC `qr_unique_visitors(p_range int)`).
- Drilldown `/analytics/$qrId` ganha mesma métrica e linha sobreposta no gráfico ("Scans" vs "Únicos").

---

## 6. PWA instalável com offline (segue skill PWA)

- Adicionar `vite-plugin-pwa` com `generateSW`, `registerType: "autoUpdate"`, `injectRegister: null`, `devOptions.enabled: false`.
- Wrapper de registro `src/lib/registerSW.ts` com guards: refusa em dev, iframe, hostnames `id-preview--*`, `preview--*`, `*.lovableproject.com`, `*.lovableproject-dev.com`, `*.beta.lovable.dev`, e `?sw=off`. Em contextos refusados, faz `unregister()` de `/sw.js`.
- Manifest em `public/manifest.webmanifest`: nome QRzum, theme/background `#000`/`#fff`, `display: standalone`, ícones 192/512 (gerados via `imagegen`).
- Head tags em `__root.tsx`: manifest, theme-color, apple-touch-icon.
- Estratégias do SW: `NetworkFirst` para navegações HTML; `CacheFirst` apenas para assets hashed same-origin; `/~oauth`, `/api/public/scan`, `/r/*` excluídos do fallback.
- Aviso na UI: "Modo offline funciona apenas no app publicado".

---

## 7. Diagrama de tabelas após migração

```
qr_links ── folder_id ──> folders
   │
   └── qr_link_tags ──> tags
   └── qr_scans (+ visitor_hash)
```

---

## 8. Ordem de execução

1. Migração única: `folders`, `tags`, `qr_link_tags`, `qr_links.folder_id`, `qr_links.style`, `qr_links.frame_text`, `qr_scans.visitor_hash`, `qr_links_type_check` += `'pdf'`, RPC `qr_unique_visitors`.
2. Trocar lib de QR para `qr-code-styling`; refazer `QRStyleFields` e `QRCodePreview` (gradientes, formas, molduras com CTA, ajuste de logo).
3. Dashboard: árvore de pastas, filtros, tags na edição, novo tipo PDF.
4. `/bulk` (server fn + UI + zip de PNGs).
5. Analytics: card "Únicos" + linha no gráfico.
6. PWA: plugin, manifest, ícones, wrapper guardado, head tags.
7. Smoke test: criar/editar QR de cada tipo, bulk import 5 linhas, scan via `/r/*` (analytics e únicos), instalar PWA no published.

---

## 9. Dependências novas

`qr-code-styling`, `papaparse`, `@types/papaparse`, `jszip`, `html-to-image`, `vite-plugin-pwa`, `workbox-window`.

Quando aprovar, executo na ordem acima.