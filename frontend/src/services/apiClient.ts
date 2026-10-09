export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
  timestamp: string;
  correlationId?: string;
}

export class ApiError extends Error {
  status: number;
  correlationId?: string;
  errors?: string[];

  constructor(message: string, status: number, correlationId?: string, errors?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.correlationId = correlationId;
    this.errors = errors;
  }
}

const BASE_URL = '/api/v1';

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    const token = localStorage.getItem('nextmail_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async parseResponse<T>(res: Response, endpoint: string): Promise<ApiResponse<T>> {
    const correlationId = res.headers.get('X-Correlation-ID') || undefined;
    if (!res.ok) {
      const errorPayload: Partial<ApiResponse<unknown>> = await res.json().catch(() => ({}));
      const cid = errorPayload.correlationId || correlationId;
      const msg = errorPayload.message || `API request ${endpoint} failed with status ${res.status}`;
      throw new ApiError(cid ? `[Trace: ${cid}] ${msg}` : msg, res.status, cid, errorPayload.errors);
    }
    const data: ApiResponse<T> = await res.json();
    if (correlationId && !data.correlationId) {
      data.correlationId = correlationId;
    }
    return data;
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
    let url = `${BASE_URL}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.parseResponse<T>(res, endpoint);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.parseResponse<T>(res, endpoint);
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.parseResponse<T>(res, endpoint);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.parseResponse<T>(res, endpoint);
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    const token = localStorage.getItem('nextmail_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.parseResponse<T>(res, endpoint);
  }
}

export const apiClient = new ApiClient();
