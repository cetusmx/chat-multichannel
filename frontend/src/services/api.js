import useAuthStore from '../stores/useAuthStore.js';

const BASE_URL = '/api';
let refreshPromise = null;

async function request(endpoint, options = {}, isFormData = false) {
  const { token } = useAuthStore.getState();
  const headers = { ...options.headers };
  
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    const { refreshToken, setToken, clearAuth } = useAuthStore.getState();
    if (!refreshToken) {
      clearAuth();
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!refreshPromise) {
      refreshPromise = (async () => {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!refreshRes.ok) {
          clearAuth();
          window.location.href = '/login';
          throw new Error('Session expired');
        }
        const { token: newToken } = await refreshRes.json();
        setToken(newToken);
        return newToken;
      })().finally(() => { refreshPromise = null; });
    }

    const newToken = await refreshPromise;
    headers.Authorization = `Bearer ${newToken}`;
    const retryRes = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
    return retryRes;
  }

  return res;
}

export async function get(endpoint, options = {}) {
  return request(endpoint, options);
}

export async function post(endpoint, data) {
  return request(endpoint, { method: 'POST', body: JSON.stringify(data) });
}

export async function put(endpoint, data) {
  return request(endpoint, { method: 'PUT', body: JSON.stringify(data) });
}

export async function postFormData(endpoint, formData, signal = null) {
  const options = { method: 'POST', body: formData };
  if (signal) options.signal = signal;
  return request(endpoint, options, true);
}

export async function del(endpoint) {
  return request(endpoint, { method: 'DELETE' });
}
