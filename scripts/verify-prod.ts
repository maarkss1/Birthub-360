import { prisma } from '../src/lib/prisma.js';
import { connection } from '../src/lib/queue/redis.js';

interface AuditStatus {
  name: string;
  status: 'PASS' | 'FAIL' | 'INFO';
  details: string;
}

function redactValue(val?: string): string {
  if (!val) return 'AUSENTE';
  if (val.includes('localhost') || val.includes('127.0.0.1')) {
    return `[LOCALHOST]: ${val}`;
  }
  try {
    const url = new URL(val);
    return `[HTTPS/HOST]: ${url.protocol}//${url.host}`;
  } catch {
    return '[CONFIGURADO]';
  }
}

async function verifyProd() {
  console.log('========================================================');
  console.log('🚀 Certificação de Domínio e Autenticação de Produção');
  console.log('========================================================');

  const audit: AuditStatus[] = [];

  // 1. Conexão com Banco de Dados
  try {
    await prisma.$queryRaw`SELECT 1`;
    audit.push({ name: 'Banco de Dados (PostgreSQL)', status: 'PASS', details: 'Conectado com sucesso (SELECT 1)' });
  } catch (err) {
    audit.push({ name: 'Banco de Dados (PostgreSQL)', status: 'FAIL', details: `Falha de conexão: ${err instanceof Error ? err.message : String(err)}` });
  }

  // 2. Conexão com Redis (opcional)
  if (connection) {
    try {
      await connection.ping();
      audit.push({ name: 'Fila / Redis', status: 'PASS', details: 'Conectado e respondendo ao PING' });
    } catch {
      audit.push({ name: 'Fila / Redis', status: 'INFO', details: 'Redis configurado mas indisponível/desacoplado' });
    }
  } else {
    audit.push({ name: 'Fila / Redis', status: 'INFO', details: 'Modo Standalone (sem Redis)' });
  }

  // 3. Validação de Domínio & URLs Públicas
  const prodDomain = process.env.PRODUCTION_DOMAIN || process.env.DOMAIN;
  const publicBaseUrl = process.env.PUBLIC_BASE_URL;
  const betterAuthUrl = process.env.BETTER_AUTH_URL;
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  const cookieDomain = process.env.COOKIE_DOMAIN;
  const secureCookies = process.env.SECURE_COOKIES;
  const trustProxy = process.env.TRUST_PROXY;

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    audit.push({ name: 'NODE_ENV', status: 'PASS', details: 'production' });
  } else {
    audit.push({ name: 'NODE_ENV', status: 'INFO', details: process.env.NODE_ENV || 'não definido' });
  }

  // 4. Checagem de Localhost Residual Crítico em Produção
  const criticalLocalhostLeaks: string[] = [];
  if (isProduction) {
    if (publicBaseUrl?.includes('localhost') || publicBaseUrl?.includes('127.0.0.1')) {
      criticalLocalhostLeaks.push('PUBLIC_BASE_URL');
    }
    if (betterAuthUrl?.includes('localhost') || betterAuthUrl?.includes('127.0.0.1')) {
      criticalLocalhostLeaks.push('BETTER_AUTH_URL');
    }
    if (allowedOrigins) {
      const origins = allowedOrigins.split(',').map((s) => s.trim());
      if (origins.some((o) => o.includes('localhost') || o.includes('127.0.0.1'))) {
        criticalLocalhostLeaks.push('ALLOWED_ORIGINS');
      }
    }
  }

  if (criticalLocalhostLeaks.length > 0) {
    audit.push({
      name: 'Localhost Residual em Produção',
      status: 'FAIL',
      details: `Variáveis contendo localhost/127.0.0.1: ${criticalLocalhostLeaks.join(', ')}`,
    });
  } else {
    audit.push({
      name: 'Localhost Residual em Produção',
      status: 'PASS',
      details: 'Nenhuma variável crítica contém localhost em produção',
    });
  }

  // 5. Better Auth URL
  if (betterAuthUrl && betterAuthUrl.startsWith('https://')) {
    audit.push({ name: 'Better Auth URL', status: 'PASS', details: redactValue(betterAuthUrl) });
  } else if (betterAuthUrl) {
    audit.push({ name: 'Better Auth URL', status: isProduction ? 'FAIL' : 'INFO', details: `${redactValue(betterAuthUrl)} (Esperado HTTPS em produção)` });
  } else {
    audit.push({ name: 'Better Auth URL', status: 'FAIL', details: 'Variável BETTER_AUTH_URL não configurada' });
  }

  // 6. Secure Cookies & Cookie Domain
  if (secureCookies === 'true' || process.env.BETTER_AUTH_URL?.startsWith('https://')) {
    audit.push({ name: 'Secure Cookies', status: 'PASS', details: 'Ativado (secure=true)' });
  } else {
    audit.push({ name: 'Secure Cookies', status: isProduction ? 'FAIL' : 'INFO', details: 'Desativado (secure=false)' });
  }

  if (cookieDomain) {
    audit.push({ name: 'Cookie Domain', status: 'PASS', details: `Configurado: ${cookieDomain}` });
  } else {
    audit.push({ name: 'Cookie Domain', status: 'INFO', details: 'Não definido (usa o host da própria requisição)' });
  }

  // 7. Trust Proxy
  if (trustProxy === 'true') {
    audit.push({ name: 'Trust Proxy', status: 'PASS', details: 'Ativado (trust proxy = 1)' });
  } else {
    audit.push({ name: 'Trust Proxy', status: isProduction ? 'FAIL' : 'INFO', details: 'Desativado' });
  }

  // Exibição do relatório (sem vazar segredos)
  console.log('\n📊 RESULTADO DA AUDITORIA (SEM EXPOSIÇÃO DE SEGREDAOS):');
  console.log('--------------------------------------------------------');
  let hasFailures = false;
  for (const item of audit) {
    const icon = item.status === 'PASS' ? '✅' : item.status === 'FAIL' ? '❌' : 'ℹ️';
    console.log(`${icon} [${item.status}] ${item.name}: ${item.details}`);
    if (item.status === 'FAIL') {
      hasFailures = true;
    }
  }
  console.log('--------------------------------------------------------');

  if (hasFailures) {
    console.error('❌ A CERTIFICAÇÃO DE PRODUÇÃO FALHOU. Corrija os itens marcados com [FAIL].');
    process.exit(1);
  } else {
    console.log('🎉 PRODUCTION DOMAIN/AUTH CONFIGURATION = PASS');
    console.log('ℹ️  Nota: A certificação operacional final depende de validação real na OCI de:');
    console.log('    - DNS público;');
    console.log('    - HTTPS;');
    console.log('    - Login e logout;');
    console.log('    - Persistência de sessão;');
    console.log('    - Cookie Secure;');
    console.log('    - CORS no browser.');
    process.exit(0);
  }
}

verifyProd().catch((err) => {
  console.error('Erro fatal na verificação:', err);
  process.exit(1);
});
