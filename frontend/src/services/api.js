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

export async function deleteGroup(id) {
  return request(`/tenant/groups/${id}`, { method: 'DELETE' });
}



/**
 * Fetches the AI configuration for the current tenant.
 * @returns {Promise<Object>} The AI configuration object containing isConfigured and provider
 */
export async function getAiConfig() {
  const res = await get('/tenant/ai-config');
  if (!res.ok) {
    const text = await res.text();
    let error = {};
    if (text) {
      try {
        error = text.startsWith('{') ? JSON.parse(text) : { error: text };
      } catch (e) {
        error = { error: text };
      }
    let errMsg = typeof error.error === 'object' ? error.error.message : error.error;
    throw new Error(errMsg || 'Failed to fetch AI config');
  }
  return res.json();
}

/**
 * Updates the AI configuration for the current tenant.
 * @param {Object} data - The configuration data
 * @param {string} data.provider - The AI provider name (e.g. gemini)
 * @param {string} data.apiKey - The API key for the provider
 * @returns {Promise<Object>} The updated AI configuration object
 */
export async function updateAiConfig(data) {
  const res = await put('/tenant/ai-config', data);
  if (!res.ok) {
    const text = await res.text();
    let error = {};
    if (text) {
      try {
        error = text.startsWith('{') ? JSON.parse(text) : { error: text };
      } catch (e) {
        error = { error: text };
      }
    let errMsg = typeof error.error === 'object' ? error.error.message : error.error;
    throw new Error(errMsg || 'Failed to update AI config');
  }
  return res.json();
}

/**
 * Uploads a document to the knowledge base.
 * @param {File} file - The file to upload (PDF or CSV)
 * @returns {Promise<Object>} The uploaded document
 */
export async function uploadKnowledgeBaseDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await postFormData('/tenant/knowledge-base/upload', formData);
  if (!res.ok) {
    const text = await res.text();
    let error = {};
    if (text) {
      try {
        error = text.startsWith('{') ? JSON.parse(text) : { error: text };
      } catch (e) {
        error = { error: text };
      }
    }
    throw new Error(error.error || 'Failed to upload document');
  }
  return res.json();
}

/**
 * Retrieves the knowledge base documents for the tenant.
 * @returns {Promise<Object>} List of documents
 */
export async function getKnowledgeBaseDocuments() {
  const res = await get('/tenant/knowledge-base');
  if (!res.ok) {
    const text = await res.text();
    let error = {};
    if (text) {
      try {
        error = text.startsWith('{') ? JSON.parse(text) : { error: text };
      } catch (e) {
        error = { error: text };
      }
    }
    throw new Error(error.error || 'Failed to fetch knowledge base documents');
  }
  return res.json();
}

// Assignment Config
/**
 * Retrieves the client assignment configuration for the tenant.
 * @returns {Promise<Response>} The raw fetch Response
 */
export async function getAssignmentConfig() {
  return request('/tenant/assignment-config');
}

/**
 * Updates the client assignment configuration for the tenant.
 * @param {Object} data - Configuration payload
 * @param {string} data.strategy - 'MANUAL' or 'ROUND_ROBIN'
 * @param {Array<string>} data.activeVendorIds - Array of vendor IDs
 * @returns {Promise<Response>} The raw fetch Response
 */
export async function updateAssignmentConfig(data) {
  return request('/tenant/assignment-config', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Retrieves the users for the tenant, filtered by query string.
 * @param {string} query - The query string parameters
 * @returns {Promise<Response>} The raw fetch Response
 */
export async function getUsers(query = '') {
  return request(`/users?${query}`);
}

export async function getSlaConfig() {
  const res = await request('/metrics/sla');
  return res.data;
}

export async function updateSlaConfig(data) {
  const res = await request('/metrics/sla', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return res.data;
}
