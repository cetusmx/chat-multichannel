import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import CryptoJS from 'crypto-js';

const SECRET = 'superadmin-local-encryption-key';

const secureStorage = {
  getItem: (name) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    try {
      const bytes = CryptoJS.AES.decrypt(str, SECRET);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted || null;
    } catch (e) {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      const parsed = JSON.parse(value);
      if (!parsed?.state?.token) {
        localStorage.removeItem(name);
        return;
      }
    } catch(e) {}
    const encrypted = CryptoJS.AES.encrypt(value, SECRET).toString();
    localStorage.setItem(name, encrypted);
  },
  removeItem: (name) => localStorage.removeItem(name),
};

const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'superadmin-auth-storage',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);

export default useAuthStore;
