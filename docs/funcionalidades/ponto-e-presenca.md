## Registro de Ponto e Presença
Funcionalidades robustas para gestão de equipes externas e auditoria de processos presenciais.

### Registro de Ponto
- **Geofencing**: O registro só é permitido se o usuário estiver no local físico correto.
- **Vínculo de Dispositivo**: Cada funcionário só pode usar o próprio celular, impedindo fraudes.
- **Biometria Nativa**: Integração com WebAuthn (Touch ID / Face ID) do smartphone.
- **PIN Individual**: Camada extra de segurança com código pessoal por funcionário.
- **Dashboard em Tempo Real**: Visualização imediata de entradas e saídas.

### Prova de Presença Certificada
- Gera certificados digitais vinculados a cada scan.
- Utiliza assinatura criptográfica **HMAC-SHA256**.
- Verificação pública através de link único, garantindo a integridade dos dados para auditorias e compliance.
