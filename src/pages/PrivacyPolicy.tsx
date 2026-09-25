import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 shadow rounded">
        <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
        <p className="mb-4">
          <strong>Última atualização:</strong> [PREENCHER ANTES DO GO-LIVE]
        </p>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">1. Categorias de Dados e Finalidade</h2>
          <p>
            O Birth Hub 360 processa dados pessoais de leads, contatos e clientes, que podem incluir
            nome, e-mail, telefone, cargo e dados corporativos, com a finalidade exclusiva de gestão
            comercial, prospecção e relacionamento (CRM) para [RAZÃO SOCIAL DA EMPRESA A PREENCHER ANTES DO GO-LIVE].
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">2. Base Legal (LGPD)</h2>
          <p>
            O tratamento de dados pessoais é realizado com fundamento no legítimo interesse (Art. 7º, IX)
            para prospecção B2B corporativa, no consentimento (Art. 7º, I) para contatos opt-in,
            e na execução de contrato (Art. 7º, V) para clientes ativos, nos termos da Lei 13.709/2018.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">3. Retenção e Exclusão</h2>
          <p>
            Os dados serão retidos apenas pelo tempo necessário para cumprir sua finalidade comercial.
            Solicitações de exclusão e anonimização podem ser feitas através dos canais de contato.
            Contatos que realizem opt-out são bloqueados imediatamente nas campanhas futuras.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">4. Compartilhamento e Subprocessadores</h2>
          <p>
            Não vendemos dados pessoais. Compartilhamos dados apenas com provedores estritamente necessários
            (nuvem, IA, provedores de comunicação corporativa), resguardados por cláusulas de sigilo e adequação legal.
            Inclui serviços de Inteligência Artificial para enriquecimento e transcrição que não utilizam
            os dados dos clientes para treinar modelos fundacionais abertos.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">5. Direitos do Titular</h2>
          <p>
            O titular possui direito a acesso, correção, anonimização, bloqueio ou eliminação
            de dados desnecessários ou tratados em desconformidade, além de portabilidade e revogação de consentimento.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">6. Contato (DPO)</h2>
          <p>
            Dúvidas sobre proteção de dados ou solicitações do titular devem ser direcionadas ao nosso Encarregado de Dados (DPO):
            [NOME/E-MAIL DO DPO A PREENCHER ANTES DO GO-LIVE].
          </p>
        </section>
      </div>
    </div>
  );
}

