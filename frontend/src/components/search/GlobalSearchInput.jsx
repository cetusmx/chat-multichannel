import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, Clock } from 'lucide-react';
import { useSearchStore } from '../../stores/searchStore';
import { Input, Eyebrow } from '../ui/index.js';

export default function GlobalSearchInput() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { recentSearches, addSearchTerm, removeSearchTerm, clearHistory } = useSearchStore();

  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef(null);

  // Sync with URL
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setInputValue(q);
    } else {
      setInputValue('');
    }
  }, [searchParams]);

  // Click outside to close history
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const term = inputValue.trim();
    if (!term) return;

    addSearchTerm(term);
    setIsFocused(false);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleClear = () => {
    setInputValue('');
  };

  const handleHistoryClick = (term) => {
    setInputValue(term);
    addSearchTerm(term);
    setIsFocused(false);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const showDropdown = isFocused && recentSearches.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} role="search" className="relative">
        <Input
          type="text"
          leftIcon={Search}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Buscar chats, clientes o pedidos"
          aria-label="Buscar en toda la aplicación"
          aria-expanded={showDropdown}
          aria-controls="history-dropdown-id"
          maxLength={100}
          className="pr-9"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg"
            aria-label="Limpiar búsqueda"
          >
            <X size={14} />
          </button>
        )}
      </form>

      {showDropdown && (
        <div
          id="history-dropdown-id"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-border bg-surface shadow-2xl shadow-black/40"
        >
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2">
            <Eyebrow tone="muted">Búsquedas recientes</Eyebrow>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); clearHistory(); }}
              className="text-xs text-fg-muted transition-colors hover:text-fg"
            >
              Borrar historial
            </button>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
            {recentSearches.map((term, idx) => (
              <li key={idx} className="group flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2 transition-colors hover:bg-surface-2/60">
                <div
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onMouseDown={(e) => { e.preventDefault(); handleHistoryClick(term); }}
                >
                  <Clock size={14} className="shrink-0 text-fg-subtle" aria-hidden />
                  <span className="truncate text-sm text-fg">{term}</span>
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); removeSearchTerm(term); }}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-fg-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Eliminar ${term} del historial`}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
