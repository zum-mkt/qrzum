
# Gerador e Gerenciador de QR Codes Dinâmicos

App completo para criar QR Codes dinâmicos (link, arquivo, vCard), gerenciá-los em um painel e rastrear cliques.

## Backend (Lovable Cloud)

Vou habilitar o Lovable Cloud (Supabase por trás) para autenticação, banco e storage.

**Tabela `qr_links`:**
- `id` uuid PK
- `user_id` uuid → auth.users
- `title` text
- `type` text (`link` | `file` | `vcard`)
- `short_id` text único (gerado, ~6 chars)
- `destination_url` text (URL final ou URL pública do arquivo)
- `vcard_data` jsonb (nullable)
- `color` text (cor escolhida do QR)
- `clicks` int default 0
- `created_at` timestamptz default now()

**RLS:** usuário só lê/edita/apaga seus próprios registros. Função `increment_clicks(short_id)` `SECURITY DEFINER` para o redirect público incrementar cliques e devolver `destination_url`/`vcard_data`/`type` sem expor a tabela inteira.

**Storage:** bucket público `qr_files` para uploads (PDF/imagem). Policies permitindo insert apenas para usuário autenticado em pasta `{user_id}/...`.

## Rotas (TanStack Start)

- `/` — Landing + Login/Cadastro (Supabase Auth, email/senha). Redireciona logado para `/dashboard`.
- `/_authenticated/dashboard` — Métricas (total QR, total scans) + tabela com Nome, Tipo, Cliques, Data, ações (Baixar, Editar destino, Apagar, Copiar link).
- `/_authenticated/create` — Formulário com Tabs (Link / Arquivo / vCard). Preview do QR ao salvar, seletor de cor, download PNG/SVG.
- `/q/$shortId` — Rota pública "invisível": chama RPC `increment_clicks`, faz `window.location.replace` para o destino. Se tipo `vcard`, redireciona para `/vcard/$shortId`.
- `/vcard/$shortId` — Página pública mobile-friendly mostrando dados do contato + botão "Salvar Contato" que gera `.vcf` no client.

## Componentes principais

- `QRCodePreview` (usando `qrcode.react`) — render SVG, cor configurável, botões Download PNG (canvas → toDataURL em alta resolução) e Download SVG.
- `CreateLinkForm`, `CreateFileForm` (upload para `qr_files`), `CreateVCardForm`.
- `QRListTable` no dashboard com edição inline de `destination_url` via Dialog.
- Toasts (sonner) para feedback de todas as ações.

## Design

Estilo clean, moderno e corporativo conforme briefing: paleta neutra com um accent (azul/índigo), tipografia sans clara (Inter), cards com bordas sutis e bom espaçamento. Layout responsivo, sidebar simples no autenticado.

## Stack

React 19 + TanStack Start + Tailwind v4 + shadcn/ui + lucide-react + `qrcode.react` + `nanoid` (short_id) + Lovable Cloud.

## Fora do escopo desta entrega

- Analytics avançado (geolocalização, gráficos por dia) — só contagem total de cliques.
- Domínio curto personalizado — usa o domínio do app.
