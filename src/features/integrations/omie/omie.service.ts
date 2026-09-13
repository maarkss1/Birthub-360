import { fetchWithTimeout } from '../../../lib/http.js';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../shared/middlewares/errorHandler.js';

// app.omie.com.br é destino FIXO do próprio código (não uma URL de tenant) — usa fetchWithTimeout
// com allowlist (src/lib/http.ts), mesma observação de stripe.service.ts.
const OMIE_API_BASE = 'https://app.omie.com.br';
const OMIE_ALLOWED_HOSTS = ['app.omie.com.br'];
const OMIE_TIMEOUT_MS = 15_000;

export interface OmieConnectionInput {
  label?: string;
  appKey: string;
  appSecret: string;
}

export interface OmieConnectionSummary {
  id: string;
  label: string;
  appKeyLast4: string;
  createdAt: Date;
}

function toSummary(conn: {
  id: string;
  label: string;
  appKey: string;
  createdAt: Date;
}): OmieConnectionSummary {
  return {
    id: conn.id,
    label: conn.label,
    appKeyLast4: conn.appKey.slice(-4),
    createdAt: conn.createdAt,
  };
}

interface OmieResponse {
  faultstring?: string;
  faultcode?: string;
  [key: string]: unknown;
}

/**
 * Chamada JSON-RPC genérica da API do Omie (documentado como "call" + app_key/app_secret + param
 * — mesmo formato usado por toda a API do Omie, não específico de um endpoint). Erros de
 * credencial/negócio vêm com HTTP 200 e um corpo `{faultstring, faultcode}` — nunca um HTTP de
 * erro — por isso o parsing de erro abaixo lê o corpo mesmo quando `res.ok` é true.
 */
