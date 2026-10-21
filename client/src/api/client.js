// In production on Vercel, always use relative '/api' unless an explicit external domain is provided
const BASE_URL =
  import.meta.env.PROD
    ? (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost') ? import.meta.env.VITE_API_URL : '/api')
    : (import.meta.env.VITE_API_URL || '/api');


export class ApiError extends Error {
  constructor(code, message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function apiClient(endpoint, { method = 'GET', body, query, headers = {} } = {}) {
  let url = `${BASE_URL}${endpoint}`;

  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.append(k, String(v));
      }
    });
    const qs = params.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const token = localStorage.getItem('opsflow_token');
  const reqHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  };

  if (token) {
    reqHeaders.Authorization = `Bearer ${token}`;
  }

  const reqOptions = {
    method,
    headers: reqHeaders,
  };

  if (body) {
    reqOptions.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, reqOptions);
  } catch (netErr) {
    throw new ApiError('NETWORK_ERROR', 'Network connection error. Please check server connection.', 0);
  }

  // Handle empty 204
  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errCode = data?.error?.code || (response.status === 409 ? 'CONFLICT' : 'HTTP_ERROR');
    const errMsg = data?.error?.message || response.statusText || 'Request failed';
    const errDetails = data?.error?.details || null;
    throw new ApiError(errCode, errMsg, response.status, errDetails);
  }

  return data;
}
