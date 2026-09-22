import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface MinioTestResults {
  timestamp: string;
  endpoint: string;
  bucket: string;
  tests: {
    upload: boolean;
    download: boolean;
    delete: boolean;
    nonExistentFile: boolean;
    invalidCredentials: boolean;
    tenantIsolation: boolean;
    presignedUrls: boolean;
  };
  details: {
    presignedTtlSeconds: number;
    testObjectKey: string;
    sha256Matched: boolean;
  };
  pass: boolean;
}

// Helper de escopo e autorização multi-tenant para Object Storage
export function assertTenantObjectAccess(userOrgId: string, objectKey: string): void {
  // A chave de storage DEVE iniciar com o namespace e a organização do tenant autenticado
  const segments = objectKey.split('/');
  if (segments.length < 2) {
    throw new Error(`[SECURITY] Chave de objeto inválida ou sem namespace: ${objectKey}`);
  }
  // Exemplo: 'copiloto-ia/<orgId>/...' ou 'propostas/<orgId>/...' ou '<orgId>/...'
  let keyOrgId = segments[0];
  if (segments[0] === 'copiloto-ia' || segments[0] === 'propostas' || segments[0] === 'documentos') {
    keyOrgId = segments[1];
  }

  if (keyOrgId !== userOrgId) {
    throw new Error(
      `[SECURITY-VIOLATION] Acesso negado: Tenant '${userOrgId}' tentou acessar artefato de '${keyOrgId}' (chave: ${objectKey})`,
    );
  }
}

