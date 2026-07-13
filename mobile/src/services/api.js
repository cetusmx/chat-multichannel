import useAuthStore from '@shared/stores/useAuthStore';
import Config from 'react-native-config';

import { Platform } from 'react-native';

// Fallback to localhost for emulator if env var is missing
const BASE_URL = Config.BACKEND_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:4000/api' : 'http://localhost:4000/api');
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
      throw new Error('Session expired');
    }

    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (!refreshRes.ok) {
            clearAuth();
            throw new Error('Session expired');
          }
          let data;
          try {
            const rawText = await refreshRes.text();
            data = JSON.parse(rawText);
          } catch (e) {
            clearAuth();
            throw new Error('Invalid refresh response from server');
          }
          if (!data || !data.token) {
            clearAuth();
            throw new Error('No token returned');
          }
          setToken(data.token);
          return data.token;
        } catch (error) {
          refreshPromise = null;
          throw error;
        }
      })();
    }

    try {
      const newToken = await refreshPromise;
      refreshPromise = null; // Reset for future refreshes
      
      // If we are still processing an old request and the token we had is NOT the new token,
      // it means this request was waiting on the refresh and can now retry.
      headers.Authorization = `Bearer ${newToken}`;
      const retryRes = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
      return retryRes;
    } catch (error) {
      // If refresh failed, the original request fails too
      return res;
    }
  }

  return res;
}

export async function get(endpoint, options = {}) {
  return request(endpoint, options);
}

export async function post(endpoint, data, options = {}) {
  return request(endpoint, { method: 'POST', body: JSON.stringify(data), ...options });
}

export async function put(endpoint, data, options = {}) {
  return request(endpoint, { method: 'PUT', body: JSON.stringify(data), ...options });
}

export async function patch(endpoint, data) {
  return request(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function postFormData(endpoint, formData, signal = null) {
  const options = { method: 'POST', body: formData };
  if (signal) options.signal = signal;
  return request(endpoint, options, true);
}

export async function del(endpoint) {
  return request(endpoint, { method: 'DELETE' });
}
