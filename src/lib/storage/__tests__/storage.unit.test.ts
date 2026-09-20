import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
const getSignedUrlMock = vi.fn();

class MockPutObjectCommand {
  input: unknown;
  constructor(input: unknown) {
    this.input = input;
  }
}

class MockGetObjectCommand {
  input: unknown;
  constructor(input: unknown) {
    this.input = input;
  }
}

class MockDeleteObjectCommand {
  input: unknown;
  constructor(input: unknown) {
    this.input = input;
  }
}

class MockS3Client {
  send = sendMock;
}

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: MockS3Client,
  PutObjectCommand: MockPutObjectCommand,
  GetObjectCommand: MockGetObjectCommand,
  DeleteObjectCommand: MockDeleteObjectCommand,
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => getSignedUrlMock(...args),
}));

describe('Storage Module (src/lib/storage/index.ts)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STORAGE_ENDPOINT = 'http://localhost:9000';
    process.env.STORAGE_ACCESS_KEY_ID = 'test_access_key';
    process.env.STORAGE_SECRET_ACCESS_KEY = 'test_secret_key';
    process.env.STORAGE_BUCKET = 'prospector-assets';
    process.env.STORAGE_REGION = 'us-east-1';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('falha explicitamente quando credenciais S3 não estão configuradas (fail-closed)', async () => {
    delete process.env.STORAGE_ACCESS_KEY_ID;
    delete process.env.MINIO_ACCESS_KEY;
    delete process.env.STORAGE_SECRET_ACCESS_KEY;
    delete process.env.MINIO_SECRET_KEY;

    const { getUploadUrl } = await import('../index.js');
    await expect(getUploadUrl('tenant-1/doc.pdf', 'application/pdf')).rejects.toThrow(
      /Failed to generate upload URL/,
    );
  });

  it('gera URL assinada de upload com TTL de 3600s', async () => {
    getSignedUrlMock.mockResolvedValue('http://localhost:9000/prospector-assets/test.pdf?X-Amz-Signature=xyz');
    const { getUploadUrl } = await import('../index.js');

    const result = await getUploadUrl('tenant-1/test.pdf', 'application/pdf');

    expect(result.key).toBe('tenant-1/test.pdf');
    expect(result.signedUrl).toContain('http://localhost:9000/prospector-assets/test.pdf');
    expect(getSignedUrlMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: {
          Bucket: 'prospector-assets',
          Key: 'tenant-1/test.pdf',
          ContentType: 'application/pdf',
        },
      }),
      { expiresIn: 3600 },
    );
  });

  it('gera URL assinada de download com TTL de 3600s', async () => {
    getSignedUrlMock.mockResolvedValue('http://localhost:9000/prospector-assets/test.pdf?X-Amz-Signature=xyz');
    const { getDownloadUrl } = await import('../index.js');

    const result = await getDownloadUrl('tenant-1/test.pdf');

    expect(result.key).toBe('tenant-1/test.pdf');
    expect(result.signedUrl).toContain('http://localhost:9000/prospector-assets/test.pdf');
    expect(getSignedUrlMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: {
          Bucket: 'prospector-assets',
          Key: 'tenant-1/test.pdf',
        },
      }),
      { expiresIn: 3600 },
    );
  });

  it('exclui objeto via DeleteObjectCommand com sucesso', async () => {
    sendMock.mockResolvedValue({});
    const { deleteObject } = await import('../index.js');

    const success = await deleteObject('tenant-1/test.pdf');

    expect(success).toBe(true);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Bucket: 'prospector-assets',
          Key: 'tenant-1/test.pdf',
        },
      }),
    );
  });

  it('trata falhas de exclusão graciosamente retornando false sem lançar exceção', async () => {
    sendMock.mockRejectedValue(new Error('S3 network timeout'));
    const { deleteObject } = await import('../index.js');

    const success = await deleteObject('tenant-1/test.pdf');

    expect(success).toBe(false);
  });
});