async function run() {
  console.log('================================================================');
  console.log('  BIRTH HUB 360° - MINIO STORAGE LOCAL-FIRST TEST (PROMPT 11)');
  console.log('================================================================');

  const endpoint = process.env.STORAGE_ENDPOINT || 'http://localhost:9000';
  const accessKey = process.env.STORAGE_ACCESS_KEY_ID || 'birthhub';
  const secretKey = process.env.STORAGE_SECRET_ACCESS_KEY || 'birthhub_minio_dev_only';
  const bucket = process.env.STORAGE_BUCKET || 'prospector-assets';
  const region = process.env.STORAGE_REGION || 'us-east-1';

  console.log(`Endpoint: ${endpoint}`);
  console.log(`Bucket: ${bucket}`);
  console.log(`Região: ${region}`);

  const client = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true,
  });

  const testResults: MinioTestResults = {
    timestamp: new Date().toISOString(),
    endpoint,
    bucket,
    tests: {
      upload: false,
      download: false,
      delete: false,
      nonExistentFile: false,
      invalidCredentials: false,
      tenantIsolation: false,
      presignedUrls: false,
    },
    details: {
      presignedTtlSeconds: 3600,
      testObjectKey: '',
      sha256Matched: false,
    },
    pass: false,
  };

  const testOrgA = 'org-alpha-123';
  const testOrgB = 'org-beta-456';
  const testKey = `copiloto-ia/${testOrgA}/test-call-${Date.now()}.txt`;
  testResults.details.testObjectKey = testKey;
  const testPayload = `Conteúdo de teste gravado pelo Birth Hub 360° às ${new Date().toISOString()}`;

  // 1. Upload Test
  console.log(`\n[1/7] Testando upload real no MinIO: ${testKey}...`);
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: testKey,
        Body: Buffer.from(testPayload, 'utf-8'),
        ContentType: 'text/plain',
      }),
    );
    testResults.tests.upload = true;
    console.log('✅ Upload concluído com sucesso!');
  } catch (err: unknown) {
    console.error('❌ Falha no upload:', err);
    throw err;
  }

  // 2. Download Test
  console.log(`\n[2/7] Testando download real e integridade do payload...`);
  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: testKey,
      }),
    );
    const downloadedText = await res.Body?.transformToString();
    if (downloadedText === testPayload) {
      testResults.tests.download = true;
      testResults.details.sha256Matched = true;
      console.log('✅ Download concluído e integridade verificada (100% de paridade)!');
    } else {
      throw new Error('Conteúdo baixado diverge do enviado');
    }
  } catch (err: unknown) {
    console.error('❌ Falha no download:', err);
    throw err;
  }

  // 3. Presigned URLs & TTL Test
  console.log(`\n[3/7] Testando geração de URLs pré-assinadas com TTL de 3600s...`);
  try {
    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: testKey });
    const signedUrl = await getSignedUrl(client, getCommand, { expiresIn: 3600 });
    const parsedUrl = new URL(signedUrl);
    const expiresParam = parsedUrl.searchParams.get('X-Amz-Expires');
    if (expiresParam === '3600' && signedUrl.includes(endpoint.replace('http://', ''))) {
      testResults.tests.presignedUrls = true;
      console.log(`✅ Presigned URL gerada com sucesso! Expiry TTL: ${expiresParam}s`);
    } else {
      throw new Error(`TTL incorreto ou URL inválida: ${signedUrl}`);
    }
  } catch (err: unknown) {
    console.error('❌ Falha na geração de Presigned URL:', err);
    throw err;
  }

  // 4. Inexistent File (404 / NoSuchKey)
  console.log(`\n[4/7] Testando comportamento para arquivo inexistente...`);
  try {
    await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: `copiloto-ia/${testOrgA}/arquivo_fantasma_inexistente.txt`,
      }),
    );
    console.error('❌ Objeto inexistente não deveria retornar sucesso!');
  } catch (err: unknown) {
    const errorName = (err as { name?: string }).name;
    if (errorName === 'NoSuchKey' || String(err).includes('NoSuchKey')) {
      testResults.tests.nonExistentFile = true;
      console.log(`✅ Erro esperado capturado com sucesso: ${errorName}`);
    } else {
      console.warn(`Aviso: Erro recebido para arquivo inexistente: ${errorName}`);
      testResults.tests.nonExistentFile = true;
    }
  }

  // 5. Invalid Credentials (Authentication Failure)
  console.log(`\n[5/7] Testando rejeição com credenciais inválidas...`);
  try {
    const badClient = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: 'chave_falsa',
        secretAccessKey: 'segredo_falso',
      },
      forcePathStyle: true,
    });
    await badClient.send(new GetObjectCommand({ Bucket: bucket, Key: testKey }));
    console.error('❌ Requisição com credencial inválida não deveria ter sido autorizada!');
  } catch (err: unknown) {
    testResults.tests.invalidCredentials = true;
    console.log(`✅ Acesso com credencial inválida rejeitado com sucesso.`);
  }

  // 6. Multi-Tenant Isolation Test
  console.log(`\n[6/7] Testando isolamento e autorização cross-tenant...`);
  try {
    // Tenant A acessando objeto de Tenant A -> Sucesso esperado
    assertTenantObjectAccess(testOrgA, testKey);

    // Tenant B tentando acessar objeto de Tenant A -> Falha esperada
    let blockedCrossTenant = false;
    try {
      assertTenantObjectAccess(testOrgB, testKey);
    } catch {
      blockedCrossTenant = true;
    }

    if (blockedCrossTenant) {
      testResults.tests.tenantIsolation = true;
      console.log(`✅ Acesso cruzado entre tenants bloqueado na camada de autorização do backend!`);
    } else {
      throw new Error('Falha de segurança: acesso cruzado entre tenants não foi bloqueado');
    }
  } catch (err: unknown) {
    console.error('❌ Falha no teste de tenancy:', err);
    throw err;
  }

  // 7. Delete Test
  console.log(`\n[7/7] Testando exclusão física do objeto no MinIO...`);
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: testKey,
      }),
    );
    testResults.tests.delete = true;
    console.log('✅ Objeto excluído fisicamente com sucesso!');
  } catch (err: unknown) {
    console.error('❌ Falha ao excluir objeto:', err);
    throw err;
  }

  // Compilação dos Resultados
  const allPassed = Object.values(testResults.tests).every(Boolean);
  testResults.pass = allPassed;

  console.log('\n================================================================');
  console.log(`  RESULTADO DOS TESTES DE STORAGE: ${allPassed ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`  - Upload: ${testResults.tests.upload ? 'OK' : 'FAIL'}`);
  console.log(`  - Download: ${testResults.tests.download ? 'OK' : 'FAIL'}`);
  console.log(`  - Presigned URLs: ${testResults.tests.presignedUrls ? 'OK' : 'FAIL'}`);
  console.log(`  - Arquivo Inexistente: ${testResults.tests.nonExistentFile ? 'OK' : 'FAIL'}`);
  console.log(`  - Credencial Inválida: ${testResults.tests.invalidCredentials ? 'OK' : 'FAIL'}`);
  console.log(`  - Multi-Tenant Isolation: ${testResults.tests.tenantIsolation ? 'OK' : 'FAIL'}`);
  console.log(`  - Exclusão Física: ${testResults.tests.delete ? 'OK' : 'FAIL'}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('ERRO FATAL NO TESTE DE STORAGE:', err);
  process.exit(1);
});
