import { createFileRoute } from "@tanstack/react-router";
import { Nav, Footer } from "./index";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — ZRCODE" },
      { name: "description", content: "Termos de Uso da plataforma ZRCODE." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-bold text-foreground">Termos de Uso</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: agosto de 2026</p>

        <div className="mt-10 space-y-8 text-foreground/90">
          <section>
            <p>
              Estes Termos de Uso ("Termos") regulam o acesso e uso da plataforma{" "}
              <strong>ZRCODE</strong> ("ZRCODE", "nós", "plataforma"), que permite criar, gerenciar e
              rastrear QR Codes dinâmicos, fluxos operacionais, formulários, provas de presença,
              registro de ponto e assistentes de IA. Ao criar uma conta ou usar a plataforma,
              você declara ter lido, compreendido e aceito integralmente estes Termos.
            </p>
          </section>

          <Section title="1. Objeto do serviço">
            <p>
              A ZRCODE fornece uma plataforma de software como serviço (SaaS) para geração de QR
              Codes dinâmicos e automação de operações de campo, incluindo, entre outras
              funcionalidades: links dinâmicos, PDFs, vCards, Wi-Fi, listas de links,
              fluxos operacionais com validação por GPS e/ou senha, formulários de coleta de
              dados, provas de presença certificadas, registro de ponto, analytics e assistentes
              de inteligência artificial treinados com conteúdo do próprio cliente.
            </p>
          </Section>

          <Section title="2. Cadastro e conta">
            <ul className="list-disc space-y-2 pl-6">
              <li>Você deve fornecer informações verdadeiras, completas e atualizadas no cadastro.</li>
              <li>Você é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas em sua conta.</li>
              <li>Notifique-nos imediatamente em caso de uso não autorizado da sua conta.</li>
              <li>Reservamo-nos o direito de suspender ou encerrar contas que violem estes Termos ou a legislação aplicável.</li>
            </ul>
          </Section>

          <Section title="3. Planos, cobrança e cancelamento">
            <ul className="list-disc space-y-2 pl-6">
              <li>A plataforma oferece diferentes planos, com limites e funcionalidades descritos na página de Planos.</li>
              <li>Planos pagos são cobrados de forma recorrente (mensal ou anual), via Mercado Pago (cartão ou Pix), até que a assinatura seja cancelada.</li>
              <li>Você pode cancelar sua assinatura a qualquer momento; o acesso aos recursos pagos permanece até o fim do ciclo já pago, sem reembolso proporcional, salvo quando exigido por lei.</li>
              <li>Alterações de preço serão comunicadas com antecedência razoável e não afetam ciclos já pagos.</li>
            </ul>
          </Section>

          <Section title="4. Uso aceitável">
            <p>Ao usar a plataforma, você concorda em não:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Utilizar a ZRCODE para fins ilegais, fraudulentos, difamatórios ou que violem direitos de terceiros;</li>
              <li>Criar QR Codes, formulários ou fluxos que coletem dados pessoais sem base legal adequada ou sem informar os titulares;</li>
              <li>Enviar spam, phishing, malware ou conteúdo enganoso através de QR Codes gerados na plataforma;</li>
              <li>Tentar acessar, sem autorização, dados de outros clientes ou vulnerar a segurança da plataforma;</li>
              <li>Sobrecarregar a infraestrutura da ZRCODE com uso automatizado abusivo (scraping, ataques de negação de serviço, etc.).</li>
            </ul>
            <p>
              O descumprimento pode resultar em suspensão ou encerramento imediato da conta, sem prejuízo de outras medidas cabíveis.
            </p>
          </Section>

          <Section title="5. Conteúdo e dados dos clientes">
            <p>
              Você é o único responsável pelo conteúdo que insere na plataforma (textos,
              imagens, formulários, bases de conhecimento de IA) e pelos dados pessoais de
              terceiros que coleta através de seus QR Codes, incluindo garantir base legal
              adequada perante a LGPD e demais legislações aplicáveis, especialmente no uso de
              geolocalização, provas de presença e registro de ponto de colaboradores. A ZRCODE atua
              como operadora desses dados, processando-os conforme suas instruções e a nossa
              Política de Privacidade.
            </p>
          </Section>

          <Section title="6. Propriedade intelectual">
            <p>
              A plataforma, sua marca, design, código-fonte e demais elementos são de
              propriedade da ZRCODE e protegidos por leis de propriedade intelectual. Estes Termos
              não transferem qualquer direito de propriedade intelectual sobre a plataforma ao
              cliente. O conteúdo inserido pelo cliente (textos, imagens, dados) permanece de
              propriedade do próprio cliente.
            </p>
          </Section>

          <Section title="7. Disponibilidade do serviço">
            <p>
              Envidamos esforços comercialmente razoáveis para manter a plataforma disponível de
              forma contínua, mas não garantimos disponibilidade ininterrupta. Manutenções
              programadas, falhas de infraestrutura de terceiros (hospedagem, provedores de
              pagamento, autenticação) ou eventos de força maior podem causar indisponibilidade
              temporária, sem que isso gere direito a indenização, salvo disposição legal em
              contrário.
            </p>
          </Section>

          <Section title="8. Limitação de responsabilidade">
            <p>
              A ZRCODE fornece ferramentas para automação de processos, mas não se responsabiliza
              por decisões operacionais, trabalhistas ou legais tomadas com base nos dados
              gerados pela plataforma. Registros de ponto e provas de presença são fornecidos
              como evidência técnica (com validação de GPS, dispositivo e/ou biometria local),
              mas cabe ao cliente garantir conformidade com a legislação trabalhista aplicável ao
              seu uso específico. Na máxima extensão permitida por lei, a responsabilidade total
              da ZRCODE por danos decorrentes do uso da plataforma fica limitada ao valor pago pelo
              cliente nos 12 meses anteriores ao evento gerador.
            </p>
          </Section>

          <Section title="9. Assistentes de inteligência artificial">
            <p>
              Os assistentes de IA disponibilizados na plataforma respondem com base no conteúdo
              fornecido pelo próprio cliente e em modelos de terceiros (ex.: Google Gemini).
              Apesar dos esforços para limitar respostas ao escopo definido, respostas geradas
              por IA podem conter imprecisões — cabe ao cliente revisar a adequação do conteúdo
              ao seu caso de uso.
            </p>
          </Section>

          <Section title="10. Rescisão">
            <p>
              Você pode encerrar sua conta a qualquer momento. Podemos suspender ou encerrar o
              acesso à plataforma, com aviso prévio quando possível, em caso de violação destes
              Termos, inadimplência ou determinação legal. Encerrada a conta, os dados serão
              tratados conforme descrito na nossa Política de Privacidade.
            </p>
          </Section>

          <Section title="11. Alterações destes Termos">
            <p>
              Podemos atualizar estes Termos periodicamente. Alterações relevantes serão
              comunicadas com antecedência razoável. O uso continuado da plataforma após a
              entrada em vigor das alterações constitui aceitação dos novos Termos.
            </p>
          </Section>

          <Section title="12. Lei aplicável e foro">
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito
              o foro do domicílio do cliente para dirimir eventuais controvérsias, salvo
              disposição legal em contrário.
            </p>
          </Section>

          <Section title="13. Contato">
            <p>
              Dúvidas sobre estes Termos podem ser enviadas para{" "}
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
