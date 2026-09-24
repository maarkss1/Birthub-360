import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSignedUrl = vi.fn();

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

// The S3Client constructor tries to resolve region/credential providers eagerly in some SDK
// versions — stub it out entirely since these tests only care about our own key-building and
// TTL-clamping logic, not actual AWS wiring.
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function S3Client() {
    return {};
  }),
  HeadBucketCommand: vi.fn(),
  CreateBucketCommand: vi.fn(),
  PutObjectCommand: vi.fn().mockImplementation(function PutObjectCommand(input: unknown) {
    return { input };
  }),
  GetObjectCommand: vi.fn().mockImplementation(function GetObjectCommand(input: unknown) {
    return { input };
  }),
}));

import {
  DEFAULT_PRESIGNED_URL_TTL_SECONDS,
  MAX_PRESIGNED_URL_TTL_SECONDS,
  InvalidObjectKeyError,
  assertKeyBelongsToTenant,
  buildTenantObjectKey,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
} from './objectStorage.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSignedUrl.mockResolvedValue('https://s3.example.com/signed-url');
});

describe('buildTenantObjectKey', () => {
  it('builds a key scoped under tenants/<tenantId>/...', () => {
    const key = buildTenantObjectKey('tenant-abc', 'recordings', 'call-123.wav');
    expect(key).toBe('tenants/tenant-abc/recordings/call-123.wav');
  });

  it('rejects a tenantId with path-unsafe characters', () => {
    expect(() => buildTenantObjectKey('../other-tenant', 'file.txt')).toThrow(InvalidObjectKeyError);
  });

  it('rejects a path segment containing ".." (traversal attempt)', () => {
    expect(() => buildTenantObjectKey('tenant-abc', '..', 'secrets.txt')).toThrow(InvalidObjectKeyError);
  });

  it('rejects a path segment containing a slash', () => {
    expect(() => buildTenantObjectKey('tenant-abc', 'a/b')).toThrow(InvalidObjectKeyError);
  });

  it('requires at least one segment', () => {
    expect(() => buildTenantObjectKey('tenant-abc')).toThrow(InvalidObjectKeyError);
  });
});

describe('assertKeyBelongsToTenant — cross-tenant isolation', () => {
  it('allows a key that is actually under the tenant prefix', () => {
    expect(() => assertKeyBelongsToTenant('tenant-a', 'tenants/tenant-a/doc.pdf')).not.toThrow();
  });

  it('rejects a key that belongs to a different tenant', () => {
    expect(() => assertKeyBelongsToTenant('tenant-a', 'tenants/tenant-b/doc.pdf')).toThrow(InvalidObjectKeyError);
  });

  it('rejects a key with no tenant prefix at all', () => {
    expect(() => assertKeyBelongsToTenant('tenant-a', 'doc.pdf')).toThrow(InvalidObjectKeyError);
  });
});

describe('getPresignedUploadUrl / getPresignedDownloadUrl', () => {
  it('refuses to sign a URL for a key belonging to a different tenant', async () => {
    await expect(
      getPresignedUploadUrl('tenant-a', 'tenants/tenant-b/doc.pdf', 'application/pdf'),
    ).rejects.toThrow(InvalidObjectKeyError);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it('signs an upload URL with the default TTL when none is given', async () => {
    const key = buildTenantObjectKey('tenant-a', 'doc.pdf');
    await getPresignedUploadUrl('tenant-a', key, 'application/pdf');
    const [, , options] = mockGetSignedUrl.mock.calls[0];
    expect(options).toEqual({ expiresIn: DEFAULT_PRESIGNED_URL_TTL_SECONDS });
  });

  it('clamps an excessively long requested TTL to the hard ceiling', async () => {
    const key = buildTenantObjectKey('tenant-a', 'doc.pdf');
    await getPresignedDownloadUrl('tenant-a', key, 60 * 60 * 24 * 7); // one week — must be clamped
    const [, , options] = mockGetSignedUrl.mock.calls[0];
    expect(options).toEqual({ expiresIn: MAX_PRESIGNED_URL_TTL_SECONDS });
  });

  it('never returns a non-expiring URL — always calls getSignedUrl with a finite expiresIn', async () => {
    const key = buildTenantObjectKey('tenant-a', 'doc.pdf');
    await getPresignedDownloadUrl('tenant-a', key, 0);
    const [, , options] = mockGetSignedUrl.mock.calls[0];
    expect(options.expiresIn).toBeGreaterThan(0);
    expect(Number.isFinite(options.expiresIn)).toBe(true);
  });
});
