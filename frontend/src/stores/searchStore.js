import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSearchStore = create(
  persist(
    (set) => ({
      recentSearches: [],
      addSearchTerm: (term) => set((state) => {
        const lowerTerm = term.trim().toLowerCase();
        // Remove existing to avoid duplicates
        const filtered = state.recentSearches.filter(t => t.toLowerCase() !== lowerTerm);
        // Add to front
        filtered.unshift(term.trim());
        // Cap at 10
        if (filtered.length > 10) {
          filtered.pop();
        }
        return { recentSearches: filtered };
      }),
      removeSearchTerm: (term) => set((state) => ({
        recentSearches: state.recentSearches.filter(t => t.toLowerCase() !== term.toLowerCase())
      })),
      clearHistory: () => set({ recentSearches: [] })
    }),
    {
      name: 'search-history',
    }
  )
);
