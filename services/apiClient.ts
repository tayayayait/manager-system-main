const API_BASE = (import.meta as any)?.env?.VITE_API_BASE_URL || '';

interface RequestOptions extends RequestInit {
  retryCount?: number;
}

const defaultHeaders = {
  'Content-Type': 'application/json',
};

export const isApiEnabled = Boolean(API_BASE);

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE) {
    throw new Error('API base URL is not set (VITE_API_BASE_URL).');
  }

  const { retryCount = 0, ...rest } = options;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: defaultHeaders,
      ...rest,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text}`);
    }
    return res.status === 204 ? (undefined as unknown as T) : await res.json();
  } catch (err) {
    if (retryCount > 0) {
      return apiRequest(path, { ...options, retryCount: retryCount - 1 });
    }
    throw err;
  }
}
