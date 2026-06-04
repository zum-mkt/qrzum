## Fase 2 — Blindar a geração de URLs do QR

Hoje o app usa `window.location.origin` ao montar tanto a URL curta (`/q/...`) quanto as URLs internas de vCard e lista de links. Isso significa que um QR criado a partir do preview (`id-preview--...lovable.app`) fica gravado com aquele domínio temporário. Quando o preview muda de URL, o QR impresso quebra. O ideal é sempre usar o domínio público.

### O que mudar

1. **Base pública configurável**
   - Adicionar uma constante `PUBLIC_BASE_URL` lida de `import.meta.env.VITE_PUBLIC_BASE_URL`.
   - Default seguro: `https://qrzum.lovable.app` (o domínio publicado atual).
   - Fallback final: `window.location.origin` (só usado se nada estiver definido — não deve ocorrer em produção).

2. **`src/lib/qr.ts`**
   - Atualizar `buildQrUrl(shortId)` para usar `PUBLIC_BASE_URL` em vez de `window.location.origin`.
   - Exportar também um helper `buildInternalUrl(path)` para vCard / links.

3. **`src/routes/_authenticated/create.tsx`**
   - Substituir os 4 usos de `${window.location.origin}/vcard/...` e `${window.location.origin}/links/...` por `buildInternalUrl(...)`.
   - Resultado: todo QR novo aponta para `qrzum.lovable.app`, independente de onde foi criado.

4. **`.env`** (apenas documentação — não vamos editar; é gerado)
   - No futuro, se você conectar um domínio próprio (ex.: `qr.suamarca.com`), basta definir `VITE_PUBLIC_BASE_URL=https://qr.suamarca.com` para que os novos QRs já usem esse domínio. QRs antigos continuam funcionando porque ainda apontam pro Lovable.

### O que NÃO muda

- O `emailRedirectTo` do signup pode continuar com `window.location.origin` (é correto para auth).
- QRs já gerados não são reescritos — somente os novos.
- Nenhuma mudança de banco / RLS / função SQL.

### Resultado esperado

- Criar um QR no preview ou no domínio publicado gera sempre links `https://qrzum.lovable.app/q/...`.
- O bug "QR gerado no preview não funciona depois" fica eliminado por design.
- Quando você plugar um domínio customizado, troca-se apenas 1 variável e a fase está completa.
