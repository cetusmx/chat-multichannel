import { create } from 'zustand';

let counter = 0;

const useToastStore = create((set, get) => ({
  toasts: [],

  push(toast) {
    const id = `t${++counter}`;
    const item = { id, tone: 'neutral', duration: 4500, ...toast };
    set((s) => ({ toasts: [...s.toasts, item].slice(-5) }));
    if (item.duration > 0) {
      setTimeout(() => get().dismiss(id), item.duration);
    }
    return id;
  },

  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

/**
 * Imperative toast API usable outside React.
 *   toast.success('Guardado')
 *   toast.error('No se pudo guardar', { description: err.message })
 */
export const toast = {
  show: (title, opts) => useToastStore.getState().push({ title, ...opts }),
  success: (title, opts) => useToastStore.getState().push({ title, tone: 'success', ...opts }),
  error: (title, opts) => useToastStore.getState().push({ title, tone: 'danger', duration: 7000, ...opts }),
  warning: (title, opts) => useToastStore.getState().push({ title, tone: 'warning', ...opts }),
  info: (title, opts) => useToastStore.getState().push({ title, tone: 'info', ...opts }),
};

export default useToastStore;
