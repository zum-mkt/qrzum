import { createFileRoute } from "@tanstack/react-router";
import { Nav, Footer } from "./index";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — zum" },
      { name: "description", content: "Política de Privacidade da plataforma zum." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-bold text-foreground">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: agosto de 2026</p>

        <div className="prose-legal mt-10 space-y-8 text-foreground/90">
          <section>
            <p>
              Esta Política de Privacidade descreve como a <strong>zum</strong> ("zum", "nós")
              coleta, usa, armazena e protege dados pessoais de usuários que criam conta na
              plataforma ("clientes") e de pessoas que interagem com QR Codes, formulários,
              fluxos operacionais, páginas de links e registros de ponto/presença gerados por
              nossos clientes ("usuários finais"). Ao usar a plataforma, você concorda com as
              práticas descritas aqui. Esta política é regida pela Lei Geral de Proteção de
              Dados Pessoais (LGPD — Lei nº 13.709/2018).
            </p>
          </section>

          <Section title="1. Quem controla os dados">
            <p>
              A zum atua como <strong>controladora</strong> dos dados de cadastro dos clientes
              da plataforma (conta, autenticação, cobrança) e como <strong>operadora</strong> dos
              dados coletados em nome do cliente através dos QR Codes que ele configura
              (respostas de formulário, escaneamentos, presenças, registros de ponto). Cabe a
              cada cliente da zum garantir base legal adequada para coletar dados de seus
              próprios usuários finais (colaboradores, clientes, visitantes).
            </p>
          </Section>

          <Section title="2. Dados que coletamos">
            <p>Coletamos as seguintes categorias de dados, conforme o uso da plataforma:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Dados de cadastro:</strong> nome, e-mail e senha (armazenada com hash,
                nunca em texto plano) ou dados básicos de perfil quando o login é feito via
                Google OAuth.
              </li>
              <li>
                <strong>Dados de cobrança:</strong> plano contratado, status de assinatura e
                histórico de pagamentos. Dados de cartão de crédito e Pix são processados
                diretamente pelo Mercado Pago — a zum não armazena números de cartão.
              </li>
              <li>
                <strong>Dados de uso e scans:</strong> data/hora, localização aproximada (país,
                cidade, com base em IP), tipo de dispositivo e navegador de cada escaneamento de
                QR Code, para fins de analytics.
              </li>
              <li>
                <strong>Dados de geolocalização precisa (GPS):</strong> coletados apenas quando
                um fluxo configurado pelo cliente exige um "Portão GPS", registro de ponto ou
                prova de presença certificada, e somente mediante permissão de geolocalização
                concedida pelo usuário final no navegador/dispositivo.
              </li>
              <li>
                <strong>Respostas de formulários:</strong> texto, seleções e demais dados
                inseridos por usuários finais em Formulários de Campo, junto com timestamp e
                localização quando aplicável.
              </li>
              <li>
                <strong>Provas de presença:</strong> certificados com assinatura criptográfica
                HMAC-SHA256, vinculando QR Code, coordenadas GPS e timestamp — usados para
                comprovar presença de forma verificável e não repudiável.
              </li>
              <li>
                <strong>Dados de registro de ponto:</strong> horário de entrada/saída, geofence,
                identificador do dispositivo vinculado ao funcionário e PIN. Quando a biometria
                (impressão digital / Face ID via WebAuthn) é usada, a verificação ocorre
                localmente no dispositivo do usuário — a zum não recebe nem armazena dados
                biométricos brutos, apenas a confirmação criptográfica de que a verificação
                ocorreu.
              </li>
              <li>
                <strong>Conversas com IA:</strong> mensagens trocadas com o assistente de IA
                configurado pelo cliente em um QR Code, para permitir o histórico da conversa
                durante a sessão.
              </li>
              <li>
                <strong>Cookies e armazenamento local:</strong> usados para manter a sessão de
                login (token de autenticação) e preferências básicas de uso.
              </li>
            </ul>
          </Section>

          <Section title="3. Como usamos os dados">
            <ul className="list-disc space-y-2 pl-6">
              <li>Autenticar contas e manter sessões ativas com segurança;</li>
              <li>Processar pagamentos e gerenciar assinaturas;</li>
              <li>Operar os fluxos, formulários, provas de presença e registros de ponto configurados pelos clientes;</li>
              <li>Gerar relatórios de analytics (escaneamentos, localização, dispositivo, conversões);</li>
              <li>Responder solicitações de suporte;</li>
              <li>Cumprir obrigações legais e prevenir fraudes.</li>
            </ul>
          </Section>

          <Section title="4. Compartilhamento de dados">
            <p>Compartilhamos dados apenas com os seguintes terceiros, na medida necessária à operação do serviço:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Supabase</strong> — banco de dados e autenticação;
              </li>
              <li>
                <strong>Cloudflare</strong> — hospedagem, entrega de conteúdo e execução da aplicação;
              </li>
              <li>
                <strong>Mercado Pago</strong> — processamento de pagamentos (cartão e Pix);
              </li>
              <li>
                <strong>Google</strong> — autenticação via OAuth, quando essa opção é escolhida pelo usuário;
              </li>
              <li>
                <strong>Ferramentas de analytics de terceiros</strong> (Google Analytics/GTM, Meta
                Pixel, TikTok Pixel, LinkedIn Insight, X/Twitter Ads, Pinterest Tag) — apenas
                quando o próprio cliente configura essas integrações em seus QR Codes;
              </li>
              <li>
                <strong>Google Gemini</strong> — provedor do modelo de IA usado nos assistentes configuráveis pelos clientes.
              </li>
            </ul>
            <p>Não vendemos dados pessoais a terceiros.</p>
          </Section>

          <Section title="5. Segurança">
            <p>
              Adotamos medidas técnicas e organizacionais para proteger os dados, incluindo
              conexões criptografadas (TLS), hashing de senhas, assinatura criptográfica
              HMAC-SHA256 para provas de presença e controle de acesso por autenticação. Apesar
              dos esforços, nenhum sistema é 100% imune a incidentes — comprometemo-nos a
              notificar clientes e autoridades competentes em caso de incidente de segurança
              relevante, conforme exigido pela LGPD.
            </p>
          </Section>

          <Section title="6. Retenção de dados">
            <p>
              Mantemos os dados enquanto a conta estiver ativa ou pelo tempo necessário para
              cumprir as finalidades descritas nesta política, obrigações legais, fiscais ou
              regulatórias. Ao encerrar a conta, dados pessoais são excluídos ou anonimizados,
              exceto quando a lei exigir retenção por período determinado.
            </p>
          </Section>

          <Section title="7. Seus direitos (LGPD)">
            <p>Você pode, a qualquer momento, solicitar:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Confirmação da existência de tratamento e acesso aos dados;</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
              <li>Portabilidade dos dados a outro fornecedor;</li>
              <li>Eliminação dos dados pessoais tratados com consentimento;</li>
              <li>Revogação do consentimento, a qualquer momento.</li>
            </ul>
            <p>
              Usuários finais que tiveram dados coletados através de um QR Code de um cliente da
              zum devem, preferencialmente, dirigir a solicitação diretamente a esse cliente
              (controlador dos dados). Ainda assim, pode entrar em contato conosco pelo canal
              abaixo que encaminharemos a solicitação.
            </p>
          </Section>

          <Section title="8. Cookies">
            <p>
              Usamos cookies e armazenamento local estritamente necessários para autenticação e
              funcionamento da plataforma. Ferramentas de analytics de terceiros configuradas
              pelo próprio cliente em seus QR Codes podem definir cookies adicionais — consulte a
              política de privacidade do cliente responsável por aquele QR Code específico.
            </p>
          </Section>

          <Section title="9. Alterações desta política">
            <p>
              Podemos atualizar esta política periodicamente para refletir mudanças na
              plataforma ou na legislação. A data da última atualização está indicada no topo
              desta página. Alterações relevantes serão comunicadas aos clientes.
            </p>
          </Section>

          <Section title="10. Contato">
            <p>
              Dúvidas, solicitações ou exercício de direitos sobre seus dados podem ser
              enviados para{" "}
              <a href="mailto:zum@agenciazum.com.br" className="text-primary underline underline-offset-2">
                zum@agenciazum.com.br
              </a>.
            </p>
          </Section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
