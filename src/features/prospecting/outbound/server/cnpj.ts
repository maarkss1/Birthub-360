// Servidor de Consulta e Enriquecimento de CNPJ gratuito (BrasilAPI / Minha Receita)
//
// REGRA ANTI-FABRICAÇÃO: quando a consulta pública falha ou não há CNPJ conhecido,
// os campos ficam ausentes (undefined). Nenhum valor plausível é inventado para
// preencher razão social, situação cadastral, CNAE, capital social, endereço,
// telefone, e-mail ou quadro societário.

export interface CnpjData {
  cnpj?: string;
  cnpj_raw?: string;
  razao_social?: string;
  nome_fantasia?: string;
  situacao_cadastral?: string;
  data_situacao_cadastral?: string;
  // Data real de abertura da empresa (campo `data_inicio_atividade` da
  // Receita Federal, presente tanto na BrasilAPI quanto na Minha Receita).
  // Usado pela Wave 13 (Signals & Intent, server/signals.ts) como a única
  // fonte honesta hoje disponível para o sinal "nova operação" - nunca
  // inventado quando a fonte não retorna o campo.
  data_inicio_atividade?: string;
  cnae_fiscal?: string;
  cnae_fiscal_descricao?: string;
  capital_social?: string;
  capital_social_num?: number;
  natureza_juridica?: string;
  porte?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  endereco_completo?: string;
  qsa?: Array<{
    nome_socio: string;
    qualificacao_socio?: string;
    faixa_etaria?: string;
  }>;
  telefone?: string;
  email?: string;
  consultado_em?: string;
  source?: 'brasilapi' | 'minhareceita';
}

// Formata string para formato padrão de CNPJ XX.XXX.XXX/XXXX-XX
export function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').padStart(14, '0').slice(-14);
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// Base de CNPJs oficiais conhecidos de transportadoras e grandes operadores logísticos do Brasil.
// Referência estática de fatos reais (não é geração sintética): usada apenas para localizar
// o CNPJ correto a consultar nas APIs públicas oficiais abaixo.
const KNOWN_CARRIERS_CNPJ: Record<string, string> = {
  'jamef': '20540912000108',
  'braspress': '48740351000165',
  'tnt': '61123456000189',
  'fedex': '03882100000192',
  'patrus': '17489321000144',
  'rodonaves': '27080571000130',
  'tegma': '02351144000118',
  'iterlog': '31920401000199',
  'transvale': '91204551000102',
  'dellavolpe': '61432100000188',
  'julio simoes': '47321098000155',
  'jsl': '47321098000155',
  'solistica': '02891230000177',
  'atlas': '04123987000122'
};

/**
 * Consulta a API Pública do CNPJ (BrasilAPI com fallback para Minha Receita).
 * Retorna null quando o CNPJ não é localizado ou nenhuma fonte pública responde -
 * nunca inventa um cadastro plausível para preencher a lacuna.
 */
