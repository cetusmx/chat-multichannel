import useAuthStore from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4005';

export const api = {
  async fetch(endpoint, options = {}) {
    const token = useAuthStore.getState().token;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const abortHandler = () => controller.abort();
    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', abortHandler, { once: true });
      }
    }
    const signal = controller.signal;

    let response;
    try {
      response = await fetch(`${API_URL.replace(/\/$/, '')}${endpoint}`, {
        ...options,
        headers,
        signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('La petición ha tardado demasiado (timeout).');
      }
      throw new Error('No se pudo conectar con el servidor.');
    } finally {
      clearTimeout(timeoutId);
      if (options.signal && typeof options.signal.removeEventListener === 'function') {
        options.signal.removeEventListener('abort', abortHandler);
      }
    }

    if (!response.ok) {
      if (response.status === 401 && window.location.pathname !== '/login') {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return null;
      }

      // Intentar extraer el mensaje de error del backend, si existe.
      let errorMessage =
        response.status === 502 || response.status === 503 || response.status === 504
          ? 'El servidor se está reiniciando temporalmente. Intenta de nuevo en unos segundos.'
          : 'Error de comunicación con el servidor';
      let errorDataObj = null;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData?.error?.message || errorData.message || errorMessage;
          errorDataObj = errorData;
        }
      } catch (e) {
        // Ignorar si no se puede parsear
      }

      if (response.status === 403 && errorDataObj?.error?.code === 'TENANT_SUSPENDED' && window.location.pathname !== '/login') {
        useAuthStore.getState().logout();
        window.location.href = '/login?suspended=true';
        return null;
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = errorDataObj;
      throw error;
    }

    // Para respuestas 204 No Content
    if (response.status === 204) {
      return null;
    }

    try {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (e) {
      return null;
    }
  },

  get(endpoint, options) {
    return this.fetch(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint, body, options) {
    return this.fetch(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body, options) {
    return this.fetch(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  patch(endpoint, body, options) {
    return this.fetch(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint, options) {
    return this.fetch(endpoint, { ...options, method: 'DELETE' });
  },
};

// ---------------------------------------------------------------------------
// Tenant catalog configuration (superadmin manages any tenant's catalog)
// ---------------------------------------------------------------------------

/** @returns {Promise<{ data: Object|null, providers: string[] }>} */
export async function getTenantCatalogConfig(tenantId) {
  const res = await api.get(`/api/superadmin/tenants/${tenantId}/catalog-config`);
  return { data: res?.data ?? null, providers: Array.isArray(res?.providers) ? res.providers : [] };
}

/** @returns {Promise<Object>} saved config (never includes the API key; exposes `hasApiKey`) */
export async function updateTenantCatalogConfig(tenantId, payload) {
  const res = await api.put(`/api/superadmin/tenants/${tenantId}/catalog-config`, payload);
  return res?.data ?? null;
}

/**
 * Tests the saved connection. The backend answers 502 when the provider is unreachable,
 * which `api.fetch` turns into a generic error, so unwrap it back into `{ ok, message }`.
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export async function testTenantCatalogConnection(tenantId) {
  try {
    const res = await api.post(`/api/superadmin/tenants/${tenantId}/catalog-config/test`, {});
    return res?.data ?? { ok: false, message: 'Respuesta vacía del servidor' };
  } catch (err) {
    if (err.status === 502 && err.data?.data) return { ok: false, ...err.data.data };
    throw err;
  }
}
