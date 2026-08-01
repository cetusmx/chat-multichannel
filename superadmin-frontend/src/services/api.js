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
    
    // Manually link user signal to our timeout controller for older browser support
    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', () => controller.abort(), { once: true });
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
    }

    if (!response.ok) {
      if (response.status === 401 && window.location.pathname !== '/login') {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return null;
      }

      // Intentar extraer el mensaje de error del backend, si existe.
      let errorMessage = 'Network response was not ok';
      let errorDataObj = null;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        errorDataObj = errorData;
      } catch (e) {
        // Ignorar si no es JSON
      }

      // Log out if the user's tenant was suspended
      if (response.status === 403 && window.location.pathname !== '/login') {
        if (errorDataObj?.error === 'TENANT_SUSPENDED' || errorDataObj?.code === 'TENANT_SUSPENDED') {
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return null;
        }
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
