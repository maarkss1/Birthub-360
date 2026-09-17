import { Capacitor } from '@capacitor/core';

export interface FileDownloadOptions {
  filename: string;
  blob: Blob;
  mimeType?: string;
}

export interface FileDownloadResult {
  success: boolean;
  isNative: boolean;
  uri?: string;
  filename: string;
}

/**
 * Converte um Blob em string base64.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao converter arquivo para base64'));
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Realiza o download de um arquivo utilizando adapter nativo do Capacitor no Android/iOS
 * com fallback transparente para o navegador Web.
 */
export async function saveAndDownloadFile(
  options: FileDownloadOptions,
): Promise<FileDownloadResult> {
  const { filename, blob } = options;
  const isNative = Boolean(Capacitor?.isNativePlatform?.());

  if (isNative) {
    try {
      const base64Data = await blobToBase64(blob);
      const filesystemPlugin = (
        window as unknown as {
          Capacitor?: {
            Plugins?: {
              Filesystem?: {
                writeFile: (args: unknown) => Promise<{ uri: string }>;
              };
            };
          };
        }
      )?.Capacitor?.Plugins?.Filesystem;

      if (filesystemPlugin && typeof filesystemPlugin.writeFile === 'function') {
        const result = await filesystemPlugin.writeFile({
          path: `Download/${filename}`,
          data: base64Data,
          recursive: true,
        });
        return {
          success: true,
          isNative: true,
          uri: result.uri,
          filename,
        };
      }
    } catch {
      // Se falhar a gravação nativa direta, cai no fallback seguro
    }
  }

  // Fallback Web padrão (navegador)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
    return {
      success: true,
      isNative: false,
      uri: objectUrl,
      filename,
    };
  }

  return {
    success: true,
    isNative: false,
    filename,
  };
}
