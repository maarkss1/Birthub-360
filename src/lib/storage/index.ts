import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../logger.js';

// Client S3-compatível genérico: funciona sem nenhuma mudança de código contra MinIO (dev local,
// docker-compose), Cloudflare R2 ou Supabase Storage (S3-compatible, ver
// https://supabase.com/docs/guides/storage/s3/authentication) — só troca o endpoint/credenciais via
// env. STORAGE_* é o nome canônico; MINIO_* continua aceito como alias (compat com quem já tinha
// essas vars configuradas) e é usado só se STORAGE_* não estiver definido.
function getBucketName(): string {
  return process.env.STORAGE_BUCKET || 'prospector-assets';
}

function getS3Client(): S3Client {
  const endpoint =
    process.env.STORAGE_ENDPOINT || process.env.MINIO_ENDPOINT || 'http://localhost:9000';
  const accessKey = process.env.STORAGE_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.STORAGE_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY;
  const region = process.env.STORAGE_REGION || 'us-east-1';

  if (!accessKey || !secretKey) {
    throw new Error(
      'STORAGE_ACCESS_KEY_ID e STORAGE_SECRET_ACCESS_KEY precisam ser configurados para usar o storage de objetos.',
    );
  }
  return new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true, // Necessário para MinIO/R2/Supabase Storage (path-style, não virtual-hosted-style).
  });
}

export const getUploadUrl = async (key: string, contentType: string) => {
  try {
    const command = new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      ContentType: contentType,
    });
    const signedUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
    return { signedUrl, key };
  } catch (err: any) {
    logger.error({ err, key }, 'Error generating upload URL');
    throw new Error('Failed to generate upload URL', { cause: err });
  }
};

export const getDownloadUrl = async (key: string) => {
  try {
    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });
    const signedUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
    return { signedUrl, key };
  } catch (err: any) {
    logger.error({ err, key }, 'Error generating download URL');
    throw new Error('Failed to generate download URL', { cause: err });
  }
};

export const deleteObject = async (key: string): Promise<boolean> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });
    await getS3Client().send(command);
    return true;
  } catch (err: any) {
    logger.warn(
      { err, key },
      'Falha ao excluir objeto do storage (pode não existir ou storage não configurado)',
    );
    return false;
  }
};
