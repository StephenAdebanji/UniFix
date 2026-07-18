import type {
  Category,
  PaginatedRequests,
  PublicUser,
  ReportsSummary,
  RequestDetail,
  RequestPriority,
  RequestStatus,
  RoleName,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const ACCESS_TOKEN_KEY = 'unifix_access_token';
const REFRESH_TOKEN_KEY = 'unifix_refresh_token';

export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseErrorMessage(res: Response) {
  try {
    const body = await res.json();
    if (Array.isArray(body.message)) return body.message.join(', ');
    return body.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

async function rawFetch(path: string, options: RequestInit = {}) {
  const accessToken = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  return fetch(`${API_URL}${path}`, { ...options, headers });
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;

  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return true;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res = await rawFetch(path, options);

  if (res.status === 401 && getRefreshToken()) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawFetch(path, options);
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearTokens();
    }
    throw new ApiError(res.status, await parseErrorMessage(res));
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('text/csv')) {
    return (await res.text()) as unknown as T;
  }
  return res.json();
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export const api = {
  auth: {
    register: (data: {
      name: string;
      email: string;
      password: string;
      department?: string;
    }) =>
      apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => apiFetch<PublicUser>('/auth/me'),
    logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  },
  categories: {
    list: () => apiFetch<Category[]>('/categories'),
  },
  requests: {
    list: (query: Record<string, string | number | undefined> = {}) => {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.set(key, String(value));
      });
      const qs = params.toString();
      return apiFetch<PaginatedRequests>(`/requests${qs ? `?${qs}` : ''}`);
    },
    get: (id: number) => apiFetch<RequestDetail>(`/requests/${id}`),
    create: (data: {
      title: string;
      categoryId: number;
      priority?: RequestPriority;
      location: string;
      description: string;
      evidenceFileUrl?: string;
    }) =>
      apiFetch<RequestDetail>('/requests', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    assign: (id: number, officerId: number) =>
      apiFetch<RequestDetail>(`/requests/${id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ officerId }),
      }),
    updateStatus: (id: number, status: RequestStatus, note?: string) =>
      apiFetch<RequestDetail>(`/requests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note }),
      }),
    exportCsv: () => apiFetch<string>('/requests/export'),
  },
  users: {
    list: () => apiFetch<PublicUser[]>('/users'),
    updateRole: (id: number, role: RoleName) =>
      apiFetch<PublicUser>(`/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
  },
  reports: {
    summary: () => apiFetch<ReportsSummary>('/reports/summary'),
    exportCsv: () => apiFetch<string>('/reports/export'),
  },
  upload: {
    evidence: async (file: File) => {
      const accessToken = getAccessToken();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/uploads/evidence`, {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: formData,
      });
      if (!res.ok) {
        throw new ApiError(res.status, await parseErrorMessage(res));
      }
      return res.json() as Promise<{ url: string }>;
    },
  },
};
