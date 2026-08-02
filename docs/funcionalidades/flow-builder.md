## Fluxo Operacional (Flow Builder)
O Flow Builder permite criar sequências lógicas de interação que o usuário deve seguir ao escanear o QR Code, ideal para inspeções, auditorias e checklists de campo.

### Blocos de Fluxo
1. **Portão GPS**: Valida se o colaborador está dentro de um raio geográfico configurável (geofence).
2. **Portão de Senha**: Restringe o acesso apenas a usuários autorizados (protegido por hash SHA-256).
3. **Formulário de Campo**: Coleta de dados estruturados (texto, seleção, avaliação) com registro automático de timestamp, dispositivo e localização.
4. **Tela de Conclusão**: Finaliza o processo com mensagens personalizadas, imagens e botões de chamada para ação (CTA).
