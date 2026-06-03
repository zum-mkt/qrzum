## Objetivo
Fazer os QRs publicados redirecionarem corretamente usando o domínio público atual, sem exigir domínio customizado.

## Plano

1. **Corrigir a função pública de resolução do QR**
   - Ajustar a função `resolve_qr` no backend para remover a ambiguidade da coluna `active`.
   - Garantir que ela incremente cliques apenas quando o QR estiver ativo e retorne o registro correto sem erro para acessos públicos.

2. **Validar o fluxo público de redirecionamento**
   - Testar o link real do QR publicado (`/q/$shortId`) após a correção.
   - Confirmar os comportamentos esperados para:
     - QR ativo redirecionando ao destino final
     - QR pausado mostrando mensagem de indisponibilidade
     - QR inexistente mostrando erro de não encontrado

3. **Blindar a geração de links futuros**
   - Revisar a criação do QR para evitar dependência acidental do ambiente errado ao montar a URL curta.
   - Se necessário, passar a usar uma base pública configurável/preferencial para que novos QRs apontem sempre para o domínio publicado, e não para links temporários de preview.

## Resultado esperado
- O domínio `qrzum.lovable.app` funciona normalmente como base dos QRs.
- Não é obrigatório conectar um domínio próprio para resolver esse bug.
- Um domínio customizado continua sendo opcional e útil apenas para branding e estabilidade de marca.

## Detalhes técnicos
- Diagnóstico confirmado no site publicado: a chamada pública para `resolve_qr` retorna erro `400` com código Postgres `42702`.
- Mensagem exata: `column reference "active" is ambiguous`.
- Isso indica falha na função SQL/RPC, não problema de hospedagem, rota TanStack ou necessidade de domínio customizado.