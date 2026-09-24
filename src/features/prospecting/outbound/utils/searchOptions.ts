import { SearchSchemaConfig } from '../types';

export const SEARCH_SCHEMA_CONFIG: SearchSchemaConfig = {
  // 1. SEGMENTO
  segments: [
    {
      id: 'transp_geral',
      label: 'Transporte Rodoviário de Carga Geral & Fracionada',
      description: 'Frotas de carga seca, distribuição intermunicipal, interestadual e transferência.',
      badge: 'Alta Demanda',
      queryFragment: 'transportadora de carga geral fracionada seca'
    },
    {
      id: 'operador_3pl',
      label: 'Operador Logístico 3PL / Armazéns Gerais',
      description: 'Armazenagem, intralogística, cross-docking e gestão de cadeia de suprimentos.',
      badge: 'Grandes Contas',
      queryFragment: 'operador logistico 3PL armazenagem geral logistica'
    },
    {
      id: 'transp_frigorificado',
      label: 'Transporte Frigorificado & Cadeia Fria',
      description: 'Alimentos perecíveis, carnes, laticínios, congelados e câmaras frias.',
      badge: 'Carga Crítica',
      queryFragment: 'transporte frigorificado cadeia fria refrigerado pereciveis'
    },
    {
      id: 'quimicos_mopp',
      label: 'Produtos Perigosos & Químicos (MOPP)',
      description: 'Líquidos inflamáveis, defensivos agrícolas, gases e produtos controlados.',
      badge: 'Alto Risco',
      queryFragment: 'transporte produtos perigosos quimicos mopp inflamaveis'
    },
    {
      id: 'alto_valor',
      label: 'Cargas de Alto Valor & Eletrônicos',
      description: 'Smartphones, tecnologia, fármacos de alto custo e cargas com escolta.',
      badge: 'Máxima Segurança',
      queryFragment: 'transporte carga alto valor eletronicos escolta gerenciamento risco'
    },
    {
      id: 'agronegocio',
      label: 'Agronegócio, Grãos & Fertilizantes',
      description: 'Bitrens, rodotrens, caçambas graneleiras em corredores do agro e portos.',
      badge: 'Safra & Agro',
      queryFragment: 'transportadora agronegocio graos soja milho fertilizantes'
    },
    {
      id: 'farmaceutico',
      label: 'Distribuição Farmacêutica & Termolábeis',
      description: 'Medicamentos, vacinas, cosméticos com exigências Anvisa e controle térmico.',
      badge: 'Anvisa / Pharma',
      queryFragment: 'distribuidora farmaceutica medicamentos termolabeis anvisa'
    },
    {
      id: 'ecommerce_lastmile',
      label: 'E-commerce, Fulfillment & Last-Mile Express',
      description: 'Centros de triagem urbana, entregas no mesmo dia e encomendas expressas.',
      badge: 'Last-Mile',
      queryFragment: 'logistica ecommerce last mile entrega expressa encomendas'
    },
    {
      id: 'industria_bens',
      label: 'Indústria & Manufatura com Frota Própria',
      description: 'Metalmecânica, bens de consumo, têxtil, papel e celulose com frota.',
      badge: 'Indústria',
      queryFragment: 'industria manufatura distribuicao logistica frota propria'
    },
    {
      id: 'distribuidores_atacado',
      label: 'Distribuidores & Atacadistas de Bens de Consumo',
      description: 'Atacado de alimentos, bebidas, materiais de construção e autopeças.',
      badge: 'Atacado / FMCG',
      queryFragment: 'distribuidora atacadista distribuicao frotas entregas'
    },
    {
      id: 'conteineres_porto',
      label: 'Transporte Portuário & Contêineres',
      description: 'Terminais retroportuários e frotas de importação/exportação.',
      badge: 'Porto / Marítimo',
      queryFragment: 'transporte conteineres terminal retroportuario exportacao porto'
    },
    {
      id: 'maquinas_especiais',
      label: 'Cargas Excedentes & Maquinário Pesado',
      description: 'Pranchas, guindastes, pás eólicas e transporte indivisível.',
      badge: 'Cargas Pesadas',
      queryFragment: 'transporte carga pesada indivisivel prancha especial'
    }
  ],

  // 2. REGIÃO & CIDADE (TODOS OS ESTADOS E POLOS)
  regions: [
    {
      stateUf: 'SP',
      stateName: 'São Paulo',
      polos: [
        { id: 'sp_todas', label: 'Todo o Estado de SP', queryFragment: 'São Paulo SP Brasil' },
        { id: 'sp_capital', label: 'São Paulo Capital & Região Metropolitana', queryFragment: 'São Paulo SP Marginal Tiete Pinheiros' },
        { id: 'sp_campinas', label: 'Campinas, Viracopos, Paulínia & Sumaré', queryFragment: 'Campinas Paulinia Viracopos Sumare SP' },
        { id: 'sp_dutra', label: 'Eixo Dutra (Guarulhos, São José dos Campos, Taubaté)', queryFragment: 'Guarulhos Sao Jose dos Campos Taubate SP Rodovia Dutra' },
        { id: 'sp_santos', label: 'Baixada Santista, Cubatão & Porto de Santos', queryFragment: 'Santos Cubatao Baixada Santista SP' },
        { id: 'sp_ribeirao', label: 'Ribeirão Preto, Franca & Sertãozinho', queryFragment: 'Ribeirao Preto Franca Sertaozinho SP' },
        { id: 'sp_sorocaba', label: 'Sorocaba, Itu, Salto & Castelo Branco', queryFragment: 'Sorocaba Itu Salto Castelo Branco SP' },
        { id: 'sp_riopreto', label: 'São José do Rio Preto & Catanduva', queryFragment: 'Sao Jose do Rio Preto Catanduva SP' },
        { id: 'sp_bauru', label: 'Bauru, Marília & Jaú', queryFragment: 'Bauru Marilia Jau SP' },
        { id: 'sp_piracicaba', label: 'Piracicaba, Limeira & Americana', queryFragment: 'Piracicaba Limeira Americana SP' }
      ]
    },
    {
      stateUf: 'MG',
      stateName: 'Minas Gerais',
      polos: [
        { id: 'mg_todas', label: 'Todo o Estado de MG', queryFragment: 'Minas Gerais MG Brasil' },
        { id: 'mg_bh_contagem', label: 'Grande BH, Contagem & Betim', queryFragment: 'Contagem Betim Belo Horizonte MG' },
        { id: 'mg_triangulo', label: 'Triângulo Mineiro (Uberlândia, Uberaba & Araguari)', queryFragment: 'Uberlandia Uberaba Triangulo Mineiro MG' },
        { id: 'mg_sul', label: 'Sul de Minas & Fernão Dias (Extrema, Pouso Alegre, Varginha)', queryFragment: 'Extrema Pouso Alegre Varginha Sul de Minas MG' },
        { id: 'mg_juizdefora', label: 'Juiz de Fora & Zona da Mata', queryFragment: 'Juiz de Fora Zona da Mata MG' },
        { id: 'mg_montesclaros', label: 'Norte de Minas (Montes Claros)', queryFragment: 'Montes Claros Norte de Minas MG' }
      ]
    },
    {
      stateUf: 'PR',
      stateName: 'Paraná',
      polos: [
        { id: 'pr_todas', label: 'Todo o Estado do PR', queryFragment: 'Paraná PR Brasil' },
        { id: 'pr_curitiba', label: 'Curitiba, São José dos Pinhais & Araucária', queryFragment: 'Curitiba Sao Jose dos Pinhais Araucaria PR' },
        { id: 'pr_londrina', label: 'Londrina & Maringá (Norte do Paraná)', queryFragment: 'Londrina Maringa Norte Parana PR' },
        { id: 'pr_cascavel', label: 'Cascavel, Foz do Iguaçu & Toledo (Oeste)', queryFragment: 'Cascavel Foz do Iguacu Toledo Oeste Parana PR' },
        { id: 'pr_paranagua', label: 'Paranaguá & Corredor Portuário', queryFragment: 'Paranagua Porto Parana PR' },
        { id: 'pr_pontagrossa', label: 'Ponta Grossa & Campos Gerais', queryFragment: 'Ponta Grossa Campos Gerais PR' }
      ]
    },
    {
      stateUf: 'SC',
      stateName: 'Santa Catarina',
      polos: [
        { id: 'sc_todas', label: 'Todo o Estado de SC', queryFragment: 'Santa Catarina SC Brasil' },
        { id: 'sc_itajai', label: 'Itajaí, Navegantes, Balneário Camboriú (Complexo Portuário)', queryFragment: 'Itajai Navegantes Balneario Camboriu Porto SC' },
        { id: 'sc_joinville', label: 'Joinville, Jaraguá do Sul & Norte Catarinense', queryFragment: 'Joinville Jaragua do Sul Norte Catarinense SC' },
        { id: 'sc_florianopolis', label: 'Grande Florianópolis, São José & Palhoça', queryFragment: 'Florianopolis Sao Jose Palhoca SC' },
        { id: 'sc_blumenau', label: 'Blumenau, Brusque & Vale do Itajaí', queryFragment: 'Blumenau Brusque Vale do Itajai SC' },
        { id: 'sc_chapeco', label: 'Chapecó, Concórdia & Oeste Catarinense (Agro / Frigoríficos)', queryFragment: 'Chapeco Concordia Oeste Catarinense SC' }
      ]
    },
    {
      stateUf: 'RS',
      stateName: 'Rio Grande do Sul',
      polos: [
        { id: 'rs_todas', label: 'Todo o Estado do RS', queryFragment: 'Rio Grande do Sul RS Brasil' },
        { id: 'rs_portoalegre', label: 'Porto Alegre, Canoas, Novo Hamburgo & Gravataí', queryFragment: 'Porto Alegre Canoas Gravatai RS' },
        { id: 'rs_caxias', label: 'Caxias do Sul, Bento Gonçalves & Serra Gaúcha', queryFragment: 'Caxias do Sul Bento Goncalves Serra Gaucha RS' },
        { id: 'rs_passofundo', label: 'Passo Fundo & Planalto Médio', queryFragment: 'Passo Fundo Planalto Medio RS' },
        { id: 'rs_riogrande', label: 'Pelotas & Porto de Rio Grande', queryFragment: 'Rio Grande Pelotas Porto RS' }
      ]
    },
    {
      stateUf: 'RJ',
      stateName: 'Rio de Janeiro',
      polos: [
        { id: 'rj_todas', label: 'Todo o Estado do RJ', queryFragment: 'Rio de Janeiro RJ Brasil' },
        { id: 'rj_capital', label: 'Rio de Janeiro Capital, Pavuna & Baixada Fluminense', queryFragment: 'Rio de Janeiro Pavuna Duque de Caxias Baixada Fluminense RJ' },
        { id: 'rj_resende', label: 'Resende, Volta Redonda & Sul Fluminense (Médio Paraíba)', queryFragment: 'Resende Volta Redonda Porto Real RJ' },
        { id: 'rj_macae', label: 'Macaé, Campos & Norte Fluminense (Offshore / Óleo & Gás)', queryFragment: 'Macae Campos dos Goytacazes RJ' }
      ]
    },
    {
      stateUf: 'GO',
      stateName: 'Goiás & DF',
      polos: [
        { id: 'go_todas', label: 'Todo o Estado de GO & Distrito Federal', queryFragment: 'Goias GO Brasilia DF' },
        { id: 'go_goiania', label: 'Goiânia, Aparecida de Goiânia & Senador Canedo', queryFragment: 'Goiania Aparecida de Goiania Senador Canedo GO' },
        { id: 'go_anapolis', label: 'Anápolis (DAIA - Polo Farmoquímico & Porto Seco)', queryFragment: 'Anapolis DAIA Porto Seco GO' },
        { id: 'go_rioverde', label: 'Rio Verde, Jataí & Sudoeste Goiano (Agronegócio)', queryFragment: 'Rio Verde Jatai Sudoeste Goiano GO' },
        { id: 'df_brasilia', label: 'Brasília, Taguatinga & Ceilândia (DF)', queryFragment: 'Brasilia Taguatinga Ceilandia DF' }
      ]
    },
    {
      stateUf: 'MT',
      stateName: 'Mato Grosso',
      polos: [
        { id: 'mt_todas', label: 'Todo o Estado do MT', queryFragment: 'Mato Grosso MT Brasil' },
        { id: 'mt_rondonopolis', label: 'Rondonópolis (Terminal Ferroviário & Polo de Grãos)', queryFragment: 'Rondonopolis Terminal Ferroviario MT' },
        { id: 'mt_cuiaba', label: 'Cuiabá & Várzea Grande', queryFragment: 'Cuiaba Varzea Grande MT' },
        { id: 'mt_sinop', label: 'Sinop, Sorriso, Lucas do Rio Verde & Nova Mutum (BR-163)', queryFragment: 'Sinop Sorriso Lucas do Rio Verde Nova Mutum MT BR-163' }
      ]
    },
    {
      stateUf: 'MS',
      stateName: 'Mato Grosso do Sul',
      polos: [
        { id: 'ms_todas', label: 'Todo o Estado do MS', queryFragment: 'Mato Grosso do Sul MS Brasil' },
        { id: 'ms_campogrande', label: 'Campo Grande & Região Central', queryFragment: 'Campo Grande MS' },
        { id: 'ms_dourados', label: 'Dourados & Sul do Estado (Agro)', queryFragment: 'Dourados MS' },
        { id: 'ms_treslagoas', label: 'Três Lagoas (Polo de Celulose & Leste)', queryFragment: 'Tres Lagoas Celulose MS' }
      ]
    },
    {
      stateUf: 'BA',
      stateName: 'Bahia',
      polos: [
        { id: 'ba_todas', label: 'Todo o Estado da Bahia', queryFragment: 'Bahia BA Brasil' },
        { id: 'ba_salvador', label: 'Salvador, Camaçari, Simões Filho & Lauro de Freitas', queryFragment: 'Salvador Camacari Simoes Filho Polo Petroquimico BA' },
        { id: 'ba_feiradesantana', label: 'Feira de Santana (Maior Entroncamento Rodoviário do Nordeste)', queryFragment: 'Feira de Santana Entroncamento Rodoviario BA' },
        { id: 'ba_luiseduardo', label: 'Luís Eduardo Magalhães & Barreiras (Oeste Baiano / Grãos)', queryFragment: 'Luis Eduardo Magalhaes Barreiras Oeste Baiano BA' }
      ]
    },
    {
      stateUf: 'ES',
      stateName: 'Espírito Santo',
      polos: [
        { id: 'es_todas', label: 'Todo o Estado do ES', queryFragment: 'Espírito Santo ES Brasil' },
        { id: 'es_vitoria', label: 'Grande Vitória, Cariacica, Serra & Viana', queryFragment: 'Vitoria Cariacica Serra Viana Polo Logistico ES' },
        { id: 'es_cachoeiro', label: 'Cachoeiro de Itapemirim & Sul Capixaba (Rochas Ornamentais)', queryFragment: 'Cachoeiro de Itapemirim Sul Capixaba ES' }
      ]
    },
    {
      stateUf: 'PE',
      stateName: 'Pernambuco',
      polos: [
        { id: 'pe_todas', label: 'Todo o Estado de PE', queryFragment: 'Pernambuco PE Brasil' },
        { id: 'pe_recife', label: 'Grande Recife, Cabo de Santo Agostinho, Jaboatão & Ipojuca (Porto de Suape)', queryFragment: 'Recife Cabo de Santo Agostinho Jaboatao Porto Suape PE' },
        { id: 'pe_caruaru', label: 'Caruaru & Agreste Pernambucano', queryFragment: 'Caruaru Agreste PE' },
        { id: 'pe_petrolina', label: 'Petrolina & Vale do São Francisco (Fruticultura Exportação)', queryFragment: 'Petrolina Vale do Sao Francisco PE' }
      ]
    },
    {
      stateUf: 'CE',
      stateName: 'Ceará',
      polos: [
        { id: 'ce_todas', label: 'Todo o Estado do CE', queryFragment: 'Ceará CE Brasil' },
        { id: 'ce_fortaleza', label: 'Fortaleza, Maracanaú, Caucaia & Complexo do Pecém', queryFragment: 'Fortaleza Maracanau Porto Pecem CE' },
        { id: 'ce_juazeiro', label: 'Juazeiro do Norte, Crato & Cariri', queryFragment: 'Juazeiro do Norte Cariri CE' }
      ]
    },
    {
      stateUf: 'PA',
      stateName: 'Pará & Norte',
      polos: [
        { id: 'pa_todas', label: 'Todo o Estado do PA', queryFragment: 'Pará PA Brasil' },
        { id: 'pa_belem', label: 'Belém, Ananindeua & Barcarena (Porto de Vila do Conde)', queryFragment: 'Belem Ananindeua Barcarena Vila do Conde PA' },
        { id: 'pa_maraba', label: 'Marabá, Parauapebas & Carajás (Mineração / Sudeste)', queryFragment: 'Maraba Parauapebas Carajas PA' }
      ]
    },
    {
      stateUf: 'AM',
      stateName: 'Amazonas',
      polos: [
        { id: 'am_manaus', label: 'Manaus & Polo Industrial de Manaus (PIM / Zona Franca)', queryFragment: 'Manaus Polo Industrial Zona Franca AM' }
      ]
    }
  ],

  // 3. TIPO DE EMPRESA / OPERAÇÃO
  companyTypes: [
    {
      id: 'todos_tipos',
      label: 'Todos os Tipos de Operação',
      description: 'Frotas próprias, terceirizadas, operadores e indústrias.',
      badge: 'Geral',
      queryFragment: ''
    },
    {
      id: 'frota_propria',
      label: 'Transportadora com Frota Própria Pesada',
      description: 'Cavalos mecânicos, carretas, bitrens e semirreboques próprios.',
      badge: 'Frota Própria',
      queryFragment: 'frota propria cavalos carretas'
    },
    {
      id: 'operador_3pl_tipo',
      label: 'Operador Logístico 3PL / 4PL',
      description: 'Operadores integrados com gestão de armazém e transporte.',
      badge: '3PL / 4PL',
      queryFragment: 'operador logistico 3PL 4PL cadeia suprimentos'
    },
    {
      id: 'frota_agregada',
      label: 'Transportadora com Frota Agregada / Terceirizada',
      description: 'Operações baseadas em motoristas autônomos e agregados.',
      badge: 'Agregados',
      queryFragment: 'transportadora frota agregados autonomos'
    },
    {
      id: 'cd_crossdocking',
      label: 'Centro de Distribuição / Cross-docking',
      description: 'Hubs de triagem rápida e consolidação de mercadorias.',
      badge: 'Cross-docking',
      queryFragment: 'centro distribuicao cross docking'
    },
    {
      id: 'industria_frota',
      label: 'Indústria / Embarcador com Logística Dedicada',
      description: 'Grandes indústrias que contratam ou gerenciam transporte direto.',
      badge: 'Embarcador',
      queryFragment: 'industria embarcador logistica transporte'
    },
    {
      id: 'distribuidora_tipo',
      label: 'Distribuidora / Atacado com Frota de Distribuição',
      description: 'Veículos urbanos de carga (VUCs), tocos e caminhões médios.',
      badge: 'Distribuição',
      queryFragment: 'distribuidora atacadista frota entregas'
    }
  ],

  // 4. NÚMERO DE FUNCIONÁRIOS
  employeeCounts: [
    {
      id: 'todos_funcionarios',
      label: 'Qualquer Porte de Funcionários',
      description: 'Todas as faixas de colaboradores.',
      badge: 'Todas',
      queryFragment: ''
    },
    {
      id: 'func_1_10',
      label: '1 a 10 funcionários (Microempresa)',
      description: 'Pequenas transportadoras locais ou filiais operacionais.',
      badge: '1-10',
      queryFragment: '1-10 funcionarios'
    },
    {
      id: 'func_11_50',
      label: '11 a 50 funcionários (Pequeno Porte)',
      description: 'Frotas regionais em consolidação.',
      badge: '11-50',
      queryFragment: '11-50 funcionarios'
    },
    {
      id: 'func_51_200',
      label: '51 a 200 funcionários (Médio Porte)',
      description: 'Empresas consolidadas com rotas interestaduais.',
      badge: '51-200',
      queryFragment: '51-200 funcionarios'
    },
    {
      id: 'func_201_500',
      label: '201 a 500 funcionários (Médio-Grande Porte)',
      description: 'Grandes frotas com filiais e gerência de risco estruturada.',
      badge: '201-500',
      queryFragment: '201-500 funcionarios'
    },
    {
      id: 'func_500_plus',
      label: 'Acima de 500 funcionários (Grande Porte / Corporativo)',
      description: 'Líderes nacionais de transporte e operadores multinacionais.',
      badge: '500+',
      queryFragment: 'mais de 500 funcionarios'
    }
  ],

  // 5. FATURAMENTO ANUAL
  annualRevenues: [
    {
      id: 'todos_faturamentos',
      label: 'Qualquer Faixa de Faturamento',
      description: 'Todas as faixas de receita bruta anual.',
      badge: 'Geral',
      queryFragment: ''
    },
    {
      id: 'fat_ate_5m',
      label: 'Até R$ 5 Milhões / ano',
      description: 'Frotas de pequeno porte e distribuidoras regionais.',
      badge: 'Até 5M',
      queryFragment: 'faturamento ate 5 milhoes'
    },
    {
      id: 'fat_5m_20m',
      label: 'R$ 5M a R$ 20 Milhões / ano',
      description: 'Médio porte inicial, frotas em expansão.',
      badge: '5M - 20M',
      queryFragment: 'faturamento 5 a 20 milhoes'
    },
    {
      id: 'fat_20m_50m',
      label: 'R$ 20M a R$ 50 Milhões / ano',
      description: 'Médio porte consolidado, alta demanda de gestão de risco.',
      badge: '20M - 50M',
      queryFragment: 'faturamento 20 a 50 milhoes'
    },
    {
      id: 'fat_50m_200m',
      label: 'R$ 50M a R$ 200 Milhões / ano',
      description: 'Grande porte, cobertura interestadual e múltiplos CDs.',
      badge: '50M - 200M',
      queryFragment: 'faturamento 50 a 200 milhoes'
    },
    {
      id: 'fat_acima_200m',
      label: 'Acima de R$ 200 Milhões / ano (Enterprise)',
      description: 'Grandes corporações logísticas e operadores globais.',
      badge: '> 200M',
      queryFragment: 'faturamento acima de 200 milhoes'
    }
  ],

  // 6. DECISOR ALVO
  decisionMakerRoles: [
    {
      id: 'diretor_operacoes',
      label: 'Diretor de Operações / Frotas (COO / Head de Ops)',
      description: 'Responsável direto por produtividade, rotas, custos e frotas.',
      badge: 'Principal',
      queryFragment: 'Diretor de Operacoes Diretor de Frota COO'
    },
    {
      id: 'head_gr',
      label: 'Head / Gerente de Gestão de Risco (GR) e Prevenção de Perdas',
      description: 'Decisor direto de sinistros, tecnologias de rastreamento e seguros.',
      badge: 'Decisor GR',
      queryFragment: 'Gerente de Gerenciamento de Risco Head de GR Seguranca Patrimonial Sinistros'
    },
    {
      id: 'ceo_socio',
      label: 'CEO / Sócio-Fundador / Presidente Executivo',
      description: 'Tomador de decisão estratégica final e investimento.',
      badge: 'C-Level',
      queryFragment: 'CEO Socio Diretor Presidente Fundador Owner'
    },
    {
      id: 'diretor_logistica',
      label: 'Diretor de Logística & Supply Chain',
      description: 'Gestor da cadeia de suprimentos, malha de CDs e contratos.',
      badge: 'Supply Chain',
      queryFragment: 'Diretor de Logistica Head Supply Chain'
    },
    {
      id: 'gerente_sinistros',
      label: 'Gerente de Sinistros & Seguros de Cargas',
      description: 'Focado em redução da sinistralidade e apólices RCF-DC / RCTR-C.',
      badge: 'Seguros',
      queryFragment: 'Gerente de Sinistros Gerente de Seguros de Carga'
    },
    {
      id: 'gerente_transportes',
      label: 'Gerente Geral de Transportes & Tráfego',
      description: 'Coordenação operacional do dia a dia e expedição.',
      badge: 'Operacional',
      queryFragment: 'Gerente de Transportes Gerente de Trafego'
    },
    {
      id: 'gerente_manutencao',
      label: 'Gerente de Manutenção de Frotas & Telemetria',
      description: 'Focado em desgaste, telemetria e segurança veicular.',
      badge: 'Manutenção',
      queryFragment: 'Gerente de Manutencao Frota Telemetria'
    }
  ],

  // 7. TOM DE VOZ
  tones: [
    {
      id: 'consultivo',
      label: 'Consultivo & Especialista (Recomendado)',
      description: 'Postura de autoridade em gestão de risco rodoviário e inteligência.'
    },
    {
      id: 'direto',
      label: 'Direto & ROI Focado',
      description: 'Foco nos números, redução de sinistros e retorno financeiro.'
    },
    {
      id: 'storytelling',
      label: 'Storytelling & Casos Reais',
      description: 'Contextualiza com o cenário atual das rodovias e casos de sucesso.'
    },
    {
      id: 'provocador',
      label: 'Provocador de Dores',
      description: 'Questiona a vulnerabilidade de frotas e brechas em rotas críticas.'
    }
  ]
};

export const PREDEFINED_TAGS_SUGGESTIONS = [
  'Frota Pesada',
  'Carga Crítica',
  'Gestão de Risco',
  'Decisor Mapeado',
  'Lead Quente',
  'Operador 3PL',
  'Frigorificado',
  'MOPP / Químicos',
  'E-commerce',
  'Campinas / SP',
  'Triângulo MG',
  'Bitrix Sincronizado',
  'Contato Telefônico',
  'E-mail Válido'
];
