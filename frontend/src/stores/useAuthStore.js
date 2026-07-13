import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Default to localStorage on web, or a dummy storage on mobile until configured
const defaultStorage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
};

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
    { 
      name: 'salesflow-auth',
      storage: createJSONStorage(() => defaultStorage)
    }
  ),
);

// Method to inject platform-specific storage engine (e.g., react-native-keychain)
export const configureAuthStorage = async (storageEngine) => {
  useAuthStore.persist.setOptions({ storage: createJSONStorage(() => storageEngine) });
  try {
    await useAuthStore.persist.rehydrate();
  } catch (error) {
    console.error("Auth storage rehydration failed:", error);
  }
};

export default useAuthStore;
