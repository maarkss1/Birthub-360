import { describe, expect, it, vi, beforeEach } from 'vitest';
import { blobToBase64, saveAndDownloadFile } from '../../../../src/lib/mobile/nativeFileDownloader';
import { Capacitor } from '@capacitor/core';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

describe('nativeFileDownloader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blobToBase64 converte um Blob em string base64 válida', async () => {
    const blob = new Blob(['teste de conteudo'], { type: 'text/plain' });
    const base64 = await blobToBase64(blob);
    expect(typeof base64).toBe('string');
    expect(base64.length).toBeGreaterThan(0);
  });

  it('saveAndDownloadFile executa o fallback Web criando elemento <a> quando no navegador', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    const blob = new Blob(['relatorio,dados\n1,2'], { type: 'text/csv' });
    const result = await saveAndDownloadFile({
      filename: 'relatorio.csv',
      blob,
      mimeType: 'text/csv',
    });

    expect(result.success).toBe(true);
    expect(result.isNative).toBe(false);
    expect(createObjectURLMock).toHaveBeenCalledWith(blob);
    expect(revokeObjectURLMock).toHaveBeenCalled();
  });

  it('saveAndDownloadFile utiliza o plugin Capacitor Filesystem quando em ambiente nativo', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const writeFileMock = vi.fn().mockResolvedValue({ uri: 'file:///data/user/0/app/files/Download/relatorio.csv' });

    (window as any).Capacitor = {
      Plugins: {
        Filesystem: {
          writeFile: writeFileMock,
        },
      },
    };

    const blob = new Blob(['conteudo nativo'], { type: 'text/plain' });
    const result = await saveAndDownloadFile({
      filename: 'relatorio.csv',
      blob,
    });

    expect(result.success).toBe(true);
    expect(result.isNative).toBe(true);
    expect(result.uri).toBe('file:///data/user/0/app/files/Download/relatorio.csv');
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'Download/relatorio.csv',
        recursive: true,
      }),
    );
  });
});
