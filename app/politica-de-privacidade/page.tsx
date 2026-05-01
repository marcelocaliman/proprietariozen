import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidade | ProprietárioZen',
  description: 'Saiba como o ProprietárioZen coleta, usa e protege seus dados pessoais, em conformidade com a LGPD.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://www.proprietariozen.com.br/politica-de-privacidade' },
}

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors">
            ← Voltar ao site
          </Link>
          <span className="text-xs text-slate-400">Atualizado em 15 de abril de 2025</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Política de Privacidade</h1>
        <p className="text-slate-500 mb-10 text-sm">
          Esta Política descreve como o <strong>ProprietárioZen</strong> trata os dados pessoais coletados durante o uso da plataforma, em conformidade com a{' '}
          <strong>Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)</strong>.
        </p>

        <Section title="1. Identificação do Controlador">
          <p>
            O controlador dos seus dados pessoais é o <strong>ProprietárioZen</strong>, plataforma de gestão de imóveis para proprietários brasileiros, acessível pelo domínio{' '}
            <strong>proprietariozen.com.br</strong>.
          </p>
          <p className="mt-3">
            Para dúvidas, solicitações ou exercício de direitos, entre em contato com nosso encarregado de proteção de dados (DPO) pelo e-mail:{' '}
            <a href="mailto:privacidade@proprietariozen.com.br" className="text-emerald-700 underline underline-offset-2">privacidade@proprietariozen.com.br</a>.
          </p>
        </Section>

        <Section title="2. Dados Coletados">
          <p>Coletamos as seguintes categorias de dados:</p>
          <ul className="mt-3 space-y-2 list-none">
            <Item label="Dados de cadastro">Nome completo, endereço de e-mail e senha (armazenada com hash criptográfico).</Item>
            <Item label="Dados de perfil">Telefone de contato, informações de conta bancária vinculada ao Asaas (armazenadas de forma criptografada).</Item>
            <Item label="Dados de imóveis">Apelido, endereço, tipo, valor de aluguel e demais informações cadastradas pelo próprio usuário.</Item>
            <Item label="Dados de inquilinos">Nome, CPF, e-mail e telefone dos inquilinos cadastrados pelo usuário, sob responsabilidade do próprio proprietário enquanto controlador secundário.</Item>
            <Item label="Dados financeiros">Valores de aluguel, datas de vencimento, histórico de pagamentos e cobranças geradas via Asaas.</Item>
            <Item label="Dados de uso">Endereço IP, navegador, páginas acessadas e registros de ações na plataforma (logs), coletados automaticamente para fins de segurança e melhoria do serviço.</Item>
          </ul>
        </Section>

        <Section title="3. Finalidade e Base Legal do Tratamento">
          <table className="w-full text-sm mt-3 border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold w-1/2">Finalidade</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Base Legal (LGPD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['Criação e gestão de conta', 'Execução de contrato (art. 7º, V)'],
                ['Prestação dos serviços contratados', 'Execução de contrato (art. 7º, V)'],
                ['Processamento de cobranças e pagamentos', 'Execução de contrato (art. 7º, V)'],
                ['Envio de notificações transacionais (e-mail)', 'Execução de contrato (art. 7º, V)'],
                ['Comunicações de marketing e novidades', 'Consentimento (art. 7º, I) — revogável a qualquer momento'],
                ['Segurança, prevenção a fraudes e logs', 'Legítimo interesse (art. 7º, IX) e obrigação legal (art. 7º, II)'],
                ['Melhoria da plataforma e análise de uso', 'Legítimo interesse (art. 7º, IX)'],
                ['Cumprimento de obrigações legais', 'Obrigação legal (art. 7º, II)'],
              ].map(([fin, base]) => (
                <tr key={fin} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-700">{fin}</td>
                  <td className="px-4 py-3 text-slate-500">{base}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="4. Compartilhamento de Dados">
          <p>Seus dados são compartilhados exclusivamente com os seguintes parceiros necessários à prestação do serviço:</p>
          <ul className="mt-3 space-y-2 list-none">
            <Item label="Supabase (EUA)">Armazenamento e autenticação. Os dados são armazenados em servidores da AWS na região us-east-1. O Supabase é certificado SOC 2 Type II.</Item>
            <Item label="Asaas Pagamentos">Processamento de cobranças, geração de PIX e boletos. Empresa brasileira regulamentada pelo Banco Central.</Item>
            <Item label="Stripe (EUA)">Processamento de assinaturas da plataforma. Certificado PCI-DSS nível 1.</Item>
            <Item label="Resend (EUA)">Envio de e-mails transacionais (confirmações, notificações, alertas).</Item>
          </ul>
          <p className="mt-4 text-slate-500 text-sm bg-slate-50 rounded-lg p-4 border border-slate-100">
            <strong>Transferência internacional:</strong> Alguns parceiros operam fora do Brasil. Nesses casos, adotamos cláusulas contratuais padrão e garantias equivalentes às exigidas pela LGPD (art. 33).
          </p>
          <p className="mt-3">
            Não vendemos, alugamos nem cedemos seus dados a terceiros para fins comerciais. Dados poderão ser divulgados apenas quando exigido por lei, ordem judicial ou autoridade competente.
          </p>
        </Section>

        <Section title="5. Dados de Inquilinos — Responsabilidade do Proprietário">
          <p>
            O proprietário que cadastra dados de terceiros (inquilinos) na plataforma atua como <strong>controlador independente</strong> desses dados, sendo integralmente responsável por:
          </p>
          <ul className="mt-3 space-y-1.5 list-disc list-inside text-slate-600">
            <li>Ter base legal para o tratamento dos dados dos inquilinos;</li>
            <li>Informar os inquilinos sobre o uso de seus dados;</li>
            <li>Garantir a exatidão e atualização das informações cadastradas;</li>
            <li>Responder a eventuais solicitações dos titulares.</li>
          </ul>
          <p className="mt-3">
            O ProprietárioZen atua como <strong>operador</strong> desses dados, processando-os conforme as instruções do proprietário e sem utilizá-los para fins próprios.
          </p>
        </Section>

        <Section title="6. Retenção de Dados">
          <p>Os dados são mantidos pelo tempo necessário para cumprir as finalidades descritas, observando os seguintes critérios:</p>
          <ul className="mt-3 space-y-2 list-disc list-inside text-slate-600">
            <li>Dados de conta: enquanto a conta estiver ativa;</li>
            <li>Dados financeiros e histórico de cobranças: por 5 anos, conforme obrigações fiscais e o Código Civil;</li>
            <li>Logs de segurança: por até 6 meses;</li>
            <li>Após o encerramento da conta: dados são anonimizados ou excluídos em até 90 dias, salvo obrigação legal de retenção.</li>
          </ul>
        </Section>

        <Section title="7. Seus Direitos (LGPD, art. 18)">
          <p>Como titular de dados, você tem direito a:</p>
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ['Acesso', 'Saber quais dados temos sobre você'],
              ['Correção', 'Corrigir dados incompletos ou desatualizados'],
              ['Anonimização / Exclusão', 'Solicitar o apagamento de dados desnecessários'],
              ['Portabilidade', 'Receber seus dados em formato estruturado'],
              ['Informação', 'Saber com quem compartilhamos seus dados'],
              ['Revogação do consentimento', 'A qualquer momento, para dados tratados com base no consentimento'],
              ['Oposição', 'Opor-se a tratamentos que causem dano'],
              ['Revisão de decisão automatizada', 'Solicitar revisão de decisões tomadas automaticamente'],
            ].map(([dir, desc]) => (
              <div key={dir} className="rounded-lg border border-slate-100 p-3 bg-slate-50/50">
                <p className="font-semibold text-slate-700 text-sm">{dir}</p>
                <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </ul>
          <p className="mt-4">
            Para exercer seus direitos, envie solicitação para{' '}
            <a href="mailto:privacidade@proprietariozen.com.br" className="text-emerald-700 underline underline-offset-2">privacidade@proprietariozen.com.br</a>.
            Responderemos em até <strong>15 dias úteis</strong>.
          </p>
        </Section>

        <Section title="8. Cookies e Tecnologias de Rastreamento">
          <p>Utilizamos cookies e tecnologias similares para:</p>
          <ul className="mt-3 space-y-1.5 list-disc list-inside text-slate-600">
            <li><strong>Cookies essenciais:</strong> manutenção de sessão autenticada (obrigatórios para o funcionamento);</li>
            <li><strong>Cookies analíticos:</strong> Google Analytics (GA4) e Google Tag Manager, para entender como os usuários utilizam a plataforma (anonimizados);</li>
            <li><strong>Cookies de preferências:</strong> armazenam configurações de interface do usuário.</li>
          </ul>
          <p className="mt-3">
            Você pode desativar cookies analíticos nas configurações do seu navegador. Cookies essenciais não podem ser desativados sem comprometer o funcionamento da plataforma.
          </p>
        </Section>

        <Section title="9. Segurança dos Dados">
          <p>Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo:</p>
          <ul className="mt-3 space-y-1.5 list-disc list-inside text-slate-600">
            <li>Criptografia TLS em todas as comunicações;</li>
            <li>Criptografia AES-256-GCM para credenciais financeiras;</li>
            <li>Autenticação segura com hash de senha (bcrypt);</li>
            <li>Controle de acesso baseado em políticas (Row Level Security no Supabase);</li>
            <li>Logs de acesso e monitoramento contínuo;</li>
            <li>Acesso restrito aos dados por parte da equipe interna.</li>
          </ul>
          <p className="mt-3">
            Em caso de incidente de segurança que possa acarretar risco aos titulares, notificaremos a ANPD e os usuários afetados no prazo previsto pela LGPD.
          </p>
        </Section>

        <Section title="10. Alterações nesta Política">
          <p>
            Esta Política pode ser atualizada periodicamente. Quando houver alterações materiais, você será notificado por e-mail e/ou mediante aviso destacado na plataforma com antecedência mínima de{' '}
            <strong>15 dias</strong>. O uso continuado da plataforma após as alterações implica aceite dos novos termos.
          </p>
        </Section>

        <Section title="11. Contato e Canal de Comunicação com a ANPD">
          <p>
            Dúvidas, solicitações ou reclamações relacionadas à privacidade podem ser dirigidas ao nosso DPO:{' '}
            <a href="mailto:privacidade@proprietariozen.com.br" className="text-emerald-700 underline underline-offset-2">privacidade@proprietariozen.com.br</a>.
          </p>
          <p className="mt-3">
            Você também pode contatar a <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong> pelo portal{' '}
            <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline underline-offset-2">gov.br/anpd</a>{' '}
            caso entenda que seus direitos não foram adequadamente atendidos.
          </p>
        </Section>

        <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">Última atualização: 15 de abril de 2025</p>
          <div className="flex gap-4 text-xs">
            <Link href="/termos-de-uso" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">Termos de Uso</Link>
            <Link href="/" className="text-slate-400 hover:text-slate-600">← Voltar ao site</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">{title}</h2>
      <div className="text-slate-600 leading-relaxed space-y-2 text-sm">{children}</div>
    </section>
  )
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm">
      <span className="text-emerald-600 font-semibold shrink-0 mt-0.5">→</span>
      <span><strong className="text-slate-700">{label}:</strong> {children}</span>
    </li>
  )
}
