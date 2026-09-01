import { create } from 'zustand';

const useUIStore = create((set) => ({
  sidebarOpen: true,
  commandPaletteOpen: false,
  notifications: [],
  coordinatorViewMode: 'preview', // 'preview' | 'focus'
  focusedChatIds: [],

  toggleSidebar() {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setCommandPalette(open) {
    set({ commandPaletteOpen: open });
  },

  addNotification(notification) {
    set((state) => ({
      notifications: [{ id: Date.now().toString() + Math.random(), date: new Date(), read: false, ...notification }, ...state.notifications].slice(0, 50),
    }));
  },
  markNotificationsAsRead() {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true }))
    }));
  },

  clearNotifications() {
    set({ notifications: [] });
  },

  setCoordinatorViewMode(mode) {
    set({ coordinatorViewMode: mode });
  },

  toggleFocusedChat(chatId) {
    set((state) => {
      if (state.focusedChatIds.includes(chatId)) {
        const newIds = state.focusedChatIds.filter(id => id !== chatId);
        return {
          focusedChatIds: newIds,
          coordinatorViewMode: newIds.length === 0 ? 'preview' : state.coordinatorViewMode,
        };
      } else {
        const newIds = [...state.focusedChatIds, chatId];
        if (newIds.length > 2) {
          newIds.shift();
        }
        return {
          focusedChatIds: newIds,
          coordinatorViewMode: 'focus',
        };
      }
    });
  },
}));

export default useUIStore;