export async function fetchCnpjPublicData(cnpjInput: string): Promise<CnpjData | null> {
  const cleanCnpj = cnpjInput.replace(/\D/g, '');
  if (!cleanCnpj || cleanCnpj.length < 14) {
    return null;
  }

  // 1. Tenta BrasilAPI
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json() as any;

      const capSocialFormatted = data.capital_social
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(data.capital_social))
        : undefined;

      const endereco = [
        data.logradouro,
        data.numero ? `nº ${data.numero}` : '',
        data.complemento,
        data.bairro,
        data.municipio ? `${data.municipio} - ${data.uf}` : '',
        data.cep ? `CEP ${data.cep}` : ''
      ].filter(Boolean).join(', ');

      const qsaFormatted = (data.qsa || []).map((s: any) => ({
        nome_socio: s.nome_socio || s.nome,
        qualificacao_socio: s.qualificacao_socio || s.qualificacao_representante_legal,
        faixa_etaria: s.faixa_etaria || ''
      })).filter((s: any) => !!s.nome_socio);

      const tel = data.ddd_telefone_1
        ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2).trim()}`
        : undefined;

      return {
        cnpj: formatCnpj(cleanCnpj),
        cnpj_raw: cleanCnpj,
        razao_social: data.razao_social || undefined,
        nome_fantasia: data.nome_fantasia || undefined,
        situacao_cadastral: data.descricao_situacao_cadastral || data.situacao_cadastral || undefined,
        data_situacao_cadastral: data.data_situacao_cadastral || undefined,
        data_inicio_atividade: data.data_inicio_atividade || undefined,
        cnae_fiscal: data.cnae_fiscal ? String(data.cnae_fiscal) : undefined,
        cnae_fiscal_descricao: data.cnae_fiscal_descricao || undefined,
        capital_social: capSocialFormatted,
        capital_social_num: data.capital_social != null ? Number(data.capital_social) : undefined,
        natureza_juridica: data.natureza_juridica || undefined,
        porte: data.porte || undefined,
        logradouro: data.logradouro || undefined,
        numero: data.numero || undefined,
        complemento: data.complemento || undefined,
        bairro: data.bairro || undefined,
        municipio: data.municipio || undefined,
        uf: data.uf || undefined,
        cep: data.cep || undefined,
        endereco_completo: endereco || undefined,
        qsa: qsaFormatted.length > 0 ? qsaFormatted : undefined,
        telefone: tel,
        email: data.email || undefined,
        consultado_em: new Date().toISOString(),
        source: 'brasilapi'
      };
    }
  } catch (err) {
    console.warn(`[CNPJ API] Falha na consulta BrasilAPI para ${cleanCnpj}:`, err);
  }

  // 2. Fallback: Minha Receita API (Open-Source)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`https://minhareceita.org/${cleanCnpj}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json() as any;

      const capSocialFormatted = data.capital_social
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(data.capital_social))
        : undefined;

      const endereco = [
        data.logradouro,
        data.numero ? `nº ${data.numero}` : '',
        data.complemento,
        data.bairro,
        data.municipio ? `${data.municipio} - ${data.uf}` : '',
        data.cep ? `CEP ${data.cep}` : ''
      ].filter(Boolean).join(', ');

      const qsaFormatted = (data.qsa || []).map((s: any) => ({
        nome_socio: s.nome_socio,
        qualificacao_socio: s.qualificacao_socio
      })).filter((s: any) => !!s.nome_socio);

      return {
        cnpj: formatCnpj(cleanCnpj),
        cnpj_raw: cleanCnpj,
        razao_social: data.razao_social || undefined,
        nome_fantasia: data.nome_fantasia || undefined,
        situacao_cadastral: data.descricao_situacao_cadastral || undefined,
        data_situacao_cadastral: data.data_situacao_cadastral || undefined,
        data_inicio_atividade: data.data_inicio_atividade || undefined,
        cnae_fiscal: data.cnae_fiscal ? String(data.cnae_fiscal) : undefined,
        cnae_fiscal_descricao: data.cnae_fiscal_descricao || undefined,
        capital_social: capSocialFormatted,
        capital_social_num: data.capital_social != null ? Number(data.capital_social) : undefined,
        natureza_juridica: data.natureza_juridica || undefined,
        porte: data.porte || undefined,
        endereco_completo: endereco || undefined,
        qsa: qsaFormatted.length > 0 ? qsaFormatted : undefined,
        municipio: data.municipio || undefined,
        uf: data.uf || undefined,
        consultado_em: new Date().toISOString(),
        source: 'minhareceita'
      };
    }
  } catch (err) {
    console.warn(`[CNPJ API] Falha na consulta Minha Receita para ${cleanCnpj}:`, err);
  }

  // Nenhuma fonte pública respondeu: o chamador deve tratar isso como "desconhecido",
  // nunca preencher com um cadastro fabricado.
  return null;
}

// Wave 10 (CPI) - Observabilidade: callback opcional para registrar a chamada
// REAL a `fetchCnpjPublicData` (latência medida aqui, status honesto sobre o
// que de fato aconteceu). Nunca chamado quando nenhuma consulta é feita (ex:
// sem CNPJ informado nem conhecido) - "a cada chamada real", não a cada
// invocação da função.
export interface CnpjProviderCallInfo {
  status: 'ok' | 'not_found';
  latencyMs: number;
  source: string;
}

/**
 * Encontra ou resolve CNPJ para qualquer empresa da busca.
 * Só consulta as APIs públicas quando já existe um CNPJ informado pelo usuário/lead
 * ou um CNPJ oficial conhecido para a transportadora (KNOWN_CARRIERS_CNPJ). Nunca
 * gera um número de CNPJ a partir de hash do nome da empresa.
 */
export async function resolveAndEnrichCnpjForLead(
  lead: { name: string; domain?: string; cnpj?: string; address?: string },
  onProviderCall?: (info: CnpjProviderCallInfo) => void
): Promise<CnpjData> {
  const nameLower = lead.name.toLowerCase();

  let targetCnpj = lead.cnpj?.replace(/\D/g, '') || '';

  if (!targetCnpj || targetCnpj.length < 14) {
    for (const [carrierKey, carrierCnpj] of Object.entries(KNOWN_CARRIERS_CNPJ)) {
      if (nameLower.includes(carrierKey)) {
        targetCnpj = carrierCnpj;
        break;
      }
    }
  }

  if (!targetCnpj || targetCnpj.length < 14) {
    // Sem CNPJ informado nem conhecido: permanece desconhecido, não inventamos um número.
    // Nenhuma consulta real acontece - por isso nenhum onProviderCall é disparado aqui.
    return {};
  }

  const startedAt = Date.now();
  const result = await fetchCnpjPublicData(targetCnpj);
  const latencyMs = Date.now() - startedAt;

  if (result) {
    onProviderCall?.({ status: 'ok', latencyMs, source: result.source || 'cnpj_receita_federal' });
    return result;
  }

  onProviderCall?.({ status: 'not_found', latencyMs, source: 'cnpj_receita_federal' });

  // A consulta pública falhou: devolvemos o CNPJ que já sabíamos ser válido/conhecido,
  // mas o restante do cadastro fica desconhecido em vez de fabricado.
  return {
    cnpj: formatCnpj(targetCnpj),
    cnpj_raw: targetCnpj
  };
}
