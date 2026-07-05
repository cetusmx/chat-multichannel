import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,

      setAuth(user, token, refreshToken) {
        set({ user, token, refreshToken });
      },

      clearAuth() {
        set({ user: null, token: null, refreshToken: null });
      },

      setToken(token) {
        set({ token });
      },
    }),
    { name: 'salesflow-auth' },
  ),
);

export default useAuthStore;
