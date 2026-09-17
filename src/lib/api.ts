export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
}

export async function apiFetch<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  // FormData (upload de arquivo) precisa que o navegador defina o Content-Type sozinho, com o
  // boundary do multipart — forçar 'application/json' aqui quebraria o parse no servidor.
  const isFormData = options?.body instanceof FormData;
  const defaultHeaders: Record<string, string> = isFormData
    ? {}
    : {
        'Content-Type': 'application/json',
      };

  // Check if there is an auth token in localStorage (if used)
  const token = localStorage.getItem('token');
  if (token) {
    (defaultHeaders as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? Number(import.meta.env.VITE_API_TIMEOUT_MS || 15_000);
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const signal = options?.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;

  let response: Response;
  try {
    const requestOptions = { ...(options || {}) };
    requestOptions.timeoutMs = undefined;
    const baseUrl =
      typeof window !== 'undefined' &&
      window.location?.origin &&
      window.location.origin !== 'null' &&
      !window.location.origin.startsWith('about')
        ? window.location.origin
        : 'http://localhost';
    const targetUrl =
      endpoint.startsWith('http://') || endpoint.startsWith('https://')
        ? endpoint
        : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    response = await fetch(targetUrl, {
      ...requestOptions,
      signal,
      credentials: 'include',
      headers: {
        ...defaultHeaders,
        ...requestOptions.headers,
      },
    });
  } catch {
    if (controller.signal.aborted) {
      throw new Error('A API demorou demais para responder. Tente novamente.');
    }
    throw new Error('Não foi possível conectar ao servidor.');
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.error || errorData?.message || `API request failed with status ${response.status}`,
    );
  }

  // For 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();

  // Support standardized { success, data } format
  if (data && typeof data === 'object' && 'success' in data) {
    if (!data.success) {
      throw new Error(data.error || 'API request failed');
    }
    if ('meta' in data) {
      return { data: data.data, meta: data.meta } as T;
    }
    return data.data as T;
  }

  // Fallback for non-standardized endpoints (like /api/prospect or intelligence if they are not standardized yet)
  return data as T;
}

import { saveAndDownloadFile } from './mobile/nativeFileDownloader.js';

/**
 * Baixa um arquivo de uma rota autenticada utilizando o adapter nativo (Capacitor)
 * ou o fallback web padrão (Blob).
 */
export async function downloadFile(url: string, fallbackFilename: string): Promise<void> {
  const token = localStorage.getItem('token');
  const response = await fetch(url, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || errorData?.message || 'Falha ao baixar o arquivo.');
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match?.[1] || fallbackFilename;
  await saveAndDownloadFile({ filename, blob });
}

const inFlightRequests = new Map<string, Promise<unknown>>();

// Uma mutação (POST/PUT/PATCH/DELETE) invalida qualquer GET in-flight: sem isso, um GET
// disparado logo após a mutação podia reaproveitar uma Promise antiga já em voo (resposta
// pré-mutação) em vez de buscar o estado atualizado — ver useCrmBoardController.handleConvert
// (post seguido de fetchLeads na mesma URL).
function invalidateInFlightGetCache(): void {
  inFlightRequests.clear();
}

export const api = {
  get: <T>(url: string, options?: ApiRequestOptions) => {
    const cacheKey = url + (options ? JSON.stringify(options) : '');
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey) as Promise<T>;
    }
    const promise = apiFetch<T>(url, { ...options, method: 'GET' }).finally(() => {
      inFlightRequests.delete(cacheKey);
    });
    inFlightRequests.set(cacheKey, promise);
    return promise;
  },
  post: <T>(url: string, body?: unknown, options?: ApiRequestOptions) => {
    invalidateInFlightGetCache();
    return apiFetch<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) });
  },
  put: <T>(url: string, body?: unknown, options?: ApiRequestOptions) => {
    invalidateInFlightGetCache();
    return apiFetch<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) });
  },
  patch: <T>(url: string, body?: unknown, options?: ApiRequestOptions) => {
    invalidateInFlightGetCache();
    return apiFetch<T>(url, { ...options, method: 'PATCH', body: JSON.stringify(body) });
  },
  delete: <T>(url: string, options?: ApiRequestOptions) => {
    invalidateInFlightGetCache();
    return apiFetch<T>(url, { ...options, method: 'DELETE' });
  },
  /** Upload de arquivo (multipart/form-data) — ex.: OCR de imagem. Não usa JSON.stringify. */
  postForm: <T>(url: string, form: FormData, options?: ApiRequestOptions) =>
    apiFetch<T>(url, { ...options, method: 'POST', body: form }),
};
