import { describe, it, expect, beforeEach } from 'vitest';
import { useSearchStore } from '../searchStore';

describe('Search Store', () => {
  beforeEach(() => {
    useSearchStore.setState({ recentSearches: [] });
  });

  it('should add a new search term to recent searches', () => {
    useSearchStore.getState().addSearchTerm('hello');
    expect(useSearchStore.getState().recentSearches).toEqual(['hello']);
  });

  it('should avoid duplicates and move term to top', () => {
    const store = useSearchStore.getState();
    store.addSearchTerm('first');
    store.addSearchTerm('second');
    store.addSearchTerm('First');
    
    expect(useSearchStore.getState().recentSearches).toEqual(['First', 'second']);
  });

  it('should limit recent searches to 10 items', () => {
    const store = useSearchStore.getState();
    for (let i = 1; i <= 15; i++) {
      store.addSearchTerm(`term-${i}`);
    }
    
    expect(useSearchStore.getState().recentSearches.length).toBe(10);
    expect(useSearchStore.getState().recentSearches[0]).toBe('term-15');
    expect(useSearchStore.getState().recentSearches[9]).toBe('term-6');
  });

  it('should remove a specific search term', () => {
    const store = useSearchStore.getState();
    store.addSearchTerm('term1');
    store.addSearchTerm('term2');
    
    store.removeSearchTerm('term1');
    expect(useSearchStore.getState().recentSearches).toEqual(['term2']);
  });

  it('should clear all history', () => {
    const store = useSearchStore.getState();
    store.addSearchTerm('term1');
    store.addSearchTerm('term2');
    
    store.clearHistory();
    expect(useSearchStore.getState().recentSearches).toEqual([]);
  });
});
