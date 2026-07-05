import { useCallback } from 'react';
import useAuthStore from '../stores/useAuthStore.js';
import { post } from '../services/api.js';
import { connectSockets, disconnectSockets } from '../services/socket.js';

export default function useAuth() {
  const { user, token, setAuth, clearAuth } = useAuthStore();

  const login = useCallback(async (email, password) => {
    const res = await post('/auth/login', { email, password });
    const data = await res.json();
    setAuth(data.data.user, data.data.token, data.data.refreshToken);
    connectSockets(data.data.token);
    return data.data;
  }, [setAuth]);

  const logout = useCallback(() => {
    disconnectSockets();
    clearAuth();
    window.location.href = '/login';
  }, [clearAuth]);

  return { user, token, isAuthenticated: !!token, login, logout };
}