async function callOmieRpc(
  appKey: string,
  appSecret: string,
  endpoint: string,
  call: string,
  param: Record<string, unknown>,
): Promise<OmieResponse> {
  const res = await fetchWithTimeout(
    `${OMIE_API_BASE}${endpoint}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ call, app_key: appKey, app_secret: appSecret, param: [param] }),
    },
    OMIE_TIMEOUT_MS,
    OMIE_ALLOWED_HOSTS,
  );

  const json = (await res.json().catch(() => ({}))) as OmieResponse;
  if (!res.ok) {
    throw new AppError(`Omie respondeu HTTP ${res.status} ao chamar ${call}.`, 502);
  }
  return json;
}

/** Lista as conexões Omie desta organização (nunca expõe appKey/appSecret em texto puro). */
export async function listOmieConnections(
  organizationId: string,
): Promise<OmieConnectionSummary[]> {
  const connections = await prisma.omieConnection.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
  return connections.map(toSummary);
}

/**
 * Cadastra uma conexão Omie — valida appKey/appSecret de verdade contra a API do Omie
 * (ListarClientes com 1 registro, chamada de leitura barata) ANTES de persistir. Mesma honestidade
 * de connectStripe/connect3CX: nunca aceita e grava uma credencial sem provar que funciona.
 */
export async function connectOmie(
  organizationId: string,
  input: OmieConnectionInput,
): Promise<OmieConnectionSummary> {
  const appKey = input.appKey?.trim();
  const appSecret = input.appSecret?.trim();
  if (!appKey || !appSecret) {
    throw new AppError('Informe a Chave de Integração (App Key) e o App Secret do Omie.', 400);
  }

  const check = await callOmieRpc(appKey, appSecret, '/api/v1/geral/clientes/', 'ListarClientes', {
    pagina: 1,
    registros_por_pagina: 1,
    apenas_importado_api: 'N',
  });
  if (check.faultstring) {
    throw new AppError(`Credenciais do Omie inválidas: ${check.faultstring}`, 401);
  }

  const connection = await prisma.omieConnection.create({
    data: {
      organizationId,
      label: input.label?.trim() || 'Omie',
      appKey,
      appSecret,
    },
  });

  logger.info(
    { organizationId, connectionId: connection.id },
    '[omie] Conexão Omie cadastrada com sucesso',
  );

  return toSummary(connection);
}

/** Remove uma conexão Omie (deleteMany já escopado por organizationId — nunca apaga de outro tenant). */
export async function disconnectOmie(organizationId: string, connectionId: string): Promise<void> {
  await prisma.omieConnection.deleteMany({ where: { id: connectionId, organizationId } });
  logger.info({ organizationId, connectionId }, '[omie] Conexão Omie removida');
}

/** Testa a comunicação com a API do Omie — resultado honesto (nunca sucesso fabricado), mesmo
 * espírito de test3CXConnection/testStripeConnection. */
export async function testOmieConnection(
  organizationId: string,
  connectionId: string,
): Promise<{ success: boolean; message: string }> {
  const connection = await prisma.omieConnection.findFirst({
    where: { id: connectionId, organizationId },
  });
  if (!connection) throw new AppError('Conexão Omie não encontrada.', 404);

  try {
    const check = await callOmieRpc(
      connection.appKey,
      connection.appSecret,
      '/api/v1/geral/clientes/',
      'ListarClientes',
      { pagina: 1, registros_por_pagina: 1, apenas_importado_api: 'N' },
    );
    const ok = !check.faultstring;
    logger.info({ organizationId, connectionId, ok }, '[omie] Teste de comunicação realizado');
    return {
      success: ok,
      message: ok
        ? 'Credenciais do Omie válidas e API respondendo normalmente.'
        : `Omie respondeu com erro: ${check.faultstring}`,
    };
  } catch (err) {
    logger.warn({ err, organizationId, connectionId }, '[omie] Falha ao testar comunicação');
    return { success: false, message: 'Não foi possível comunicar com a API do Omie.' };
  }
}

export interface OmieCustomerInput {
  name: string;
  cnpjOrCpf: string;
  email?: string;
  /** Telefone completo com DDD (ex.: "11987654321") — Omie exige DDD e número separados; quando o
   * valor tem 10-11 dígitos os 2 primeiros são tratados como DDD, senão é enviado sem DDD (gap
   * real: o formato exato esperado pelo Omie para números fora do padrão BR não foi validado
   * contra uma conta real nesta implementação — mesma ressalva já registrada em
   * threecx.service.ts/make3CXCall para o contrato de API não verificado ao vivo). */
  phone?: string;
}

export interface OmieCustomerResult {
  id: string;
  externalId: string;
  name: string;
  cnpjOrCpf: string;
  createdAt: string;
}

/** Cria/atualiza um cliente real no Omie via IncluirCliente. */
export async function upsertOmieCustomer(
  organizationId: string,
  connectionId: string,
  input: OmieCustomerInput,
): Promise<OmieCustomerResult> {
  const connection = await prisma.omieConnection.findFirst({
    where: { id: connectionId, organizationId },
  });
  if (!connection) throw new AppError('Conexão Omie não encontrada.', 404);

  if (!input.name?.trim() || !input.cnpjOrCpf?.trim()) {
    throw new AppError('Nome e CNPJ/CPF são obrigatórios para cadastrar um cliente no Omie.', 400);
  }

  const digits = input.phone?.replace(/\D/g, '') ?? '';
  const hasDdd = digits.length === 10 || digits.length === 11;

  const param: Record<string, unknown> = {
    razao_social: input.name,
    nome_fantasia: input.name,
    cnpj_cpf: input.cnpjOrCpf.replace(/\D/g, ''),
  };
  if (input.email) param.email = input.email;
  if (digits) {
    param.telefone1_ddd = hasDdd ? digits.slice(0, 2) : '';
    param.telefone1_numero = hasDdd ? digits.slice(2) : digits;
  }

  const result = await callOmieRpc(
    connection.appKey,
    connection.appSecret,
    '/api/v1/geral/clientes/',
    'IncluirCliente',
    param,
  );

  if (result.faultstring) {
    logger.warn(
      { organizationId, connectionId, faultstring: result.faultstring },
      '[omie] Falha ao cadastrar cliente',
    );
    throw new AppError(`Falha ao cadastrar cliente no Omie: ${result.faultstring}`, 502);
  }

  const customerId = result.codigo_cliente_omie;
  logger.info(
    { organizationId, connectionId, customerId },
    '[omie] Cliente cadastrado com sucesso',
  );

  return {
    id: String(customerId),
    externalId: String(customerId),
    name: input.name,
    cnpjOrCpf: input.cnpjOrCpf,
    createdAt: new Date().toISOString(),
  };
}
