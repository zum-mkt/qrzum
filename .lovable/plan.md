# Fase 3 — Orquestração Contextual (CPO)

Pulamos as pendências da Fase 1 polish. Esta fase entrega 3 capacidades que tornam o mesmo QR físico "inteligente": roteamento por regras, IA conversacional sobre o conteúdo, e prova criptográfica de presença.

---

## 3.1 Roteamento Contextual Inteligente

Cada QR pode ter **N regras ordenadas** avaliadas no servidor antes do redirect. A primeira que casar define o destino (ou bloqueia o acesso).

### Modelo de dados
Nova tabela `qr_routing_rules`:
- `qr_id` (fk), `priority` (int), `kind` (`identity` | `schedule` | `geofence`), `config` (jsonb), `action` (`redirect` | `block`), `destination_url`, `enabled`.

Tipos de regra:
- **identity**: `{ role: 'tecnico' | 'cliente' | string }` — exige usuário logado via Lovable Cloud Auth no scan; lê role da tabela `user_roles` (criada conforme padrão de roles).
- **schedule**: `{ tz, days: [0..6], start: 'HH:mm', end: 'HH:mm' }`.
- **geofence**: `{ lat, lng, radius_m, mode: 'allow' | 'block' }` — usa Geolocation API no client; se negado, regra falha (configurável).

### Fluxo
1. `/r/$shortId` (rota pública) carrega QR via RPC existente.
2. Se houver regras ativas, renderiza componente `<RuleResolver>` que:
   - Pede geolocalização (se necessário).
   - Detecta sessão atual + role.
   - Chama serverFn `resolveRoutingRules({ qrId, lat, lng, now })` → retorna `{ action, destination_url }`.
3. Redireciona ou exibe tela de bloqueio.

### UI
- Nova aba "Regras" no dialog de edição do QR (`dashboard.tsx`): lista drag-orderable de regras + botão "Adicionar regra" com formulário condicional ao `kind`.

---

## 3.2 ScanAI (Assistente IA + Tradução)

Cada QR pode ter um **knowledge pack** opcional (manuais, FAQs, specs). Ao escanear, em vez do redirect, abre um chat IA que respondeu com base nesses docs.

### Modelo
- Novo tipo `scanai` em `qr_links.type`.
- Tabela `qr_knowledge` (`qr_id`, `title`, `content` text, `source_url`). Por enquanto sem embeddings — passa todo o conteúdo no system prompt (chunk simples por tamanho).
- Tabela `scanai_messages` (`qr_id`, `session_id`, `role`, `content`, `created_at`) com `session_id` gerado client-side (anon ok) para histórico curto da sessão.

### UI nova rota pública
- `/ai/$shortId.tsx`: chat com AI Elements (`Conversation`, `Message`, `PromptInput`), markdown, shimmer "Pensando...".
- Detecta `navigator.language` e instrui o modelo a responder nesse idioma (tradução automática do conteúdo).

### Backend
- Server route `src/routes/api/public/scanai.ts` (POST stream) usando `streamText` + Lovable AI Gateway (`google/gemini-3-flash-preview`).
- System prompt: "Você é o assistente do produto X. Responda em {locale}. Use APENAS o conteúdo abaixo: <docs>".
- Persiste user+assistant em `scanai_messages` no `onFinish`.

### Criação
- Em `create.tsx`, novo tipo "Assistente IA" com upload/cola de até 5 documentos (text/markdown/PDF). PDF é parseado com `pdfjs-dist` no browser para extrair texto.

---

## 3.3 Proof of Presence

Gera um **certificado digital assinado** comprovando que o usuário esteve fisicamente no QR.

### Modelo
- `qr_links.proof_enabled` (bool) + `qr_links.proof_anchor` (jsonb: `{ lat, lng, radius_m, label }`).
- Tabela `presence_proofs`: `id`, `qr_id`, `user_id` (nullable se anon), `scanned_at`, `lat`, `lng`, `accuracy_m`, `device_fp` (sha256 de UA+screen+tz), `nonce`, `signature` (base64), `payload_hash`.

### Fluxo
1. No scan, se `proof_enabled`, frontend coleta: geo (Geolocation API alta precisão), timestamp, device fingerprint, nonce (UUID).
2. Valida no servidor (serverFn `mintPresenceProof`): distância ≤ `radius_m`, accuracy ≤ 50m, nonce não reusado.
3. Assina payload com **HMAC-SHA256** (segredo `PRESENCE_SIGNING_SECRET` em env) — simples, sem PKI. Payload canonicalizado JSON.
4. Retorna certificado JSON + URL pública `/proof/$id` que renderiza certificado verificável (mostra payload + assinatura + botão "Verificar" que chama serverFn `verifyPresenceProof`).

### UI
- Toggle "Exigir prova de presença" no editor do QR + campos de âncora geográfica (com mini-mapa usando OpenStreetMap embed simples ou só lat/lng + raio).
- Nova rota autenticada `/proofs` lista todas as provas geradas dos QRs do usuário, com export CSV.

---

## Ordem de execução
1. **Migração única** criando: `qr_routing_rules`, `qr_knowledge`, `scanai_messages`, `presence_proofs`, novas colunas em `qr_links`, e adição de `scanai` ao check de type. Inclui GRANTs e RLS por owner via `user_id` do `qr_links`.
2. **3.1 Roteamento** (sem dependências externas).
3. **3.3 Proof of Presence** (server-only crypto, isolado).
4. **3.2 ScanAI** (maior superfície, usa AI Elements — instalar `bun add ai @ai-sdk/react @ai-sdk/openai-compatible` + `bun x ai-elements@latest add conversation message prompt-input shimmer`).
5. **Smoke test** end-to-end de cada feature.

## Detalhes técnicos
- Toda lógica sensível (avaliação de regras, assinatura, chat IA) em `createServerFn` ou server routes — nunca no client.
- Roles reutilizam padrão `user_roles` + `has_role()` (criar se ainda não existir).
- `PRESENCE_SIGNING_SECRET` criado via secrets tool no início da implementação.
- Sem mudanças em `resolve_qr`, `/r/$shortId` atual permanece compatível: só intercepta quando há regras/proof/scanai habilitados.
- Pendências de Fase 1 (qr-code-styling, halo de logo etc.) ficam no plano antigo, intactas.

Aprovado? Executo na ordem acima.
