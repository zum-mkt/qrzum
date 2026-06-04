## Fase 2 — Customização visual do QR Code

Objetivo: tornar os QRs visualmente distintos e prontos para impressão profissional, mantendo legibilidade de scanner.

### 1. Logo central
- Novo campo opcional `logo_url` em `qr_links` (text, nullable).
- No formulário `/create`: input de upload de logo (PNG/JPG/SVG, ≤ 200 KB) — sobe para o mesmo bucket `qr_files` em `<user_id>/logos/`.
- No `QRCodePreview`: passar `imageSettings={{ src, height: size*0.2, width: size*0.2, excavate: true }}` ao `QRCodeSVG`/`QRCodeCanvas`.
- Forçar `level="H"` (já é o caso) para manter leitura mesmo com 20% recortado.

### 2. Cor de fundo + presets
- Novo campo `bg_color` em `qr_links` (default `#ffffff`).
- No `ColorField`: adicionar segundo color picker "cor de fundo".
- Acima dos pickers, uma fileira de **6 presets** clicáveis (combinações fg/bg testadas para contraste):
  - Clássico (preto/branco), Tinta (azul-escuro/branco), Floresta (verde/creme), Vinho (bordô/areia), Solar (preto/amarelo), Inverso (branco/preto).
- Validação leve: alerta visual se contraste fg×bg < 4.5:1 (função pequena em `src/lib/qr.ts`).

### 3. Frame "Scan Me"
- Componente `QRFrame` que envolve o QR em SVG com 4 estilos:
  - **none** (sem frame, atual)
  - **rounded** — caixa arredondada + label "ESCANEIE" embaixo
  - **scan-me** — moldura com cantos tipo viewfinder + "SCAN ME"
  - **arrow** — seta apontando pro QR com texto "👉 Aponte a câmera"
- Estilo escolhido fica salvo em novo campo `frame_style` (text, default `none`).
- Cor do frame = `color` (fg) do QR para coesão visual.

### 4. Download em PDF
- Adicionar `jspdf` (~50 KB) via `bun add jspdf`.
- Novo botão "PDF" em `QRCodePreview` (ao lado de PNG/SVG):
  - Gera A6 (105×148 mm) centralizando o QR em alta resolução (canvas 1024px → imagem no PDF).
  - Inclui título do QR no rodapé em Helvetica.
- Útil para imprimir adesivos/cartazes sem abrir Figma.

### 5. Aplicar nas telas existentes
- `/create` (preview imediato após criar): mostra QR já com logo/cores/frame escolhidos.
- `/dashboard` (dialog "Baixar QR"): renderiza com os mesmos atributos salvos.
- Edição: dialog de edit ganha os mesmos campos (logo, bg_color, frame_style) — para que QRs já criados possam ser estilizados depois sem precisar regerar.

### Mudanças de banco (1 migração)
```sql
ALTER TABLE public.qr_links
  ADD COLUMN logo_url text,
  ADD COLUMN bg_color text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN frame_style text NOT NULL DEFAULT 'none';
```
Sem mudança em RLS — campos seguem as policies existentes.

### Fora de escopo (fica pra depois)
- Estilos de "olhos"/dots customizados (exige trocar `qrcode.react` por `qr-code-styling` — mais peso, deixar pra v3 se pedir).
- Templates prontos (ex.: "Cartaz de Cardápio") — depende dessa base primeiro.
- Múltiplos logos / variações por canal.

### Resultado esperado
- Usuário cria QR, escolhe preset de cor, sobe logo, escolhe um frame, baixa PDF pronto pra imprimir.
- Tudo client-side exceto upload do logo (storage existente).
- Compatível com QRs antigos: defaults garantem que nada quebra.
