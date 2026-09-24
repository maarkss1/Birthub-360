import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET_KEY;

const config: S3ClientConfig = {
  region: process.env.S3_REGION ?? 'us-east-1',
  endpoint,
  forcePathStyle: Boolean(endpoint),
};

if (accessKeyId && secretAccessKey) {
  config.credentials = { accessKeyId, secretAccessKey };
}

export const objectStorage = new S3Client(config);
export const recordingsBucket = process.env.S3_RECORDINGS_BUCKET ?? 'birth-voice-recordings';

export async function ensureRecordingsBucket(): Promise<void> {
  try {
    await objectStorage.send(new HeadBucketCommand({ Bucket: recordingsBucket }));
  } catch (error: unknown) {
    const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (statusCode && statusCode !== 404) throw error;
    await objectStorage.send(new CreateBucketCommand({ Bucket: recordingsBucket }));
  }
}

/** Sensible default for pre-signed URLs: long enough for a normal upload/download, short enough
 * that a leaked link (log, browser history, referrer) stops working soon after. */
export const DEFAULT_PRESIGNED_URL_TTL_SECONDS = 15 * 60; // 15 minutes
/** Hard ceiling — no caller may request a longer-lived pre-signed URL than this, even explicitly.
 * A "permanent" public URL to sensitive content (call recordings, uploaded documents) is exactly
 * the failure mode this module exists to prevent. */
export const MAX_PRESIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

/** Only safe characters for a tenant id or an object key path segment: no `..`, no leading `/`,
 * no null bytes — nothing that could let one tenant's path segment escape into another tenant's
 * prefix. */
const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/;

export class InvalidObjectKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidObjectKeyError';
  }
}

/**
 * Builds an object key scoped to a single tenant, e.g. `tenants/<tenantId>/recordings/<callId>.wav`.
 *
 * Every object this service ever writes or reads MUST go through this function (or have its key
 * checked with `assertKeyBelongsToTenant`) so that one tenant can never guess or construct the key
 * of another tenant's object.
 */
export function buildTenantObjectKey(tenantId: string, ...segments: string[]): string {
  if (!SAFE_SEGMENT.test(tenantId)) {
    throw new InvalidObjectKeyError(`tenantId inválido para chave de objeto: "${tenantId}"`);
  }
  if (segments.length === 0) {
    throw new InvalidObjectKeyError('É necessário ao menos um segmento de caminho para a chave de objeto.');
  }

  const cleanSegments = segments.map((segment) => {
    // Allow a single trailing file extension (dot) on the last-level segment (e.g. "call-123.wav")
    // while still rejecting traversal/hidden-path tricks like "..", "/", or empty segments.
    const normalized = segment.trim();
    if (!normalized || normalized.includes('..') || normalized.includes('/') || normalized.includes('\\')) {
      throw new InvalidObjectKeyError(`Segmento de chave de objeto inválido: "${segment}"`);
    }
    return normalized;
  });

  return ['tenants', tenantId, ...cleanSegments].join('/');
}

/**
 * Defense-in-depth check: even when a key was supposedly built by `buildTenantObjectKey`
 * elsewhere, verify at the point of use that the key actually belongs to the requesting tenant
 * before generating any pre-signed URL for it. Prevents cross-tenant access from a caller that
 * passes a raw/stored key instead of re-deriving it.
 */
export function assertKeyBelongsToTenant(tenantId: string, key: string): void {
  const expectedPrefix = `tenants/${tenantId}/`;
  if (!key.startsWith(expectedPrefix)) {
    throw new InvalidObjectKeyError(
      `Chave de objeto "${key}" não pertence ao tenant "${tenantId}" — acesso negado.`,
    );
  }
}

function clampTtl(expiresInSeconds: number): number {
  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    return DEFAULT_PRESIGNED_URL_TTL_SECONDS;
  }
  return Math.min(expiresInSeconds, MAX_PRESIGNED_URL_TTL_SECONDS);
}

/**
 * Generates a time-limited pre-signed URL the client can use to PUT the object's bytes directly to
 * the bucket. The upload itself must already have passed `antivirus.ts#scanBufferForViruses`
 * before this is issued, or before the resulting object is treated as usable — this function only
 * governs storage access, not the antivirus gate.
 */
export async function getPresignedUploadUrl(
  tenantId: string,
  key: string,
  contentType: string,
  expiresInSeconds: number = DEFAULT_PRESIGNED_URL_TTL_SECONDS,
): Promise<string> {
  assertKeyBelongsToTenant(tenantId, key);
  const command = new PutObjectCommand({ Bucket: recordingsBucket, Key: key, ContentType: contentType });
  return getSignedUrl(objectStorage, command, { expiresIn: clampTtl(expiresInSeconds) });
}

/**
 * Generates a time-limited pre-signed URL to download/read an object. Never returns a public,
 * non-expiring URL — sensitive content (call recordings, uploaded documents) must never be
 * reachable without a fresh, tenant-checked, expiring link.
 */
export async function getPresignedDownloadUrl(
  tenantId: string,
  key: string,
  expiresInSeconds: number = DEFAULT_PRESIGNED_URL_TTL_SECONDS,
): Promise<string> {
  assertKeyBelongsToTenant(tenantId, key);
  const command = new GetObjectCommand({ Bucket: recordingsBucket, Key: key });
  return getSignedUrl(objectStorage, command, { expiresIn: clampTtl(expiresInSeconds) });
}
