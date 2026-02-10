const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function api<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders as Record<string, string>,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('nexus_access_token');
    if (stored) headers['Authorization'] = `Bearer ${stored}`;
  }

  const res = await fetch(`${API_URL}${path}`, { headers, ...rest });

  if (res.status === 401 && typeof window !== 'undefined') {
    // Try refresh
    const refreshed = await refreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${refreshed}`;
      const retry = await fetch(`${API_URL}${path}`, { headers, ...rest });
      return retry.json();
    }
    // Redirect to login
    window.location.href = '/login';
  }

  return res.json();
}

async function refreshToken(): Promise<string | null> {
  const refresh = localStorage.getItem('nexus_refresh_token');
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.success && data.data?.tokens) {
      localStorage.setItem('nexus_access_token', data.data.tokens.access_token);
      localStorage.setItem('nexus_refresh_token', data.data.tokens.refresh_token);
      return data.data.tokens.access_token;
    }
  } catch {
    return null;
  }
  return null;
}

// Convenience methods
export const apiGet = <T = any>(path: string) => api<T>(path);
export const apiPost = <T = any>(path: string, body: any) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const apiPut = <T = any>(path: string, body: any) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(body) });
export const apiPatch = <T = any>(path: string, body: any) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const apiDelete = <T = any>(path: string) =>
  api<T>(path, { method: 'DELETE' });
